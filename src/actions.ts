"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/server";
import { ensureUserRow } from "@/lib/user-sync";
import { requireAdmin, requireUser } from "@/lib/rbac-server";
import type { Creator, Company, CompanyContactInput, CompanyInput, CompanyWithContacts, Deal, Outreach, Contract, CreatorSummary, CompanySummary } from "@/lib/types";
import {
  DROPDOWN_FIELD_KEYS,
  DROPDOWN_FIELDS,
  type DropdownFieldKey,
} from "@/lib/dropdown-options";
import {
  matchesFilter,
  scopeConditions,
  validateConditions,
  type CustomFilter,
  type FilterCondition,
  type FilterVisibility,
} from "@/lib/custom-filters";
import { DEFAULT_WORKSPACE_ID, type PresenceStatus } from "@/lib/presence";
import type { TableViewPrefs } from "@/lib/table-view";

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || "Database error");
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message?: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) fail(error);
  return (data ?? []) as T[];
}

function groupByCreator<T extends { creator_id: string | null }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of items) {
    if (!row.creator_id) continue;
    const list = map.get(row.creator_id) ?? [];
    list.push(row);
    map.set(row.creator_id, list);
  }
  return map;
}

type OutreachRow = {
  creator_id: string | null;
  date_contacted: string | null;
  next_follow_up_date: string | null;
  current_status: string | null;
  outcome: string | null;
  created_at: string;
};

type ContractRow = { creator_id: string | null; contract_status: string | null; created_at: string };

const OUTREACH_COLUMNS = "creator_id, date_contacted, next_follow_up_date, current_status, outcome, created_at";

const byRecency = (a: OutreachRow, b: OutreachRow) =>
  (b.date_contacted ?? "").localeCompare(a.date_contacted ?? "") || b.created_at.localeCompare(a.created_at);

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/master-data");
  revalidatePath("/outreach");
  revalidatePath("/contracts");
  revalidatePath("/deals");
  revalidatePath("/companies");
  revalidatePath("/creators");
}

export type OutreachWithCreator = Outreach & { creators: CreatorSummary | null };
export type DealWithRefs = Deal & { creators: CreatorSummary[]; companies: CompanySummary | null };
export type ContractWithCreator = Contract & { creators: CreatorSummary | null };

export type MasterDataRow = Creator & {
  total_reach: number;
  management_status: string | null;
  date_first_contacted: string | null;
  next_follow_up_date: string | null;
  outreach_outcome: string | null;
  contract_status: string | null;
};

// ---------- Creators ----------

export async function listCreators(): Promise<Creator[]> {
  return rows(db.from("creators").select("*").order("created_at", { ascending: false }));
}

export async function getCreator(id: string): Promise<Creator | null> {
  const { data, error } = await db.from("creators").select("*").eq("id", id).single();
  if (error) fail(error);
  return data as Creator | null;
}

