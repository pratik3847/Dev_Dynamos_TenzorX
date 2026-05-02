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

// Map ICD-10 prefix to common hospital specialties
const mapIcdToSpecialty = (code: string): string => {
  const prefix = code.charAt(0).toUpperCase();
  switch (prefix) {
    case 'I': return 'Cardiology';
    case 'M': return 'Orthopaedics';
    case 'K': return 'Gastroenterology';
    case 'N': return 'Urology'; // or Nephrology/Gynaecology
    case 'H': return 'Ophthalmology';
    case 'E': return 'Endocrinology';
    case 'G': return 'Neurology';
    case 'J': return 'Pulmonology';
    case 'O': return 'Obstetrics';
    case 'C': return 'Oncology';
    case 'F': return 'Psychiatry';
    case 'L': return 'Dermatology';
    default: return 'General Medicine';
  }
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
          results = await searchHospitalsNearby(token, {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius_km: 50,
            specialty,
            limit: 30
          });
        } else if (user?.district || user?.city || city) {
          results = await searchHospitals(token, {
            district: user?.district || city || undefined,
            specialty,
            limit: 30
          });
        } else {
          results = await searchHospitals(token, { limit: 30, specialty });
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
      const spec = specialty.toLowerCase();
      const text = `${h.specialties || ""} ${h.facilities || ""} ${h.discipline || ""}`.toLowerCase();
      const cs = text.includes(spec) ? 8 : 5;
      const ns = h.nabh_accredited ? 10 : 3;
      const beds = h.total_beds || 0;
      const bs = beds > 200 ? 9 : beds > 100 ? 7 : beds > 50 ? 5 : 3;
      
      let km = h.distance_km;
      if (km == null && userLocation && h.lat && h.lng) {
        km = distanceKm(userLocation, { lat: h.lat, lng: h.lng });
      }
      
      const ds = km == null ? 5 : km < 5 ? 10 : km < 10 ? 8 : km < 20 ? 6 : km < 40 ? 4 : 2;
      const ts = h.tier === "premium" ? 9 : h.tier === "mid_tier" ? 7 : 5;
      
      const score = (cs * 0.3) + (ns * 0.2) + (bs * 0.2) + (ds * 0.15) + (ts * 0.15);

      return {
        ...h,
        score,
        distanceKm: km,
      };
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
