export type AiProvider = "openai" | "anthropic" | "gemini" | "azure" | "bedrock";

export interface AiProviderConfig {
  provider: AiProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
  apiVersion?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export const DEFAULT_AI_PROVIDER_CONFIG: AiProviderConfig = {
  provider: "openai",
  model: "gpt-5.4-mini",
};

export const AI_PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string; description: string }> = [
  { value: "openai", label: "OpenAI", description: "Use an OpenAI API key." },
  { value: "anthropic", label: "Anthropic", description: "Use a Claude API key." },
  { value: "gemini", label: "Gemini", description: "Use a Google Gemini API key." },
  { value: "azure", label: "Azure OpenAI", description: "Use an Azure endpoint and deployment." },
  { value: "bedrock", label: "AWS Bedrock", description: "Use AWS credentials and a Bedrock model ID." },
];

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.5-flash",
  azure: "",
  bedrock: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
};

// Known text-generation model IDs exposed by the installed AI SDK provider types.
// Provider types also accept arbitrary strings, so the UI keeps custom entry enabled.
export const MODEL_OPTIONS: Record<AiProvider, string[]> = {
  openai: [
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.4-pro",
    "gpt-5.4-2026-03-05",
    "gpt-5.4-mini-2026-03-17",
    "gpt-5.4-nano-2026-03-17",
    "gpt-5.4-pro-2026-03-05",
    "gpt-5.3-chat-latest",
    "gpt-5.3-codex",
    "gpt-5.2",
    "gpt-5.2-chat-latest",
    "gpt-5.2-pro",
    "gpt-5.2-codex",
    "gpt-5.2-2025-12-11",
    "gpt-5.2-pro-2025-12-11",
    "gpt-5.1",
    "gpt-5.1-chat-latest",
    "gpt-5.1-codex",
    "gpt-5.1-codex-mini",
    "gpt-5.1-codex-max",
    "gpt-5.1-2025-11-13",
    "gpt-5",
    "gpt-5-chat-latest",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5-pro",
    "gpt-5-codex",
    "gpt-5-2025-08-07",
    "gpt-5-mini-2025-08-07",
    "gpt-5-nano-2025-08-07",
    "gpt-5-pro-2025-10-06",
    "o4-mini",
    "o4-mini-2025-04-16",
    "o3",
    "o3-mini",
    "o3-2025-04-16",
    "o3-mini-2025-01-31",
    "o1",
    "o1-2024-12-17",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4.1-2025-04-14",
    "gpt-4.1-mini-2025-04-14",
    "gpt-4.1-nano-2025-04-14",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4o-2024-11-20",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-05-13",
    "gpt-4o-mini-2024-07-18",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-1106",
  ],
  anthropic: [
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    "claude-opus-4-5",
    "claude-opus-4-5-20251101",
    "claude-sonnet-4-5",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-1",
    "claude-opus-4-1-20250805",
    "claude-opus-4-0",
    "claude-opus-4-20250514",
    "claude-sonnet-4-0",
    "claude-sonnet-4-20250514",
    "claude-3-haiku-20240307",
  ],
  gemini: [
    "gemini-3.1-pro-preview",
    "gemini-3.1-pro-preview-customtools",
    "gemini-3.1-flash-image-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-tts-preview",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
    "gemini-2.5-flash-native-audio-latest",
    "gemini-2.5-flash-native-audio-preview-12-2025",
    "gemini-2.5-flash-native-audio-preview-09-2025",
    "gemini-2.5-computer-use-preview-10-2025",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-pro-latest",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "deep-research-pro-preview-12-2025",
    "nano-banana-pro-preview",
    "aqa",
    "gemini-robotics-er-1.5-preview",
    "gemma-3-27b-it",
    "gemma-3-12b-it",
    "gemma-3-4b-it",
    "gemma-3-1b-it",
    "gemma-3n-e4b-it",
    "gemma-3n-e2b-it",
  ],
  azure: [],
  bedrock: [
    "us.anthropic.claude-opus-4-7",
    "us.anthropic.claude-opus-4-6-v1",
    "us.anthropic.claude-sonnet-4-6-v1",
    "us.anthropic.claude-opus-4-5-20251101-v1:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "us.anthropic.claude-opus-4-1-20250805-v1:0",
    "us.anthropic.claude-opus-4-20250514-v1:0",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-haiku-20240307-v1:0",
    "us.amazon.nova-premier-v1:0",
    "us.amazon.nova-pro-v1:0",
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0",
    "us.meta.llama4-maverick-17b-instruct-v1:0",
    "us.meta.llama4-scout-17b-instruct-v1:0",
    "us.meta.llama3-3-70b-instruct-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "us.meta.llama3-1-70b-instruct-v1:0",
    "us.meta.llama3-1-8b-instruct-v1:0",
    "us.deepseek.r1-v1:0",
    "us.mistral.pixtral-large-2502-v1:0",
    "anthropic.claude-opus-4-7",
    "anthropic.claude-opus-4-6-v1",
    "anthropic.claude-sonnet-4-6-v1",
    "anthropic.claude-opus-4-5-20251101-v1:0",
    "anthropic.claude-sonnet-4-5-20250929-v1:0",
    "anthropic.claude-haiku-4-5-20251001-v1:0",
    "anthropic.claude-opus-4-1-20250805-v1:0",
    "anthropic.claude-opus-4-20250514-v1:0",
    "anthropic.claude-sonnet-4-20250514-v1:0",
    "anthropic.claude-3-7-sonnet-20250219-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-v2:1",
    "anthropic.claude-v2",
    "anthropic.claude-instant-v1",
    "amazon.titan-tg1-large",
    "amazon.titan-text-express-v1",
    "amazon.titan-text-lite-v1",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "cohere.command-text-v14",
    "cohere.command-light-text-v14",
    "meta.llama3-1-405b-instruct-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "meta.llama3-2-90b-instruct-v1:0",
    "meta.llama3-2-11b-instruct-v1:0",
    "meta.llama3-2-3b-instruct-v1:0",
    "meta.llama3-2-1b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-8b-instruct-v1:0",
    "mistral.mistral-large-2402-v1:0",
    "mistral.mistral-small-2402-v1:0",
    "mistral.mixtral-8x7b-instruct-v0:1",
    "mistral.mistral-7b-instruct-v0:2",
    "openai.gpt-oss-120b-1:0",
    "openai.gpt-oss-20b-1:0",
  ],
};

