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

// ---------- Dashboard ----------

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
