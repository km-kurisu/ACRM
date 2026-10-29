export const AUDIT_ENTITY_TYPES = [
  "creator",
  "company",
  "deal",
  "outreach",
  "contract",
  "dropdown_option",
  "workspace",
  "user",
  "custom_filter",
] as const;

export const AUDIT_ACTIONS = ["create", "update", "delete", "import"] as const;

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  creator: "Creator",
  company: "Company",
  deal: "Deal",
  outreach: "Outreach",
  contract: "Contract",
  dropdown_option: "Dropdown option",
  workspace: "Workspace",
  user: "Team member",
  custom_filter: "Custom filter",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  import: "Imported",
};
