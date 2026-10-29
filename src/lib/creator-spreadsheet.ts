import type { Creator } from "@/lib/types";

export type CreatorSpreadsheetRow = Creator & {
  total_reach?: number | null;
  management_status?: string | null;
  date_first_contacted?: string | null;
  next_follow_up_date?: string | null;
  outreach_outcome?: string | null;
  contract_status?: string | null;
};

export type CreatorColumnType = "text" | "number" | "yesno" | "exclusive" | "date";

export type CreatorColumn = {
  key: keyof CreatorSpreadsheetRow & string;
  label: string;
  aliases?: string[];
  type: CreatorColumnType;
  importable?: boolean;
  required?: boolean;
};

export const CREATOR_COLUMNS: CreatorColumn[] = [
  {
    key: "creator_name",
    label: "Creator Name",
    aliases: ["name", "creator"],
    type: "text",
    importable: true,
    required: true,
  },
  {
    key: "creator_type",
    label: "Type",
    aliases: ["creator type"],
    type: "text",
    importable: true,
  },
  {
    key: "instagram",
    label: "Instagram",
    aliases: ["instagram handle", "instagram url", "ig"],
    type: "text",
    importable: true,
  },
  {
    key: "youtube",
    label: "YouTube",
    aliases: ["youtube handle", "youtube url", "youtube channel", "yt"],
    type: "text",
    importable: true,
  },
  {
    key: "x_twitter",
    label: "X (Twitter)",
    aliases: ["x", "twitter", "x twitter", "twitter handle"],
    type: "text",
    importable: true,
  },
  {
    key: "other_platforms",
    label: "Other Platforms",
    aliases: ["other platform", "other"],
    type: "text",
    importable: true,
  },
  {
    key: "email",
    label: "Email",
    aliases: ["email address"],
    type: "text",
    importable: true,
  },
  {
    key: "phone_number",
    label: "Phone",
    aliases: ["phone number", "phone", "mobile"],
    type: "text",
    importable: true,
  },
  { key: "city", label: "City", type: "text", importable: true },
  { key: "state", label: "State", type: "text", importable: true },
  { key: "country", label: "Country", type: "text", importable: true },
  { key: "niche", label: "Niche", type: "text", importable: true },
  {
    key: "followers_instagram",
    label: "Followers (IG)",
    aliases: ["followers instagram", "instagram followers", "ig followers"],
    type: "number",
    importable: true,
  },
  {
    key: "followers_youtube",
    label: "Followers (YT)",
    aliases: ["followers youtube", "youtube followers", "yt followers", "youtube subscribers", "subscribers"],
    type: "number",
    importable: true,
  },
  { key: "total_reach", label: "Total Reach", type: "number" },
  {
    key: "engagement_rate",
    label: "Engagement",
    aliases: ["engagement rate", "engagement rate %", "engagement %"],
    type: "number",
    importable: true,
  },
  {
    key: "primary_content_type",
    label: "Content Type",
    aliases: ["primary content type", "content type"],
    type: "text",
    importable: true,
  },
  { key: "languages", label: "Languages", type: "text", importable: true },
  { key: "management_status", label: "Mgmt Status", aliases: ["management status"], type: "text" },
  {
    key: "interested_in_exclusive_mgmt",
    label: "Exclusive?",
    aliases: ["exclusive mgmt interest", "interested in exclusive mgmt", "exclusive mgmt", "exclusive"],
    type: "exclusive",
    importable: true,
  },
  { key: "date_first_contacted", label: "First Contacted", aliases: ["date first contacted"], type: "date" },
  { key: "next_follow_up_date", label: "Next Follow-up", aliases: ["next follow up", "follow up date"], type: "date" },
  { key: "outreach_outcome", label: "Outreach Outcome", aliases: ["outcome"], type: "text" },
  { key: "contract_status", label: "Contract Status", type: "text" },
  {
    key: "rate_card_received",
    label: "Rate Card",
    aliases: ["rate card received"],
    type: "yesno",
    importable: true,
  },
  { key: "gst_available", label: "GST", aliases: ["gst available"], type: "yesno", importable: true },
  {
    key: "payment_details_received",
    label: "Payment",
    aliases: ["payment details received", "payment details"],
    type: "yesno",
    importable: true,
  },
  { key: "priority", label: "Priority", type: "text", importable: true },
  {
    key: "assigned_manager",
    label: "Manager",
    aliases: ["assigned manager"],
    type: "text",
    importable: true,
  },
  { key: "notes", label: "Notes", type: "text", importable: true },
  { key: "created_at", label: "Created At", aliases: ["created"], type: "date" },
];

