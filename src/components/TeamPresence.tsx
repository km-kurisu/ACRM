"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { listTeamPresence, type TeamPresence } from "@/actions";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-yellow-500",
  offline: "bg-gray-400",
  invisible: "bg-purple-500",
};

export function TeamPresence() {
  const [members, setMembers] = useState<TeamPresence[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      listTeamPresence().then((items) => {
        if (active) {
          setMembers(items);
          setLoaded(true);
        }
      }).catch((error) => {
        console.error("Failed to load team members:", error);
        if (active) setLoaded(true);
      });
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!loaded) return null;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Team</p>
      <div className="flex flex-wrap gap-2" aria-label="Team members">
        {members.map((member) => (
          <div key={member.id} className="group relative" title={`${member.name} (${member.status})`}>
            {member.imageUrl ? (
              <Image src={member.imageUrl} alt={member.name} width={32} height={32} className="size-8 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <span
                className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-border"
                aria-label={member.name}
              >
                {member.initials}
              </span>
            )}
            <span
              className={cn(
                "absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background",
                statusColor[member.status] ?? statusColor.offline
              )}
              aria-label={`${member.status} status`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
