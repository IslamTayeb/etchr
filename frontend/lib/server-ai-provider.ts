import { generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

export type AiProvider = "openai" | "anthropic" | "gemini" | "azure" | "bedrock";

export interface AiProviderConfig {
  provider?: AiProvider;
  model?: string;
  apiKey?: string;
  endpoint?: string;
  apiVersion?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export class AiProviderConfigError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "AiProviderConfigError";
  }
}

const DEFAULT_MODELS: Record<Exclude<AiProvider, "azure" | "bedrock">, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.5-flash",
};

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const requireField = (config: AiProviderConfig, field: keyof AiProviderConfig, label: string): string => {
  const value = config[field];
  if (!isNonEmpty(value)) {
    throw new AiProviderConfigError(`${label} is required for ${config.provider || "the selected provider"}.`);
  }
  return value.trim();
};

const normalizeProviderConfig = (
  config: unknown
): Required<Pick<AiProviderConfig, "provider" | "model">> & AiProviderConfig => {
  if (!config || typeof config !== "object") {
    throw new AiProviderConfigError("AI provider settings are required.");
  }

  const candidate = config as AiProviderConfig;
  if (!candidate.provider) {
    throw new AiProviderConfigError("AI provider is required.");
  }

  const provider = candidate.provider;
  const defaultModel = provider === "azure" || provider === "bedrock" ? "" : DEFAULT_MODELS[provider];
  const model = isNonEmpty(candidate.model) ? candidate.model.trim() : defaultModel;

  if (!isNonEmpty(model)) {
    throw new AiProviderConfigError("Model or deployment name is required.");
  }

  return {
    ...candidate,
    provider,
    model,
  };
};

const normalizeAzureBaseUrl = (endpoint: string): string | undefined => {
  const trimmed = endpoint.trim().replace(/\/+$/, "");

  if (!trimmed.includes("://")) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    const openAiIndex = url.pathname.indexOf("/openai");
    if (openAiIndex >= 0) {
      url.pathname = url.pathname.slice(0, openAiIndex + "/openai".length);
    } else {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/openai`;
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
};

const createLanguageModel = (rawConfig: unknown): LanguageModel => {
  const config = normalizeProviderConfig(rawConfig);

  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: requireField(config, "apiKey", "OpenAI API key") });
      return openai(config.model);
    }

    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: requireField(config, "apiKey", "Anthropic API key") });
      return anthropic(config.model);
    }

    case "gemini": {
      const google = createGoogleGenerativeAI({ apiKey: requireField(config, "apiKey", "Gemini API key") });
      return google(config.model);
    }

    case "azure": {
      const endpoint = requireField(config, "endpoint", "Azure endpoint or resource name");
      const azure = createAzure({
        apiKey: requireField(config, "apiKey", "Azure OpenAI API key"),
        apiVersion: isNonEmpty(config.apiVersion) ? config.apiVersion.trim() : "preview",
        baseURL: normalizeAzureBaseUrl(endpoint),
        resourceName: endpoint.includes("://") ? undefined : endpoint,
        useDeploymentBasedUrls: true,
      });
      return azure(config.model);
    }

    case "bedrock": {
      const bedrock = createAmazonBedrock({
        accessKeyId: requireField(config, "accessKeyId", "AWS access key ID"),
        secretAccessKey: requireField(config, "secretAccessKey", "AWS secret access key"),
        sessionToken: isNonEmpty(config.sessionToken) ? config.sessionToken.trim() : undefined,
        region: requireField(config, "region", "AWS region"),
      });
      return bedrock(config.model as Parameters<typeof bedrock>[0]);
    }

    default:
      throw new AiProviderConfigError("Unsupported AI provider.");
  }
};

export const validateAiProviderConfig = (config: unknown): void => {
  createLanguageModel(config);
};

export const generateAiText = async (config: unknown, prompt: string): Promise<string> => {
  const { text } = await generateText({
    model: createLanguageModel(config),
    prompt,
  });

  return text;
};

export const getSafeAiErrorMessage = (error: unknown): string => {
  if (error instanceof AiProviderConfigError) {
    return error.message;
  }

  const maybeError = error as { statusCode?: number; status?: number; message?: string };
  const status = maybeError?.statusCode || maybeError?.status;
  const message = maybeError?.message?.toLowerCase() || "";

  if (status === 401 || status === 403 || message.includes("api key") || message.includes("credential")) {
    return "AI provider rejected the supplied credentials.";
  }

  if (status === 404 || message.includes("model")) {
    return "AI provider could not find the selected model or deployment.";
  }

  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return "AI provider rate limit or quota was reached.";
  }

  if (status === 400 && (message.includes("context") || message.includes("token"))) {
    return "Selected content is too large for the provider model.";
  }

  return "Failed to generate content with the selected AI provider.";
};