const IMPORTABLE_COLUMNS = CREATOR_COLUMNS.filter((column) => column.importable);

export type CreatorImportPreview = {
  fileName: string;
  sheetName: string;
  creators: Partial<Creator>[];
  errors: string[];
  skippedEmpty: number;
  unknownHeaders: string[];
  matchedHeaders: string[];
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

function buildImportAliasMap(): Map<string, CreatorColumn> {
  const map = new Map<string, CreatorColumn>();
  for (const column of CREATOR_COLUMNS) {
    for (const name of [column.key, column.label, ...(column.aliases ?? [])]) {
      map.set(normalizeHeader(name), column);
    }
  }
  return map;
}

function rawToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return typeof value === "string" && value.trim() === "";
}

const NUMBER_SUFFIXES = { k: 1_000, m: 1_000_000, b: 1_000_000_000 } as const;

function parseNumber(value: unknown): { value: number | null; error?: string } {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value } : { value: null, error: "is not a valid number" };
  }

  const raw = rawToString(value).replace(/,/g, "").replace(/%/g, "").trim();
  if (!raw) return { value: null };

  const suffixed = raw.match(/^(-?\d*\.?\d+)\s*([kmb])$/i);
  const numeric = suffixed
    ? Number(suffixed[1]) * NUMBER_SUFFIXES[suffixed[2].toLowerCase() as keyof typeof NUMBER_SUFFIXES]
    : Number(raw);

  if (!Number.isFinite(numeric)) return { value: null, error: `"${rawToString(value)}" is not a valid number` };
  return { value: numeric };
}

function parseYesNo(value: unknown): { value: "Yes" | "No" | null; error?: string } {
  const raw = rawToString(value).toLowerCase();
  if (!raw) return { value: null };
  if (["yes", "y", "true", "1", "received"].includes(raw)) return { value: "Yes" };
  if (["no", "n", "false", "0", "not received", "pending"].includes(raw)) return { value: "No" };
  return { value: null, error: `"${rawToString(value)}" is not Yes/No` };
}

function parseExclusive(value: unknown): { value: "Yes" | "No" | "Maybe" | null; error?: string } {
  const raw = rawToString(value).toLowerCase();
  if (!raw) return { value: null };
  if (["yes", "y", "true", "1"].includes(raw)) return { value: "Yes" };
  if (["no", "n", "false", "0"].includes(raw)) return { value: "No" };
  if (["maybe", "m", "perhaps"].includes(raw)) return { value: "Maybe" };
  return { value: null, error: `"${rawToString(value)}" is not Yes/No/Maybe` };
}

