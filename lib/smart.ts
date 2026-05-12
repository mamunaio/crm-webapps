// Rule-based "smart" intelligence — no external AI required.

export type LeadLike = {
  id: string;
  source: "referral" | "website" | "social_media" | "cold_outreach";
  status: "new" | "contacted" | "qualified" | "proposal_sent" | "converted";
  created_at?: string;
};

export type ActivityLike = {
  entity_id: string;
  entity_type: "lead" | "contact" | "deal";
  created_at: string;
  type?: string;
};

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / 86400000);

export function daysSince(iso?: string | null): number {
  if (!iso) return 999;
  return daysBetween(new Date(iso), new Date());
}

// ===== Lead scoring (0-100) =====
const SOURCE_SCORE = {
  referral: 30,
  website: 22,
  social_media: 14,
  cold_outreach: 6,
} as const;

const STAGE_SCORE = {
  new: 6,
  contacted: 14,
  qualified: 22,
  proposal_sent: 28,
  converted: 30,
} as const;

export function scoreLead(
  lead: LeadLike,
  activities: ActivityLike[],
): { score: number; tier: "hot" | "warm" | "cold"; reasons: string[] } {
  const reasons: string[] = [];
  const leadActs = activities.filter(
    (a) => a.entity_type === "lead" && a.entity_id === lead.id,
  );

  // Freshness — based on most recent activity, fallback to created_at
  const lastTouch = leadActs[0]?.created_at ?? lead.created_at ?? null;
  const days = daysSince(lastTouch);
  let freshness = 0;
  if (days <= 2) { freshness = 25; reasons.push("Contacted in last 2 days"); }
  else if (days <= 7) { freshness = 18; reasons.push("Contacted this week"); }
  else if (days <= 14) { freshness = 10; reasons.push("Contacted this fortnight"); }
  else if (days <= 30) { freshness = 4; reasons.push("Stale (>14 days)"); }
  else { freshness = 0; reasons.push("Cold (>30 days)"); }

  const sourceScore = SOURCE_SCORE[lead.source] ?? 10;
  reasons.push(`${lead.source.replace("_", " ")} source (+${sourceScore})`);

  const stageScore = STAGE_SCORE[lead.status] ?? 10;
  reasons.push(`Stage: ${lead.status.replace("_", " ")} (+${stageScore})`);

  const interactions = Math.min(leadActs.length, 5) * 3; // up to 15
  if (leadActs.length) reasons.push(`${leadActs.length} logged interactions`);

  const score = Math.min(100, freshness + sourceScore + stageScore + interactions);
  const tier: "hot" | "warm" | "cold" =
    score >= 65 ? "hot" : score >= 40 ? "warm" : "cold";

  return { score, tier, reasons };
}

// ===== Deal health =====
export type DealHealth = {
  status: "on_track" | "at_risk" | "stalled";
  label: string;
  daysInStage: number;
};

export function dealHealth(
  deal: { id: string; stage: string; created_at?: string },
  activities: ActivityLike[],
): DealHealth {
  // Most recent activity (any type) for this deal — best proxy for "last update"
  const dealActs = activities.filter(
    (a) => a.entity_type === "deal" && a.entity_id === deal.id,
  );
  const lastTouch = dealActs[0]?.created_at ?? deal.created_at;
  const days = daysSince(lastTouch);

  if (deal.stage === "won" || deal.stage === "lost") {
    return { status: "on_track", label: "Closed", daysInStage: days };
  }
  if (days >= 21) return { status: "stalled", label: "Stalled", daysInStage: days };
  if (days >= 14) return { status: "at_risk", label: "At Risk", daysInStage: days };
  return { status: "on_track", label: "On Track", daysInStage: days };
}

// ===== Follow-up suggestion =====
export function followUpSuggestion(
  lastContactIso: string | null | undefined,
  status?: string,
): { show: boolean; message: string; templateHint: string } | null {
  const days = daysSince(lastContactIso);
  if (days < 7) return null;

  const templateHint =
    status === "proposal_sent"
      ? "Proposal Follow-up"
      : status === "qualified"
      ? "Discovery Call Recap"
      : status === "contacted"
      ? "Gentle Check-in"
      : "Introduction & Value";

  return {
    show: true,
    message: `It's been ${days} days since last contact — consider sending a follow-up.`,
    templateHint,
  };
}

// ===== Invoice payment prediction =====
export type InvoiceLike = {
  id: string;
  client_name: string;
  status: "draft" | "sent" | "paid" | "overdue";
  due_date: string;
  issue_date: string;
};

