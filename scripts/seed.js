/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
const { Clerk } = require("@clerk/backend");
const fs = require("fs");
const path = require("path");

try { require("dotenv").config(); } catch { /* ignore */ }

function loadEnvFile(file) {
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) return;
  const content = fs.readFileSync(abs, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running seed.");
  process.exit(1);
}

const reset = process.argv.includes("--reset") || process.argv.includes("--force");
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const supabase = createClient(url, serviceKey);

async function clearData() {
  for (const table of ["outreach", "contracts", "deals"]) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }
  for (const table of ["companies", "creators"]) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }
  console.log("Cleared existing data.");
}

async function seed() {
  console.log("Seeding dev data...");

  if (reset) await clearData();
  else {
    const { count, error: countError } = await supabase.from("creators").select("id", { count: "exact", head: true });
    if (countError) throw new Error("creators count: " + countError.message);
    if (count > 0) {
      console.log("creators already has data; skipping seed. Use --reset to reseed.");
      return;
    }
  }

  const creators = [
    { creator_name: "Aiko Tanaka", creator_username: "aiko.tanaka", instagram: "aiko.tanaka", email: "aiko@example.com", city: "Tokyo", country: "Japan", niche: "Cosplay", followers_instagram: 12000, engagement_rate: 4.2, primary_content_type: "Cosplay", languages: "Japanese, English", priority: "High", interested_in_exclusive_mgmt: "Yes", gst_available: "Yes", rate_card_received: "Yes", payment_details_received: "No" },
    { creator_name: "Yuki Sato", creator_username: "yuki.sato", instagram: "yuki.sato", email: "yuki@example.com", city: "Osaka", country: "Japan", niche: "Fan Art / Illustration", followers_instagram: 54000, engagement_rate: 3.1, primary_content_type: "Illustration", languages: "Japanese", priority: "High", interested_in_exclusive_mgmt: "Yes", gst_available: "No", rate_card_received: "Yes", payment_details_received: "Yes" },
    { creator_name: "Kenji Watanabe", creator_username: "kenji.watanabe", instagram: "kenji.watanabe", email: "kenji@example.com", city: "Nagoya", country: "Japan", niche: "AMV Editing", followers_instagram: 8000, engagement_rate: 5.5, primary_content_type: "Video", languages: "Japanese, English", priority: "Medium", interested_in_exclusive_mgmt: "No", gst_available: "No", rate_card_received: "No", payment_details_received: "No" },
    { creator_name: "Rina Kobayashi", creator_username: "rina.kobayashi", instagram: "rina.kobayashi", email: "rina@example.com", city: "Sapporo", country: "Japan", niche: "Anime Commentary / Review", followers_instagram: 210000, engagement_rate: 2.4, primary_content_type: "Video", languages: "Japanese, English", priority: "High", interested_in_exclusive_mgmt: "Maybe", gst_available: "Yes", rate_card_received: "Yes", payment_details_received: "Yes" },
    { creator_name: "Daiki Mori", creator_username: "daiki.mori", instagram: "daiki.mori", email: "daiki@example.com", city: "Fukuoka", country: "Japan", niche: "Figure Collecting", followers_instagram: 32000, engagement_rate: 3.8, primary_content_type: "Photos", languages: "Japanese", priority: "Medium", interested_in_exclusive_mgmt: "Yes", gst_available: "No", rate_card_received: "Yes", payment_details_received: "No" },
    { creator_name: "Sora Ito", creator_username: "sora.ito", instagram: "sora.ito", email: "sora@example.com", city: "Kyoto", country: "Japan", niche: "Gaming + Anime", followers_instagram: 6000, engagement_rate: 6.2, primary_content_type: "Stream", languages: "Japanese, English", priority: "Low", interested_in_exclusive_mgmt: "No", gst_available: "No", rate_card_received: "No", payment_details_received: "No" },
  ];
  const { data: creatorRows, error: creatorsError } = await supabase.from("creators").insert(creators).select("id, creator_name");
  if (creatorsError) throw new Error("creators insert: " + creatorsError.message);
  const byName = Object.fromEntries(creatorRows.map((c) => [c.creator_name, c.id]));

  const companies = [
    { name: "CrunchyMerch Co.", domain: "crunchymerch.com", industry: "Merch/Apparel" },
    { name: "AniPlay Studios", domain: "aniplay.studio", industry: "Gaming" },
  ];
  const { data: companyRows, error: companyError } = await supabase.from("companies").insert(companies).select("id, name");
  if (companyError) throw new Error("companies insert: " + companyError.message);
  const companyByName = Object.fromEntries(companyRows.map((c) => [c.name, c.id]));

  const id = (name) => byName[name];
  const coId = (name) => companyByName[name];

  const deals = [
    { creator_id: id("Yuki Sato"), company_id: coId("CrunchyMerch Co."), campaign: "Summer Cosplay Capsule Launch", deal_value: 150000, agency_commission: 30000, campaign_status: "In Progress", invoice_status: "Sent", payment_status: "Pending", due_date: daysFromNow(14) },
    { creator_id: id("Rina Kobayashi"), company_id: coId("AniPlay Studios"), campaign: "AnimeCon Mainstage Appearance", deal_value: 450000, agency_commission: 90000, campaign_status: "Confirmed", invoice_status: "Sent", payment_status: "Pending", due_date: daysFromNow(30) },
    { creator_id: id("Aiko Tanaka"), company_id: coId("CrunchyMerch Co."), campaign: "Festival Merch Collab", deal_value: 80000, agency_commission: 16000, campaign_status: "Completed", invoice_status: "Sent", payment_status: "Paid", completion_date: daysFromNow(-10) },
    { creator_id: id("Daiki Mori"), company_id: coId("AniPlay Studios"), campaign: "Cosplay Workshop Series", deal_value: 95000, agency_commission: 19000, campaign_status: "Pitched", invoice_status: "Overdue", payment_status: "Pending", due_date: daysFromNow(-3) },
    { creator_id: id("Sora Ito"), company_id: coId("CrunchyMerch Co."), campaign: "Small Creator Capsule", deal_value: 45000, agency_commission: 9000, campaign_status: "Cancelled", invoice_status: "Not Sent", payment_status: "Pending" },
  ];
  const { error: dealsError } = await supabase.from("deals").insert(deals);
  if (dealsError) throw new Error("deals insert: " + dealsError.message);

  const outreach = [
    { creator_id: id("Aiko Tanaka"), contact_method: "Email", date_contacted: daysFromNow(-21), current_status: "Negotiating", outcome: "Pending", next_follow_up_date: daysFromNow(7) },
    { creator_id: id("Rina Kobayashi"), contact_method: "Instagram", date_contacted: daysFromNow(-14), current_status: "Interested", outcome: "Pending", next_follow_up_date: daysFromNow(5) },
    { creator_id: id("Kenji Watanabe"), contact_method: "WhatsApp", date_contacted: daysFromNow(-30), current_status: "Not Interested", outcome: "Rejected" },
    { creator_id: id("Sora Ito"), contact_method: "Other", date_contacted: daysFromNow(-7), current_status: "No Response", outcome: "No Response" },
    { creator_id: id("Daiki Mori"), contact_method: "X (Twitter)", date_contacted: daysFromNow(-3), current_status: "Awaiting Reply", outcome: "Pending" },
  ];
  const { error: outreachError } = await supabase.from("outreach").insert(outreach);
  if (outreachError) throw new Error("outreach insert: " + outreachError.message);

  const contracts = [
    { creator_id: id("Yuki Sato"), contract_type: "Exclusive Management", contract_status: "Active", start_date: daysFromNow(-90), exclusivity: "Yes" },
    { creator_id: id("Rina Kobayashi"), contract_type: "Exclusive Management", contract_status: "Draft", start_date: daysFromNow(30), exclusivity: "Yes" },
    { creator_id: id("Kenji Watanabe"), contract_type: "Brand Deal Only", contract_status: "Expired", start_date: daysFromNow(-365), end_date: daysFromNow(-10), exclusivity: "No" },
  ];
  const { error: contractsError } = await supabase.from("contracts").insert(contracts);
  if (contractsError) throw new Error("contracts insert: " + contractsError.message);

  console.log("Seeding complete.");
}

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerk = clerkSecretKey ? new Clerk({ secretKey: clerkSecretKey }) : null;

async function seedUserRoles() {
  if (!clerk) {
    console.log("CLERK_SECRET_KEY not set, skipping user role seeding.");
    return;
  }
  
  console.log("Seeding user roles...");
  
  try {
    const users = await clerk.users.getUserList();
    
    for (const user of users.data) {
      const currentRole = user.publicMetadata?.role;
      if (!currentRole) {
        const role = users.data.indexOf(user) === 0 ? "admin" : "member";
        await clerk.users.updateUser(user.id, {
          publicMetadata: { role }
        });
        console.log(`Set ${user.emailAddresses[0]?.emailAddress} to ${role}`);
      }
    }
    
    console.log("User roles seeded.");
  } catch (err) {
    console.error("Failed to seed user roles:", err.message);
  }
}

seed().then(() => seedUserRoles()).catch((err) => { console.error(err); process.exit(1); });
