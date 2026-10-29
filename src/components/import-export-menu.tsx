"use client";

import React from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { importCreators } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadCreatorImportTemplate,
  exportCreatorsToCsv,
  exportCreatorsToExcel,
  parseCreatorSpreadsheet,
  type CreatorImportPreview,
  type CreatorSpreadsheetRow,
} from "@/lib/creator-spreadsheet";

type ImportExportMenuProps = {
  rows: CreatorSpreadsheetRow[];
  canImport?: boolean;
  onImported?: () => void | Promise<void>;
  fileName?: string;
};

export function ImportExportMenu({
  rows,
  canImport = false,
  onImported,
  fileName = "creators",
}: ImportExportMenuProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"csv" | "excel" | "import" | null>(null);
  const [preview, setPreview] = React.useState<CreatorImportPreview | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fileStamp = new Date().toISOString().slice(0, 10);

  async function handleExport(format: "csv" | "excel") {
    if (rows.length === 0) {
      toast.error("There are no rows to export");
      return;
    }
    setBusy(format);
    try {
      const name = `${fileName}-${fileStamp}.${format === "csv" ? "csv" : "xlsx"}`;
      if (format === "csv") exportCreatorsToCsv(rows, name);
      else await exportCreatorsToExcel(rows, name);
      toast.success(`Exported ${rows.length} creator${rows.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the file");
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(file: File) {
    setBusy("import");
    try {
      const result = await parseCreatorSpreadsheet(file);
      setPreview(result);
      if (result.creators.length === 0) {
        toast.error("No valid creator rows were found in that file");
      }
    } catch (err) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!preview || preview.creators.length === 0) return;
    setBusy("import");
    try {
      const count = await importCreators(preview.creators);
      toast.success(`Imported ${count} creator${count === 1 ? "" : "s"}`);
      setDialogOpen(false);
      setPreview(null);
      await onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import the file");
    } finally {
      setBusy(null);
    }
  }

  function downloadTemplate() {
    downloadCreatorImportTemplate();
  }

  return (
    <div className="flex items-center gap-2">
      {canImport && (
        <Button
          variant="outline"
          className="glass"
          onClick={() => {
            setPreview(null);
            setDialogOpen(true);
          }}
        >
          <Upload className="size-4" /> Import
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="glass" disabled={rows.length === 0 || busy === "csv" || busy === "excel"}>
            {busy === "csv" || busy === "excel" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong">
          <DropdownMenuItem onClick={() => handleExport("csv")} disabled={busy !== null}>
            <FileText className="size-4" /> Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("excel")} disabled={busy !== null}>
            <FileSpreadsheet className="size-4" /> Export as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="glass-strong sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import creators</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file. The first row must contain column headers such as{" "}
              <span className="font-medium text-foreground">Creator Name</span> and{" "}
              <span className="font-medium text-foreground">Email</span>.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {!preview && (
            <div className="grid gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy === "import"}
                className="grid place-items-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "import" ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="size-8 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {busy === "import" ? "Reading file…" : "Choose a CSV or Excel file"}
                </span>
                <span className="text-xs text-muted-foreground">.csv, .xlsx or .xls · up to your browser&apos;s file limit</span>
              </button>
              <Button type="button" variant="link" className="mx-auto h-auto p-0 text-xs" onClick={downloadTemplate}>
                Download import template
              </Button>
            </div>
          )}

          {preview && (
            <div className="grid gap-4">
              <div className="glass rounded-lg border border-border/40 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{preview.fileName}</p>
                  <p className="text-xs text-muted-foreground">Sheet: {preview.sheetName}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{preview.creators.length}</p>
                    <p className="text-xs text-muted-foreground">Ready to import</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{preview.matchedHeaders.length}</p>
                    <p className="text-xs text-muted-foreground">Columns matched</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{preview.errors.length}</p>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{preview.skippedEmpty}</p>
                    <p className="text-xs text-muted-foreground">Blank rows skipped</p>
                  </div>
                </div>
              </div>

              {preview.unknownHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ignored columns: {preview.unknownHeaders.join(", ")}
                </p>
              )}

              {preview.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {preview.errors.slice(0, 20).map((error, index) => (
                    <p key={`${index}-${error}`}>{error}</p>
                  ))}
                  {preview.errors.length > 20 && (
                    <p className="mt-1 font-medium">and {preview.errors.length - 20} more…</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                  Choose another file
                </Button>
                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={downloadTemplate}>
                  Download template
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!preview || preview.creators.length === 0 || busy === "import"}
            >
              {busy === "import" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Importing…
                </>
              ) : (
                `Import ${preview?.creators.length ?? 0} creator${preview?.creators.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
