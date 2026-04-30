import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LocalMcpServer = {
  key: string;
  label: string;
  source: string;
  command: string;
  args: string[];
  available: boolean;
  path: string | null;
};

type McpDefinition = {
  key: string;
  source: string;
  command: string;
  args: string[];
};

function labelFromKey(key: string) {
  return key;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function commandPath(command: string) {
  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      ["-lc", `command -v ${shellQuote(command)}`],
      { timeout: 1800 },
    );

    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonMcpFile(filePath: string, source: string): McpDefinition[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const mcpServers = isRecord(parsed) ? parsed.mcpServers : null;

    if (!isRecord(mcpServers)) {
      return [];
    }

    return Object.entries(mcpServers)
      .map(([key, value]) => {
        if (!isRecord(value) || typeof value.command !== "string") {
          return null;
        }

        return {
          key,
          source,
          command: value.command,
          args: stringArray(value.args),
        };
      })
      .filter((item): item is McpDefinition => Boolean(item));
  } catch {
    return [];
  }
}

function readCodexToml(filePath: string): McpDefinition[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const definitions: McpDefinition[] = [];
  let current: Partial<McpDefinition> | null = null;

  for (const line of content.split(/\r?\n/)) {
    const section = line.match(/^\s*\[mcp_servers\.([^\]]+)\]\s*$/);

    if (section) {
      if (current?.key && current.command) {
        definitions.push({
          key: current.key,
          source: ".codex/config.toml",
          command: current.command,
          args: current.args ?? [],
        });
      }

      current = { key: section[1], source: ".codex/config.toml", args: [] };
      continue;
    }

    if (!current) {
      continue;
    }

    const command = line.match(/^\s*command\s*=\s*"([^"]+)"\s*$/);

    if (command) {
      current.command = command[1];
      continue;
    }

    const args = line.match(/^\s*args\s*=\s*\[(.*)\]\s*$/);

    if (args) {
      current.args = Array.from(args[1].matchAll(/"([^"]*)"/g), (match) => match[1]);
    }
  }

  if (current?.key && current.command) {
    definitions.push({
      key: current.key,
      source: ".codex/config.toml",
      command: current.command,
      args: current.args ?? [],
    });
  }

  return definitions;
}

function readEnabledCodexPlugins(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return new Set<string>();
  }

  const content = fs.readFileSync(filePath, "utf8");
  const enabledPlugins = new Set<string>();
  let currentPlugin: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    const pluginSection = line.match(/^\s*\[plugins\."([^"@]+)(?:@[^"]+)?"\]\s*$/);

    if (pluginSection) {
      currentPlugin = pluginSection[1];
      continue;
    }

    if (!currentPlugin) {
      continue;
    }

    const enabled = line.match(/^\s*enabled\s*=\s*(true|false)\s*$/);

    if (enabled) {
      if (enabled[1] === "true") {
        enabledPlugins.add(currentPlugin);
      }

      currentPlugin = null;
    }
  }

  return enabledPlugins;
}

function findFiles(rootDir: string, predicate: (filePath: string) => boolean, maxDepth = 6) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: string[] = [];

  function visit(dir: string, depth: number) {
    if (depth > maxDepth) {
      return;
    }

    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.forEach((entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        visit(entryPath, depth + 1);
        return;
      }

      if (entry.isFile() && predicate(entryPath)) {
        results.push(entryPath);
      }
    });
  }

  visit(rootDir, 0);
  return results;
}

function readCodexPluginFile(
  filePath: string,
  enabledPlugins: Set<string>,
): McpDefinition | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;

    if (!isRecord(parsed) || typeof parsed.name !== "string") {
      return null;
    }

    if (!enabledPlugins.has(parsed.name)) {
      return null;
    }

    return {
      key: parsed.name,
      source: path.relative(os.homedir(), filePath).replace(/\\/g, "/"),
      command: "codex-plugin",
      args: [] as string[],
    };
  } catch {
    return null;
  }
}

function readUserCodexPlugins(codexDir: string) {
  const configPath = path.join(codexDir, "config.toml");
  const enabledPlugins = readEnabledCodexPlugins(configPath);

  if (!enabledPlugins.size) {
    return [];
  }

  return findFiles(
    path.join(codexDir, "plugins/cache"),
    (filePath) => filePath.endsWith(path.join(".codex-plugin", "plugin.json")),
    7,
  )
    .map((filePath) => readCodexPluginFile(filePath, enabledPlugins))
    .filter((definition): definition is McpDefinition => Boolean(definition));
}

function readPluginMcpFiles(rootDir: string) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const pluginDir = path.join(rootDir, entry.name);

      return ["mcp.json", ".mcp.json"].flatMap((fileName) => {
        const filePath = path.join(pluginDir, fileName);

        return fs.existsSync(filePath)
          ? readJsonMcpFile(filePath, `.agents/plugins/${entry.name}/${fileName}`)
          : [];
      });
    });
}

function mergeDefinitions(definitions: McpDefinition[]) {
  const merged = new Map<string, McpDefinition & { sources: Set<string> }>();

  definitions.forEach((definition) => {
    const existing = merged.get(definition.key);

    if (existing) {
      existing.sources.add(definition.source);
      return;
    }

    merged.set(definition.key, {
      ...definition,
      sources: new Set([definition.source]),
    });
  });

  return Array.from(merged.values()).map((definition) => ({
    ...definition,
    source: Array.from(definition.sources).join(", "),
  }));
}

export async function listLocalMcpServers(): Promise<LocalMcpServer[]> {
  const cwd = process.cwd();
  const homeDir = os.homedir();
  const userCodexDir = path.join(homeDir, ".codex");
  const userAgentsPluginsDir = path.join(homeDir, ".agents/plugins");
  const definitions = mergeDefinitions([
    ...readCodexToml(path.join(userCodexDir, "config.toml")),
    ...readUserCodexPlugins(userCodexDir),
    ...readPluginMcpFiles(userAgentsPluginsDir),
    ...readCodexToml(path.join(cwd, ".codex/config.toml")),
    ...readPluginMcpFiles(path.join(cwd, ".agents/plugins")),
  ]);
  const paths = await Promise.all(
    definitions.map((definition) =>
      definition.command === "codex-plugin"
        ? Promise.resolve("enabled")
        : commandPath(definition.command),
    ),
  );

  return definitions
    .map((definition, index) => {
      const pathValue = paths[index];

      return {
        key: definition.key,
        label: labelFromKey(definition.key),
        source: definition.source,
        command: definition.command,
        args: definition.args,
        available: Boolean(pathValue),
        path: pathValue,
      };
    })
    .sort((a, b) => Number(b.available) - Number(a.available) || a.key.localeCompare(b.key));
}
