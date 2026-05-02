import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Calendar, Download, Landmark, CheckCircle2, AlertTriangle, Receipt, TrendingUp, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Hospital, Treatment, formatINR } from "@/lib/healthcare-data";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { sessionStore } from "@/lib/session-store";
import { Link } from "react-router-dom";

interface Props {
  budget: string;
  hospital: Hospital;
  treatment: Treatment;
  onRestart: () => void;
}

export const StepFinance = ({ budget, hospital, treatment, onRestart }: Props) => {
  const { user } = useAuth();
  const totalCost = hospital.cost;
  const [budgetValue, setBudgetValue] = useState(budget);
  const [prefilledFromProfile, setPrefilledFromProfile] = useState(false);
  const [tenure, setTenure] = useState([24]);
  const [downPayment, setDownPayment] = useState([Math.round(totalCost * 0.2)]);
  const interestRate = 0.11;

  useEffect(() => {
    const stored = sessionStore.get<{ budget: string }>("step_finance_data");
    if (stored?.budget) {
      setBudgetValue(stored.budget);
      return;
    }
    if (budget) {
      setBudgetValue(budget);
      return;
    }
    if (user?.budget_pref) {
      setBudgetValue(String(Math.round(user.budget_pref)));
      setPrefilledFromProfile(true);
    }
  }, [budget, user]);

  useEffect(() => {
    sessionStore.set("step_finance_data", { budget: budgetValue });
  }, [budgetValue]);

  const principal = totalCost - downPayment[0];
  const monthlyRate = interestRate / 12;
  const n = tenure[0];
  const emi = useMemo(
    () =>
      Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)),
    [principal, monthlyRate, n]
  );
  const totalPayable = emi * n + downPayment[0];
  const interestPayable = totalPayable - totalCost;

  const userBudget = parseInt(budgetValue.replace(/[^\d]/g, "")) || 0;
  const hasBudget = userBudget > 0;
  const withinBudget = !hasBudget || totalCost <= userBudget;
  const insuranceCovered = Math.round(totalCost * 0.6);
  const outOfPocket = totalCost - insuranceCovered;

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold">Financial Planning</h2>
        <p className="text-muted-foreground">
          Cost summary for <span className="font-semibold text-foreground">{treatment.name}</span> at{" "}
          <span className="font-semibold text-foreground">{hospital.name}</span>
        </p>
      </div>

      <Card className="p-6 sm:p-8 shadow-elevated border-0 bg-gradient-primary text-primary-foreground rounded-3xl overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-90 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Estimated Total Cost
            </p>
            <p className="text-4xl sm:text-5xl font-bold mt-1.5">{formatINR(totalCost)}</p>
            <p className="text-xs opacity-80 mt-2">{hospital.name} · {treatment.name}</p>
          </div>
          <Wallet className="h-20 w-20 opacity-25" />
        </div>
      </Card>

      <Card className="p-5 rounded-2xl border border-border/60 shadow-card">
        <Label htmlFor="finance-budget" className="text-sm font-semibold text-foreground">
          Your budget (₹)
        </Label>
        <Input
          id="finance-budget"
          value={budgetValue}
          onChange={(e) => {
            setBudgetValue(e.target.value);
            setPrefilledFromProfile(false);
          }}
          placeholder="3,00,000"
          className="mt-2 rounded-xl"
        />
        {prefilledFromProfile && (
          <p className="text-xs text-muted-foreground mt-2">
            Based on your profile — update in settings{" "}
            <Link to="/profile" className="text-primary font-semibold hover:underline">
              Profile
            </Link>
          </p>
        )}
      </Card>

      {hasBudget && (
        <Card
          className={`p-5 border-2 rounded-2xl ${
            withinBudget ? "border-success/40 bg-success-soft" : "border-warning/40 bg-warning-soft"
          }`}
        >
          <div className="flex items-start gap-3">
            {withinBudget ? (
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {withinBudget ? "Within your budget ✓" : "Over your stated budget"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your budget: {formatINR(userBudget)} · Treatment: {formatINR(totalCost)}{" "}
                {!withinBudget && <span className="text-warning font-medium">(+{formatINR(totalCost - userBudget)})</span>}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl border border-border/60 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-secondary" />
            <h3 className="font-bold">Insurance Estimate</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-semibold">{formatINR(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Insurance (~60%)</span>
              <span className="font-semibold text-success">- {formatINR(insuranceCovered)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="font-semibold">Out-of-pocket</span>
              <span className="font-bold text-lg text-primary">{formatINR(outOfPocket)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border border-border/60 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Loan Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Principal</span>
              <span className="font-semibold">{formatINR(principal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest ({n} mo)</span>
              <span className="font-semibold text-warning">+ {formatINR(interestPayable)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="font-semibold">Total payable</span>
              <span className="font-bold text-lg text-primary">{formatINR(totalPayable)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card border border-border/60 rounded-2xl">
        <div className="flex items-center gap-2 mb-5">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">EMI Calculator</h3>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Down payment</span>
              <span className="text-sm font-semibold">{formatINR(downPayment[0])}</span>
            </div>
            <Slider
              value={downPayment}
              onValueChange={setDownPayment}
              min={0}
              max={totalCost}
              step={5000}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tenure</span>
              <span className="text-sm font-semibold">{tenure[0]} months</span>
            </div>
            <Slider value={tenure} onValueChange={setTenure} min={6} max={60} step={6} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-primary-soft">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Monthly EMI
              </p>
              <p className="text-2xl font-bold text-primary mt-1">{formatINR(emi)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-secondary-soft">
              <p className="text-xs text-muted-foreground">Interest rate</p>
              <p className="text-2xl font-bold text-secondary mt-1">11% p.a.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={() => toast.success("Booking request sent!", { description: `${hospital.name} will contact you shortly.` })}
          className="h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
        >
          Book Appointment
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Loan application initiated", { description: "We'll match you with partner lenders." })}
          className="h-12 rounded-2xl border-2"
        >
          <Landmark className="h-4 w-4 mr-2" /> Apply for Loan
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("PDF report ready", { description: "Your care plan has been downloaded." })}
          className="h-12 rounded-2xl border-2"
        >
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>

      <Button onClick={onRestart} variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
        Start a new search
      </Button>

      <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-muted border border-border">
        <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong>Disclaimer:</strong> Costs are estimates based on average data and may vary by hospital, doctor, and case complexity. This tool does not provide medical diagnosis or financial advice — consult licensed professionals before any decision.
        </p>
      </div>
    </div>
  );
};
