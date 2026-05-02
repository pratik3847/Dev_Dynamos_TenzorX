import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, LogOut, User, ShieldCheck, HeartPulse, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { LogoutDialog } from "@/components/LogoutDialog";
import { useLogoutHandler } from "@/lib/logout";
import { UpdateProfilePayload, UserResponse } from "@/lib/api";

const COMORBIDITY_OPTIONS = ["diabetes", "hypertension", "ckd", "cardiac", "obesity", "asthma"];

const parseTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items: string[]) => Array.from(new Set(items));

const TagList = ({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) => {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
        >
          {tag}
          <button type="button" onClick={() => onRemove(tag)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

const applyProfileState = (
  user: UserResponse,
  setPersonal: (value: PersonalState) => void,
  setAllergies: (value: string) => void,
  setMedications: (value: string) => void,
  setSelectedComorbidities: (value: string[]) => void,
  setOtherComorbidities: (value: string) => void,
  setMedical: (value: MedicalState) => void,
) => {
  setPersonal({
    age: user.age?.toString() ?? "",
    gender: user.gender ?? "",
    phone: user.phone ?? "",
    city: user.city ?? "",
    pincode: user.pincode ?? "",
    blood_group: user.blood_group ?? "",
    height_cm: user.height_cm?.toString() ?? "",
    weight_kg: user.weight_kg?.toString() ?? "",
    budget_pref: user.budget_pref?.toString() ?? "",
  });
  setAllergies((user.allergies ?? []).join(", "));
  setMedications((user.medications ?? []).join(", "));
  const known = (user.comorbidities ?? []).map((c) => c.toLowerCase());
  const selected = known.filter((c) => COMORBIDITY_OPTIONS.includes(c));
  const other = known.filter((c) => !COMORBIDITY_OPTIONS.includes(c));
  setSelectedComorbidities(selected);
  setOtherComorbidities(other.join(", "));
  setMedical({
    emergency_contact_name: user.emergency_contact_name ?? "",
    emergency_contact_phone: user.emergency_contact_phone ?? "",
    insurance_provider: user.insurance_provider ?? "",
    insurance_id: user.insurance_id ?? "",
  });
};

interface PersonalState {
  age: string;
  gender: string;
  phone: string;
  city: string;
  pincode: string;
  blood_group: string;
  height_cm: string;
  weight_kg: string;
  budget_pref: string;
}

interface MedicalState {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  insurance_provider: string;
  insurance_id: string;
}

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const handleLogout = useLogoutHandler();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [tab, setTab] = useState<"personal" | "medical">("personal");
  const [saving, setSaving] = useState(false);

  const [personal, setPersonal] = useState<PersonalState>({
    age: "",
    gender: "",
    phone: "",
    city: "",
    pincode: "",
    blood_group: "",
    height_cm: "",
    weight_kg: "",
    budget_pref: "",
  });
  const [medical, setMedical] = useState<MedicalState>({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    insurance_provider: "",
    insurance_id: "",
  });
  const [allergiesInput, setAllergiesInput] = useState("");
  const [medicationsInput, setMedicationsInput] = useState("");
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [otherComorbiditiesInput, setOtherComorbiditiesInput] = useState("");

  useEffect(() => {
    if (!user) return;
    applyProfileState(
      user,
      setPersonal,
      setAllergiesInput,
      setMedicationsInput,
      setSelectedComorbidities,
      setOtherComorbiditiesInput,
      setMedical,
    );
  }, [user]);

  const allergies = useMemo(() => parseTags(allergiesInput), [allergiesInput]);
  const medications = useMemo(() => parseTags(medicationsInput), [medicationsInput]);
  const otherComorbidities = useMemo(() => parseTags(otherComorbiditiesInput), [otherComorbiditiesInput]);
  const comorbidities = useMemo(
    () => unique([...selectedComorbidities, ...otherComorbidities]),
    [selectedComorbidities, otherComorbidities]
  );

  if (!user) return null;

  const clean = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const toInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const toFloat = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: UpdateProfilePayload = {
      allergies,
      conditions: comorbidities,
      medications,
    };

    const maybeFields: UpdateProfilePayload = {
      age: toInt(personal.age),
      gender: clean(personal.gender),
      phone: clean(personal.phone),
      city: clean(personal.city),
      pincode: clean(personal.pincode),
      blood_group: clean(personal.blood_group),
      height_cm: toFloat(personal.height_cm),
      weight_kg: toFloat(personal.weight_kg),
      budget_pref: toFloat(personal.budget_pref),
      emergency_contact_name: clean(medical.emergency_contact_name),
      emergency_contact_phone: clean(medical.emergency_contact_phone),
      insurance_provider: clean(medical.insurance_provider),
      insurance_id: clean(medical.insurance_id),
    };

    Object.entries(maybeFields).forEach(([key, value]) => {
      if (value !== undefined) payload[key as keyof UpdateProfilePayload] = value;
    });

    try {
      const updated = await updateProfile(payload);
      applyProfileState(
        updated,
        setPersonal,
        setAllergiesInput,
        setMedicationsInput,
        setSelectedComorbidities,
        setOtherComorbiditiesInput,
        setMedical,
      );
      toast({ title: "Profile updated successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile update failed";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <HeartPulse className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">Profile</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Manage your health details</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="p-6 sm:p-8 rounded-3xl shadow-elevated border border-border/60 bg-card/90">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Full name</p>
              <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> {user.name}
              </p>
              <p className="text-xs text-muted-foreground">To change your name, contact support.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-semibold text-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-muted p-2">
            <button
              type="button"
              onClick={() => setTab("personal")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === "personal"
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Personal Info
            </button>
            <button
              type="button"
              onClick={() => setTab("medical")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === "medical"
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Medical Details
            </button>
          </div>

          {tab === "personal" ? (
            <div className="mt-6 space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input value={personal.age} onChange={(e) => setPersonal((p) => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    value={personal.gender}
                    onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={personal.phone} onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={personal.city} onChange={(e) => setPersonal((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={personal.pincode} onChange={(e) => setPersonal((p) => ({ ...p, pincode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Blood group</Label>
                  <select
                    value={personal.blood_group}
                    onChange={(e) => setPersonal((p) => ({ ...p, blood_group: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {"A+,A-,B+,B-,AB+,AB-,O+,O-".split(",").map((bg) => (
                      <option key={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input value={personal.height_cm} onChange={(e) => setPersonal((p) => ({ ...p, height_cm: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input value={personal.weight_kg} onChange={(e) => setPersonal((p) => ({ ...p, weight_kg: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max treatment budget (₹)</Label>
                  <Input value={personal.budget_pref} onChange={(e) => setPersonal((p) => ({ ...p, budget_pref: e.target.value }))} />
                </div>
              </div>

              <Button className="rounded-xl w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Save changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Allergies (comma separated)</Label>
                  <Input value={allergiesInput} onChange={(e) => setAllergiesInput(e.target.value)} />
                  <TagList
                    tags={allergies}
                    onRemove={(tag) =>
                      setAllergiesInput(unique(allergies.filter((t) => t !== tag)).join(", "))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current medications (comma separated)</Label>
                  <Input value={medicationsInput} onChange={(e) => setMedicationsInput(e.target.value)} />
                  <TagList
                    tags={medications}
                    onRemove={(tag) =>
                      setMedicationsInput(unique(medications.filter((t) => t !== tag)).join(", "))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Known conditions / comorbidities</Label>
                <div className="flex flex-wrap gap-2">
                  {COMORBIDITY_OPTIONS.map((option) => {
                    const active = selectedComorbidities.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setSelectedComorbidities((prev) =>
                            prev.includes(option)
                              ? prev.filter((c) => c !== option)
                              : [...prev, option]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? "bg-secondary-soft text-secondary border-secondary/40"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Other conditions (comma separated)"
                  value={otherComorbiditiesInput}
                  onChange={(e) => setOtherComorbiditiesInput(e.target.value)}
                />
                <TagList
                  tags={comorbidities}
                  onRemove={(tag) => {
                    if (COMORBIDITY_OPTIONS.includes(tag)) {
                      setSelectedComorbidities((prev) => prev.filter((c) => c !== tag));
                    } else {
                      const nextOther = otherComorbidities.filter((c) => c !== tag);
                      setOtherComorbiditiesInput(nextOther.join(", "));
                    }
                  }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency contact name</Label>
                  <Input
                    value={medical.emergency_contact_name}
                    onChange={(e) => setMedical((m) => ({ ...m, emergency_contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency contact phone</Label>
                  <Input
                    value={medical.emergency_contact_phone}
                    onChange={(e) => setMedical((m) => ({ ...m, emergency_contact_phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insurance provider</Label>
                  <Input
                    value={medical.insurance_provider}
                    onChange={(e) => setMedical((m) => ({ ...m, insurance_provider: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insurance ID</Label>
                  <Input
                    value={medical.insurance_id}
                    onChange={(e) => setMedical((m) => ({ ...m, insurance_id: e.target.value }))}
                  />
                </div>
              </div>

              <Button className="rounded-xl w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Save changes
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </main>

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

export default Profile;