const hasValue = (value?: string) => Boolean(value?.trim());

export function isAiProviderConfigured(config: AiProviderConfig): boolean {
  if (!hasValue(config.model)) return false;

  if (config.provider === "azure") {
    return hasValue(config.apiKey) && hasValue(config.endpoint);
  }

  if (config.provider === "bedrock") {
    return (
      hasValue(config.accessKeyId) &&
      hasValue(config.secretAccessKey) &&
      hasValue(config.region)
    );
  }

  return hasValue(config.apiKey);
}

export function getAiProviderLabel(provider: AiProvider): string {
  return AI_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label || provider;
}

export function getAiProviderStatus(config: AiProviderConfig): string {
  const providerLabel = getAiProviderLabel(config.provider);
  if (!isAiProviderConfigured(config)) {
    return `${providerLabel} needs credentials`;
  }
  return `${providerLabel} · ${config.model}`;
}

export function getConfigForProvider(provider: AiProvider, previous?: AiProviderConfig): AiProviderConfig {
  return {
    provider,
    model: previous?.provider === provider ? previous.model : DEFAULT_MODELS[provider],
    apiKey: previous?.provider === provider ? previous.apiKey : "",
    endpoint: previous?.provider === provider ? previous.endpoint : "",
    apiVersion: previous?.provider === provider ? previous.apiVersion : "",
    region: previous?.provider === provider ? previous.region : provider === "bedrock" ? "us-east-1" : "",
    accessKeyId: previous?.provider === provider ? previous.accessKeyId : "",
    secretAccessKey: previous?.provider === provider ? previous.secretAccessKey : "",
    sessionToken: previous?.provider === provider ? previous.sessionToken : "",
  };
}
