import { z } from "zod";

export const FREE_TOOL_HANDOFF_STORAGE_KEY = "playwrightgen:free-tool-handoff:v1";

export const freeToolHandoffSchema = z.object({
  version: z.literal(1),
  source: z.enum(["quick-generate", "coverage-review", "release-review"]),
  target: z.enum(["TEST_CASE", "REQUIREMENT"]),
  createdAt: z.string().datetime(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(50_000),
  acceptanceCriteria: z.string().trim().max(50_000),
  externalReference: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
  testType: z
    .enum(["FUNCTIONAL", "END_TO_END", "API", "INTEGRATION", "REGRESSION"])
    .optional(),
  notice: z.string().trim().max(2_000),
});

export type FreeToolHandoff = z.infer<typeof freeToolHandoffSchema>;

export function saveFreeToolHandoff(handoff: FreeToolHandoff): void {
  const parsed = freeToolHandoffSchema.parse(handoff);
  sessionStorage.setItem(FREE_TOOL_HANDOFF_STORAGE_KEY, JSON.stringify(parsed));
}

export function readFreeToolHandoff(): FreeToolHandoff | null {
  const raw = sessionStorage.getItem(FREE_TOOL_HANDOFF_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = freeToolHandoffSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.createdAt).getTime();
    if (!Number.isFinite(age) || age > 24 * 60 * 60 * 1_000) {
      sessionStorage.removeItem(FREE_TOOL_HANDOFF_STORAGE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function clearFreeToolHandoff(): void {
  sessionStorage.removeItem(FREE_TOOL_HANDOFF_STORAGE_KEY);
}
