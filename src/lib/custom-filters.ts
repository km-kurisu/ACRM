export type FilterFieldType = "text" | "number" | "enum" | "date";
export type FilterVisibility = "org" | "personal";

export type FilterCondition = { field: string; op: string; value?: string };

export type CustomFilter = {
  id: string;
  name: string;
  visibility: FilterVisibility;
  conditions: FilterCondition[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type FieldDef = {
  field: string;
  label: string;
  type: FilterFieldType;
  group: string;
  scope: "all" | "master";
  options?: string[];
};

export const OPS_BY_TYPE: Record<FilterFieldType, { op: string; label: string }[]> = {
  text: [
    { op: "contains", label: "contains" },
    { op: "eq", label: "equals" },
    { op: "neq", label: "not equals" },
    { op: "empty", label: "is empty" },
    { op: "notEmpty", label: "is not empty" },
  ],
  number: [
    { op: "eq", label: "=" },
    { op: "neq", label: "≠" },
    { op: "gt", label: ">" },
    { op: "gte", label: "≥" },
    { op: "lt", label: "<" },
    { op: "lte", label: "≤" },
  ],
  enum: [
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" },
  ],
  date: [
    { op: "on", label: "on" },
    { op: "before", label: "before" },
    { op: "after", label: "after" },
  ],
};

const YES_NO = ["Yes", "No"];

export const FILTERABLE_FIELDS: FieldDef[] = [
  { field: "creator_name", label: "Creator Name", type: "text", group: "Profile", scope: "all" },
  {
    field: "creator_type",
    label: "Creator Type",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["Individual", "Agency", "MCN", "Brand", "Studio"],
  },
  { field: "instagram", label: "Instagram Handle", type: "text", group: "Profile", scope: "all" },
  { field: "youtube", label: "YouTube Channel", type: "text", group: "Profile", scope: "all" },
  { field: "x_twitter", label: "X (Twitter) Handle", type: "text", group: "Profile", scope: "all" },
  { field: "other_platforms", label: "Other Platforms", type: "text", group: "Profile", scope: "all" },
  { field: "email", label: "Email", type: "text", group: "Profile", scope: "all" },
  { field: "phone_number", label: "Phone Number", type: "text", group: "Profile", scope: "all" },
  { field: "city", label: "City", type: "text", group: "Profile", scope: "all" },
  { field: "state", label: "State", type: "text", group: "Profile", scope: "all" },
  { field: "country", label: "Country", type: "text", group: "Profile", scope: "all" },
  { field: "niche", label: "Niche", type: "text", group: "Profile", scope: "all" },
  { field: "primary_content_type", label: "Content Type", type: "text", group: "Profile", scope: "all" },
  { field: "languages", label: "Languages", type: "text", group: "Profile", scope: "all" },
  {
    field: "priority",
    label: "Priority",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["High", "Medium", "Low"],
  },
  { field: "assigned_manager", label: "Assigned Manager", type: "text", group: "Profile", scope: "all" },
  {
    field: "interested_in_exclusive_mgmt",
    label: "Interested in Exclusive Mgmt",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["Yes", "No", "Maybe"],
  },
  { field: "rate_card_received", label: "Rate Card Received", type: "enum", group: "Profile", scope: "all", options: YES_NO },
  { field: "gst_available", label: "GST Available", type: "enum", group: "Profile", scope: "all", options: YES_NO },
  {
    field: "payment_details_received",
    label: "Payment Details Received",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: YES_NO,
  },
  { field: "followers_instagram", label: "Followers (Instagram)", type: "number", group: "Reach", scope: "all" },
  { field: "followers_youtube", label: "Followers (YouTube)", type: "number", group: "Reach", scope: "all" },
  { field: "engagement_rate", label: "Engagement Rate (%)", type: "number", group: "Reach", scope: "all" },
  { field: "total_reach", label: "Total Reach", type: "number", group: "Reach", scope: "master" },
  {
    field: "management_status",
    label: "Mgmt Status",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["Prospect", "Contacted", "Negotiating", "Signed", "Rejected", "On Hold"],
  },
  {
    field: "outreach_outcome",
    label: "Outreach Outcome",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["No Response", "Awaiting Reply", "Interested", "Not Interested", "Negotiating", "Signed", "On Hold"],
  },
  { field: "date_first_contacted", label: "First Contacted", type: "date", group: "Pipeline", scope: "master" },
  { field: "next_follow_up_date", label: "Next Follow-up", type: "date", group: "Pipeline", scope: "master" },
  {
    field: "contract_status",
    label: "Contract Status",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["Draft", "Active", "Renewed", "Expired", "Terminated"],
  },
  { field: "notes", label: "Notes", type: "text", group: "System", scope: "all" },
  { field: "created_at", label: "Date Added", type: "date", group: "System", scope: "all" },
];

export const FIELD_MAP: Map<string, FieldDef> = new Map(FILTERABLE_FIELDS.map(f => [f.field, f]));

function conditionMatches(condition: FilterCondition, row: Record<string, unknown>): boolean {
  const def = FIELD_MAP.get(condition.field);
  if (!def) return true;
  const knownOp = OPS_BY_TYPE[def.type].some(o => o.op === condition.op);
  if (!knownOp) return true;

  const raw = row[condition.field];

  if (def.type === "text") {
    const s = raw == null ? "" : String(raw).trim();
    const v = String(condition.value ?? "").trim();
    switch (condition.op) {
      case "empty":
        return s === "";
      case "notEmpty":
        return s !== "";
      case "contains":
        return v === "" || s.toLowerCase().includes(v.toLowerCase());
      case "eq":
        return s.toLowerCase() === v.toLowerCase();
      case "neq":
        return s.toLowerCase() !== v.toLowerCase();
    }
  }

  if (def.type === "number") {
    if (raw == null || raw === "") return false;
    const n = Number(raw);
    const v = Number(condition.value);
    if (Number.isNaN(n) || Number.isNaN(v)) return false;
    switch (condition.op) {
      case "eq":
        return n === v;
      case "neq":
        return n !== v;
      case "gt":
        return n > v;
      case "gte":
        return n >= v;
      case "lt":
        return n < v;
      case "lte":
        return n <= v;
    }
  }

  if (def.type === "enum") {
    const s = raw == null ? "" : String(raw);
    const v = String(condition.value ?? "");
    return condition.op === "is" ? s === v : s !== v;
  }

  if (def.type === "date") {
    const ds = typeof raw === "string" ? raw.slice(0, 10) : "";
    const v = String(condition.value ?? "").slice(0, 10);
    if (!ds || !v) return false;
    switch (condition.op) {
      case "on":
        return ds === v;
      case "before":
        return ds < v;
      case "after":
        return ds > v;
    }
  }

  return true;
}

export function matchesFilter(row: Record<string, unknown>, conditions: FilterCondition[]): boolean {
  return conditions.every(c => conditionMatches(c, row));
}

export function validateConditions(conditions: FilterCondition[]): string | null {
  if (!Array.isArray(conditions) || conditions.length === 0) return "Add at least one condition";
  for (const c of conditions) {
    const def = FIELD_MAP.get(c.field);
    if (!def) return "Pick a field for every condition";
    if (!OPS_BY_TYPE[def.type].some(o => o.op === c.op)) return `Invalid operator for ${def.label}`;
    const needsValue = c.op !== "empty" && c.op !== "notEmpty";
    if (needsValue && String(c.value ?? "").trim() === "") return `Enter a value for ${def.label}`;
    if (needsValue && def.type === "number" && Number.isNaN(Number(c.value))) return `${def.label} needs a numeric value`;
  }
  return null;
}

export function describeCondition(c: FilterCondition): string {
  const def = FIELD_MAP.get(c.field);
  const label = def?.label ?? c.field;
  const opEntry = def ? OPS_BY_TYPE[def.type].find(o => o.op === c.op) : undefined;
  const opLabel = opEntry?.label ?? c.op;
  if (c.op === "empty" || c.op === "notEmpty") return `${label} ${opLabel}`;
  return `${label} ${opLabel} ${String(c.value ?? "")}`;
}

export function describeFilter(conditions: FilterCondition[]): string[] {
  return conditions.map(describeCondition);
}

export function scopeConditions(conditions: FilterCondition[], scope: "all" | "master"): FilterCondition[] {
  return conditions.filter(c => FIELD_MAP.get(c.field)?.scope === scope);
}
