export type AgentRuntime = "claude" | "codex";

export type Agent = {
  id: string;
  name: string;
  icon?: string;
  personality?: string;
  runtime: AgentRuntime;
  memory?: string;
  status: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};
