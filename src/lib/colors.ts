export const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-foreground/10 text-foreground",
  Medium: "bg-muted text-muted-foreground",
  Low: "bg-border/60 text-muted-foreground",
};

export const MGMT_COLORS: Record<string, string> = {
  Signed: "bg-foreground/10 text-foreground",
  Negotiating: "bg-foreground/15 text-foreground",
  Prospect: "bg-muted text-muted-foreground",
};

export const OUTREACH_STATUS_COLORS: Record<string, string> = {
  Negotiating: "bg-foreground/10 text-foreground",
  Interested: "bg-foreground/10 text-foreground",
  Signed: "bg-foreground/10 text-foreground",
  "Awaiting Reply": "bg-foreground/15 text-foreground",
  "On Hold": "bg-foreground/15 text-foreground",
  "Meeting Scheduled": "bg-foreground/15 text-foreground",
  "Not Interested": "bg-muted text-muted-foreground line-through",
  "No Response": "bg-muted text-muted-foreground",
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  Active: "bg-foreground/10 text-foreground",
  Draft: "bg-muted text-muted-foreground",
  Renewed: "bg-foreground/10 text-foreground",
  Expired: "bg-muted text-muted-foreground",
  Terminated: "bg-border/60 text-muted-foreground line-through",
};

export const DEAL_STATUS_COLORS: Record<string, string> = {
  Pitched: "bg-muted text-muted-foreground",
  "In Progress": "bg-foreground/10 text-foreground",
  Confirmed: "bg-foreground/10 text-foreground",
  Completed: "bg-muted text-muted-foreground",
  Cancelled: "bg-border/60 text-muted-foreground line-through",
};
