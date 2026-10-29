"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { listWorkspaces, setActiveWorkspace, type WorkspaceInfo } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    listWorkspaces().then((items) => {
      if (!mounted) return;
      setWorkspaces(items);
      setActiveId(items[0]?.id ?? null);
    }).catch(() => {
      if (mounted) setWorkspaces([]);
    });
    return () => { mounted = false; };
  }, []);

  const active = workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0];
  if (!active && !pending) return null;

  function choose(workspace: WorkspaceInfo) {
    if (workspace.id === active?.id) return;
    setActiveId(workspace.id);
    startTransition(async () => {
      try {
        await setActiveWorkspace(workspace.id);
        router.refresh();
      } catch {
        setActiveId(active?.id ?? null);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2">
          <span className="min-w-0 truncate text-left">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</span>
            <span className="block truncate">{active?.name ?? "Loading..."}</span>
          </span>
          {pending ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <ChevronsUpDown className="size-4 shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onSelect={() => choose(workspace)}>
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {workspace.id === active?.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}