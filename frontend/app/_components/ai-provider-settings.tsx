"use client";

import * as React from "react";
import { Info, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_MODELS,
  MODEL_OPTIONS,
  getAiProviderStatus,
  getConfigForProvider,
  isAiProviderConfigured,
  type AiProvider,
  type AiProviderConfig,
} from "@/lib/ai-provider";
import { cn } from "@/lib/utils";

interface AiProviderSettingsProps {
  value: AiProviderConfig;
  onChange: (config: AiProviderConfig) => void;
}

const SAFE_DATA_COPY =
  "Your API key is kept only in this browser tab, sent to Etchr's backend for the current generation request, forwarded to your selected AI provider, and never saved in Etchr's database or logs. Selected repository content is sent only to the provider you choose.";

export function AiProviderSettings({ value, onChange }: AiProviderSettingsProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<AiProviderConfig>(value);

  React.useEffect(() => {
    if (!open) {
      setDraft(value);
    }
  }, [open, value]);

  const modelOptions = MODEL_OPTIONS[draft.provider] || [];
  const configured = isAiProviderConfigured(value);
  const draftConfigured = isAiProviderConfigured(draft);

  const updateDraft = (updates: Partial<AiProviderConfig>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleProviderChange = (provider: AiProvider) => {
    setDraft((current) => getConfigForProvider(provider, current));
  };

  const handleModelSelect = (model: string) => {
    updateDraft({ model: model === "custom" ? "" : model });
  };

  const handleSave = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={configured ? "secondary" : "outline"}
          className={cn("w-full justify-between gap-3 border-dashed", !configured && "text-muted-foreground")}
        >
          <span className="flex items-center gap-2 min-w-0">
            <KeyRound className="h-4 w-4 flex-none" />
            <span className="truncate">{getAiProviderStatus(value)}</span>
          </span>
          <span className="text-xs text-muted-foreground">{configured ? "Edit" : "Set up"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI Provider
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs leading-relaxed">
                  <p>{SAFE_DATA_COPY}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Bring your own API key. Credentials are kept in memory for this tab only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select value={draft.provider} onValueChange={(provider) => handleProviderChange(provider as AiProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modelOptions.length > 0 && (
            <div className="grid gap-2">
              <Label>Model</Label>
              <Select
                value={modelOptions.includes(draft.model) ? draft.model : "custom"}
                onValueChange={handleModelSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom model</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(!modelOptions.length || !modelOptions.includes(draft.model)) && (
            <div className="grid gap-2">
              <Label>{draft.provider === "azure" ? "Deployment name" : "Custom model ID"}</Label>
              <Input
                value={draft.model}
                onChange={(event) => updateDraft({ model: event.target.value })}
                placeholder={
                  draft.provider === "bedrock"
                    ? "us.anthropic.claude-haiku-4-5-20251001-v1:0"
                    : draft.provider === "azure"
                      ? "my-gpt-deployment"
                      : DEFAULT_MODELS[draft.provider]
                }
              />
            </div>
          )}

          {draft.provider === "azure" && (
            <>
              <div className="grid gap-2">
                <Label>Azure endpoint or resource name</Label>
                <Input
                  value={draft.endpoint || ""}
                  onChange={(event) => updateDraft({ endpoint: event.target.value })}
                  placeholder="https://my-resource.openai.azure.com or my-resource"
                />
              </div>
              <div className="grid gap-2">
                <Label>API version (optional)</Label>
                <Input
                  value={draft.apiVersion || ""}
                  onChange={(event) => updateDraft({ apiVersion: event.target.value })}
                  placeholder="preview"
                />
              </div>
            </>
          )}

          {draft.provider === "bedrock" ? (
            <>
              <div className="grid gap-2">
                <Label>AWS region</Label>
                <Input
                  value={draft.region || ""}
                  onChange={(event) => updateDraft({ region: event.target.value })}
                  placeholder="us-east-1"
                />
              </div>
              <div className="grid gap-2">
                <Label>AWS access key ID</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={draft.accessKeyId || ""}
                  onChange={(event) => updateDraft({ accessKeyId: event.target.value })}
                  placeholder="AKIA..."
                />
              </div>
              <div className="grid gap-2">
                <Label>AWS secret access key</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={draft.secretAccessKey || ""}
                  onChange={(event) => updateDraft({ secretAccessKey: event.target.value })}
                  placeholder="AWS secret access key"
                />
              </div>
              <div className="grid gap-2">
                <Label>AWS session token (optional)</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={draft.sessionToken || ""}
                  onChange={(event) => updateDraft({ sessionToken: event.target.value })}
                  placeholder="Temporary session token"
                />
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label>API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={draft.apiKey || ""}
                onChange={(event) => updateDraft({ apiKey: event.target.value })}
                placeholder={`${AI_PROVIDER_OPTIONS.find((option) => option.value === draft.provider)?.label} API key`}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!draftConfigured}>
            Save provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
