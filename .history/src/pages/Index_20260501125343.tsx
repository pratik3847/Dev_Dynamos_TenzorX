import { useEffect, useMemo, useRef, useState } from "react";
import { StepInput, InputData } from "@/components/healthcare/StepInput";
import { StepCondition } from "@/components/healthcare/StepCondition";
import { StepTreatment } from "@/components/healthcare/StepTreatment";
import { StepHospitals } from "@/components/healthcare/StepHospitals";
import { StepFinance } from "@/components/healthcare/StepFinance";
import { Button } from "@/components/ui/button";
import { HeartPulse, ArrowLeft, ShieldCheck, LogOut, UserRound } from "lucide-react";
import { matchDiagnosis } from "@/lib/api";
import { matchCondition, Hospital, MatchResult, Treatment, TREATMENTS } from "@/lib/healthcare-data";
import { GeoCoords } from "@/hooks/use-geolocation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sessionStore } from "@/lib/session-store";
import { LogoutDialog } from "@/components/LogoutDialog";
import { useLogoutHandler } from "@/lib/logout";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storedInput = sessionStore.get<InputData>("step_input_data");
  const storedStep = sessionStore.get<number>("navigator_current_step");
  const [step, setStep] = useState(() => (storedStep && storedStep > 0 ? storedStep : 1));
  const initialInput: InputData = {
    symptoms: storedInput?.symptoms ?? "",
    diagnosis: storedInput?.diagnosis ?? "",
    age: storedInput?.age ?? (user?.age ? String(user.age) : ""),
    budget: storedInput?.budget ?? "",
    location: storedInput?.location ?? (user?.city || "Mumbai"),
    comorbidities: storedInput?.comorbidities ?? user?.comorbidities ?? [],
  };
  const [data, setData] = useState<InputData>(initialInput);
  const [treatment, setTreatment] = useState<Treatment>(TREATMENTS["angioplasty"]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [match, setMatch] = useState<MatchResult>(() => {
    const seed = initialInput.diagnosis?.trim() || initialInput.symptoms.trim();
    const local = matchCondition(seed || "");
    return { ...local, displayName: initialInput.diagnosis?.trim() || undefined, source: "local" };
  });
  const [matchLoading, setMatchLoading] = useState(false);
  const lastMatchKey = useRef("");
  const matchRequestId = useRef(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleLogout = useLogoutHandler();

  useEffect(() => {
    sessionStore.set("navigator_current_step", step);
  }, [step]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const initials = useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }, [user]);

  const buildLocalMatch = (input: InputData): MatchResult => {
    const seed = input.diagnosis?.trim() || input.symptoms.trim();
    const local = matchCondition(seed || "");
    return { ...local, displayName: input.diagnosis?.trim() || undefined, source: "local" };
  };

  const mergeApiMatch = (input: InputData, api: Awaited<ReturnType<typeof matchDiagnosis>>): MatchResult => {
    const preferredName = api.condition_name?.trim() || api.icd10?.name || input.diagnosis?.trim() || input.symptoms.trim();
    const local = matchCondition(preferredName || "");
    return {
      ...local,
      confidence: api.confidence ?? local.confidence,
      displayName: api.condition_name?.trim() || api.icd10?.name || input.diagnosis?.trim() || undefined,
      displaySpecialty: api.specialty || local.condition.specialty,
      icd10: api.icd10,
      source: api.source ?? "icd",
    };
  };

  const resolveMatch = async (input: InputData) => {
    const key = `${input.symptoms.trim()}|${input.diagnosis?.trim() || ""}`;
    if (!key.replace("|", "").trim()) return;
    if (lastMatchKey.current === key) return;
    lastMatchKey.current = key;

    const local = buildLocalMatch(input);
    setMatch(local);
    setMatchLoading(true);
    const requestId = ++matchRequestId.current;

    try {
      const api = await matchDiagnosis({ symptoms: input.symptoms, diagnosis: input.diagnosis });
      if (requestId !== matchRequestId.current) return;
      setMatch(mergeApiMatch(input, api));
    } catch (error) {
      if (requestId !== matchRequestId.current) return;
      toast({
        title: "Match service unavailable",
        description: "Using local symptom matching for now.",
        variant: "destructive",
      });
      setMatch(local);
    } finally {
      if (requestId === matchRequestId.current) setMatchLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 2) return;
    void resolveMatch(data);
  }, [step, data]);

  const restart = () => {
    setStep(1);
    const cleared: InputData = { symptoms: "", diagnosis: "", age: "", budget: "", location: "Mumbai", comorbidities: [] };
    setData(cleared);
    setMatch(buildLocalMatch(cleared));
    setHospital(null);
    setCoords(null);
    sessionStore.clear("step_input_data");
    sessionStore.clear("step_finance_data");
    sessionStore.set("navigator_current_step", 1);
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
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="h-10 w-10 rounded-full bg-secondary-soft text-secondary font-semibold flex items-center justify-center shadow-card"
                  title="Account menu"
                >
                  {initials || <UserRound className="h-4 w-4" />}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/60 bg-card shadow-elevated p-2 z-30">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="h-px bg-border/70 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-muted"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowLogoutDialog(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="w-full px-2 sm:px-4 py-6" aria-hidden="true" />

      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        {step === 1 && (
          <StepInput
            initial={data}
            onNext={(d, c) => {
              setData(d);
              if (c) setCoords(c);
              void resolveMatch(d);
              setStep(2);
            }}
            onCoords={setCoords}
            coords={coords}
          />
        )}
        {step === 2 && (
          <StepCondition match={match} loading={matchLoading} onNext={() => setStep(3)} onRefine={() => setStep(1)} />
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
            specialty={match.displaySpecialty || match.condition.specialty}
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

      <LogoutDialog
        isOpen={showLogoutDialog}
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={() => {
          setShowLogoutDialog(false);
          handleLogout();
        }}
      />
    </div>
  );
};

export default Index;
