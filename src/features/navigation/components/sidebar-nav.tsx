"use client";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  brandMark,
  sidebarItems,
  sidebarSettingsItem,
} from "@/features/navigation/lib/navigation-items";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

const BrandIcon = brandMark;

export function SidebarNav() {
  const appView = useWorkspaceStore((state) => state.appView);
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );
  const toggleAgentPanel = useWorkspaceStore((state) => state.toggleAgentPanel);
  const setAppView = useWorkspaceStore((state) => state.setAppView);
  const SettingsIcon = sidebarSettingsItem.icon;
  const isSettingsActive = appView === sidebarSettingsItem.view;

  return (
    <aside className="border-b border-white/6 bg-[rgba(8,8,8,0.78)] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-row items-center gap-2 px-3 py-3 lg:flex-col lg:items-center lg:px-2 lg:py-4">
        <div className="mb-1 hidden h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(245,148,78,0.22)] bg-[linear-gradient(180deg,rgba(54,29,15,0.68),rgba(27,15,8,0.4))] shadow-[0_0_18px_rgba(245,148,78,0.08)] lg:flex">
          <BrandIcon className="h-5 w-5 text-[var(--accent-strong)]" />
        </div>

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = appView === item.view;

          return (
            <Button
              key={item.label}
              title={item.label}
              variant={isActive ? "default" : "ghost"}
              size="icon-lg"
              onClick={() => setAppView(item.view)}
              className={cn(
                "h-12 w-12 rounded-[18px] p-0",
                isActive
                  ? "bg-[rgba(245,148,78,0.18)] text-white hover:bg-[rgba(245,148,78,0.26)]"
                  : "border-transparent text-white/42 hover:border-white/8 hover:bg-white/[0.03] hover:text-white/82",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sr-only">{item.label}</span>
            </Button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:mt-auto lg:flex-col">
          <Button
            type="button"
            onClick={toggleAgentPanel}
            variant="outline"
            size="icon-lg"
            className="h-12 w-12 rounded-[18px] border-white/8 bg-white/[0.03] p-0 text-white/56 hover:bg-white/[0.08] hover:text-white"
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

          <Button
            type="button"
            title={sidebarSettingsItem.label}
            variant={isSettingsActive ? "default" : "ghost"}
            size="icon-lg"
            onClick={() => setAppView(sidebarSettingsItem.view)}
            className={cn(
              "relative h-12 w-12 rounded-[18px] p-0",
              isSettingsActive
                ? "bg-[rgba(245,148,78,0.18)] text-white hover:bg-[rgba(245,148,78,0.26)]"
                : "border-transparent text-white/42 hover:border-white/8 hover:bg-white/[0.03] hover:text-white/82",
            )}
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className="sr-only">{sidebarSettingsItem.label}</span>
            <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[#abffbf] shadow-[0_0_10px_rgba(171,255,191,0.55)]" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
