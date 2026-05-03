import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet, Download, Landmark, CheckCircle2, AlertTriangle, Receipt, TrendingUp, Sparkles, Loader2, Info, X, ShieldCheck, ExternalLink, Phone } from "lucide-react";
import { useEffect, useState, useRef, Component, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { HospitalResult, PathwayOption, CostEstimate, estimateCost } from "@/lib/api";
import { cn } from "@/lib/utils";


// ── Insurance partners ─────────────────────────────────────────────────────────
interface InsurancePartner {
  name: string;
  tagline: string;
  coverageUpTo: string;
  highlights: string[];
  quoteUrl: string;
  phone: string;
  color: string; // tailwind bg class for the accent strip
}

const INSURANCE_PARTNERS: InsurancePartner[] = [
  {
    name: "Star Health Insurance",
    tagline: "India's largest standalone health insurer",
    coverageUpTo: "₹1 Crore",
    highlights: ["Cashless at 14,000+ hospitals", "No pre-policy medical test up to 50 yrs", "Day-care procedures covered"],
    quoteUrl: "https://www.starhealth.in/health-insurance",
    phone: "1800-425-2255",
    color: "bg-blue-500",
  },
  {
    name: "Niva Bupa Health Insurance",
    tagline: "Formerly Max Bupa — trusted by 1 Cr+ families",
    coverageUpTo: "₹1 Crore",
    highlights: ["Cashless at 10,000+ hospitals", "ReAssure plan with unlimited restore", "No room rent capping"],
    quoteUrl: "https://www.nivabupa.com/health-insurance-plans.html",
    phone: "1860-500-8888",
    color: "bg-purple-500",
  },
  {
    name: "HDFC ERGO Health",
    tagline: "Optima Secure — comprehensive coverage",
    coverageUpTo: "₹2 Crore",
    highlights: ["4x coverage boost benefit", "Cashless at 13,000+ hospitals", "Pre & post hospitalisation covered"],
    quoteUrl: "https://www.hdfcergo.com/health-insurance",
    phone: "022-6234-6234",
    color: "bg-red-500",
  },
  {
    name: "Care Health Insurance",
    tagline: "Formerly Religare Health Insurance",
    coverageUpTo: "₹6 Crore",
    highlights: ["Unlimited restore benefit", "Annual health check-up free", "AYUSH treatment covered"],
    quoteUrl: "https://www.careinsurance.com/health-insurance.html",
    phone: "1800-102-4488",
    color: "bg-green-500",
  },
  {
    name: "Aditya Birla Health Insurance",
    tagline: "Activ Health — rewards healthy living",
    coverageUpTo: "₹2 Crore",
    highlights: ["Earn premium discounts for staying healthy", "Chronic disease management", "Cashless at 11,000+ hospitals"],
    quoteUrl: "https://www.adityabirlacapital.com/healthinsurance/active-health-enhanced",
    phone: "1800-270-7000",
    color: "bg-orange-500",
  },
  {
    name: "Bajaj Allianz Health Guard",
    tagline: "Flexible plans for individuals & families",
    coverageUpTo: "₹1 Crore",
    highlights: ["Cumulative bonus up to 100%", "Cashless at 8,000+ hospitals", "Critical illness add-on available"],
    quoteUrl: "https://www.bajajallianz.com/health-insurance-plans.html",
    phone: "1800-209-0144",
    color: "bg-cyan-500",
  },
];

const InsurancePartnersCard = ({ outOfPocket }: { outOfPocket: number }) => (
  <Card className="p-6 border-2 border-border/60 shadow-card rounded-3xl">
    <div className="flex items-center gap-2 mb-1">
      <ShieldCheck className="h-5 w-5 text-primary" />
      <h3 className="text-xl font-bold">Get Health Insurance</h3>
    </div>
    <p className="text-sm text-muted-foreground mb-6">
      {outOfPocket > 0
        ? `Cover your out-of-pocket cost of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(outOfPocket)} with a health plan.`
        : "Protect yourself from future medical expenses with a health insurance plan."}
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {INSURANCE_PARTNERS.map((p) => (
        <div
          key={p.name}
          className="flex flex-col rounded-2xl border border-border/60 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          {/* colour accent strip */}
          <div className={`h-1.5 w-full ${p.color} shrink-0`} />

          {/* card body — grows to fill height */}
          <div className="flex flex-col flex-1 p-4 gap-3">
            {/* header */}
            <div>
              <p className="font-bold text-sm leading-tight">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.tagline}</p>
            </div>

            {/* coverage badge */}
            <Badge className="self-start bg-success/10 text-success border-0 text-xs font-semibold">
              Up to {p.coverageUpTo}
            </Badge>

            {/* highlights — flex-1 pushes buttons to bottom */}
            <ul className="flex-1 space-y-1.5">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            {/* actions — always at bottom */}
            <div className="flex gap-2 pt-2 mt-auto">
              <a href={p.quoteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" className="w-full rounded-xl text-xs h-8 font-semibold">
                  Get Quote <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
              <a href={`tel:${p.phone.replace(/[^0-9]/g, "")}`} title={`Call ${p.phone}`}>
                <Button size="sm" variant="outline" className="rounded-xl h-8 w-8 p-0 shrink-0">
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>

    <p className="text-[10px] text-muted-foreground mt-5 text-center">
      CareCompass is not affiliated with these insurers. Links open the insurer's official website.
    </p>
  </Card>
);

// ── Error boundary ─────────────────────────────────────────────────────────────
class FinanceErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-10 border-2 border-red-500 bg-red-50 text-red-900 rounded-xl m-10">
        <h2 className="text-xl font-bold mb-4">StepFinance Crashed</h2>
        <pre className="whitespace-pre-wrap">{this.state.error?.toString()}</pre>
      </div>
    );
    return this.props.children;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Props {
  budget_pref: string;
  hospital: HospitalResult;
  selected_pathway: PathwayOption;
  cost_estimate: CostEstimate | null;
  onRestart: () => void;
  onEstimate: (est: CostEstimate) => void;
  age?: number | null;
  comorbidities?: string[];
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

// ── Finance partners ───────────────────────────────────────────────────────────
interface FinancePartner {
  name: string;
  tagline: string;
  loanUpTo: string;
  features: string[];
  applyUrl: (amount: number) => string;
  phone: string;
  color: string;
  badge: string;
}

const FINANCE_PARTNERS: FinancePartner[] = [
  {
    name: "Bajaj Finserv Health EMI",
    tagline: "0% EMI at 1.1 lakh+ hospitals across India",
    loanUpTo: "₹4 Lakh",
    features: ["Instant approval in 2 mins", "0% interest at network hospitals", "No collateral required"],
    applyUrl: (_amt) => "https://www.bajajfinserv.in/health-emi-network-card",
    phone: "1800-103-3535",
    color: "bg-blue-600",
    badge: "Most Popular",
  },
  {
    name: "LazyPay Medical Loan",
    tagline: "Instant medical emergency loans — fully online",
    loanUpTo: "₹5 Lakh",
    features: ["One-time approval, lifetime usage", "No bank visit or collateral", "Pay interest only on amount used"],
    applyUrl: (_amt) => "https://lazypay.in/personal-loan/medical-loan",
    phone: "1860-180-3010",
    color: "bg-green-600",
    badge: "Healthcare Focused",
  },
  {
    name: "KreditBee Medical Loan",
    tagline: "Quick personal loans for medical emergencies",
    loanUpTo: "₹10 Lakh",
    features: ["Disbursal in 10 minutes", "Minimal documentation", "Available 24/7"],
    applyUrl: (_amt) => "https://www.kreditbee.in/personal-loan-for-surgery",
    phone: "080-44292200",
    color: "bg-purple-600",
    badge: "Fast Disbursal",
  },
  {
    name: "Arogya Finance",
    tagline: "India's first dedicated healthcare lender",
    loanUpTo: "₹20 Lakh",
    features: ["Specifically for healthcare", "Covers rural & semi-urban areas", "Decision in 3 hours"],
    applyUrl: (_amt) => "https://lms.arogyafinance.com/los/personal-information/card/create",
    phone: "1800-103-7200",
    color: "bg-orange-600",
    badge: "Healthcare Specialist",
  },
  {
    name: "HDFC Bank Personal Loan",
    tagline: "Trusted bank-backed medical financing",
    loanUpTo: "₹50 Lakh",
    features: ["Competitive rates from 9.99%", "Tenure up to 60 months", "Instant disbursal for existing customers"],
    applyUrl: (_amt) => "https://applyonline.hdfcbank.com/personal-loans.html",
    phone: "1800-202-6161",
    color: "bg-red-600",
    badge: "Bank Backed",
  },
  {
    name: "CASHe Medical Loan",
    tagline: "AI-powered instant loans for salaried individuals",
    loanUpTo: "₹3 Lakh",
    features: ["AI credit scoring — no CIBIL needed", "App-based, fully digital", "Repay in 3–18 months"],
    applyUrl: (_amt) => "https://www.cashe.co.in/",
    phone: "022-6871-4444",
    color: "bg-cyan-600",
    badge: "No CIBIL Needed",
  },
];

// ── Finance Partner Modal ──────────────────────────────────────────────────────
interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  loanAmount: number;
  emi: number;
  tenure: number;
  hospitalName: string;
  procedureName: string;
}

const FinanceModal = ({ open, onClose, loanAmount, emi, tenure, hospitalName, procedureName }: FinanceModalProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleApply = (partner: FinancePartner) => {
    window.open(partner.applyUrl(Math.round(loanAmount)), "_blank", "noopener,noreferrer");
    toast.success(`Opening ${partner.name}`, { description: "Complete your application on their website." });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-primary" /> Choose a Finance Partner
          </DialogTitle>
          <DialogDescription>
            {hospitalName} · {procedureName}
          </DialogDescription>
        </DialogHeader>

        {/* Loan summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {[
            { label: "Loan Amount", value: formatINR(loanAmount) },
            { label: "Monthly EMI", value: formatINR(emi) },
            { label: "Tenure", value: `${tenure} months` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-2xl bg-muted text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-bold text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Partner list */}
        <div className="space-y-3 pb-2">
          {FINANCE_PARTNERS.map((p) => (
            <div
              key={p.name}
              onClick={() => setSelected(selected === p.name ? null : p.name)}
              className={cn(
                "rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200",
                selected === p.name
                  ? "border-primary shadow-md"
                  : "border-border/60 hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <div className={`h-1 w-full ${p.color}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{p.name}</p>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0 font-semibold">{p.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Up to</p>
                    <p className="font-bold text-sm text-primary">{p.loanUpTo}</p>
                  </div>
                </div>

                {/* Expanded details */}
                {selected === p.name && (
                  <div className="mt-4 space-y-3">
                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1 h-9 rounded-xl font-semibold text-sm"
                        onClick={(e) => { e.stopPropagation(); handleApply(p); }}
                      >
                        Apply Now <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                      <a
                        href={`tel:${p.phone.replace(/[^0-9]/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`Call ${p.phone}`}
                      >
                        <Button variant="outline" className="h-9 w-9 rounded-xl p-0">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-1">
          CareCompass is not affiliated with these lenders. You will be redirected to their official website.
        </p>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const StepFinanceInner = ({ budget_pref, hospital, selected_pathway, cost_estimate, onRestart, onEstimate, age, comorbidities = [] }: Props) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(!cost_estimate);
  const [localEstimate, setLocalEstimate] = useState<CostEstimate | null>(cost_estimate);
  const printRef = useRef<HTMLDivElement>(null);

  const [downPayment, setDownPayment] = useState(20);
  const [tenure, setTenure] = useState(12);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState(12); // annual %
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [insuranceCoverage, setInsuranceCoverage] = useState<string>("");

  const budget = budget_pref ? parseInt(String(budget_pref).replace(/\D/g, "")) : 0;

  useEffect(() => {
    if (cost_estimate) { setLocalEstimate(cost_estimate); setLoading(false); return; }
    if (!token) return;
    let isMounted = true;
    const fetchEstimate = async () => {
      setLoading(true);
      try {
        if (selected_pathway.id && selected_pathway.id.includes("_")) {
          if (isMounted) {
            const fallback = buildFallback(selected_pathway, hospital);
            setLocalEstimate(fallback); onEstimate(fallback); setLoading(false);
          }
          return;
        }
        const est = await estimateCost(token, {
          cghs_code: selected_pathway.id,
          hospital_tier: hospital.tier || "budget",
          nabh_accredited: hospital.nabh_accredited,
          age: user?.age,
          comorbidities: user?.comorbidities,
        });
        if (isMounted) { setLocalEstimate(est); onEstimate(est); }
      } catch {
        if (isMounted) {
          const fallback = buildFallback(selected_pathway, hospital);
          setLocalEstimate(fallback); onEstimate(fallback);
        }
      } finally { if (isMounted) setLoading(false); }
    };
    fetchEstimate();
    return () => { isMounted = false; };
  }, [token, cost_estimate, selected_pathway, hospital, user, onEstimate]);

  const rawTotal = localEstimate ? localEstimate.total_high : selected_pathway.total_cost_high;
  const totalCost = rawTotal;

  const MAX_DOWN_PAYMENT = 80;
  const safeDownPayment = Math.min(downPayment, MAX_DOWN_PAYMENT);
  const downPaymentAmount = (totalCost * safeDownPayment) / 100;
  const loanAmount = totalCost - downPaymentAmount;

  const annualRate = useCustomRate ? customRate : 0;
  const monthlyRate = annualRate / 12 / 100;

  const isOverBudget = budget > 0 && totalCost > budget;

  // Insurance
  const insuranceAmount = Math.min(parseFloat(insuranceCoverage.replace(/\D/g, "") || "0") || 0, totalCost);
  const outOfPocket = Math.max(0, totalCost - insuranceAmount);
  const hasInsurance = insuranceAmount > 0;

  // EMI is based on out-of-pocket if insurance is set, else loan amount
  const emiBase = hasInsurance ? outOfPocket : loanAmount;
  const emi = annualRate === 0
    ? emiBase / tenure
    : (emiBase * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1);
  const totalInterest = emi * tenure - emiBase;

  // ── PDF Print handler ────────────────────────────────────────────────────────
  const handleDownload = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) { toast.error("Pop-up blocked. Allow pop-ups and try again."); return; }

    printWindow.document.write(`
      <html><head><title>Cost Estimate – ${hospital.hospital_name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { text-align: left; font-size: 12px; color: #888; padding: 6px 0; border-bottom: 1px solid #eee; }
        td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        td:last-child { text-align: right; font-weight: 600; }
        .total-row td { font-size: 16px; font-weight: 700; border-top: 2px solid #111; border-bottom: none; padding-top: 14px; }
        .emi-box { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .emi-box h2 { font-size: 15px; margin-bottom: 10px; }
        .emi-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; }
      </style></head><body>
      <h1>Cost Estimate</h1>
      <div class="sub">${hospital.hospital_name} &nbsp;·&nbsp; ${selected_pathway.name} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-IN")}</div>
      <table>
        <tr><th>Item</th><th></th></tr>
        <tr><td>Procedure / Surgery</td><td>${formatINR(localEstimate?.procedure_cost || 0)}</td></tr>
        <tr><td>Hospital Stay & Room (${localEstimate?.los_days || 3} days)</td><td>${formatINR(localEstimate?.stay_cost_high || 0)}</td></tr>
        <tr><td>Diagnostics & Tests</td><td>${formatINR(localEstimate?.diagnostics_high || 0)}</td></tr>
        <tr><td>Medicines & Consumables</td><td>${formatINR(localEstimate?.medicines_high || 0)}</td></tr>
        <tr><td>Contingency (${localEstimate?.contingency_pct ? (localEstimate.contingency_pct * 100).toFixed(0) : 10}%)</td><td>${formatINR(localEstimate?.contingency_high || 0)}</td></tr>
        ${hasInsurance ? `<tr><td style="color:green">Insurance Coverage</td><td style="color:green">−${formatINR(insuranceAmount)}</td></tr><tr><td><strong>Out-of-Pocket</strong></td><td><strong>${formatINR(outOfPocket)}</strong></td></tr>` : ""}
        <tr class="total-row"><td>Total Estimated Cost</td><td>${formatINR(localEstimate?.total_low || 0)} – ${formatINR(totalCost)}</td></tr>
      </table>
      <div class="emi-box">
        <h2>Payment Plan</h2>
        <div class="emi-row"><span>Down Payment (${safeDownPayment}%)</span><span>${formatINR(downPaymentAmount)}</span></div>
        <div class="emi-row"><span>${hasInsurance ? "Out-of-Pocket" : "Loan Amount"}</span><span>${formatINR(hasInsurance ? outOfPocket : loanAmount)}</span></div>
        <div class="emi-row"><span>Interest (${annualRate}% p.a.)</span><span>${annualRate === 0 ? "₹0" : formatINR(totalInterest)}</span></div>
        <div class="emi-row"><span>Tenure</span><span>${tenure} months</span></div>        <div class="emi-row" style="font-weight:700;font-size:15px;margin-top:8px"><span>Monthly EMI</span><span>${formatINR(emi)}</span></div>
      </div>
      <div class="footer">Estimates are based on CGHS baseline rates adjusted for hospital tier and NABH status. Final costs may vary.</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
    toast.success("Print dialog opened", { description: "Save as PDF from the print dialog." });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-slide-up">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <h3 className="text-xl font-semibold">Calculating Estimates...</h3>
      <p className="text-muted-foreground">Factoring in hospital tier, NABH status, and comorbidities</p>
    </div>
  );

  return (
    <div className="animate-slide-up space-y-6" ref={printRef}>
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
        {/* Left: Cost Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-2 border-border/60 shadow-card rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Receipt className="h-32 w-32" />
            </div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
              <Wallet className="h-5 w-5 text-primary" /> Cost Breakdown
            </h3>

            {/* Hospital + pathway context */}
            <div className="mb-4 p-3 rounded-2xl bg-muted/50 border border-border/40 relative z-10 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Treatment Plan</span>
                <span className="font-semibold">{selected_pathway.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hospital Tier</span>
                <span className="font-semibold capitalize">{(hospital.tier || "budget").replace("_", " ")}</span>
              </div>
              {hospital.nabh_accredited && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accreditation</span>
                  <span className="font-semibold text-success">NABH Accredited</span>
                </div>
              )}
              {localEstimate?.tier_multiplier && localEstimate.tier_multiplier > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tier Adjustment</span>
                  <span className="font-semibold text-warning">×{localEstimate.tier_multiplier.toFixed(2)}</span>
                </div>
              )}
            </div>

            {isOverBudget && (
              <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col gap-3 relative z-10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-destructive">Cost Exceeds Your Budget by {Math.round(((totalCost - budget) / budget) * 100)}%</p>
                    <p className="text-xs text-foreground/80 mt-1">
                      Estimated cost {formatINR(totalCost)} vs your budget {formatINR(budget)}.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button onClick={onRestart} className="p-2 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-colors">
                    <span className="font-semibold block">1. Switch pathway</span>
                    <span className="text-muted-foreground">Try conservative/medical management</span>
                  </button>
                  <a href="#govt-hospitals" className="p-2 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-colors block">
                    <span className="font-semibold block">2. Government hospitals</span>
                    <span className="text-muted-foreground">CGHS/PMJAY empanelled options</span>
                  </a>
                  <button onClick={() => setShowFinanceModal(true)} className="p-2 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-colors">
                    <span className="font-semibold block">3. EMI financing</span>
                    <span className="text-muted-foreground">0% EMI or medical loan options</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Procedure / Surgery</p>
                  <p className="text-xs text-muted-foreground mt-1">Base rate adjusted for {(hospital.tier || "standard").replace("_", " ")}</p>
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
                <p className="text-sm text-muted-foreground">Medicines & Consumables</p>
                <p className="font-semibold">{formatINR(localEstimate?.medicines_high || 0)}</p>
              </div>
              <div className="flex justify-between items-end pb-4 border-b border-border/60">
                <div>
                  <p className="text-sm text-muted-foreground">Contingency Buffer</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {localEstimate?.contingency_pct ? `${(localEstimate.contingency_pct * 100).toFixed(0)}%` : "12%"} —
                    {comorbidities.length > 0
                      ? ` includes risk adjustment for: ${comorbidities.map(c => {
                          const reasons: Record<string, string> = {
                            diabetes: "wound healing risk",
                            hypertension: "anaesthesia monitoring",
                            ckd: "renal care",
                            cardiac: "cardiac monitoring",
                            obesity: "DVT prophylaxis",
                            asthma: "respiratory monitoring",
                          };
                          return `${c} (${reasons[c] || "risk adjustment"})`;
                        }).join(", ")}`
                      : " standard post-procedure buffer"
                    }
                  </p>
                </div>
                <p className="font-semibold text-warning">{formatINR(localEstimate?.contingency_high || 0)}</p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-lg font-bold">Total Estimated Range</p>
                <div className="text-right">
                  <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {formatINR(localEstimate?.total_low || 0)} – {formatINR(totalCost)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Final cost may vary based on actual stay</p>
                </div>
              </div>

              {/* Pathway steps detail */}
              {selected_pathway.steps && selected_pathway.steps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Treatment Steps ({selected_pathway.steps.length})
                  </p>
                  <div className="space-y-2">
                    {selected_pathway.steps.map((step) => {
                      return (
                        <div key={step.seq} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {step.seq}
                            </span>
                            <span className="text-muted-foreground truncate">{step.name}</span>
                          </div>
                          <span className="font-medium text-foreground shrink-0 ml-2">
                            {formatINR(step.cost_low)} – {formatINR(step.cost_high)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Insurance Coverage */}
            <div className="mt-6 pt-5 border-t border-border/60 relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Insurance Coverage</Label>
                <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary-soft text-accent-foreground">Optional</Badge>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground text-sm font-medium">₹</span>
                <Input
                  placeholder="Enter your coverage amount"
                  className="h-10 rounded-xl"
                  value={insuranceCoverage}
                  onChange={(e) => setInsuranceCoverage(e.target.value.replace(/[^0-9]/g, ""))}
                />
                {hasInsurance && (
                  <button onClick={() => setInsuranceCoverage("")} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {hasInsurance && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-success/10 border border-success/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Insurance Covers</p>
                    <p className="text-lg font-bold text-success">{formatINR(insuranceAmount)}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-warning-soft border border-warning/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Out-of-Pocket</p>
                    <p className="text-lg font-bold text-warning">{formatINR(outOfPocket)}</p>
                  </div>
                </div>
              )}
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
              These estimates are derived from your selected treatment pathway (<span className="font-medium text-foreground">{selected_pathway.name}</span>), adjusted for {hospital.hospital_name}'s tier ({(hospital.tier || "standard").replace("_", " ")}) and NABH accreditation status. Individual step costs are based on CGHS benchmark rates.
            </p>
          </div>
        </div>

        {/* Right: EMI Calculator */}
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
                  <Label>Down Payment ({safeDownPayment}%)</Label>
                  <span className="font-semibold text-primary">{formatINR(downPaymentAmount)}</span>
                </div>
                <Slider value={[safeDownPayment]} min={10} max={MAX_DOWN_PAYMENT} step={5}
                  onValueChange={(val) => setDownPayment(val[0])} className="py-2" />
                {safeDownPayment >= 70 && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> High down payment — EMI will be very low but upfront cost is significant.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Tenure (Months)</Label>
                  <span className="font-semibold text-primary">{tenure} mo</span>
                </div>
                <div className="flex gap-2">
                  {[3, 6, 9, 12, 18, 24].map((t) => (
                    <Button key={t} type="button" variant={tenure === t ? "default" : "outline"} onClick={() => setTenure(t)}
                      className={cn("flex-1 h-9 px-0 rounded-lg text-xs font-semibold", tenure === t ? "shadow-md" : "")}>
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Interest Rate Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Interest Rate</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setUseCustomRate(false)}
                      className={cn("px-2.5 py-1 rounded-lg font-semibold transition-colors",
                        !useCustomRate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      0% Promo
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCustomRate(true)}
                      className={cn("px-2.5 py-1 rounded-lg font-semibold transition-colors",
                        useCustomRate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                {useCustomRate && (
                  <div className="flex items-center gap-2">
                    <Slider value={[customRate]} min={1} max={36} step={0.5}
                      onValueChange={(val) => setCustomRate(val[0])} className="py-2 flex-1" />
                    <span className="text-sm font-semibold text-primary w-12 text-right">{customRate}% p.a.</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{hasInsurance ? "Out-of-Pocket Amount" : "Loan Amount"}</span>
                  <span className="font-semibold">{formatINR(hasInsurance ? outOfPocket : loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Interest ({annualRate}% p.a.)</span>
                  {annualRate === 0
                    ? <span className="font-semibold text-success">₹0</span>
                    : <span className="font-semibold text-warning">{formatINR(totalInterest)}</span>
                  }
                </div>
                {annualRate > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total Payable</span>
                    <span className="font-semibold">{formatINR(emi * tenure)}</span>
                  </div>
                )}
                <div className="h-px bg-border/60 w-full" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">Monthly EMI</span>
                  <span className="text-2xl font-bold text-primary">{formatINR(emi)}</span>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-card hover:shadow-glow transition-all"
                onClick={() => setShowFinanceModal(true)}
              >
                Finance this with EMI <Landmark className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" /> Instant approval · No hidden fees
              </p>
            </div>
          </Card>

          <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-semibold" onClick={onRestart}>
            Start New Consultation
          </Button>
        </div>
      </div>

      {/* Full-width Insurance Partners */}
      <InsurancePartnersCard outOfPocket={outOfPocket} />

      <FinanceModal
        open={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        loanAmount={emiBase}
        emi={emi}
        tenure={tenure}
        hospitalName={hospital.hospital_name}
        procedureName={selected_pathway.name}
      />
    </div>
  );
};

// ── Fallback helper ────────────────────────────────────────────────────────────
// Builds a CostEstimate directly from the pathway steps.
// Steps already have CGHS-priced costs from the clinical engine — no extra multiplier needed.
function buildFallback(selected_pathway: PathwayOption, hospital: HospitalResult): CostEstimate {
  const steps = selected_pathway.steps || [];

  let procedureCostLow = 0, procedureCostHigh = 0;
  let stayLow = 0, stayHigh = 0;
  let diagLow = 0, diagHigh = 0;
  let medLow = 0, medHigh = 0;

  const stayKw = ["stay", "ward", "icu", "admission", "inpatient", "room"];
  const diagKw = ["test", "scan", "mri", "ct", "x-ray", "xray", "ultrasound", "ecg", "echo",
                  "blood", "culture", "biopsy", "lab", "diagnostic", "ns1", "widal", "rdt",
                  "spirometry", "endoscopy", "angiography", "profile", "panel"];
  const medKw  = ["medication", "medicine", "drug", "tablet", "antibiotic", "antiviral",
                  "iv fluid", "saline", "paracetamol", "injection", "vaccine", "transfusion",
                  "nebulisation", "oxygen", "drip", "ors", "fluid"];

  steps.forEach(s => {
    const n = s.name.toLowerCase();
    if (stayKw.some(k => n.includes(k))) {
      stayLow += s.cost_low; stayHigh += s.cost_high;
    } else if (diagKw.some(k => n.includes(k))) {
      diagLow += s.cost_low; diagHigh += s.cost_high;
    } else if (medKw.some(k => n.includes(k))) {
      medLow += s.cost_low; medHigh += s.cost_high;
    } else {
      procedureCostLow += s.cost_low; procedureCostHigh += s.cost_high;
    }
  });

  // If nothing classified as procedure, use pathway totals as base
  if (procedureCostLow === 0 && procedureCostHigh === 0 && steps.length === 0) {
    procedureCostLow  = Math.round(selected_pathway.total_cost_low  * 0.6);
    procedureCostHigh = Math.round(selected_pathway.total_cost_high * 0.6);
    stayLow  = Math.round(selected_pathway.total_cost_low  * 0.2);
    stayHigh = Math.round(selected_pathway.total_cost_high * 0.2);
    diagLow  = Math.round(selected_pathway.total_cost_low  * 0.1);
    diagHigh = Math.round(selected_pathway.total_cost_high * 0.1);
    medLow   = Math.round(selected_pathway.total_cost_low  * 0.1);
    medHigh  = Math.round(selected_pathway.total_cost_high * 0.1);
  }

  const contingencyPct = 0.12;
  const subtotalLow  = procedureCostLow  + stayLow  + diagLow  + medLow;
  const subtotalHigh = procedureCostHigh + stayHigh + diagHigh + medHigh;
  const contingencyLow  = Math.round(subtotalLow  * contingencyPct);
  const contingencyHigh = Math.round(subtotalHigh * contingencyPct);
  const totalLow  = subtotalLow  + contingencyLow;
  const totalHigh = subtotalHigh + contingencyHigh;

  // Estimate LOS from step names
  const losMatch = steps.find(s => s.name.match(/\((\d+)\s*day/i));
  const losStr = losMatch?.name.match(/\((\d+)\s*day/i);
  const los_days = losStr ? parseInt(losStr[1]) : (stayHigh > 0 ? 3 : 0);

  // Tier multiplier stored for display only (steps already priced)
  const tierMult = hospital.tier === "premium" ? 1.8 : hospital.tier === "mid_tier" ? 1.3 : 1.0;
  const nabh = hospital.nabh_accredited ? 1.15 : 1.0;

  const flags: string[] = ["pathway_derived"];
  if (hospital.nabh_accredited) flags.push("nabh_rates_applied");
  if (hospital.tier !== "budget") flags.push(`${hospital.tier}_multiplier`);

  return {
    cghs_code: selected_pathway.id,
    procedure_name: selected_pathway.name,
    hospital_tier: hospital.tier || "budget",
    nabh_accredited: hospital.nabh_accredited,
    base_rate: selected_pathway.total_cost_low,
    tier_multiplier: parseFloat((tierMult * nabh).toFixed(2)),
    los_days,
    procedure_cost: procedureCostHigh,
    stay_cost_low: stayLow,
    stay_cost_high: stayHigh,
    diagnostics_low: diagLow,
    diagnostics_high: diagHigh,
    medicines_low: medLow,
    medicines_high: medHigh,
    contingency_pct: contingencyPct,
    contingency_low: contingencyLow,
    contingency_high: contingencyHigh,
    total_low: totalLow,
    total_high: totalHigh,
    applied_flags: flags,
    specialty_classification: selected_pathway.type === "surgical" ? "Surgery" : "General",
    disclaimer: "Estimate derived from treatment pathway steps, adjusted for hospital tier and NABH status.",
  };
}

// ── Export ─────────────────────────────────────────────────────────────────────
export const StepFinance = (props: Props) => (
  <FinanceErrorBoundary>
    <StepFinanceInner {...props} />
  </FinanceErrorBoundary>
);
