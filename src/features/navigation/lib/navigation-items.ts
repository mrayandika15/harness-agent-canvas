import { Bot, MessageSquareText, PanelTop, Settings } from "lucide-react";

export const sidebarItems = [
  { label: "Canvas", icon: PanelTop, view: "canvas" as const },
  { label: "Chat", icon: MessageSquareText, view: "chat" as const },
];

export const sidebarSettingsItem = {
  label: "Settings",
  icon: Settings,
  view: "settings" as const,
};

export const brandMark = Bot;
