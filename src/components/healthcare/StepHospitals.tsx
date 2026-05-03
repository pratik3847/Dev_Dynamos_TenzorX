import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocateFixed, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GeoCoords, distanceKm, useGeolocation } from "@/hooks/use-geolocation";
import { searchHospitals, searchHospitalsNearby, HospitalResult, PathwayOption } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { HospitalSplitView } from "./HospitalSplitView";

interface Props {
  icd10_code: string;
  condition_name: string;
  selected_pathway: PathwayOption;
  city: string;
  coords?: GeoCoords | null;
  onNext: (hospital: HospitalResult) => void;
}

// Map ICD-10 prefix to hospital specialty search term
const mapIcdToSpecialty = (code: string): string => {
  const prefix3 = code.substring(0, 3).toUpperCase();
  const prefix1 = code.charAt(0).toUpperCase();

  // Infectious diseases → General Medicine (not a narrow specialty)
  if (["A", "B"].includes(prefix1)) return "General Medicine";
  // Specific ICD-3 overrides
  const map3: Record<string, string> = {
    I20: "Cardiology", I21: "Cardiology", I25: "Cardiology", I50: "Cardiology",
    M17: "Orthopaedics", M16: "Orthopaedics", M54: "Orthopaedics",
    K35: "General Surgery", K40: "General Surgery", K80: "Gastroenterology",
    N20: "Urology", G43: "Neurology", J18: "Pulmonology", J45: "Pulmonology",
    E11: "Endocrinology", E05: "Endocrinology", E03: "Endocrinology",
  };
  if (map3[prefix3]) return map3[prefix3];

  const map1: Record<string, string> = {
    I: "Cardiology", M: "Orthopaedics", K: "Gastroenterology",
    N: "Urology", H: "Ophthalmology", E: "Endocrinology",
    G: "Neurology", J: "Pulmonology", O: "Obstetrics",
    C: "Oncology", F: "Psychiatry", L: "Dermatology",
  };
  return map1[prefix1] || "General Medicine";
};

export const StepHospitals = ({ icd10_code, condition_name, selected_pathway, city, coords, onNext }: Props) => {
  const { token, user } = useAuth();
  const geo = useGeolocation();
  const userLocation = coords ?? (geo.data ? { lat: geo.data.lat, lng: geo.data.lng } : null);

  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  const specialty = useMemo(() => mapIcdToSpecialty(icd10_code), [icd10_code]);

  useEffect(() => {
    if (!token) return;
    
    let isMounted = true;
    const fetchHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        let results: HospitalResult[] = [];

        if (userLocation) {
          // GPS-based: search within 50km, no specialty filter for infectious diseases
          results = await searchHospitalsNearby(token, {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius_km: 50,
            specialty,
            limit: 40,
          });
          // If too few results, widen to 100km without specialty filter
          if (results.length < 5) {
            results = await searchHospitalsNearby(token, {
              lat: userLocation.lat,
              lng: userLocation.lng,
              radius_km: 100,
              limit: 40,
            });
          }
        } else {
          const locationParam = user?.district || city || undefined;
          results = await searchHospitals(token, {
            district: locationParam,
            specialty,
            limit: 40,
          });
          // If too few, search by state or drop specialty filter
          if (results.length < 5 && locationParam) {
            results = await searchHospitals(token, {
              district: locationParam,
              limit: 40,
            });
          }
          if (results.length < 5) {
            results = await searchHospitals(token, { specialty, limit: 40 });
          }
        }

        if (isMounted) setHospitals(results);
      } catch (err: any) {
        if (isMounted) setError("Failed to fetch hospitals.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchHospitals();
    return () => { isMounted = false; };
  }, [token, userLocation, user, city, specialty]);

  const enhanced = useMemo(() => {
    return hospitals.map(h => {
      // Specialty relevance
      const spec = specialty.toLowerCase();
      const text = `${h.specialties || ""} ${h.facilities || ""} ${h.discipline || ""} ${h.care_type || ""}`.toLowerCase();
      const cs = text.includes(spec) ? 10 : 6;

      // Accreditation quality
      const accred = (h.accreditation || "").toLowerCase();
      const ns = h.nabh_accredited ? 10
        : accred.includes("jci") ? 10
        : accred.includes("nabh") ? 9
        : accred.includes("iso") ? 7 : 4;

      // Size proxy
      const beds = h.total_beds || 0;
      const bs = beds > 500 ? 10 : beds > 200 ? 8 : beds > 100 ? 6 : beds > 50 ? 4 : 3;

      // Distance
      let km = h.distance_km;
      if (km == null && userLocation && h.lat && h.lng) {
        km = distanceKm(userLocation, { lat: h.lat, lng: h.lng });
      }
      const ds = km == null ? 5 : km < 3 ? 10 : km < 8 ? 8 : km < 15 ? 6 : km < 30 ? 4 : 2;

      // Tier
      const ts = h.tier === "premium" ? 9 : h.tier === "mid_tier" ? 7 : 5;

      // Emergency services
      const es = h.emergency_services ? 8 : 5;

      // Composite score (0–10)
      const score = (cs * 0.25) + (ns * 0.25) + (bs * 0.15) + (ds * 0.15) + (ts * 0.10) + (es * 0.10);

      // Derive hospital type label from category
      const cat = (h.hospital_category || "").toLowerCase();
      const hospitalType = cat.includes("gov") || cat.includes("public") || cat.includes("esic") || cat.includes("aiims") || cat.includes("central") ? "Government"
        : cat.includes("trust") || cat.includes("charitable") || cat.includes("mission") ? "Trust / Charitable"
        : cat.includes("private") ? "Private"
        : h.tier === "budget" ? "Government / Budget"
        : "Private";

      return { ...h, score, distanceKm: km, hospitalType };
    });
  }, [hospitals, specialty, userLocation]);

  // Default selection
  useEffect(() => {
    if (enhanced.length > 0 && !selectedHospitalId) {
      // Find highest rated
      const best = [...enhanced].sort((a, b) => b.score - a.score)[0];
      setSelectedHospitalId(best.id);
    }
  }, [enhanced, selectedHospitalId]);

  const handleNext = () => {
    if (!selectedHospitalId) return;
    const chosen = enhanced.find((h) => h.id === selectedHospitalId);
    if (chosen) {
      onNext(chosen);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up space-y-4">
        <div className="h-24 bg-card rounded-2xl animate-pulse border border-border" />
        <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
          <div className="w-full lg:w-2/5 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
          <div className="w-full lg:w-3/5 h-full bg-card rounded-2xl animate-pulse border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-destructive/20 bg-destructive/5 rounded-3xl">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold">Failed to load hospitals</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold">Select a Provider</h2>
        <p className="text-muted-foreground">
          Top {specialty} hospitals equipped for <span className="font-semibold text-foreground">{condition_name}</span> treatment.
        </p>
        {userLocation && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-soft text-success text-xs font-semibold">
            <LocateFixed className="h-3.5 w-3.5" /> Showing hospitals near your live location
          </div>
        )}
      </div>

      <HospitalSplitView
        hospitals={enhanced}
        selectedHospitalId={selectedHospitalId}
        onSelectHospital={setSelectedHospitalId}
        userLocation={userLocation}
        fallbackCity={city}
      />

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedHospitalId}
          className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
        >
          View Cost Estimate →
        </Button>
      </div>
    </div>
  );
};
