export const DROPDOWN_FIELDS = {
  creator_type: { table: "creators", column: "creator_type" },
  niche: { table: "creators", column: "niche" },
  priority: { table: "creators", column: "priority" },
  interested_in_exclusive_mgmt: { table: "creators", column: "interested_in_exclusive_mgmt" },
  contact_method: { table: "outreach", column: "contact_method" },
  current_status: { table: "outreach", column: "current_status" },
  outcome: { table: "outreach", column: "outcome" },
  contract_type: { table: "contracts", column: "contract_type" },
  contract_status: { table: "contracts", column: "contract_status" },
  exclusivity: { table: "contracts", column: "exclusivity" },
  campaign_status: { table: "deals", column: "campaign_status" },
  invoice_status: { table: "deals", column: "invoice_status" },
  payment_status: { table: "deals", column: "payment_status" },
} as const;

export type DropdownFieldKey = keyof typeof DROPDOWN_FIELDS;

export const DROPDOWN_FIELD_KEYS = Object.keys(DROPDOWN_FIELDS) as DropdownFieldKey[];

export const FIELD_LABELS: Record<DropdownFieldKey, string> = {
  creator_type: "Creator Type",
  niche: "Niche",
  priority: "Priority",
  interested_in_exclusive_mgmt: "Exclusive Mgmt Interest",
  contact_method: "Contact Method",
  current_status: "Current Status (Outreach)",
  outcome: "Outcome (Outreach)",
  contract_type: "Contract Type",
  contract_status: "Contract Status",
  exclusivity: "Exclusivity",
  campaign_status: "Campaign Status",
  invoice_status: "Invoice Status",
  payment_status: "Payment Status",
};

// Dashboard logic keys off canonical strings of these fields
// (Signed detection, pipeline buckets, donut chart order).
export const AUTOMATION_FIELDS: DropdownFieldKey[] = ["contract_status", "current_status", "campaign_status"];

export const DEFAULT_OPTIONS: Record<DropdownFieldKey, string[]> = {
  creator_type: ["Individual", "Agency", "MCN", "Brand", "Studio"],
  niche: [
    "Cosplay",
    "Fan Art / Illustration",
    "AMV Editing",
    "Anime Commentary / Review",
    "Voice Acting / Dubbing",
    "Anime News",
    "Figure Collecting",
    "Manga Content",
    "Gaming + Anime",
    "Anime Merch Reviews",
  ],
  priority: ["High", "Medium", "Low"],
  interested_in_exclusive_mgmt: ["Yes", "No", "Maybe"],
  contact_method: ["Email", "Instagram", "X (Twitter)", "WhatsApp", "Other"],
  current_status: ["No Response", "Awaiting Reply", "Interested", "Not Interested", "Negotiating", "Signed", "On Hold"],
  outcome: ["Pending", "Signed", "Rejected", "No Response"],
  contract_type: [
    "Exclusive Management",
    "Non-Exclusive Management",
    "Brand Deal Only",
    "Project-Based",
    "Ambassadorship",
  ],
  contract_status: ["Draft", "Active", "Renewed", "Expired", "Terminated"],
  exclusivity: ["Yes", "No"],
  campaign_status: ["Pitched", "Confirmed", "In Progress", "Completed", "Cancelled"],
  invoice_status: ["Not Sent", "Sent", "Overdue"],
  payment_status: ["Pending", "Partial", "Paid"],
};
