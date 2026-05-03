import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity, AlertCircle, Check, RefreshCw, HelpCircle,
  Sparkles, Stethoscope, AlertTriangle, ChevronRight,
  HelpCircle as QuestionIcon, ListChecks, ArrowRight,
} from "lucide-react";
import { ClinicalMapResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  clinical_result: ClinicalMapResponse;
  onConfirm: (result: ClinicalMapResponse) => void;
  onRefine: () => void;
}

export const StepCondition = ({ clinical_result, onConfirm, onRefine }: Props) => {
  const {
    condition_name, confidence, icd10_code, emergency_flag, reasoning,
    procedures, all_matches, source,
    differential_diagnoses, key_features_detected,
    missing_critical_information, recommended_questions,
    risk_level, next_steps,
  } = clinical_result;

  const displayCondition = condition_name || "Unknown Condition";
  const displayConfidence = confidence || 50;
  const features = key_features_detected?.length ? key_features_detected : (procedures || []);

  // Severity: use LLM risk_level if available, else derive
  const severity =
    emergency_flag || risk_level === "high" ? "high"
    : risk_level === "moderate" || displayConfidence > 75 ? "moderate"
    : "low";

  const severityStyles = {
    low:      { label: "Routine Care",                          cls: "bg-success-soft text-success border-success/20" },
    moderate: { label: "Priority Care",                         cls: "bg-warning-soft text-warning border-warning/20" },
    high:     { label: "Emergency — Seek Immediate Care",       cls: "bg-destructive/10 text-destructive border-destructive/20 font-bold" },
  };
  const sev = severityStyles[severity];

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-accent-foreground text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis Complete
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold">Clinical Mapping Results</h2>
        <p className="text-muted-foreground">Review the AI-mapped conditions and proceed to explore clinical pathways.</p>
      </div>

      {/* Emergency banner */}
      {severity === "high" && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-destructive">Emergency Symptoms Detected</h4>
            <p className="text-sm text-foreground/80 mt-1">
              Your symptoms may indicate a life-threatening condition. Please seek immediate emergency medical care or call an ambulance now.
            </p>
          </div>
        </div>
      )}

      {/* Primary condition card */}
      <Card className="p-6 sm:p-8 shadow-elevated border border-border/60 bg-gradient-soft rounded-3xl overflow-hidden relative">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-primary-soft text-accent-foreground hover:bg-primary-soft border-0">
                <Stethoscope className="w-3 h-3 mr-1" />
                {clinical_result.specialist_type || clinical_result.specialty || "General Medicine"}
              </Badge>
              <Badge variant="outline" className={cn("border", sev.cls)}>{sev.label}</Badge>
              <Badge variant="outline" className="bg-card/70 border-border text-foreground/80 font-mono text-[10px] tracking-wider">
                ICD-10: {icd10_code}
              </Badge>
              {source && (
                <Badge variant="outline" className="bg-card/70 border-border text-muted-foreground text-[10px]">
                  {source.toUpperCase()}
                </Badge>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{displayCondition}</h3>
            {reasoning && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-l-2 border-primary/30 pl-3">
                {reasoning}
              </p>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">AI Diagnostic Confidence</span>
            <span className="text-2xl font-bold text-primary">{displayConfidence}%</span>
          </div>
          <Progress value={displayConfidence} className="h-3" />
          {displayConfidence < 70 && (
            <p className="text-xs text-warning flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              Low confidence — more information may improve accuracy. See questions below.
            </p>
          )}
        </div>

        {/* Key features + ICD alternatives */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Key Clinical Features</p>
            {features.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <Badge key={f} variant="outline" className="bg-primary-soft/50 border-primary/20 text-accent-foreground font-medium py-1 px-2.5">
                    {f}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific features extracted.</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Other ICD-10 Matches</p>
            {all_matches && all_matches.length > 1 ? (
              <ul className="space-y-2.5">
                {all_matches.slice(1, 4).map((m) => (
                  <li key={m.code} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs line-clamp-1">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">{m.code}</span>
                    </div>
                    <button
                      onClick={() => onConfirm({ ...clinical_result, icd10_code: m.code, condition_name: m.name })}
                      className="text-[10px] text-primary hover:underline text-left flex items-center gap-0.5"
                    >
                      Use this diagnosis <ChevronRight className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No strong alternative matches found.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Differential diagnoses */}
      {differential_diagnoses && differential_diagnoses.length > 0 && (
        <Card className="p-5 border border-border/60 rounded-3xl">
          <p className="text-sm font-bold mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Differential Diagnoses
          </p>
          <div className="space-y-3">
            {differential_diagnoses.map((d) => (
              <div key={d.icd10} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50 border border-border/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{d.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{d.icd10}</span>
                    <Badge className={cn("text-[10px] border-0",
                      d.confidence >= 70 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                    )}>
                      {d.confidence}% likely
                    </Badge>
                  </div>
                  {d.reasoning && <p className="text-xs text-muted-foreground mt-1">{d.reasoning}</p>}
                </div>
                <button
                  onClick={() => onConfirm({ ...clinical_result, icd10_code: d.icd10, condition_name: d.name })}
                  className="text-xs text-primary hover:underline shrink-0 flex items-center gap-0.5 mt-0.5"
                >
                  Use <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Missing info + recommended questions */}
      {((missing_critical_information?.length ?? 0) > 0 || (recommended_questions?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(missing_critical_information?.length ?? 0) > 0 && (
            <Card className="p-5 border border-warning/30 bg-warning-soft/30 rounded-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-warning mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Missing Information
              </p>
              <ul className="space-y-1.5">
                {missing_critical_information!.map((item) => (
                  <li key={item} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <span className="text-warning mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(recommended_questions?.length ?? 0) > 0 && (
            <Card className="p-5 border border-primary/20 rounded-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-primary mb-3 flex items-center gap-1.5">
                <QuestionIcon className="h-3.5 w-3.5" /> Questions to Ask Your Doctor
              </p>
              <ul className="space-y-1.5">
                {recommended_questions!.map((q) => (
                  <li key={q} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">?</span> {q}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Next steps */}
      {next_steps && next_steps.length > 0 && (
        <Card className="p-5 border border-border/60 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Recommended Next Steps</p>
          <ol className="space-y-2">
            {next_steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Action buttons — swap primary CTA if confidence < 50% */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {displayConfidence < 50 ? (
          <>
            <Button onClick={onRefine} className="h-12 rounded-2xl bg-warning hover:bg-warning/90 text-warning-foreground font-semibold shadow-card">
              <RefreshCw className="h-4 w-4 mr-2" /> Refine Symptoms First
            </Button>
            <Button onClick={() => onConfirm(clinical_result)} variant="outline" className="h-12 rounded-2xl border-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4 mr-2" /> Continue Anyway
            </Button>
            <Button onClick={() => onConfirm(clinical_result)} variant="outline" className="h-12 rounded-2xl border-2 text-muted-foreground">
              <Check className="h-4 w-4 mr-2" /> View Pathways
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => onConfirm(clinical_result)} className="h-12 rounded-2xl bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-card">
              <Check className="h-4 w-4 mr-2" /> View Treatment Pathways
            </Button>
            <Button onClick={onRefine} variant="outline" className="h-12 rounded-2xl border-2">
              <RefreshCw className="h-4 w-4 mr-2" /> Refine Symptoms
            </Button>
            <Button onClick={() => onConfirm(clinical_result)} variant="outline" className="h-12 rounded-2xl border-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4 mr-2" /> Not Sure (Continue Anyway)
            </Button>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-warning-soft border border-warning/30">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80">
          <strong>Disclaimer:</strong> This is an AI-generated clinical decision support tool, NOT a medical diagnosis. Always consult a licensed physician before making any health decisions.
        </p>
      </div>
    </div>
  );
};
