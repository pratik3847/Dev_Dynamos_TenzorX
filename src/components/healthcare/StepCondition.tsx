import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertCircle, Check, RefreshCw, HelpCircle, Loader2, Sparkles, Stethoscope, AlertTriangle } from "lucide-react";
import { ClinicalMapResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  clinical_result: ClinicalMapResponse;
  onConfirm: (result: ClinicalMapResponse) => void;
  onRefine: () => void;
}

export const StepCondition = ({ clinical_result, onConfirm, onRefine }: Props) => {
  const { condition_name, confidence, icd10_code, emergency_flag, reasoning, procedures, all_matches, source } = clinical_result;
  
  const displayCondition = condition_name || "Unknown Condition";
  const displayConfidence = confidence || 50;

  // Derive severity based on emergency_flag and confidence
  const severity = emergency_flag ? "high" : displayConfidence > 80 ? "moderate" : "low";
  
  const severityStyles = {
    low: { label: "Routine Care", cls: "bg-success-soft text-success border-success/20" },
    moderate: { label: "Priority Care", cls: "bg-warning-soft text-warning border-warning/20" },
    high: { label: "Emergency Medical Attention Required", cls: "bg-destructive/10 text-destructive border-destructive/20 font-bold" },
  };
  
  const sev = severityStyles[severity as keyof typeof severityStyles];

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-accent-foreground text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis Complete
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold">Clinical Mapping Results</h2>
        <p className="text-muted-foreground">Review the detected condition and proceed to explore clinical pathways.</p>
      </div>

      {emergency_flag && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-destructive">Emergency Symptoms Detected</h4>
            <p className="text-sm text-foreground/80 mt-1">
              Your symptoms suggest a potentially life-threatening condition. Please seek immediate emergency medical care or call an ambulance.
            </p>
          </div>
        </div>
      )}

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
                {clinical_result.specialty || "General Medicine"}
              </Badge>
              <Badge variant="outline" className={cn("border", sev.cls)}>
                {sev.label}
              </Badge>
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

        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">AI Diagnostic Confidence</span>
            <span className="text-2xl font-bold text-primary">{displayConfidence}%</span>
          </div>
          <Progress value={displayConfidence} className="h-3" />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Key Clinical Features</p>
            {procedures && procedures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {procedures.map((p) => (
                  <Badge key={p} variant="outline" className="bg-primary-soft/50 border-primary/20 text-accent-foreground font-medium py-1 px-2.5">
                    {p}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific features extracted.</p>
            )}
          </div>
          
          <div className="p-4 rounded-2xl bg-card/70 border border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Other Possible Matches</p>
            {all_matches && all_matches.length > 1 ? (
              <ul className="text-sm text-foreground/80 space-y-2.5">
                {all_matches.slice(1, 4).map((m) => (
                  <li key={m.code} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs line-clamp-1">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">{m.code}</span>
                    </div>
                    {/* Allow user to switch to alternative match */}
                    <button 
                      onClick={() => onConfirm({
                        ...clinical_result,
                        icd10_code: m.code,
                        condition_name: m.name
                      })}
                      className="text-[10px] text-primary hover:underline text-left"
                    >
                      Use this diagnosis instead →
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button onClick={() => onConfirm(clinical_result)} className="h-12 rounded-2xl bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-card">
          <Check className="h-4 w-4 mr-2" /> View Treatment Pathways
        </Button>
        <Button onClick={onRefine} variant="outline" className="h-12 rounded-2xl border-2">
          <RefreshCw className="h-4 w-4 mr-2" /> Refine Symptoms
        </Button>
        <Button onClick={() => onConfirm(clinical_result)} variant="outline" className="h-12 rounded-2xl border-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4 mr-2" /> Not Sure (Continue Anyway)
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-warning-soft border border-warning/30">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80">
          <strong>Disclaimer:</strong> This is an AI-generated map of clinical possibilities based on your input. It is NOT a medical diagnosis. Always consult a licensed physician.
        </p>
      </div>
    </div>
  );
};
