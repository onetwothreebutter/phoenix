/**
 * Minimal traced agent: a ToolLoopAgent with one deterministic local tool
 * (unit conversion over a small in-memory table). Importing
 * ./instrumentation.js registers Phoenix telemetry, so the agent span, each
 * LLM step, and each tool call land in Phoenix as one trace.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs, tool, ToolLoopAgent } from "ai";
import { z } from "zod";

// Importing this module registers Phoenix tracing before any LLM calls run
import { projectName, provider } from "./instrumentation.js";

// Factors to a base unit per dimension (meters, kilograms)
const UNITS = {
  meter: { dimension: "length", toBase: 1 },
  kilometer: { dimension: "length", toBase: 1000 },
  mile: { dimension: "length", toBase: 1609.344 },
  foot: { dimension: "length", toBase: 0.3048 },
  inch: { dimension: "length", toBase: 0.0254 },
  kilogram: { dimension: "mass", toBase: 1 },
  gram: { dimension: "mass", toBase: 0.001 },
  pound: { dimension: "mass", toBase: 0.45359237 },
  ounce: { dimension: "mass", toBase: 0.028349523125 },
} as const;

const unitName = z.enum(Object.keys(UNITS) as [keyof typeof UNITS]);

const agent = new ToolLoopAgent({
  model: anthropic(process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5"),
  instructions:
    "You are a concise assistant. Always use the convertUnits tool for unit conversions instead of doing the arithmetic yourself.",
  tools: {
    convertUnits: tool({
      description: "Convert a value between length or mass units",
      inputSchema: z.object({
        value: z.number().describe("The numeric value to convert"),
        from: unitName.describe("The unit to convert from"),
        to: unitName.describe("The unit to convert to"),
      }),
      execute: async ({ value, from, to }) => {
        const source = UNITS[from];
        const target = UNITS[to];
        if (source.dimension !== target.dimension) {
          return {
            error: `Cannot convert ${source.dimension} (${from}) to ${target.dimension} (${to})`,
          };
        }
        return {
          value,
          from,
          to,
          result: (value * source.toBase) / target.toBase,
        };
      },
    }),
  },
  stopWhen: stepCountIs(5),
});

const prompt =
  process.argv[2] ??
  "I'm running a 26.2 mile marathon carrying a 12 ounce water bottle. How many kilometers is that, and how many grams does the bottle weigh?";
console.log(`\n💬 Asking: ${prompt}\n`);

try {
  const result = await agent.generate({ prompt });
  console.log(`🤖 Response: ${result.text}`);
} catch (error) {
  console.error("❌ Agent run failed:", error);
  process.exitCode = 1;
} finally {
  // Flush the trace before the process exits, even on failure, so errored
  // runs are still visible in Phoenix
  await provider.shutdown();
}

const phoenixBaseUrl =
  process.env.PHOENIX_COLLECTOR_ENDPOINT ?? "http://localhost:6006";
const projectUrl = new URL(
  `redirects/projects/${encodeURIComponent(projectName)}`,
  phoenixBaseUrl.endsWith("/") ? phoenixBaseUrl : `${phoenixBaseUrl}/`
);
console.log(`\n✅ Done - view the trace at ${projectUrl}`);