export async function createCreator(input: Partial<Creator>) {
  await requireAdmin();
  const { error } = await db.from("creators").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateCreator(id: string, input: Partial<Creator>) {
  await requireAdmin();
  const { error } = await db.from("creators").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteCreator(id: string) {
  await requireAdmin();
  const { error } = await db.from("creators").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

// ---------- Companies ----------

export async function listCompanies(): Promise<CompanyWithContacts[]> {
  return rows<CompanyWithContacts>(
    db.from("companies").select("*, company_contacts(*)").order("created_at", { ascending: false })
  );
}

function normalizeContacts(contacts: CompanyContactInput[], companyId: string) {
  let pocAssigned = false;
  return contacts.map((c) => {
    const is_poc = !!c.is_poc && !pocAssigned;
    if (is_poc) pocAssigned = true;
    return {
      company_id: companyId,
      name: c.name,
      role: c.role ?? null,
      email: c.email ?? null,
      phone_number: c.phone_number ?? null,
      is_poc,
    };
  });
}

async function replaceContacts(companyId: string, contacts: CompanyContactInput[]) {
  const { error } = await db.from("company_contacts").delete().eq("company_id", companyId);
  if (error) fail(error);
  if (contacts.length === 0) return;
  const { error: insertError } = await db
    .from("company_contacts")
    .insert(normalizeContacts(contacts, companyId));
  if (insertError) fail(insertError);
}

export async function createCompany(input: CompanyInput) {
  await requireAdmin();
  const { contacts, ...company } = input;
  const { data, error } = await db.from("companies").insert([company]).select("id").single();
  if (error) fail(error);
  const companyId = (data as { id: string }).id;
  await replaceContacts(companyId, contacts ?? []);
  revalidateAll();
}

export async function updateCompany(id: string, input: CompanyInput) {
  await requireAdmin();
  const { contacts, ...company } = input;
  const { error } = await db.from("companies").update(company).eq("id", id);
  if (error) fail(error);
  await replaceContacts(id, contacts ?? []);
  revalidateAll();
}

export async function deleteCompany(id: string) {
  await requireAdmin();
  const { count, error } = await db
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", id);
  if (error) fail(error);
  if ((count ?? 0) > 0) throw new Error(`Cannot delete this company — ${count} deal(s) still reference it`);
  const { error: deleteError } = await db.from("companies").delete().eq("id", id);
  if (deleteError) fail(deleteError);
  revalidateAll();
}

// ---------- Deals ----------

type RawDealRow = Deal & {
  companies: CompanySummary | null;
  deal_creators: { creators: CreatorSummary | null }[];
};

function withCreators({ deal_creators, ...deal }: RawDealRow): DealWithRefs {
  return { ...deal, creators: (deal_creators ?? []).map((x) => x.creators).filter((c): c is CreatorSummary => !!c) };
}

export async function listDeals(): Promise<DealWithRefs[]> {
  const data = await rows<RawDealRow>(
    db
      .from("deals")
      .select("*, companies(id, name), deal_creators(creators(id, creator_name))")
      .order("created_at", { ascending: false })
  );
  return data.map((d) => {
    const deal = withCreators(d);
    deal.creators.sort((a, b) => a.creator_name.localeCompare(b.creator_name));
    return deal;
  });
}

export async function listDealsByCreator(creatorId: string): Promise<Deal[]> {
  return rows(
    db
      .from("deals")
      .select("*, deal_creators!inner(creator_id)")
      .eq("deal_creators.creator_id", creatorId)
      .order("created_at", { ascending: false })
  );
}

export async function createDeal(input: Partial<Deal>, creatorIds: string[]) {
  await requireAdmin();
  if (creatorIds.length === 0) throw new Error("Please select at least one creator");

  const { data, error } = await db.from("deals").insert([input]).select("id").single();
  if (error) fail(error);

  const { error: linkError } = await db
    .from("deal_creators")
    .insert(creatorIds.map((creator_id) => ({ deal_id: (data as { id: string }).id, creator_id })));
  if (linkError) fail(linkError);

  revalidateAll();
}

export async function updateDeal(id: string, input: Partial<Deal>, creatorIds?: string[]) {
  await requireAdmin();
  const { error } = await db.from("deals").update(input).eq("id", id);
  if (error) fail(error);

  if (creatorIds) {
    if (creatorIds.length === 0) throw new Error("Please select at least one creator");
    const { error: deleteError } = await db.from("deal_creators").delete().eq("deal_id", id);
    if (deleteError) fail(deleteError);
    const { error: linkError } = await db
      .from("deal_creators")
      .insert(creatorIds.map((creator_id) => ({ deal_id: id, creator_id })));
    if (linkError) fail(linkError);
  }

  revalidateAll();
}

export async function deleteDeal(id: string) {
  await requireAdmin();
  const { error } = await db.from("deals").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

// ---------- Outreach ----------

export async function listOutreach(): Promise<OutreachWithCreator[]> {
  return rows(db.from("outreach").select("*, creators(id, creator_name)").order("created_at", { ascending: false }));
}

export async function listOutreachByCreator(creatorId: string): Promise<Outreach[]> {
  return rows(db.from("outreach").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }));
}

export async function createOutreach(input: Partial<Outreach>) {
  await requireAdmin();
  const { error } = await db.from("outreach").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateOutreach(id: string, input: Partial<Outreach>) {
  await requireAdmin();
  const { error } = await db.from("outreach").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteOutreach(id: string) {
  await requireAdmin();
  const { error } = await db.from("outreach").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

// ---------- Contracts ----------

export async function listContracts(): Promise<ContractWithCreator[]> {
  return rows(db.from("contracts").select("*, creators(id, creator_name)").order("created_at", { ascending: false }));
}

export async function listContractsByCreator(creatorId: string): Promise<Contract[]> {
  return rows(db.from("contracts").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }));
}

export async function createContract(input: Partial<Contract>) {
  await requireAdmin();
  const { error } = await db.from("contracts").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateContract(id: string, input: Partial<Contract>) {
  await requireAdmin();
  const { error } = await db.from("contracts").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteContract(id: string) {
  await requireAdmin();
  const { error } = await db.from("contracts").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

// ---------- Master Data ----------

export async function listMasterData(): Promise<MasterDataRow[]> {
  const creators = await rows<Creator>(db.from("creators").select("*").order("created_at", { ascending: false }));
  const outreach = await rows<OutreachRow>(db.from("outreach").select(OUTREACH_COLUMNS));
  const contracts = await rows<ContractRow>(db.from("contracts").select("creator_id, contract_status, created_at"));

  const outreachByCreator = groupByCreator(outreach);
  const contractsByCreator = groupByCreator(contracts);

  return creators.map((c) => {
    const o = [...(outreachByCreator.get(c.id) ?? [])].sort(byRecency);
    const latest = o[0] ?? null;
    const k = [...(contractsByCreator.get(c.id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const contract = k[0] ?? null;
    const signed = k.some((row) => row.contract_status === "Active");

    return {
      ...c,
      total_reach: (c.followers_instagram ?? 0) + (c.followers_youtube ?? 0),
      management_status: signed ? "Signed" : latest ? latest.current_status ?? "Contacted" : "Prospect",
      date_first_contacted: o.length ? o[o.length - 1].date_contacted ?? null : null,
      next_follow_up_date: latest?.next_follow_up_date ?? null,
      outreach_outcome: latest?.current_status ?? null,
      contract_status: contract?.contract_status ?? null,
    };
  });
}

// ---------- Pages ----------

export type CreatorPageRow = {
  creator_id: string;
  creator_name: string;
  platform: string;
  handle: string;
  url: string | null;
  followers: number | null;
  total_followers: number;
  brand_deal_value: number;
  engagement_rate: number | null;
};

function platformUrl(platform: string, handle: string): string | null {
  const trimmed = handle.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  switch (platform) {
    case "Instagram":
      return `https://instagram.com/${trimmed}`;
    case "YouTube":
      return `https://youtube.com/@${trimmed}`;
    case "X (Twitter)":
      return `https://x.com/${trimmed}`;
    default:
      return null;
  }
}

export async function listPages(): Promise<CreatorPageRow[]> {
  const creators = await rows<Creator>(db.from("creators").select("*").order("creator_name"));
  const deals = await rows<Pick<Deal, "id" | "deal_value">>(db.from("deals").select("id, deal_value"));
  const dealCreators = await rows<{ deal_id: string; creator_id: string }>(
    db.from("deal_creators").select("deal_id, creator_id")
  );

  const dealValueById = new Map(deals.map((d) => [d.id, Number(d.deal_value || 0)]));
  const valueByCreator = new Map<string, number>();
  for (const dc of dealCreators) {
    valueByCreator.set(dc.creator_id, (valueByCreator.get(dc.creator_id) ?? 0) + (dealValueById.get(dc.deal_id) ?? 0));
  }

  const out: CreatorPageRow[] = [];
  for (const c of creators) {
    const entries: [string, string | null | undefined, number | null][] = [
      ["Instagram", c.instagram, c.followers_instagram ?? null],
      ["YouTube", c.youtube, c.followers_youtube ?? null],
      ["X (Twitter)", c.x_twitter, null],
      ["Other", c.other_platforms, null],
    ];
    for (const [platform, handle, followers] of entries) {
      if (!handle?.trim()) continue;
      out.push({
        creator_id: c.id,
        creator_name: c.creator_name,
        platform,
        handle,
        url: platformUrl(platform, handle),
        followers,
        total_followers: (c.followers_instagram ?? 0) + (c.followers_youtube ?? 0),
        brand_deal_value: valueByCreator.get(c.id) ?? 0,
        engagement_rate: c.engagement_rate ?? null,
      });
    }
  }
  return out;
}

// ---------- Dashboard ----------

export type CountItem = { label: string; value: number };

export type DashboardOverview = {
  creatorsCount: number;
  pipeline: CountItem[];
  dealStatus: CountItem[];
  followUpsIn7Days: number;
  totalDeals: number;
  totalRevenue: number;
  agencyCommission: number;
  topCreators: (CreatorSummary & { total_deal_value: number; total_followers: number; engagement_rate: number })[];
  recentOutreach: OutreachWithCreator[];
};

const PIPELINE_ORDER = ["Prospect", "Contacted", "Negotiating", "Signed", "Rejected", "On Hold"];
const DEAL_STATUS_ORDER = ["Pitched", "Confirmed", "In Progress", "Completed", "Cancelled"];

export async function getDashboardOverview(filter?: FilterCondition[]): Promise<DashboardOverview> {
  const scoped = scopeConditions(filter ?? [], "all");
  const active = scoped.length > 0 ? scoped : null;
  const creators = active
    ? await rows<Creator>(db.from("creators").select("*"))
    : await rows<Creator>(
        db.from("creators").select("id, creator_name, followers_instagram, followers_youtube, engagement_rate")
      );
  const matchingIds = active
    ? new Set(creators.filter(c => matchesFilter(c as unknown as Record<string, unknown>, active)).map(c => c.id))
    : null;
  const included = (id: string) => !matchingIds || matchingIds.has(id);
  const outreach = await rows<OutreachRow>(db.from("outreach").select(OUTREACH_COLUMNS));
  const contracts = await rows<ContractRow>(db.from("contracts").select("creator_id, contract_status, created_at"));
  const deals = await rows<Pick<Deal, "id" | "deal_value" | "agency_commission" | "campaign_status">>(
    db.from("deals").select("id, deal_value, agency_commission, campaign_status")
  );
  const dealCreators = await rows<{ deal_id: string; creator_id: string }>(
    db.from("deal_creators").select("deal_id, creator_id")
  );

  const outreachByCreator = groupByCreator(outreach);
  const contractsByCreator = groupByCreator(contracts);

  const visibleOutreach = matchingIds
    ? outreach.filter(o => o.creator_id != null && matchingIds.has(o.creator_id))
    : outreach;

  const pipeline = new Map<string, number>(PIPELINE_ORDER.map((label) => [label, 0] as const));

  for (const c of creators) {
    if (!included(c.id)) continue;
    const latest = [...(outreachByCreator.get(c.id) ?? [])].sort(byRecency)[0] ?? null;
    const cons = contractsByCreator.get(c.id) ?? [];
    const hasActive = cons.some((k) => k.contract_status === "Active");
    const hasDraft = cons.some((k) => k.contract_status === "Draft");
    const hasRejected = cons.some((k) => k.contract_status === "Expired" || k.contract_status === "Terminated");
    const status = latest?.current_status ?? null;

    let cat: string;
    if (hasActive) cat = "Signed";
    else if (status === "Not Interested" || (hasRejected && !status)) cat = "Rejected";
    else if (hasDraft || status === "Negotiating" || status === "Interested" || status === "Meeting Scheduled")
      cat = "Negotiating";
    else if (status) cat = "Contacted";
    else cat = "Prospect";

    pipeline.set(cat, (pipeline.get(cat) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);

  let followUpsIn7Days = 0;
  for (const row of visibleOutreach) {
    if (!row.next_follow_up_date) continue;
    const d = new Date(`${row.next_follow_up_date}T00:00:00`);
    if (!isNaN(d.getTime()) && d >= today && d <= horizon) followUpsIn7Days++;
  }

  const dealStatus = new Map<string, number>(DEAL_STATUS_ORDER.map((label) => [label, 0] as const));
  let totalDeals = 0;
  let totalRevenue = 0;
  let agencyCommission = 0;
  const dealValuesByCreator = new Map<string, number>();

  const dealIds = matchingIds
    ? new Set(dealCreators.filter(dc => matchingIds.has(dc.creator_id)).map(dc => dc.deal_id))
    : null;

  for (const d of deals) {
    if (dealIds && !dealIds.has(d.id)) continue;
    totalDeals++;
    totalRevenue += Number(d.deal_value || 0);
    agencyCommission += Number(d.agency_commission || 0);
    const label = d.campaign_status ?? "Pitched";
    dealStatus.set(label, (dealStatus.get(label) ?? 0) + 1);
  }

  const dealValueById = new Map(deals.map((d) => [d.id, Number(d.deal_value || 0)]));
  for (const dc of dealCreators) {
    const value = dealValueById.get(dc.deal_id) ?? 0;
    dealValuesByCreator.set(dc.creator_id, (dealValuesByCreator.get(dc.creator_id) ?? 0) + value);
  }

  const allOutreach = await listOutreach();
  const recentOutreach = matchingIds
    ? allOutreach.filter(o => o.creators != null && matchingIds.has(o.creators.id))
    : allOutreach;

  const topCreators = creators
    .filter(c => included(c.id))
    .map((c) => ({
      id: c.id,
      creator_name: c.creator_name,
      total_deal_value: dealValuesByCreator.get(c.id) ?? 0,
      total_followers: (c.followers_instagram ?? 0) + (c.followers_youtube ?? 0),
      engagement_rate: c.engagement_rate ?? 0,
    }));

  return {
    creatorsCount: matchingIds ? matchingIds.size : creators.length,
    pipeline: PIPELINE_ORDER.map((label) => ({ label, value: pipeline.get(label) ?? 0 })),
    dealStatus: DEAL_STATUS_ORDER.map((label) => ({ label, value: dealStatus.get(label) ?? 0 })),
    followUpsIn7Days,
    totalDeals,
    totalRevenue,
    agencyCommission,
    topCreators,
    recentOutreach,
  };
}

// ---------- Dropdown options ----------

function assertDropdownField(fieldKey: string): asserts fieldKey is DropdownFieldKey {
  if (!(fieldKey in DROPDOWN_FIELDS)) throw new Error("Unknown dropdown field");
}

function normalizeOptionValue(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) throw new Error("Value cannot be empty");
  if (value.length > 120) throw new Error("Value must be 120 characters or fewer");
  return value;
}

// Case-insensitive uniqueness within one field. `allowExact` exempts the
// option being renamed from clashing with itself (case-only renames).
async function assertNoDuplicate(
  fieldKey: DropdownFieldKey,
  value: string,
  allowExact?: string
) {
  const existing = await rows<{ value: string }>(
    db.from("dropdown_options").select("value").eq("field_key", fieldKey)
  );
  const clash = existing.some(
    (r) => r.value !== allowExact && r.value.toLowerCase() === value.toLowerCase()
  );
  if (clash) throw new Error(`"${value}" already exists`);
}

export async function listDropdownOptions(): Promise<Record<DropdownFieldKey, string[]>> {
  await requireUser();
  const data = await rows<{ field_key: string; value: string }>(
    db.from("dropdown_options").select("field_key, value").order("sort_order").order("value")
  );
  const result = Object.fromEntries(
    DROPDOWN_FIELD_KEYS.map((k): [DropdownFieldKey, string[]] => [k, []])
  ) as Record<DropdownFieldKey, string[]>;
  for (const row of data) {
    const key = row.field_key as DropdownFieldKey;
    if (!(key in result)) continue;
    result[key].push(row.value);
  }
  return result;
}

export async function createDropdownOption(fieldKey: string, rawValue: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);
  const value = normalizeOptionValue(rawValue);
  await assertNoDuplicate(fieldKey, value);

  const latest = await rows<{ sort_order: number }>(
    db.from("dropdown_options").select("sort_order").eq("field_key", fieldKey).order("sort_order", { ascending: false }).limit(1)
  );
  const nextOrder = (latest[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from("dropdown_options").insert({ field_key: fieldKey, value, sort_order: nextOrder });
  if (error) fail(error);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}

export async function renameDropdownOption(fieldKey: string, oldValue: string, newValue: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);
  const value = normalizeOptionValue(newValue);
  await assertNoDuplicate(fieldKey, value, oldValue);

  // Cascade first so a failed update leaves option list and data consistent.
  // (Supabase update takes one values object; the column is dynamic.)
  const { table, column } = DROPDOWN_FIELDS[fieldKey];
  if (value !== oldValue) {
    const { error: cascadeError } = await db
      .from(table)
      .update({ [column]: value })
      .eq(column, oldValue);
    if (cascadeError) fail(cascadeError);
  }
  const { error } = await db
    .from("dropdown_options")
    .update({ value })
    .eq("field_key", fieldKey)
    .eq("value", oldValue);
  if (error) fail(error);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}

export async function deleteDropdownOption(fieldKey: string, value: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);

  const { table, column } = DROPDOWN_FIELDS[fieldKey];
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) fail(error);
  if ((count ?? 0) > 0) throw new Error(`Cannot remove "${value}" — ${count} record(s) still use it`);

  const { error: deleteError } = await db
    .from("dropdown_options")
    .delete()
    .eq("field_key", fieldKey)
    .eq("value", value);
  if (deleteError) fail(deleteError);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}

// ---------- Presence ----------

export async function setPresenceStatus(status: PresenceStatus) {
  const userId = await requireUser();
  await ensureUserRow(userId);

  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      status_override: status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });

  if (error) {
    console.warn("Failed to update presence status:", error.message);
  }
}

// ---------- Settings ----------

export type SettingsRole = "admin" | "member" | "viewer";
export type WorkspaceInfo = { id: string; name: string };

export async function listWorkspaces(): Promise<WorkspaceInfo[]> {
  await requireUser();
  return rows(db.from("workspaces").select("id, name").order("created_at"));
}

export async function updateWorkspaceName(workspaceId: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Workspace name cannot be empty");

  const { error } = await db
    .from("workspaces")
    .update({ name: trimmed })
    .eq("id", workspaceId);
  if (error) fail(error);

  revalidatePath("/settings");
}

export async function setUserRole(userId: string, role: SettingsRole) {
  await requireAdmin();

  if (!["admin", "member", "viewer"].includes(role)) {
    throw new Error("Invalid role");
  }

  // Clerk replaces publicMetadata wholesale on update — read first so we
  // preserve any other keys already stored there.
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: { ...(user.publicMetadata ?? {}), role },
  });

  revalidatePath("/settings/team");
}

// ---------- Notification preferences ----------

export type NotificationPreferences = {
  notify_deal_updates: boolean;
  notify_contract_renewals: boolean;
  notify_outreach_followups: boolean;
  notify_weekly_digest: boolean;
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const userId = await requireUser();

  const { data, error } = await db
    .from("user_preferences")
    .select(
      "notify_deal_updates, notify_contract_renewals, notify_outreach_followups, notify_weekly_digest"
    )
    .eq("user_id", userId)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  if (error) fail(error);

  return {
    notify_deal_updates: data?.notify_deal_updates ?? true,
    notify_contract_renewals: data?.notify_contract_renewals ?? true,
    notify_outreach_followups: data?.notify_outreach_followups ?? true,
    notify_weekly_digest: data?.notify_weekly_digest ?? false,
  };
}

export async function updateNotificationPreferences(input: NotificationPreferences) {
  const userId = await requireUser();
  await ensureUserRow(userId);

  const { error } = await db
    .from("user_preferences")
    .upsert({
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      ...input,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });
  if (error) fail(error);
}

// ---------- Custom filters ----------

type CustomFilterRecord = {
  id: string;
  name: string;
  visibility: string;
  conditions: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function normalizeFilter(row: CustomFilterRecord): CustomFilter {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility === "org" ? "org" : "personal",
    conditions: Array.isArray(row.conditions) ? (row.conditions as FilterCondition[]) : [],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function assertCanEditFilter(row: CustomFilterRecord) {
  if (row.visibility === "org") {
    await requireAdmin();
    return;
  }
  const userId = await requireUser();
  if (row.created_by !== userId) throw new Error("You can only modify your own filters");
}

export async function listCustomFilters(): Promise<CustomFilter[]> {
  const userId = await requireUser();
  const data = await rows<CustomFilterRecord>(
    db.from("custom_filters").select("*").order("created_at", { ascending: false })
  );
  return data
    .map(normalizeFilter)
    .filter((f) => f.visibility === "org" || f.created_by === userId);
}

export async function createCustomFilter(input: {
  name: string;
  visibility: FilterVisibility;
  conditions: FilterCondition[];
}) {
  const userId = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const validationError = validateConditions(input.conditions);
  if (validationError) throw new Error(validationError);
  if (input.visibility === "org") await requireAdmin();

  await ensureUserRow(userId);
  const { error } = await db.from("custom_filters").insert({
    name,
    visibility: input.visibility,
    conditions: input.conditions,
    created_by: userId,
  });
  if (error) fail(error);
}

export async function updateCustomFilter(
  id: string,
  input: { name: string; visibility: FilterVisibility; conditions: FilterCondition[] }
) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const validationError = validateConditions(input.conditions);
  if (validationError) throw new Error(validationError);

  const { data, error: fetchError } = await db.from("custom_filters").select("*").eq("id", id).single();
  if (fetchError || !data) throw new Error("Filter not found");
  const existing = data as CustomFilterRecord;
  await assertCanEditFilter(existing);
  if (input.visibility === "org" && existing.visibility !== "org") await requireAdmin();

  const { error } = await db
    .from("custom_filters")
    .update({ name, visibility: input.visibility, conditions: input.conditions, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteCustomFilter(id: string) {
  const { data, error: fetchError } = await db.from("custom_filters").select("*").eq("id", id).single();
  if (fetchError || !data) throw new Error("Filter not found");
  await assertCanEditFilter(data as CustomFilterRecord);
  const { error } = await db.from("custom_filters").delete().eq("id", id);
  if (error) fail(error);
}

// ---------- Table view preferences ----------

export async function getTableViewPrefs(tableKey: string): Promise<TableViewPrefs> {
  const userId = await requireUser();

  const { data, error } = await db
    .from("table_view_prefs")
    .select("prefs")
    .eq("user_id", userId)
    .eq("table_key", tableKey)
    .maybeSingle();
  if (error) fail(error);

  return (data?.prefs as TableViewPrefs | null) ?? {};
}

export async function saveTableViewPrefs(tableKey: string, prefs: TableViewPrefs): Promise<void> {
  const userId = await requireUser();
  await ensureUserRow(userId);

  const { error } = await db.from("table_view_prefs").upsert(
    {
      user_id: userId,
      table_key: tableKey,
      prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,table_key" }
  );
  if (error) fail(error);
}
