export type Creator = {
  id: string;
  creator_name: string;
  creator_type?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  x_twitter?: string | null;
  other_platforms?: string | null;
  email?: string | null;
  phone_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  niche?: string | null;
  followers_instagram?: number | null;
  followers_youtube?: number | null;
  engagement_rate?: number | null;
  primary_content_type?: string | null;
  languages?: string | null;
  interested_in_exclusive_mgmt?: "Yes" | "No" | "Maybe" | null;
  rate_card_received?: "Yes" | "No" | null;
  gst_available?: "Yes" | "No" | null;
  payment_details_received?: "Yes" | "No" | null;
  priority?: "High" | "Medium" | "Low" | null;
  assigned_manager?: string | null;
  notes?: string | null;
  owner_id?: string | null;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  industry?: string | null;
  notes?: string | null;
  owner_id?: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  creator_id: string | null;
  company_id: string | null;
  campaign: string | null;
  deal_value?: number | null;
  agency_commission?: number | null;
  campaign_status?: string | null;
  invoice_status?: string | null;
  payment_status?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  notes?: string | null;
  created_at: string;
};

export type Outreach = {
  id: string;
  creator_id: string | null;
  contact_method?: string | null;
  date_contacted?: string | null;
  next_follow_up_date?: string | null;
  follow_up_1?: string | null;
  follow_up_2?: string | null;
  follow_up_3?: string | null;
  current_status?: string | null;
  outcome?: string | null;
  notes?: string | null;
  created_at: string;
};

export type Contract = {
  id: string;
  creator_id: string | null;
  contract_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  exclusivity?: string | null;
  renewal_reminder?: string | null;
  contract_status?: string | null;
  notes?: string | null;
  created_at: string;
};

export type CreatorSummary = { id: string; creator_name: string };
export type CompanySummary = { id: string; name: string };
