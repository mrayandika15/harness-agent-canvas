"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SidebarHeader() {
  return (
    <div className="px-3 py-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-10 shrink-0 rounded-full border-white/8 bg-white/[0.03] px-3 text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
          Add Agent
        </Button>
      </div>
    </div>
  );
}
