import { useEffect, useMemo, useRef, useState } from "react";
import { StepInput, InputData } from "@/components/healthcare/StepInput";
import { StepCondition } from "@/components/healthcare/StepCondition";
import { StepTreatment } from "@/components/healthcare/StepTreatment";
import { StepHospitals } from "@/components/healthcare/StepHospitals";
import { StepFinance } from "@/components/healthcare/StepFinance";
import { NavbarHospitalSearch } from "@/components/NavbarHospitalSearch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, LogOut, UserRound, Loader2 } from "lucide-react";
import { mapSymptoms, ClinicalMapResponse, PathwayOption, HospitalResult, CostEstimate } from "@/lib/api";
import { GeoCoords } from "@/hooks/use-geolocation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sessionStore } from "@/lib/session-store";
import { LogoutDialog } from "@/components/LogoutDialog";
import { useLogoutHandler } from "@/lib/logout";
import { useNavigate } from "react-router-dom";

export interface NavigatorFlowState {
  query: string;
  age: number | null;
  comorbidities: string[];
  city: string;
  district: string;
  has_diagnosis: boolean;
  direct_diagnosis: string | null;
  clinical_result: ClinicalMapResponse | null;
  selected_pathway: PathwayOption | null;
  selected_hospital: HospitalResult | null;
  cost_estimate: CostEstimate | null;
  budget_pref: string;
}

const LOADING_MESSAGES = [
  "Analyzing symptoms...",
  "Searching ICD-10 database...",
  "Mapping clinical pathways...",
  "Almost ready..."
];

const Index = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const storedInput = sessionStore.get<InputData>("step_input_data");
  const storedStep = sessionStore.get<number>("navigator_current_step");
  
  const [step, setStep] = useState(() => (storedStep && storedStep > 0 ? storedStep : 1));
  
  // Single unified flow state
  const [flowState, setFlowState] = useState<NavigatorFlowState>({
    query: storedInput?.symptoms ?? "",
    age: storedInput?.age ? parseInt(storedInput.age) : (user?.age ?? null),
    comorbidities: storedInput?.comorbidities ?? user?.comorbidities ?? [],
    city: storedInput?.location ?? user?.city ?? "Mumbai",
    district: "",
    has_diagnosis: !!storedInput?.diagnosis,
    direct_diagnosis: storedInput?.diagnosis ?? null,
    clinical_result: null,
    selected_pathway: null,
    selected_hospital: null,
    cost_estimate: null,
    budget_pref: storedInput?.budget ?? ""
  });

  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const [isMapping, setIsMapping] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMapping) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isMapping]);

  const initials = useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }, [user]);

  const handleStepInputComplete = async (d: InputData, c: GeoCoords | null) => {
    if (!token) return;
    setCoords(c);
    
    // Update base flow state
    const newState: NavigatorFlowState = {
      ...flowState,
      query: d.symptoms,
      age: d.age ? parseInt(d.age) : null,
      comorbidities: d.comorbidities,
      city: d.location,
      has_diagnosis: !!d.diagnosis,
      direct_diagnosis: d.diagnosis || null,
      budget_pref: d.budget
    };
    setFlowState(newState);

    // Call mapSymptoms
    setIsMapping(true);
    setLoadingMsgIdx(0);
    
    try {
      const result = await mapSymptoms(token, {
        symptoms: d.symptoms,
        age: newState.age,
        location: newState.city,
        comorbidities: newState.comorbidities
      });
      
      setFlowState(prev => ({ ...prev, clinical_result: result }));
      setStep(2);
    } catch (error) {
      toast({
        title: "Clinical Mapping Failed",
        description: "Please check your network and try again.",
        variant: "destructive"
      });
    } finally {
      setIsMapping(false);
    }
  };

  const restart = () => {
    setStep(1);
    setFlowState({
      query: "",
      age: null,
      comorbidities: [],
      city: "Mumbai",
      district: "",
      has_diagnosis: false,
      direct_diagnosis: null,
      clinical_result: null,
      selected_pathway: null,
      selected_hospital: null,
      cost_estimate: null,
      budget_pref: ""
    });
    setCoords(null);
    sessionStore.clear("step_input_data");
    sessionStore.clear("step_finance_data");
    sessionStore.set("navigator_current_step", 1);
  };

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="CureWise"
                className="h-10 w-10 rounded-2xl object-cover shadow-glow"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                  CureWise <span className="bg-gradient-primary bg-clip-text text-transparent">AI</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Healthcare Navigator</p>
              </div>
            </div>
            
            {/* Navbar Search */}
            <div className="hidden md:block w-64 ml-4">
              <NavbarHospitalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-soft text-success text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure
            </div>
            {step > 1 && !isMapping && (
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

      {/* Loading Overlay */}
      {isMapping && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-card p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full border border-primary/20">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="relative bg-gradient-primary w-16 h-16 rounded-full flex items-center justify-center shadow-glow">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Analyzing Clinical Data</h3>
            <p className="text-muted-foreground text-center animate-pulse">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        </div>
      )}

      <div className="w-full px-2 sm:px-4 py-6" aria-hidden="true" />

      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        {step === 1 && (
          <StepInput
            initial={{
              symptoms: flowState.query,
              diagnosis: flowState.direct_diagnosis || "",
              age: flowState.age?.toString() || "",
              budget: flowState.budget_pref,
              location: flowState.city,
              comorbidities: flowState.comorbidities
            }}
            onNext={handleStepInputComplete}
            onCoords={setCoords}
            coords={coords}
          />
        )}
        {step === 2 && flowState.clinical_result && (
          <StepCondition 
            clinical_result={flowState.clinical_result} 
            onConfirm={(result) => {
              setFlowState(prev => ({ ...prev, clinical_result: result }));
              setStep(3);
            }} 
            onRefine={() => setStep(1)} 
          />
        )}
        {step === 3 && flowState.clinical_result && (
          <StepTreatment
            icd10_code={flowState.clinical_result.icd10_code}
            condition_name={flowState.clinical_result.condition_name || "Unknown Condition"}
            procedures={flowState.clinical_result.procedures}
            age={flowState.age}
            comorbidities={flowState.comorbidities}
            budget={flowState.budget_pref}
            onNext={(t) => {
              setFlowState(prev => ({ ...prev, selected_pathway: t }));
              setStep(4);
            }}
          />
        )}
        {step === 4 && flowState.clinical_result && flowState.selected_pathway && (
          <StepHospitals
            icd10_code={flowState.clinical_result.icd10_code}
            condition_name={flowState.clinical_result.condition_name || ""}
            selected_pathway={flowState.selected_pathway}
            city={flowState.city}
            coords={coords}
            onNext={(h) => {
              setFlowState(prev => ({ ...prev, selected_hospital: h }));
              setStep(5);
            }}
          />
        )}
        {step === 5 && flowState.selected_hospital && flowState.selected_pathway && (
          <StepFinance 
            hospital={flowState.selected_hospital} 
            selected_pathway={flowState.selected_pathway} 
            cost_estimate={flowState.cost_estimate}
            budget_pref={flowState.budget_pref}
            age={flowState.age}
            comorbidities={flowState.comorbidities}
            onRestart={restart} 
            onEstimate={(est) => setFlowState(prev => ({ ...prev, cost_estimate: est }))}
          />
        )}
      </main>

      <footer className="border-t border-border/60 bg-card/40 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CureWise AI · Built for transparent, accessible healthcare ·{" "}
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