export function predictPayment(
  invoice: InvoiceLike,
  history: InvoiceLike[],
): { label: string; tone: "good" | "warn" | "bad" | "neutral" } | null {
  if (invoice.status === "paid" || invoice.status === "draft") return null;

  const past = history.filter(
    (i) => i.client_name === invoice.client_name && i.id !== invoice.id,
  );
  const overdueCount = past.filter((i) => i.status === "overdue").length;
  const paidCount = past.filter((i) => i.status === "paid").length;
  const total = past.length;

  if (invoice.status === "overdue") {
    return { label: "Overdue", tone: "bad" };
  }

  if (total === 0) {
    return { label: "New client — no history", tone: "neutral" };
  }

  const overdueRate = overdueCount / total;
  if (overdueRate >= 0.4) return { label: "At risk of overdue", tone: "bad" };
  if (overdueRate >= 0.15) return { label: "May pay late", tone: "warn" };
  if (paidCount >= 1) return { label: "Likely to pay on time", tone: "good" };
  return { label: "On schedule", tone: "neutral" };
}

// ===== Company → industry / timezone lookup =====
type CompanyMeta = { industry: string; timezone: string };

const COMPANY_LOOKUP: Record<string, CompanyMeta> = {
  google: { industry: "Technology", timezone: "America/Los_Angeles" },
  microsoft: { industry: "Technology", timezone: "America/Los_Angeles" },
  apple: { industry: "Technology", timezone: "America/Los_Angeles" },
  amazon: { industry: "E-commerce", timezone: "America/Los_Angeles" },
  meta: { industry: "Social Media", timezone: "America/Los_Angeles" },
  facebook: { industry: "Social Media", timezone: "America/Los_Angeles" },
  netflix: { industry: "Media", timezone: "America/Los_Angeles" },
  uber: { industry: "Transportation", timezone: "America/Los_Angeles" },
  airbnb: { industry: "Hospitality", timezone: "America/Los_Angeles" },
  shopify: { industry: "E-commerce", timezone: "America/Toronto" },
  stripe: { industry: "FinTech", timezone: "America/Los_Angeles" },
  paypal: { industry: "FinTech", timezone: "America/Los_Angeles" },
  visa: { industry: "FinTech", timezone: "America/New_York" },
  goldman: { industry: "Finance", timezone: "America/New_York" },
  jpmorgan: { industry: "Finance", timezone: "America/New_York" },
  tesla: { industry: "Automotive", timezone: "America/Los_Angeles" },
  nike: { industry: "Apparel", timezone: "America/Los_Angeles" },
  adidas: { industry: "Apparel", timezone: "Europe/Berlin" },
  bengal: { industry: "Technology", timezone: "Asia/Dhaka" },
  daffodil: { industry: "Marketing", timezone: "Asia/Dhaka" },
  grameen: { industry: "Finance", timezone: "Asia/Dhaka" },
  brac: { industry: "Non-profit", timezone: "Asia/Dhaka" },
  pathao: { industry: "Transportation", timezone: "Asia/Dhaka" },
};

const KEYWORD_RULES: { keywords: string[]; meta: CompanyMeta }[] = [
  { keywords: ["tech", "soft", "labs", "digital", "ai", "data"], meta: { industry: "Technology", timezone: "America/New_York" } },
  { keywords: ["studio", "design", "creative", "media"], meta: { industry: "Creative / Media", timezone: "America/New_York" } },
  { keywords: ["market", "agency", "ads"], meta: { industry: "Marketing", timezone: "America/New_York" } },
  { keywords: ["consult", "advisor", "partners"], meta: { industry: "Consulting", timezone: "America/New_York" } },
  { keywords: ["bank", "capital", "finance", "invest"], meta: { industry: "Finance", timezone: "America/New_York" } },
  { keywords: ["health", "med", "pharma", "clinic"], meta: { industry: "Healthcare", timezone: "America/New_York" } },
  { keywords: ["food", "restaurant", "cafe", "kitchen"], meta: { industry: "Food & Beverage", timezone: "America/New_York" } },
  { keywords: ["build", "construct", "architect"], meta: { industry: "Construction", timezone: "America/New_York" } },
  { keywords: ["edu", "school", "academy", "learning"], meta: { industry: "Education", timezone: "America/New_York" } },
  { keywords: ["shop", "store", "retail", "boutique", "apparel"], meta: { industry: "Retail", timezone: "America/New_York" } },
  { keywords: ["logistic", "shipping", "freight"], meta: { industry: "Logistics", timezone: "America/New_York" } },
  { keywords: ["bd", "bangla", "dhaka", "chittagong"], meta: { industry: "General", timezone: "Asia/Dhaka" } },
];

export function lookupCompany(name: string): CompanyMeta | null {
  if (!name || name.length < 2) return null;
  const lower = name.toLowerCase();
  for (const key of Object.keys(COMPANY_LOOKUP)) {
    if (lower.includes(key)) return COMPANY_LOOKUP[key];
  }
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.meta;
  }
  return null;
}
