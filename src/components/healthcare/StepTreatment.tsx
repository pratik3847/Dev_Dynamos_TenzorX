import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Heart, Pill, Check, Activity, Brain, Syringe, Clock, ShieldAlert, Loader2, IndianRupee } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getPathway, PathwayOption } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ICONS = { pill: Pill, heart: Heart, stethoscope: Stethoscope, syringe: Syringe, activity: Activity, brain: Brain };

interface Props {
  icd10_code: string;
  condition_name: string;
  procedures: string[];
  onNext: (treatment: PathwayOption) => void;
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
};

export const StepTreatment = ({ icd10_code, condition_name, procedures, onNext }: Props) => {
  const { token } = useAuth();
  const [pathways, setPathways] = useState<PathwayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const fetchPathways = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await getPathway(token, icd10_code);
        
        let availablePathways = response.pathways;
        
        if (!availablePathways || availablePathways.length === 0) {
          // Fallback pathway generator
          availablePathways = [
            {
              id: "fallback_medical",
              name: "Medical Management",
              type: "non_surgical",
              recommended: true,
              steps: [
                { seq: 1, name: "Specialist Consultation", cost_low: 500, cost_high: 1500 },
                { seq: 2, name: "Diagnostic Investigations", cost_low: 2000, cost_high: 8000 },
                { seq: 3, name: "Medication & Follow-up", cost_low: 1000, cost_high: 4000 }
              ],
              total_cost_low: 3500,
              total_cost_high: 13500,
              note: `Generic pathway generated for ${condition_name}`
            }
          ];
        }
        
        setPathways(availablePathways);
        
        // Auto-select the recommended one, or the first one
        const recommended = availablePathways.find(p => p.recommended);
        setSelected(recommended ? recommended.id : availablePathways[0].id);
        
      } catch (error) {
        console.error("Failed to load pathways:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPathways();
  }, [icd10_code, token, condition_name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-slide-up">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <h3 className="text-xl font-semibold">Loading Clinical Pathways...</h3>
        <p className="text-muted-foreground">Retrieving latest CGHS treatment protocols</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold">Treatment Pathways</h2>
        <p className="text-muted-foreground">
          Compare evidence-based clinical pathways for <span className="font-semibold text-foreground">{condition_name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pathways.map((p) => {
          const isSelected = selected === p.id;
          const isSurgical = p.type === "surgical";
          const MainIcon = isSurgical ? Syringe : Pill;
          
          return (
            <Card
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                "p-6 cursor-pointer border-2 transition-all duration-300 shadow-card hover:shadow-elevated relative rounded-3xl group flex flex-col",
                isSelected
                  ? "border-primary bg-gradient-soft scale-[1.02] shadow-elevated"
                  : "border-border/50 bg-card hover:border-primary/40"
              )}
            >
              {p.recommended && (
                <Badge className="absolute -top-3 right-4 bg-gradient-primary text-primary-foreground border-0 shadow-card px-3 py-1">
                  ★ Recommended
                </Badge>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                    isSelected ? "bg-gradient-primary shadow-glow" : "bg-primary-soft group-hover:bg-gradient-primary"
                  )}
                >
                  <MainIcon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isSelected ? "text-primary-foreground" : "text-primary group-hover:text-primary-foreground"
                    )}
                  />
                </div>
                <Badge variant="outline" className={cn(
                  "font-medium",
                  isSurgical ? "border-warning text-warning bg-warning-soft" : "border-success text-success bg-success-soft"
                )}>
                  {isSurgical ? "Surgical / Invasive" : "Medical Management"}
                </Badge>
              </div>
              
              <h3 className="font-bold text-lg text-foreground leading-tight">{p.name}</h3>
              
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Est. Range:</span>
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {formatINR(p.total_cost_low)} - {formatINR(p.total_cost_high)}
                </span>
              </div>
              
              {p.note && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-l-2 border-primary/20 pl-2">
                  {p.note}
                </p>
              )}

              <div className="mt-5 space-y-2 flex-grow">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Pathway Steps</h4>
                <div className="space-y-3">
                  {p.steps.map((step) => (
                    <div key={step.seq} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-5 w-5 rounded-full bg-secondary-soft text-secondary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {step.seq}
                        </div>
                        {step.seq !== p.steps.length && (
                          <div className="w-px h-full bg-border mt-1"></div>
                        )}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium leading-tight text-foreground/90">{step.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ~ {formatINR(step.cost_low)} - {formatINR(step.cost_high)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "w-full mt-6 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                  isSelected
                    ? "bg-gradient-primary text-primary-foreground shadow-card"
                    : "bg-muted text-foreground/70"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="h-5 w-5 mr-2" /> Selected Pathway
                  </>
                ) : (
                  "Select this pathway"
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          disabled={!selected}
          onClick={() => {
            const selectedPathway = pathways.find((p) => p.id === selected);
            if (selectedPathway) onNext(selectedPathway);
          }}
          className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
        >
          Select Hospital for this Pathway →
        </Button>
      </div>
    </div>
  );
};
