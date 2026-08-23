"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { listCustomFilters } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomFilter } from "@/lib/custom-filters";
import { parseFilterIds } from "@/lib/filter-url";

export function useActiveFilterIds(): string[] {
  const searchParams = useSearchParams();
  return parseFilterIds(searchParams.get("filters"));
}

function applySelection(ids: string[], pathname: string, queryString: string, replace: ReturnType<typeof useRouter>["replace"]) {
  const params = new URLSearchParams(queryString);
  if (ids.length > 0) params.set("filters", ids.join(","));
  else params.delete("filters");
  const qs = params.toString();
  replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

function FilterRow({
  filter,
  checked,
  onToggle,
}: {
  filter: CustomFilter;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onSelect={(e) => e.preventDefault()}
      onCheckedChange={() => onToggle(filter.id, !checked)}
    >
      <span className="truncate">{filter.name}</span>
    </DropdownMenuCheckboxItem>
  );
}

export function CustomFilterPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useActiveFilterIds();
  const [filters, setFilters] = useState<CustomFilter[]>([]);

  useEffect(() => {
    listCustomFilters()
      .then(setFilters)
      .catch(() => setFilters([]));
  }, []);

  function toggle(id: string, checked: boolean) {
    applySelection(
      checked ? [...active, id] : active.filter((x) => x !== id),
      pathname,
      searchParams.toString(),
      router.replace
    );
  }

  function clearAll() {
    applySelection([], pathname, searchParams.toString(), router.replace);
  }

  const workspace = filters.filter((f) => f.visibility === "org");
  const mine = filters.filter((f) => f.visibility === "personal");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="glass shrink-0">
          <ListFilter className="size-4" />
          Filters
          {active.length > 0 && <Badge className="ml-1 h-5 min-w-5 px-1 tabular-nums">{active.length}</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong max-h-80 w-64 overflow-y-auto">
        {filters.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No custom filters yet. Create one under Settings → Custom Filters.
          </p>
        )}
        {workspace.length > 0 && <DropdownMenuLabel>Workspace</DropdownMenuLabel>}
        {workspace.map((f) => (
          <FilterRow key={f.id} filter={f} checked={active.includes(f.id)} onToggle={toggle} />
        ))}
        {workspace.length > 0 && mine.length > 0 && <DropdownMenuSeparator />}
        {mine.length > 0 && <DropdownMenuLabel>My filters</DropdownMenuLabel>}
        {mine.map((f) => (
          <FilterRow key={f.id} filter={f} checked={active.includes(f.id)} onToggle={toggle} />
        ))}
        {active.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={clearAll}>Clear all</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
