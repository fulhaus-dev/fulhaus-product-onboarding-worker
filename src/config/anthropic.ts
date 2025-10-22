import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@worker/config/environment.js";

const anthropic = createAnthropic({
	apiKey: env.ANTHROPIC_API_KEY,
});

export const anthropicClaudeHaiku = anthropic("claude-haiku-4-5-20251001");
