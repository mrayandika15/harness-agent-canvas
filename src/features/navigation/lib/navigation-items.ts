import { Bot, MessageSquareText, Settings2 } from "lucide-react";

export const sidebarItems = [
  { label: "Canvas", icon: Settings2, view: "canvas" as const },
  { label: "Chat", icon: MessageSquareText, view: "chat" as const },
];

export const brandMark = Bot;
