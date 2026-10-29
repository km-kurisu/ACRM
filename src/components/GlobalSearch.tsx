"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Handshake,
  Loader2,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import {
  globalSearch,
  type GlobalSearchItem,
  type GlobalSearchResponse,
  type GlobalSearchResultType,
} from "@/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ICONS: Record<GlobalSearchResultType, React.ComponentType<{ className?: string }>> = {
  creator: Users,
  company: Building2,
  deal: Handshake,
  contract: FileText,
  outreach: Megaphone,
};

const EMPTY: GlobalSearchResponse = { query: "", groups: [], total: 0 };

export function GlobalSearch({
  variant = "sidebar",
  keyboardShortcut = false,
}: {
  variant?: "sidebar" | "icon";
  keyboardShortcut?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GlobalSearchResponse>(EMPTY);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const requestId = useRef(0);

  const items = data.groups.flatMap((group) => group.items);

  useEffect(() => {
    if (!keyboardShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        setData(EMPTY);
        setSelectedIndex(0);
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardShortcut]);

  useEffect(() => {
    if (!open) return;
    const currentRequest = ++requestId.current;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const result = await globalSearch(trimmed);
        if (currentRequest !== requestId.current) return;
        setData(result);
        setSelectedIndex(0);
      } catch {
        if (currentRequest !== requestId.current) return;
        setData(EMPTY);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  function openSearch() {
    setQuery("");
    setData(EMPTY);
    setSelectedIndex(0);
    setOpen(true);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setData(EMPTY);
      setSelectedIndex(0);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function choose(item: GlobalSearchItem) {
    setOpen(false);
    setQuery("");
    setData(EMPTY);
    router.push(item.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (items.length > 0) setSelectedIndex((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length > 0) {
        setSelectedIndex((current) => (current - 1 + items.length) % items.length);
      }
    } else if (event.key === "Enter" && items[selectedIndex]) {
      event.preventDefault();
      choose(items[selectedIndex]);
    }
  }

  let flatIndex = 0;

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" aria-label="Search" onClick={openSearch}>
          <Search className="size-5" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setData(EMPTY);
          }
        }}
      >
        <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <DialogDescription className="sr-only">
            Search creators, companies, deals, contracts, and outreach.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search creators, companies, deals..."
              className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
            {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : !loading && items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for “{query.trim()}”.
              </p>
            ) : (
              data.groups.map((group) => (
                <div key={group.type} className="mb-2 last:mb-0">
                  <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const index = flatIndex++;
                      const Icon = ICONS[item.type];
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => choose(item)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                            index === selectedIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/60"
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            {item.subtitle && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ to navigate · ↵ to open · esc to close</span>
            <span>{data.total} result{data.total === 1 ? "" : "s"}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
