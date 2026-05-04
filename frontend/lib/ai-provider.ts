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
  model: "gpt-4o-mini",
};

export const AI_PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string; description: string }> = [
  { value: "openai", label: "OpenAI", description: "Use an OpenAI API key." },
  { value: "anthropic", label: "Anthropic", description: "Use a Claude API key." },
  { value: "gemini", label: "Gemini", description: "Use a Google Gemini API key." },
  { value: "azure", label: "Azure OpenAI", description: "Use an Azure endpoint and deployment." },
  { value: "bedrock", label: "AWS Bedrock", description: "Use AWS credentials and a Bedrock model ID." },
];

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-1.5-flash",
  azure: "",
  bedrock: "",
};

export const MODEL_OPTIONS: Partial<Record<AiProvider, string[]>> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  anthropic: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest", "claude-3-opus-latest"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
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
