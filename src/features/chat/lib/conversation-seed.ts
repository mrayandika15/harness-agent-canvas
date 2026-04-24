export const conversationSeed = [
  {
    id: "m1",
    role: "assistant" as const,
    title: "Robo is ready",
    body:
      "I can refine the active flow, explain each step, or draft markdown instructions for a new node. If needed, I can turn the current pipeline into a tighter execution handoff with explicit MCP dependencies.",
  },
  {
    id: "m2",
    role: "user" as const,
    title: "Current goal",
    body:
      "Generate a cleaner implementation brief for the latest step and keep the MCP mapping explicit. I want the markdown to read like an operational handoff document.",
  },
  {
    id: "m3",
    role: "assistant" as const,
    title: "Suggested action",
    body:
      "I would summarize the node purpose, then break the markdown into required inputs, expected outputs, success criteria, and one short implementation note about MCP invocation.",
  },
  {
    id: "m4",
    role: "user" as const,
    title: "Extra constraint",
    body:
      "Keep the tone concise and technical. Avoid product language. The result should read like something an operator can apply immediately.",
  },
  {
    id: "m5",
    role: "assistant" as const,
    title: "Execution outline",
    body:
      "Understood. I would shape the file into overview, purpose, MCP dependencies, outputs, success criteria, and a short validation checklist.",
  },
];
