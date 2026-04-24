export async function fetchFlowNodeContent(nodeId: string) {
  const response = await fetch(`/api/flow-node-content/${nodeId}`);

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as { content?: string };
  return data.content ?? "";
}

export async function saveFlowNodeContent(nodeId: string, content: string) {
  await fetch(`/api/flow-node-content/${nodeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
}
