"use client";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brandMark, sidebarItems } from "@/features/dashboard/lib/dashboard-data";
import { useCanvasStore } from "@/stores/canvas-store";

const BrandIcon = brandMark;

export function SidebarNav() {
  const { appView, isAgentPanelCollapsed, toggleAgentPanel, setAppView } =
    useCanvasStore();

  return (
    <aside className="border-b border-white/6 bg-[rgba(8,8,8,0.78)] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-row items-center gap-2 px-3 py-3 lg:flex-col lg:items-center lg:px-2 lg:py-4">
        <div className="mb-1 hidden h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(217,134,75,0.22)] bg-[linear-gradient(180deg,rgba(54,29,15,0.68),rgba(27,15,8,0.4))] shadow-[0_0_18px_rgba(217,134,75,0.08)] lg:flex">
          <BrandIcon className="h-5 w-5 text-[var(--accent)]" />
        </div>

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.label === "Manage Agent" && appView === "canvas") ||
            (item.label === "Chat With Agent" && appView === "chat");

          return (
            <Button
              key={item.label}
              title={item.label}
              variant={isActive ? "primary" : "ghost"}
              size="sm"
              onClick={() =>
                setAppView(item.label === "Chat With Agent" ? "chat" : "canvas")
              }
              className={cn(
                "h-12 w-12 rounded-[18px] p-0",
                isActive
                  ? "bg-[rgba(217,134,75,0.12)]"
                  : "border-transparent text-white/42 hover:border-white/8 hover:bg-white/[0.03] hover:text-white/82",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sr-only">{item.label}</span>
            </Button>
          );
        })}

        <Button
          type="button"
          onClick={toggleAgentPanel}
          variant="secondary"
          size="sm"
          className="h-12 w-12 rounded-[18px] border-white/8 bg-white/[0.03] p-0 text-white/56 hover:bg-white/[0.08] hover:text-white lg:mt-1"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isAgentPanelCollapsed && "rotate-180",
            )}
          />
          <span className="sr-only">
            {isAgentPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </Button>
      </div>
    </aside>
  );
}
