"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Info, KeyRound, Search } from "lucide-react";
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

interface ModelSearchPickerProps {
  label: string;
  options: string[];
  placeholder: string;
  value: string;
  onChange: (model: string) => void;
}

function ModelSearchPicker({ label, options, placeholder, value, onChange }: ModelSearchPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setQuery(value);
    }
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((model) => model.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, options]);
  const hasExactMatch = options.some((model) => model.toLowerCase() === normalizedQuery);
  const canUseCustom = Boolean(trimmedQuery) && !hasExactMatch;

  const selectModel = (model: string) => {
    onChange(model);
    setQuery(model);
    setOpen(false);
  };

  return (
    <div className="grid gap-2" ref={containerRef}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between rounded-lg border-input bg-background px-3 text-left font-normal"
          onClick={() => setOpen((current) => !current)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>

        {open && (
          <div className="absolute z-[70] mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                id={inputId}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && trimmedQuery) {
                    event.preventDefault();
                    selectModel(trimmedQuery);
                  }
                  if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search or enter a model ID..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              {filteredOptions.map((model) => (
                <button
                  key={model}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    value === model && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => selectModel(model)}
                >
                  <span className="truncate">{model}</span>
                  {value === model && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}

              {canUseCustom && (
                <button
                  type="button"
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectModel(trimmedQuery)}
                >
                  Use custom model ID: <span className="ml-1 truncate font-medium text-foreground">{trimmedQuery}</span>
                </button>
              )}

              {!filteredOptions.length && !canUseCustom && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Type a model ID to use a custom value.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const modelLabel = draft.provider === "azure" ? "Deployment name" : "Model";
  const modelPlaceholder =
    draft.provider === "azure" ? "my-gpt-deployment" : DEFAULT_MODELS[draft.provider] || "Enter model ID";

  const updateDraft = (updates: Partial<AiProviderConfig>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleProviderChange = (provider: AiProvider) => {
    setDraft((current) => getConfigForProvider(provider, current));
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
          variant="secondary"
          className="h-12 w-full justify-between gap-3 rounded-xl border border-border/70 bg-secondary/70 px-4 shadow-sm hover:bg-secondary"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70 text-muted-foreground">
              <KeyRound className="h-4 w-4" />
            </span>
            <span className={cn("truncate text-left font-medium", !configured && "text-muted-foreground")}>
              {getAiProviderStatus(value)}
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            {configured ? "Edit" : "Set up"}
          </span>
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

          <ModelSearchPicker
            key={draft.provider}
            label={modelLabel}
            options={modelOptions}
            placeholder={modelPlaceholder}
            value={draft.model}
            onChange={(model) => updateDraft({ model })}
          />

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
