export type Permission =
  | "creators:view"
  | "creators:edit"
  | "creators:delete"
  | "outreach:view"
  | "outreach:edit"
  | "outreach:delete"
  | "contracts:view"
  | "contracts:edit"
  | "contracts:delete"
  | "companies:view"
  | "companies:edit"
  | "companies:delete"
  | "deals:view"
  | "deals:edit"
  | "deals:delete"
  | "dashboard:view"
  | "settings:manage"
  | "members:invite"
  | "members:manage";

export const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: "creators:view", label: "View creators" },
  { value: "creators:edit", label: "Edit creators" },
  { value: "creators:delete", label: "Delete creators" },
  { value: "outreach:view", label: "View outreach" },
  { value: "outreach:edit", label: "Edit outreach" },
  { value: "outreach:delete", label: "Delete outreach" },
  { value: "contracts:view", label: "View contracts" },
  { value: "contracts:edit", label: "Edit contracts" },
  { value: "contracts:delete", label: "Delete contracts" },
  { value: "companies:view", label: "View companies" },
  { value: "companies:edit", label: "Edit companies" },
  { value: "companies:delete", label: "Delete companies" },
  { value: "deals:view", label: "View deals" },
  { value: "deals:edit", label: "Edit deals" },
  { value: "deals:delete", label: "Delete deals" },
  { value: "dashboard:view", label: "View dashboard" },
  { value: "settings:manage", label: "Manage settings" },
  { value: "members:invite", label: "Invite members" },
  { value: "members:manage", label: "Manage members" },
];
