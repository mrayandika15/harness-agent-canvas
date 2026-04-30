import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Agent, AgentRuntime } from "@/features/agents/types/agent";

type AgentGenerationStatus = "Generating" | "Failed";

type StoredAgentGeneration = {
  id: string;
  name: string;
  icon?: string;
  runtime: AgentRuntime;
  status: AgentGenerationStatus;
  color: string;
  personality: string;
  createdAt: string;
  updatedAt: string;
};

const STORE_DIR = "data";
const GENERATIONS_PATH = path.join(STORE_DIR, "agent-generations.json");

function now() {
  return new Date().toISOString();
}

function readJsonFile<T>(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readAgentGenerations() {
  const stored = readJsonFile<{ generations?: StoredAgentGeneration[] }>(
    GENERATIONS_PATH,
  );

  return stored?.generations ?? [];
}

function writeAgentGenerations(generations: StoredAgentGeneration[]) {
  if (generations.length === 0) {
    fs.rmSync(GENERATIONS_PATH, { force: true });
    return;
  }

  writeJsonFile(GENERATIONS_PATH, { generations });
}

function toAgent(generation: StoredAgentGeneration): Agent {
  return {
    id: generation.id,
    name: generation.name,
    icon: generation.icon,
    personality: generation.personality,
    runtime: generation.runtime,
    memory: "",
    status: generation.status,
    color: generation.color,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
  };
}

function normalizeGenerationId(generationId?: string) {
  return generationId?.startsWith("generating-")
    ? generationId
    : `generating-${randomUUID()}`;
}

export function listAgentGenerations() {
  return readAgentGenerations().map(toAgent);
}

export function isDuplicateAgentGenerationName(name: string, excludeId?: string) {
  const normalizedName = name.trim().toLowerCase();

  return readAgentGenerations().some(
    (generation) =>
      generation.id !== excludeId &&
      generation.name.trim().toLowerCase() === normalizedName,
  );
}

export function createAgentGeneration(input: {
  id?: string;
  name: string;
  icon?: string;
  runtime: AgentRuntime;
  color: string;
}) {
  const generations = readAgentGenerations();
  const generationId = normalizeGenerationId(input.id);
  const existingIndex = generations.findIndex((item) => item.id === generationId);
  const timestamp = now();
  const generation: StoredAgentGeneration = {
    id: generationId,
    name: input.name,
    icon: input.icon,
    runtime: input.runtime,
    status: "Generating",
    color: input.color,
    personality: "Preparing personality, harness, and local runtime files.",
    createdAt: generations[existingIndex]?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    generations[existingIndex] = generation;
  } else {
    generations.push(generation);
  }

  writeAgentGenerations(generations);

  return toAgent(generation);
}

export function failAgentGeneration(generationId: string, message: string) {
  const generations = readAgentGenerations();
  const generation = generations.find((item) => item.id === generationId);

  if (!generation) {
    return null;
  }

  generation.status = "Failed";
  generation.personality = message;
  generation.updatedAt = now();
  writeAgentGenerations(generations);

  return toAgent(generation);
}

export function deleteAgentGeneration(generationId: string) {
  const generations = readAgentGenerations();
  const nextGenerations = generations.filter((item) => item.id !== generationId);

  if (nextGenerations.length === generations.length) {
    return false;
  }

  writeAgentGenerations(nextGenerations);

  return true;
}
