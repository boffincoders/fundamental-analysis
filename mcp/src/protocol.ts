import { tools, InputError } from "./tools";

/**
 * The MCP stdio protocol, kept dependency-free: JSON-RPC 2.0 messages, one per line.
 * handleMessage is pure so the tests drive it without a process.
 */
export const SERVER_NAME = "fundamental-analysis-mcp";
export const SERVER_VERSION = "0.1.0";
export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Id = string | number | null;
interface Request {
  jsonrpc: "2.0";
  id?: Id;
  method: string;
  params?: Record<string, unknown>;
}

const ok = (id: Id, result: unknown) => ({ jsonrpc: "2.0" as const, id, result });
const fail = (id: Id, code: number, message: string) => ({ jsonrpc: "2.0" as const, id, error: { code, message } });

const INSTRUCTIONS =
  "Calculators only: pass the figures you already have. Every result returns the value, the formula, the inputs used and caveats. Nothing is fetched and nothing is changed.";

export function handleMessage(raw: unknown): object | null {
  if (!raw || typeof raw !== "object" || (raw as Request).jsonrpc !== "2.0" || typeof (raw as Request).method !== "string") {
    const id = raw && typeof raw === "object" && "id" in raw ? ((raw as Request).id ?? null) : null;
    return fail(id, -32600, "Invalid request");
  }
  const msg = raw as Request;
  const isNotification = msg.id === undefined;
  if (isNotification) return null;
  const id = msg.id as Id;

  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      const protocolVersion = typeof asked === "string" && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, title: "Fundamental analysis", version: SERVER_VERSION },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: tools.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
        })),
      });
    case "tools/call": {
      const name = msg.params?.name;
      const tool = tools.find((t) => t.name === name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${String(name)}`);
      const args = msg.params?.arguments;
      try {
        const result = tool.run(args && typeof args === "object" ? (args as Record<string, unknown>) : {});
        return ok(id, { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false });
      } catch (e) {
        if (e instanceof InputError) return ok(id, { content: [{ type: "text", text: e.message }], isError: true });
        throw e;
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${msg.method}`);
  }
}

/** Parses one line from stdin; a line that is not JSON gets a parse error with id null. */
export function handleLine(line: string): object | null {
  if (!line.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return fail(null, -32700, "Parse error");
  }
  try {
    return handleMessage(parsed);
  } catch (e) {
    const id = parsed && typeof parsed === "object" && "id" in parsed ? ((parsed as Request).id ?? null) : null;
    return fail(id, -32603, e instanceof Error ? e.message : "Internal error");
  }
}
