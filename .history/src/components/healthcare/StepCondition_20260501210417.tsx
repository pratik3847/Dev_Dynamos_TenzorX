import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertCircle, Check, RefreshCw, HelpCircle, Loader2, Sparkles } from "lucide-react";
import { MatchResult } from "@/lib/healthcare-data";
import { cn } from "@/lib/utils";

interface Props {
  match: MatchResult;
  loading?: boolean;
  onNext: () => void;
  onRefine: () => void;
}

const severityStyles = {
  low: { label: "Low urgency", cls: "bg-success-soft text-success border-success/20" },
  moderate: { label: "Moderate urgency", cls: "bg-warning-soft text-warning border-warning/20" },
  high: { label: "High urgency", cls: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const StepCondition = ({ match, loading, onNext, onRefine }: Props) => {
  const { condition, confidence, matchedKeywords } = match;
  const sev = severityStyles[condition.severity];
  const displayName = match.displayName || condition.name;
  const displaySpecialty = match.displaySpecialty || condition.specialty;
  const sourceLabel =
    match.source === "llm+icd"
      ? "ICD-10 + LLM"
      : match.source === "llm"
        ? "LLM"
        : match.source === "icd"
          ? "ICD-10"
          : match.source === "local"
            ? "Local"
            : null;

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-accent-foreground text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis Complete
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold">Possible Condition Detected</h2>
        <p className="text-muted-foreground">Review the detected condition and proceed to explore treatment options.</p>
        {loading && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/70 border border-border text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refining with ICD-10 + LLM
          </div>
        )}
      </div>

      <Card className="p-6 sm:p-8 shadow-elevated border border-border/60 bg-gradient-soft rounded-3xl overflow-hidden relative">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-primary-soft text-accent-foreground hover:bg-primary-soft border-0">
                {displaySpecialty}
              </Badge>
              <Badge variant="outline" className={cn("border", sev.cls)}>
                {sev.label}
              </Badge>
              {sourceLabel && (
                <Badge variant="outline" className="bg-card/70 border-border text-muted-foreground">
                  {sourceLabel}
                </Badge>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{displayName}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{condition.description}</p>
            {displayName !== condition.name && (
              <p className="text-xs text-muted-foreground mt-2">Care path based on {condition.name}.</p>
            )}
            {match.icd10 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-card/70 border-border text-foreground/80">
                  ICD-10-CM {match.icd10.code}
                </Badge>
                <span className="text-xs text-muted-foreground">{match.icd10.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">AI Confidence Score</span>
            <span className="text-2xl font-bold text-primary">{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-3" />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Common indicators</p>
            <ul className="text-sm text-foreground/80 space-y-1.5">
              {condition.indicators.map((ind) => (
                <li key={ind} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {ind}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Matched from your input</p>
            {matchedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {matchedKeywords.map((k) => (
                  <Badge key={k} variant="outline" className="bg-primary-soft border-primary/20 text-accent-foreground">
                    {k}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">General match based on description.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button onClick={onNext} className="h-12 rounded-2xl bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-card">
          <Check className="h-4 w-4 mr-2" /> Yes, proceed
        </Button>
        <Button onClick={onRefine} variant="outline" className="h-12 rounded-2xl border-2">
          <RefreshCw className="h-4 w-4 mr-2" /> Refine symptoms
        </Button>
        <Button onClick={onNext} variant="outline" className="h-12 rounded-2xl border-2">
          <HelpCircle className="h-4 w-4 mr-2" /> Not sure
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-warning-soft border border-warning/30">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80">
          <strong>Disclaimer:</strong> This is not a medical diagnosis. Please consult a licensed physician for confirmation.
        </p>
      </div>
    </div>
  );
};
