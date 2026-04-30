export type ChatMessageRole = "user" | "assistant";

export type ChatTimelineItem = {
  id: string;
  label: string;
  detail?: string;
  status: "complete" | "running" | "pending";
};

export type ChatMessage = {
  id: string;
  agentId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  timeline?: ChatTimelineItem[];
};
