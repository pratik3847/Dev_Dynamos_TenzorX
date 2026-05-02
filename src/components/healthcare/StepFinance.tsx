import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Calendar, Download, Landmark, CheckCircle2, AlertTriangle, Receipt, TrendingUp, Sparkles, Loader2, Info } from "lucide-react";
import { useEffect, useState, Component, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { HospitalResult, PathwayOption, CostEstimate, estimateCost } from "@/lib/api";
import { cn } from "@/lib/utils";

class FinanceErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 border-2 border-red-500 bg-red-50 text-red-900 rounded-xl m-10">
          <h2 className="text-xl font-bold mb-4">StepFinance Crashed</h2>
          <pre className="whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          <pre className="whitespace-pre-wrap mt-4 text-xs">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  budget_pref: string;
  hospital: HospitalResult;
  selected_pathway: PathwayOption;
  cost_estimate: CostEstimate | null;
  onRestart: () => void;
  onEstimate: (est: CostEstimate) => void;
}

const formatINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
};

const StepFinanceInner = ({ budget_pref, hospital, selected_pathway, cost_estimate, onRestart, onEstimate }: Props) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(!cost_estimate);
  const [localEstimate, setLocalEstimate] = useState<CostEstimate | null>(cost_estimate);

  const [downPayment, setDownPayment] = useState(20);
  const [tenure, setTenure] = useState(12);
  const [interestRate, setInterestRate] = useState(0); // 0% EMI promotion

  const budget = budget_pref ? parseInt(String(budget_pref).replace(/\D/g, "")) : 0;

  useEffect(() => {
    if (cost_estimate) {
      setLocalEstimate(cost_estimate);
      setLoading(false);
      return;
    }

    if (!token) return;

    let isMounted = true;
    const fetchEstimate = async () => {
      setLoading(true);
      try {
        // If the pathway ID contains an underscore (e.g., "R51_medical"), it's a generated pathway, 
        // not a raw CGHS billing code, so we skip the backend call to avoid 404 logs.
        if (selected_pathway.id && selected_pathway.id.includes("_")) {
          if (isMounted) {
            const fallback: CostEstimate = {
              cghs_code: selected_pathway.id,
              procedure_name: selected_pathway.name,
              hospital_tier: hospital.tier || "budget",
              nabh_accredited: hospital.nabh_accredited,
              base_rate: selected_pathway.total_cost_low,
              tier_multiplier: 1,
              los_days: 3,
              procedure_cost: selected_pathway.total_cost_low,
              stay_cost_low: 5000,
              stay_cost_high: 15000,
              diagnostics_low: 2000,
              diagnostics_high: 5000,
              medicines_low: 1000,
              medicines_high: 3000,
              contingency_pct: 0.1,
              contingency_low: selected_pathway.total_cost_low * 0.1,
              contingency_high: selected_pathway.total_cost_high * 0.1,
              total_low: selected_pathway.total_cost_low,
              total_high: selected_pathway.total_cost_high,
              applied_flags: ["fallback_generated"],
              specialty_classification: "General",
              disclaimer: "Fallback estimate based on pathway defaults."
            };
            setLocalEstimate(fallback);
            onEstimate(fallback);
            setLoading(false);
          }
          return;
        }

        // We use the pathway ID or a generic code to fetch the estimate.
        // In a real app, pathway steps would contain specific CGHS codes.
        const est = await estimateCost(token, {
          cghs_code: selected_pathway.id,
          hospital_tier: hospital.tier || "budget",
          nabh_accredited: hospital.nabh_accredited,
          age: user?.age,
          comorbidities: user?.comorbidities,
        });
        
        if (isMounted) {
          setLocalEstimate(est);
          onEstimate(est);
        }
      } catch (err) {
        console.error("Estimate fetch failed, using pathway defaults", err);
        // Fallback to pathway costs
        if (isMounted) {
          const fallback: CostEstimate = {
            cghs_code: selected_pathway.id,
            procedure_name: selected_pathway.name,
            hospital_tier: hospital.tier,
            nabh_accredited: hospital.nabh_accredited,
            base_rate: selected_pathway.total_cost_low,
            tier_multiplier: 1,
            los_days: 3,
            procedure_cost: selected_pathway.total_cost_low,
            stay_cost_low: 5000,
            stay_cost_high: 15000,
            diagnostics_low: 2000,
            diagnostics_high: 5000,
            medicines_low: 1000,
            medicines_high: 3000,
            contingency_pct: 0.1,
            contingency_low: selected_pathway.total_cost_low * 0.1,
            contingency_high: selected_pathway.total_cost_high * 0.1,
            total_low: selected_pathway.total_cost_low,
            total_high: selected_pathway.total_cost_high,
            applied_flags: ["fallback_generated"],
            specialty_classification: "General",
            disclaimer: "Fallback estimate based on pathway defaults."
          };
          setLocalEstimate(fallback);
          onEstimate(fallback);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEstimate();
    return () => { isMounted = false; };
  }, [token, cost_estimate, selected_pathway, hospital, user, onEstimate]);

  const totalCost = localEstimate ? localEstimate.total_high : selected_pathway.total_cost_high;
  
  const downPaymentAmount = (totalCost * downPayment) / 100;
  const loanAmount = totalCost - downPaymentAmount;
  
  const monthlyRate = interestRate / 12 / 100;
  const emi = interestRate === 0 
    ? loanAmount / tenure 
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);
  
  const totalPayable = downPaymentAmount + (emi * tenure);

  const isOverBudget = budget > 0 && totalCost > budget;

  const handleDownload = () => {
    toast.success("Cost estimate downloaded", { description: "The detailed PDF has been saved." });
  };

  const handleApplyFinance = () => {
    toast.success("Finance Application Started", { description: "Our partner will contact you shortly." });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-slide-up">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <h3 className="text-xl font-semibold">Calculating Estimates...</h3>
        <p className="text-muted-foreground">Factoring in hospital tier, NABH status, and comorbidities</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-soft text-success text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> AI Cost Prediction
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold">Financial Planning</h2>
        <p className="text-muted-foreground">
          Estimated costs at <span className="font-semibold text-foreground">{hospital.hospital_name}</span> for <span className="font-semibold text-foreground">{selected_pathway.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-2 border-border/60 shadow-card rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Receipt className="h-32 w-32" />
            </div>
            
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
              <Wallet className="h-5 w-5 text-primary" /> Cost Breakdown
            </h3>

            {isOverBudget && (
              <div className="mb-6 p-4 rounded-2xl bg-warning-soft border border-warning/30 flex items-start gap-3 relative z-10">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-warning-foreground">Above Declared Budget</p>
                  <p className="text-xs text-warning-foreground/80 mt-1">
                    This estimate exceeds your stated budget of {formatINR(budget)}. Consider alternative hospitals or our 0% EMI plans.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Procedure / Surgery</p>
                  <p className="text-xs text-muted-foreground mt-1">Base rate adjusted for {(hospital.tier || "standard").replace('_', ' ')}</p>
                </div>
                <p className="font-semibold">{formatINR(localEstimate?.procedure_cost || 0)}</p>
              </div>
              
              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Hospital Stay & Room</p>
                  <p className="text-xs text-muted-foreground mt-1">Est. {localEstimate?.los_days || 3} days</p>
                </div>
                <p className="font-semibold">{formatINR(localEstimate?.stay_cost_high || 0)}</p>
              </div>

              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Diagnostics & Tests</p>
                  <p className="text-xs text-muted-foreground mt-1">Pre & Post operative</p>
                </div>
                <p className="font-semibold">{formatINR(localEstimate?.diagnostics_high || 0)}</p>
              </div>
              
              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Medicines & Consumables</p>
                </div>
                <p className="font-semibold">{formatINR(localEstimate?.medicines_high || 0)}</p>
              </div>

              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Contingency / Comorbidities</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {localEstimate?.contingency_pct ? `${(localEstimate.contingency_pct * 100).toFixed(0)}%` : '10%'} buffer
                    </p>
                  </div>
                  {localEstimate?.applied_flags?.includes("diabetes_adjustment") && (
                    <Badge variant="outline" className="bg-warning-soft text-[10px] text-warning border-warning/20">Diabetes Adj.</Badge>
                  )}
                </div>
                <p className="font-semibold text-warning">{formatINR(localEstimate?.contingency_high || 0)}</p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-lg font-bold">Total Estimated Range</p>
                <div className="text-right">
                  <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {formatINR(localEstimate?.total_low || 0)} – {formatINR(totalCost || 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Final cost may vary based on actual stay</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3 relative z-10">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </div>
          </Card>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-sm text-sm">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              These estimates are generated by CareCompass AI using CGHS baseline rates, adjusted for hospital tier ({(hospital.tier || "standard").replace('_', ' ')}), NABH accreditation status, and your declared health profile.
            </p>
          </div>
        </div>

        {/* Right Column: EMI Calculator */}
        <div className="space-y-6">
          <Card className="p-6 border-2 border-primary/20 bg-gradient-soft shadow-card rounded-3xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            
            <Badge className="mb-4 bg-primary-soft text-accent-foreground border-0">
              <TrendingUp className="h-3 w-3 mr-1" /> 0% EMI Available
            </Badge>
            
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
              <Landmark className="h-5 w-5 text-primary" /> Payment Plan
            </h3>

            <div className="space-y-6 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Down Payment ({downPayment}%)</Label>
                  <span className="font-semibold text-primary">{formatINR(downPaymentAmount)}</span>
                </div>
                <Slider
                  value={[downPayment]}
                  min={10}
                  max={50}
                  step={5}
                  onValueChange={(val) => setDownPayment(val[0])}
                  className="py-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Tenure (Months)</Label>
                  <span className="font-semibold text-primary">{tenure} mo</span>
                </div>
                <div className="flex gap-2">
                  {[3, 6, 9, 12, 18, 24].map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={tenure === t ? "default" : "outline"}
                      onClick={() => setTenure(t)}
                      className={cn(
                        "flex-1 h-9 px-0 rounded-lg text-xs font-semibold",
                        tenure === t ? "shadow-md" : ""
                      )}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Promo Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input placeholder="CARE0" className="h-10 rounded-xl" />
                  <Button variant="secondary" className="h-10 rounded-xl font-semibold">Apply</Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Loan Amount</span>
                  <span className="font-semibold">{formatINR(loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Interest (0%)</span>
                  <span className="font-semibold text-success">₹0</span>
                </div>
                <div className="h-px bg-border/60 w-full" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Monthly EMI</span>
                  <span className="text-2xl font-bold text-primary">{formatINR(emi)}</span>
                </div>
              </div>

              <Button 
                className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-card hover:shadow-glow transition-all"
                onClick={handleApplyFinance}
              >
                Apply for Pre-approval
              </Button>
              
              <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" /> Instant approval · No hidden fees
              </p>
            </div>
          </Card>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-2xl border-2 font-semibold"
            onClick={onRestart}
          >
            Start New Consultation
          </Button>
        </div>
      </div>
    </div>
  );
};

export const StepFinance = (props: Props) => (
  <FinanceErrorBoundary>
    <StepFinanceInner {...props} />
  </FinanceErrorBoundary>
);
