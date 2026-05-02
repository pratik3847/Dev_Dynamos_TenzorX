import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, Send, MapPin, User, Wallet, ShieldCheck, Loader2, Stethoscope, Mic, MicOff, Wand2, LocateFixed } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useGeolocation, GeoCoords } from "@/hooks/use-geolocation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parseSpeech } from "@/lib/parse-speech";
import { useAuth } from "@/context/AuthContext";
import { sessionStore } from "@/lib/session-store";
import { getStates, getDistricts } from "@/lib/api";

const EXAMPLES = [
  "Chest pain while walking",
  "Persistent headache and dizziness",
  "Knee pain when walking, stiffness",
  "High fever with body ache for 3 days",
  "Knee replacement",
  "Angioplasty",
  "Best cancer hospital near Nagpur under 5 lakh",
];

export interface InputData {
  symptoms: string;
  diagnosis?: string;
  age: string;
  budget: string;
  location: string;
  comorbidities?: string[];
  state?: string;
  district?: string;
}

interface Props {
  onNext: (data: InputData, coords?: GeoCoords | null) => void;
  onCoords?: (c: GeoCoords | null) => void;
  coords?: GeoCoords | null;
  initial?: InputData;
}

export const StepInput = ({ onNext, initial, onCoords, coords }: Props) => {
  const { user, token } = useAuth();
  const [symptoms, setSymptoms] = useState(initial?.symptoms ?? "");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [age, setAge] = useState(initial?.age ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [selectedState, setSelectedState] = useState(initial?.state ?? "");
  const [selectedDistrict, setSelectedDistrict] = useState(initial?.district ?? "");
  const [comorbidities, setComorbidities] = useState<string[]>(initial?.comorbidities ?? []);
  const [loading, setLoading] = useState(false);
  
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  const speech = useSpeechRecognition("en-US");
  const geo = useGeolocation();
  const [baseSymptoms, setBaseSymptoms] = useState(initial?.symptoms ?? "");
  const [autoFilled, setAutoFilled] = useState<{ age?: boolean; budget?: boolean; location?: boolean; geo?: boolean }>({});
  const conditions = useMemo(
    () => ["diabetes", "hypertension", "ckd", "cardiac", "obesity", "asthma"],
    []
  );

  useEffect(() => {
    if (!token) return;
    getStates(token).then(setStates);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getDistricts(token, selectedState || undefined).then(setDistricts);
  }, [token, selectedState]);

  useEffect(() => {
    const storedState = sessionStore.get<string>("selected_state");
    const storedDistrict = sessionStore.get<string>("selected_district");
    if (storedState) setSelectedState(storedState);
    if (storedDistrict) setSelectedDistrict(storedDistrict);
  }, []);

  useEffect(() => {
    sessionStore.set("selected_state", selectedState);
    sessionStore.set("selected_district", selectedDistrict);
  }, [selectedState, selectedDistrict]);

  useEffect(() => {
    const stored = sessionStore.get<InputData>("step_input_data");
    if (stored) {
      setSymptoms(stored.symptoms ?? "");
      setDiagnosis(stored.diagnosis ?? "");
      setAge(stored.age ?? "");
      setBudget(stored.budget ?? "");
      setLocation(stored.location ?? "");
      setComorbidities(stored.comorbidities ?? []);
      return;
    }

    const hasInitial =
      Boolean(initial?.symptoms) ||
      Boolean(initial?.diagnosis) ||
      Boolean(initial?.age) ||
      Boolean(initial?.budget) ||
      Boolean(initial?.location) ||
      Boolean(initial?.comorbidities?.length);
    if (hasInitial) return;

    if (user?.age) {
      setAge(String(user.age));
      setAutoFilled((p) => ({ ...p, age: true }));
    }
    if (user?.city) {
      setLocation(user.city);
      setAutoFilled((p) => ({ ...p, location: true }));
    }
    if (user?.comorbidities?.length) {
      setComorbidities(user.comorbidities);
    }
    if (user?.city && !selectedDistrict) {
      setSelectedDistrict(user.city);
    }
  }, [initial, user]);

  useEffect(() => {
    const handle = setTimeout(() => {
      sessionStore.set("step_input_data", {
        symptoms,
        diagnosis,
        age,
        budget,
        location,
        comorbidities,
        state: selectedState,
        district: selectedDistrict
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [symptoms, diagnosis, age, budget, location, comorbidities, selectedState, selectedDistrict]);

  // When geolocation resolves, fill location & propagate coords up.
  useEffect(() => {
    if (geo.data) {
      onCoords?.({ lat: geo.data.lat, lng: geo.data.lng, accuracy: geo.data.accuracy });
      if (geo.data.city) {
        setLocation(geo.data.city);
        setAutoFilled((p) => ({ ...p, location: true, geo: true }));
      }
    }
  }, [geo.data, onCoords]);

  useEffect(() => {
    if (geo.error) {
      toast({ title: "Location error", description: geo.error, variant: "destructive" });
    }
  }, [geo.error]);

  useEffect(() => {
    if (!speech.listening && !speech.transcript && !speech.interim) return;
    const live = [speech.transcript, speech.interim].filter(Boolean).join(" ").trim();
    if (!live) return;

    const combined = baseSymptoms ? `${baseSymptoms.trim()} ${live}` : live;
    const parsed = parseSpeech(combined);

    setSymptoms(parsed.cleaned || combined);

    const newly: { age?: boolean; budget?: boolean; location?: boolean } = {};
    if (parsed.age && parsed.age !== age) {
      setAge(parsed.age);
      newly.age = true;
    }
    if (parsed.budget && parsed.budget !== budget) {
      setBudget(parsed.budget);
      newly.budget = true;
    }
    if (parsed.location && parsed.location !== location) {
      setLocation(parsed.location);
      newly.location = true;
      onCoords?.(null);
    }
    if (Object.keys(newly).length) {
      setAutoFilled((prev) => ({ ...prev, ...newly }));
    }
  }, [speech.transcript, speech.interim, speech.listening, baseSymptoms]);

  useEffect(() => {
    if (speech.error) {
      toast({
        title: "Microphone error",
        description:
          speech.error === "not-allowed"
            ? "Please allow microphone access in your browser."
            : speech.error,
        variant: "destructive",
      });
    }
  }, [speech.error]);

  const toggleMic = () => {
    if (!speech.supported) {
      toast({
        title: "Voice input not supported",
        description: "Try Chrome, Edge, or Safari for voice symptom input.",
        variant: "destructive",
      });
      return;
    }
    if (speech.listening) {
      speech.stop();
    } else {
      setBaseSymptoms(symptoms);
      speech.reset();
      speech.start();
      toast({ title: "Listening…", description: "Describe your symptoms out loud." });
    }
  };

  const handleSubmit = () => {
    if (!symptoms.trim() && !diagnosis.trim()) return;
    if (speech.listening) speech.stop();
    setLoading(true);
    setTimeout(() => onNext({ symptoms, diagnosis, age, budget, location, comorbidities, state: selectedState, district: selectedDistrict }, coords ?? null), 700);
  };

  const handleUseLocation = () => {
    geo.request();
    toast({ title: "Detecting your location…", description: "We'll use this to find nearby hospitals." });
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-accent-foreground text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Healthcare Navigator
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-balance">
          How can we help you today?
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg text-balance">
          Describe your symptoms in plain language. We'll guide you to the right care, transparent costs, and trusted hospitals.
        </p>
      </div>

      <Card className="p-6 sm:p-8 shadow-elevated border border-border/60 bg-card rounded-3xl">
        <div className="flex items-center justify-between mb-3">
          <Label htmlFor="symptoms" className="text-sm font-semibold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Describe your symptoms
          </Label>
          {speech.listening && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
              Listening…
            </div>
          )}
        </div>
        <div className="relative">
          <Textarea
            id="symptoms"
            placeholder="e.g. chest pain, fatigue, shortness of breath — or tap the mic to speak"
            value={symptoms}
            onChange={(e) => {
              setSymptoms(e.target.value);
              if (!speech.listening) setBaseSymptoms(e.target.value);
            }}
            className="min-h-[110px] resize-none rounded-2xl border-border/70 focus-visible:ring-primary text-base bg-muted/30 pr-14"
          />
          <button
            type="button"
            onClick={toggleMic}
            aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
            title={
              speech.supported
                ? speech.listening
                  ? "Stop listening"
                  : "Speak your symptoms"
                : "Voice input not supported in this browser"
            }
            className={cn(
              "absolute bottom-3 right-3 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-card",
              speech.listening
                ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                : "bg-gradient-primary text-primary-foreground hover:shadow-glow",
              !speech.supported && "opacity-50 cursor-not-allowed",
            )}
          >
            {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
        {speech.listening && speech.interim && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            <span className="text-primary">●</span> {speech.interim}
          </p>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/80">You can ask about:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Symptoms (e.g., "chest pain while walking")</li>
            <li>Conditions or procedures (e.g., "knee replacement", "angioplasty")</li>
            <li>Preference-based queries (e.g., "best cancer hospital near Nagpur under 5 lakh")</li>
          </ul>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="diagnosis" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
            <ShieldCheck className="h-3.5 w-3.5" /> Known diagnosis (optional)
          </Label>
          <Input
            id="diagnosis"
            placeholder="e.g. Type 2 diabetes, osteoarthritis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="rounded-xl h-11"
          />
          <p className="text-[11px] text-muted-foreground">We'll reconcile it with your symptoms.</p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground mb-2.5">Try these examples</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setSymptoms(ex)}
                className="text-xs px-3.5 py-2 rounded-full bg-muted hover:bg-primary-soft text-foreground/80 hover:text-accent-foreground border border-transparent hover:border-primary/30 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7 pt-6 border-t border-border/60">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
              State (optional — helps find nearby hospitals)
            </Label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
              District (optional)
            </Label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
              <User className="h-3.5 w-3.5" /> Age <span className="text-muted-foreground/50">(optional)</span>
              {autoFilled.age && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                  <Wand2 className="h-3 w-3" /> auto
                </span>
              )}
            </Label>
            <Input
              id="age"
              type="number"
              placeholder="35"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setAutoFilled((p) => ({ ...p, age: false }));
              }}
              className={cn("rounded-xl h-11 transition-all", autoFilled.age && "border-success/60 bg-success-soft/40 ring-1 ring-success/30")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
              <Wallet className="h-3.5 w-3.5" /> Budget (₹) <span className="text-muted-foreground/50">(optional)</span>
              {autoFilled.budget && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                  <Wand2 className="h-3 w-3" /> auto
                </span>
              )}
            </Label>
            <Input
              id="budget"
              placeholder="3,00,000"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setAutoFilled((p) => ({ ...p, budget: false }));
              }}
              className={cn("rounded-xl h-11 transition-all", autoFilled.budget && "border-success/60 bg-success-soft/40 ring-1 ring-success/30")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
              <MapPin className="h-3.5 w-3.5" /> Location
              {(autoFilled.location || coords) && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                  {autoFilled.geo || coords ? <LocateFixed className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                  {autoFilled.geo || coords ? "GPS" : "auto"}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="City/Town"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setAutoFilled((p) => ({ ...p, location: false, geo: false }));
                  if (coords) onCoords?.(null);
                }}
                className={cn(
                  "rounded-xl h-11 transition-all flex-1",
                  (autoFilled.location || coords) && "border-success/60 bg-success-soft/40 ring-1 ring-success/30",
                )}
              />
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={geo.loading}
                title="Use my current location"
                aria-label="Use my current location"
                className={cn(
                  "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-all border",
                  coords
                    ? "bg-success-soft text-success border-success/40"
                    : "bg-gradient-primary text-primary-foreground border-transparent hover:shadow-glow",
                  geo.loading && "opacity-70 cursor-wait",
                )}
              >
                {geo.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              </button>
            </div>
            {coords && (
              <p className="text-[10px] text-muted-foreground mt-1">
                📍 {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                {geo.data?.accuracy ? ` · ±${Math.round(geo.data.accuracy)}m` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <Label className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
            Existing conditions (optional)
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {conditions.map((cond) => {
              const active = comorbidities.includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() =>
                    setComorbidities((prev) =>
                      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    active
                      ? "bg-secondary-soft text-secondary border-secondary/40"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {cond}
                </button>
              );
            })}
          </div>
        </div>

        {(autoFilled.age || autoFilled.budget || autoFilled.location) && (
          <p className="mt-3 text-xs text-success flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Auto-filled from your voice — edit any field to override.
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!(symptoms.trim() || diagnosis.trim()) || loading}
          className="w-full mt-6 h-12 rounded-2xl bg-gradient-primary hover:opacity-95 hover:shadow-glow text-primary-foreground font-semibold shadow-card transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing input...
            </>
          ) : (
            <>
              Analyze Input <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/60">
          <ShieldCheck className="h-4 w-4 text-success shrink-0" />
          <span>HIPAA-aware design — data stays on your device</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/60">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>AI matches 50+ common conditions instantly</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/60">
          <Wallet className="h-4 w-4 text-secondary shrink-0" />
          <span>Transparent treatment & hospital pricing</span>
        </div>
      </div>
    </div>
  );
};
