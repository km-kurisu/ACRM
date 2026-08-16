"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server";
import type { Creator, Company, Deal, Outreach, Contract, CreatorSummary, CompanySummary } from "@/lib/types";

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || "Database error");
}

export type DashboardStat = { label: string; value: number };

export type OutreachWithCreator = Outreach & { creators: CreatorSummary | null };
export type DealWithRefs = Deal & { creators: CreatorSummary | null; companies: CompanySummary | null };
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
  const { data, error } = await db.from("creators").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []) as Creator[];
}

export async function listCreatorSummaries(): Promise<CreatorSummary[]> {
  const { data, error } = await db.from("creators").select("id, creator_name").order("creator_name");
  if (error) fail(error);
  return (data || []) as CreatorSummary[];
}

export async function createCreator(input: Partial<Creator>) {
  const { error } = await db.from("creators").insert([input]);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function updateCreator(id: string, input: Partial<Creator>) {
  const { error } = await db.from("creators").update(input).eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function deleteCreator(id: string) {
  const { error } = await db.from("creators").delete().eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

// ---------- Companies ----------

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await db.from("companies").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []) as Company[];
}

export async function listCompanySummaries(): Promise<CompanySummary[]> {
  const { data, error } = await db.from("companies").select("id, name").order("name");
  if (error) fail(error);
  return (data || []) as CompanySummary[];
}

export async function createCompany(input: Partial<Company>) {
  const { error } = await db.from("companies").insert([input]);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function updateCompany(id: string, input: Partial<Company>) {
  const { error } = await db.from("companies").update(input).eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function deleteCompany(id: string) {
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

// ---------- Deals ----------

export async function listDeals(): Promise<DealWithRefs[]> {
  const { data, error } = await db.from("deals").select("*, creators(id, creator_name), companies(id, name)").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []) as DealWithRefs[];
}

export async function createDeal(input: Partial<Deal>) {
  const { error } = await db.from("deals").insert([input]);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function updateDeal(id: string, input: Partial<Deal>) {
  const { error } = await db.from("deals").update(input).eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function deleteDeal(id: string) {
  const { error } = await db.from("deals").delete().eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

// ---------- Outreach ----------

export async function listOutreach(): Promise<OutreachWithCreator[]> {
  const { data, error } = await db.from("outreach").select("*, creators(id, creator_name)").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []) as OutreachWithCreator[];
}

export async function createOutreach(input: Partial<Outreach>) {
  const { error } = await db.from("outreach").insert([input]);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function updateOutreach(id: string, input: Partial<Outreach>) {
  const { error } = await db.from("outreach").update(input).eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function deleteOutreach(id: string) {
  const { error } = await db.from("outreach").delete().eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

// ---------- Contracts ----------

export async function listContracts(): Promise<ContractWithCreator[]> {
  const { data, error } = await db.from("contracts").select("*, creators(id, creator_name)").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []) as ContractWithCreator[];
}

export async function createContract(input: Partial<Contract>) {
  const { error } = await db.from("contracts").insert([input]);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function updateContract(id: string, input: Partial<Contract>) {
  const { error } = await db.from("contracts").update(input).eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

export async function deleteContract(id: string) {
  const { error } = await db.from("contracts").delete().eq("id", id);
  if (error) fail(error);
  revalidatePath("/dashboard");
}

// ---------- Master Data ----------

export async function listMasterData(): Promise<MasterDataRow[]> {
  const { data: creators, error } = await db.from("creators").select("*").order("created_at", { ascending: false });
  if (error) fail(error);

  const { data: outreach, error: outreachError } = await db
    .from("outreach")
    .select("creator_id, date_contacted, next_follow_up_date, current_status, outcome, created_at");
  if (outreachError) fail(outreachError);

  const { data: contracts, error: contractsError } = await db
    .from("contracts")
    .select("creator_id, contract_status, created_at");
  if (contractsError) fail(contractsError);

  type O = {
    creator_id: string | null;
    date_contacted: string | null;
    next_follow_up_date: string | null;
    current_status: string | null;
    outcome: string | null;
    created_at: string;
  };
  type K = { creator_id: string | null; contract_status: string | null; created_at: string };

  const outreachByCreator = new Map<string, O[]>();
  for (const row of (outreach || []) as O[]) {
    if (!row.creator_id) continue;
    const list = outreachByCreator.get(row.creator_id) ?? [];
    list.push(row);
    outreachByCreator.set(row.creator_id, list);
  }

  const contractsByCreator = new Map<string, K[]>();
  for (const row of (contracts || []) as K[]) {
    if (!row.creator_id) continue;
    const list = contractsByCreator.get(row.creator_id) ?? [];
    list.push(row);
    contractsByCreator.set(row.creator_id, list);
  }

  return (creators || []).map((c) => {
    const o = [...(outreachByCreator.get(c.id) ?? [])].sort(
      (a, b) =>
        (b.date_contacted ?? "").localeCompare(a.date_contacted ?? "") || b.created_at.localeCompare(a.created_at)
    );
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
  onHold: number;
  topCreators: CreatorSummary[];
  recentOutreach: OutreachWithCreator[];
};

const PIPELINE_ORDER = ["Prospect", "Contacted", "Negotiating", "Signed", "Rejected", "On Hold"];
const DEAL_STATUS_ORDER = ["Pitched", "Confirmed", "In Progress", "Completed", "Cancelled"];

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { data: creators, error: creatorsError } = await db.from("creators").select("id");
  if (creatorsError) fail(creatorsError);

  const { data: outreach, error: outreachError } = await db
    .from("outreach")
    .select("creator_id, current_status, date_contacted, next_follow_up_date, created_at");
  if (outreachError) fail(outreachError);

  const { data: contracts, error: contractsError } = await db
    .from("contracts")
    .select("creator_id, contract_status, created_at");
  if (contractsError) fail(contractsError);

  const { data: deals, error: dealsError } = await db
    .from("deals")
    .select("deal_value, agency_commission, campaign_status");
  if (dealsError) fail(dealsError);

  type O = {
    creator_id: string | null;
    current_status: string | null;
    date_contacted: string | null;
    next_follow_up_date: string | null;
    created_at: string;
  };
  type K = { creator_id: string | null; contract_status: string | null; created_at: string };

  const outreachByCreator = new Map<string, O[]>();
  for (const row of (outreach || []) as O[]) {
    if (!row.creator_id) continue;
    const list = outreachByCreator.get(row.creator_id) ?? [];
    list.push(row);
    outreachByCreator.set(row.creator_id, list);
  }

  const contractsByCreator = new Map<string, K[]>();
  for (const row of (contracts || []) as K[]) {
    if (!row.creator_id) continue;
    const list = contractsByCreator.get(row.creator_id) ?? [];
    list.push(row);
    contractsByCreator.set(row.creator_id, list);
  }

  const pipeline = new Map<string, number>(PIPELINE_ORDER.map((label) => [label, 0] as const));

  for (const c of (creators || []) as { id: string }[]) {
    const out = [...(outreachByCreator.get(c.id) ?? [])].sort(
      (a, b) =>
        (b.date_contacted ?? "").localeCompare(a.date_contacted ?? "") || b.created_at.localeCompare(a.created_at)
    );
    const latest = out[0] ?? null;
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
  for (const row of (outreach || []) as O[]) {
    if (!row.next_follow_up_date) continue;
    const d = new Date(`${row.next_follow_up_date}T00:00:00`);
    if (!isNaN(d.getTime()) && d >= today && d <= horizon) followUpsIn7Days++;
  }

  const dealStatus = new Map<string, number>(DEAL_STATUS_ORDER.map((label) => [label, 0] as const));
  let totalDeals = 0;
  let totalRevenue = 0;
  let agencyCommission = 0;

  for (const d of (deals || []) as { deal_value: number | null; agency_commission: number | null; campaign_status: string | null }[]) {
    totalDeals++;
    totalRevenue += Number(d.deal_value || 0);
    agencyCommission += Number(d.agency_commission || 0);
    const label = d.campaign_status ?? "Pitched";
    dealStatus.set(label, (dealStatus.get(label) ?? 0) + 1);
  }

  const [topCreators, recentOutreach] = await Promise.all([listCreatorSummaries(), listOutreach()]);

  return {
    creatorsCount: (creators || []).length,
    pipeline: PIPELINE_ORDER.map((label) => ({ label, value: pipeline.get(label) ?? 0 })),
    dealStatus: DEAL_STATUS_ORDER.map((label) => ({ label, value: dealStatus.get(label) ?? 0 })),
    followUpsIn7Days,
    totalDeals,
    totalRevenue,
    agencyCommission,
    onHold: 0,
    topCreators,
    recentOutreach,
  };
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  const results: DashboardStat[] = [];

  const { count: creatorsCount } = await db.from("creators").select("id", { count: "exact" });
  results.push({ label: "Total Creators", value: creatorsCount || 0 });

  const { data: outreach } = await db.from("outreach").select("creator_id");
  results.push({ label: "Creators Contacted", value: new Set((outreach || []).map((r) => r.creator_id)).size });

  const { data: contracts } = await db.from("contracts").select("creator_id");
  results.push({ label: "Signed Creators", value: new Set((contracts || []).map((r) => r.creator_id)).size });

  const { count: dealsCount } = await db.from("deals").select("id", { count: "exact" });
  results.push({ label: "Total Brand Deals", value: dealsCount || 0 });

  const { data: revenue } = await db.from("deals").select("deal_value");
  results.push({ label: "Total Revenue", value: (revenue || []).reduce((s: number, r) => s + Number(r.deal_value || 0), 0) });

  return results;
}
