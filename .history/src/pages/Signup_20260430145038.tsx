import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  HeartPulse,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Droplet,
  Ruler,
  Weight,
  AlertTriangle,
  Pill,
  ShieldCheck,
  Activity,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Signup = () => {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
    age: "",
    gender: "",
    phone: "",
    city: "",
    bloodGroup: "",
    height: "",
    weight: "",
    allergies: "",
    conditions: "",
    medications: "",
    emergencyName: "",
    emergencyPhone: "",
    insuranceProvider: "",
    insuranceId: "",
  });

  if (user) return <Navigate to="/" replace />;

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const clean = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const toNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const toInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        name: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm,
        age: toInt(form.age),
        gender: clean(form.gender),
        phone: clean(form.phone),
        city: clean(form.city),
        blood_group: clean(form.bloodGroup),
        height_cm: toNumber(form.height),
        weight_kg: toNumber(form.weight),
        allergies: clean(form.allergies),
        conditions: clean(form.conditions),
        medications: clean(form.medications),
        emergency_contact_name: clean(form.emergencyName),
        emergency_contact_phone: clean(form.emergencyPhone),
        insurance_provider: clean(form.insuranceProvider),
        insurance_id: clean(form.insuranceId),
      });
      toast({ title: "Account created!", description: "Welcome to CareCompass AI." });
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      if (message.toLowerCase().includes("email already")) {
        setEmailError(message);
      }
      toast({ title: "Signup failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const SectionTitle = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-3">
            <HeartPulse className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your health profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Help us personalize your healthcare recommendations
          </p>
        </div>

        <Card className="p-6 rounded-2xl shadow-soft border-border/60 bg-card/90 backdrop-blur-xl">
          <form onSubmit={submit} className="space-y-5">
            {/* Account */}
            <SectionTitle icon={ShieldCheck} title="Account" desc="Used to sign in" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary" /> Full name *</Label>
                <Input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="rounded-xl" placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" /> Email *</Label>
                <Input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="rounded-xl" placeholder="you@example.com" />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" /> Phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="rounded-xl" placeholder="+91 90000 00000" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Password *</Label>
                <Input required type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="rounded-xl" placeholder="Min 6 characters" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Confirm password *</Label>
                <Input required type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="rounded-xl" />
              </div>
            </div>

            {/* Personal */}
            <SectionTitle icon={User} title="Personal details" desc="Helps tailor recommendations" />
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min="0" value={form.age} onChange={(e) => update("age", e.target.value)} className="rounded-xl" placeholder="32" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> City</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" placeholder="Mumbai" />
              </div>
            </div>

            {/* Medical */}
            <SectionTitle icon={Activity} title="Medical profile" desc="Used for accurate triage" />
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Droplet className="h-3.5 w-3.5 text-destructive" /> Blood group</Label>
                <select value={form.bloodGroup} onChange={(e) => update("bloodGroup", e.target.value)} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="">Select</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-primary" /> Height (cm)</Label>
                <Input type="number" value={form.height} onChange={(e) => update("height", e.target.value)} className="rounded-xl" placeholder="175" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Weight className="h-3.5 w-3.5 text-primary" /> Weight (kg)</Label>
                <Input type="number" value={form.weight} onChange={(e) => update("weight", e.target.value)} className="rounded-xl" placeholder="72" />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Allergies</Label>
                <Input value={form.allergies} onChange={(e) => update("allergies", e.target.value)} className="rounded-xl" placeholder="Penicillin, peanuts… (or 'None')" />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label>Existing conditions</Label>
                <Input value={form.conditions} onChange={(e) => update("conditions", e.target.value)} className="rounded-xl" placeholder="Diabetes, hypertension… (or 'None')" />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label className="flex items-center gap-1.5"><Pill className="h-3.5 w-3.5 text-primary" /> Current medications</Label>
                <Input value={form.medications} onChange={(e) => update("medications", e.target.value)} className="rounded-xl" placeholder="Metformin 500mg… (or 'None')" />
              </div>
            </div>

            {/* Emergency & Insurance */}
            <SectionTitle icon={ShieldCheck} title="Emergency & insurance" desc="Optional but recommended" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emergency contact name</Label>
                <Input value={form.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Emergency contact phone</Label>
                <Input value={form.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Insurance provider</Label>
                <Input value={form.insuranceProvider} onChange={(e) => update("insuranceProvider", e.target.value)} className="rounded-xl" placeholder="Star Health, HDFC Ergo…" />
              </div>
              <div className="space-y-2">
                <Label>Policy / Member ID</Label>
                <Input value={form.insuranceId} onChange={(e) => update("insuranceId", e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                By creating an account, you agree this is a demo product and not a substitute for medical advice.
              </p>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" /> Create account
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