export async function parseCreatorSpreadsheet(file: File): Promise<CreatorImportPreview> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    throw new Error("Choose a .csv, .xlsx or .xls file");
  }

  const XLSX = await import("@e965/xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("This workbook has no sheets");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });
  if (matrix.length === 0) throw new Error("This file is empty");

  const headerRow = (matrix[0] ?? []).map((header) => rawToString(header));
  if (headerRow.every((header) => !header)) {
    throw new Error("The first row must contain column headers");
  }

  const aliasMap = buildImportAliasMap();
  const headerToColumn = new Map<number, CreatorColumn>();
  const unknownHeaders: string[] = [];
  const matchedHeaders = new Set<string>();

  headerRow.forEach((header, index) => {
    if (!header) return;
    const column = aliasMap.get(normalizeHeader(header));
    if (column) {
      headerToColumn.set(index, column);
      if (column.importable) matchedHeaders.add(column.label);
    } else {
      unknownHeaders.push(header);
    }
  });

  if (matchedHeaders.size === 0) {
    throw new Error('No creator columns were recognised. Include a "Creator Name" column (or download the template).');
  }

  const creators: Partial<Creator>[] = [];
  const errors: string[] = [];
  let skippedEmpty = 0;

  for (let index = 1; index < matrix.length; index += 1) {
    const rawRow = matrix[index] ?? [];
    const rowNumber = index + 1;
    const values = new Map<CreatorColumn, unknown>();
    let hasValue = false;

    for (const [columnIndex, column] of headerToColumn) {
      const value = rawRow[columnIndex];
      if (!isBlank(value)) hasValue = true;
      values.set(column, value);
    }

    if (!hasValue) {
      skippedEmpty += 1;
      continue;
    }

    const payload: Record<string, unknown> = {};
    let valid = true;

    for (const column of IMPORTABLE_COLUMNS) {
      const raw = values.get(column);
      if (isBlank(raw)) {
        if (column.required) {
          errors.push(`Row ${rowNumber}: ${column.label} is required`);
          valid = false;
        }
        continue;
      }

      if (column.type === "number") {
        const parsed = parseNumber(raw);
        if (parsed.error) errors.push(`Row ${rowNumber}: ${column.label} ${parsed.error}`);
        payload[column.key] = parsed.value ?? 0;
      } else if (column.type === "yesno") {
        const parsed = parseYesNo(raw);
        if (parsed.error) errors.push(`Row ${rowNumber}: ${column.label} ${parsed.error}`);
        payload[column.key] = parsed.value;
      } else if (column.type === "exclusive") {
        const parsed = parseExclusive(raw);
        if (parsed.error) errors.push(`Row ${rowNumber}: ${column.label} ${parsed.error}`);
        payload[column.key] = parsed.value;
      } else {
        payload[column.key] = rawToString(raw) || null;
      }
    }

    if (!valid) continue;

    payload.followers_instagram ??= 0;
    payload.followers_youtube ??= 0;
    payload.engagement_rate ??= 0;
    creators.push(payload as Partial<Creator>);
  }

  return {
    fileName: file.name,
    sheetName,
    creators,
    errors,
    skippedEmpty,
    unknownHeaders,
    matchedHeaders: [...matchedHeaders],
  };
}

function formatExportValue(value: unknown, column: CreatorColumn): unknown {
  if (value == null || value === "") return "";
  if (column.type === "date") return String(value).slice(0, 10);
  return value;
}

function buildExportMatrix(rows: CreatorSpreadsheetRow[]): unknown[][] {
  const headers = CREATOR_COLUMNS.map((column) => column.label);
  const data = rows.map((row) => CREATOR_COLUMNS.map((column) => formatExportValue(row[column.key], column)));
  return [headers, ...data];
}

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function buildCreatorCsv(rows: CreatorSpreadsheetRow[]): string {
  return buildExportMatrix(rows)
    .map((matrixRow) => matrixRow.map(escapeCsv).join(","))
    .join("\r\n");
}

export function exportCreatorsToCsv(rows: CreatorSpreadsheetRow[], fileName: string) {
  const csv = buildCreatorCsv(rows);
  downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }), fileName);
}

export function downloadCreatorImportTemplate() {
  const csv = IMPORTABLE_COLUMNS.map((column) => escapeCsv(column.label)).join(",");
  downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }), "creator-import-template.csv");
}

export async function exportCreatorsToExcel(rows: CreatorSpreadsheetRow[], fileName: string) {
  const XLSX = await import("@e965/xlsx");
  const matrix = buildExportMatrix(rows);
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  sheet["!cols"] = CREATOR_COLUMNS.map((column) => ({
    wch: Math.min(50, Math.max(12, column.label.length + 2)),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Creators");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
}
