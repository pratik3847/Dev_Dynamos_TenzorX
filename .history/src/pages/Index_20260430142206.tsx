import { useMemo, useState } from "react";
import { StepInput, InputData } from "@/components/healthcare/StepInput";
import { StepCondition } from "@/components/healthcare/StepCondition";
import { StepTreatment } from "@/components/healthcare/StepTreatment";
import { StepHospitals } from "@/components/healthcare/StepHospitals";
import { StepFinance } from "@/components/healthcare/StepFinance";
import { Button } from "@/components/ui/button";
import { HeartPulse, ArrowLeft, ShieldCheck, LogOut } from "lucide-react";
import { matchCondition, Hospital, Treatment, TREATMENTS } from "@/lib/healthcare-data";
import { GeoCoords } from "@/hooks/use-geolocation";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<InputData>({
    symptoms: "",
    age: user?.age || "",
    budget: "",
    location: user?.city || "Mumbai",
  });
  const [treatment, setTreatment] = useState<Treatment>(TREATMENTS["angioplasty"]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [coords, setCoords] = useState<GeoCoords | null>(null);

  const match = useMemo(() => matchCondition(data.symptoms || ""), [data.symptoms]);

  const restart = () => {
    setStep(1);
    setData({ symptoms: "", age: "", budget: "", location: "Mumbai" });
    setHospital(null);
    setCoords(null);
  };

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                CareCompass <span className="bg-gradient-primary bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Healthcare Navigator & Cost Estimator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-soft text-success text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure
            </div>
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <div className="h-6 w-6 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.fullName}</span>
              </div>
            )}
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="rounded-xl" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        {step === 1 && (
          <StepInput
            initial={data}
            onNext={(d, c) => {
              setData(d);
              if (c) setCoords(c);
              setStep(2);
            }}
            onCoords={setCoords}
            coords={coords}
          />
        )}
        {step === 2 && (
          <StepCondition match={match} onNext={() => setStep(3)} onRefine={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepTreatment
            condition={match.condition}
            onNext={(t) => {
              setTreatment(t);
              setStep(4);
            }}
          />
        )}
        {step === 4 && (
          <StepHospitals
            specialty={match.condition.specialty}
            city={data.location}
            coords={coords}
            onNext={(h) => {
              setHospital(h);
              setStep(5);
            }}
          />
        )}
        {step === 5 && hospital && (
          <StepFinance budget={data.budget} hospital={hospital} treatment={treatment} onRestart={restart} />
        )}
      </main>

      <footer className="border-t border-border/60 bg-card/40 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CareCompass AI · Built for transparent, accessible healthcare ·{" "}
          <span className="text-foreground/70">Not a substitute for medical advice.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
