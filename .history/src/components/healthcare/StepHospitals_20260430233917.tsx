import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Shield, MapPin, Check, CalendarClock, Users, ArrowUpDown, LocateFixed, Map } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { hospitalsForSpecialty, formatINR, Hospital } from "@/lib/healthcare-data";
import { GeoCoords, distanceKm, useGeolocation } from "@/hooks/use-geolocation";
import { HospitalMap } from "@/components/HospitalMap";

type SortKey = "rating" | "cost" | "distance";

interface Props {
  specialty: string;
  city: string;
  coords?: GeoCoords | null;
  onNext: (hospital: Hospital) => void;
}

export const StepHospitals = ({ specialty, city, coords, onNext }: Props) => {
  const all = useMemo(() => hospitalsForSpecialty(specialty), [specialty]);
  const geo = useGeolocation();
  const userLocation = coords ?? (geo.data ? { lat: geo.data.lat, lng: geo.data.lng } : null);

  // Compute real distance from user coords, when available
  const withDistance = useMemo(() => {
    return all.map((h) => {
      const km = userLocation ? distanceKm(userLocation, { lat: h.lat, lng: h.lng }) : null;
      return {
        ...h,
        distanceKm: km,
        distance: km != null ? `${km.toFixed(km < 10 ? 1 : 0)} km` : h.distance,
      };
    });
  }, [all, userLocation]);

  const [sortBy, setSortBy] = useState<SortKey>(userLocation ? "distance" : "rating");
  const [selected, setSelected] = useState<string[]>([withDistance[0]?.id].filter(Boolean));
  const [view, setView] = useState<"list" | "map">("list");

  const sorted = useMemo(() => {
    const list = [...withDistance];
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "cost") list.sort((a, b) => a.cost - b.cost);
    if (sortBy === "distance") {
      list.sort((a, b) => {
        const ad = a.distanceKm ?? (parseFloat(a.distance) || 9999);
        const bd = b.distanceKm ?? (parseFloat(b.distance) || 9999);
        return ad - bd;
      });
    }
    return list;
  }, [withDistance, sortBy]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleNext = () => {
    const chosen = withDistance.find((h) => h.id === selected[0]) ?? withDistance[0];
    onNext(chosen);
  };

  const handleSelectFromMap = (id: string) => {
    setSelected([id]);
    const chosen = withDistance.find((h) => h.id === id);
    if (chosen) onNext(chosen);
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold">Top Hospitals Near You</h2>
        <p className="text-muted-foreground">
          Showing {sorted.length} {specialty} hospitals {userLocation ? "near your live location" : `in ${city || "your area"}`} · Select up to 3 to compare ({selected.length}/3)
        </p>
        {userLocation && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-soft text-success text-xs font-semibold">
            <LocateFixed className="h-3.5 w-3.5" /> Live GPS · sorted by real distance
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowUpDown className="h-4 w-4" /> Sort by:
        </div>
        <div className="flex gap-2">
          {(["rating", "cost", "distance"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border",
                sortBy === k
                  ? "bg-gradient-primary text-primary-foreground border-primary shadow-card"
                  : "bg-card text-foreground/70 border-border hover:border-primary/40"
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
              view === "list"
                ? "bg-gradient-primary text-primary-foreground border-primary shadow-card"
                : "bg-card text-foreground/70 border-border hover:border-primary/40"
            )}
          >
            List View
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5",
              view === "map"
                ? "bg-gradient-primary text-primary-foreground border-primary shadow-card"
                : "bg-card text-foreground/70 border-border hover:border-primary/40"
            )}
          >
            <Map className="h-3.5 w-3.5" /> Map View
          </button>
        </div>
      </div>

      {view === "map" ? (
        <HospitalMap
          userLocation={userLocation}
          hospitals={sorted}
          selectedHospitalId={selected[0] ?? null}
          onSelectHospital={handleSelectFromMap}
          fallbackCity={city}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((h) => {
            const isSelected = selected.includes(h.id);
            return (
              <Card
                key={h.id}
                onClick={() => toggle(h.id)}
                className={cn(
                  "p-5 cursor-pointer border-2 transition-all duration-300 rounded-2xl",
                  isSelected
                    ? "border-primary bg-gradient-soft shadow-elevated"
                    : "border-border/50 bg-card hover:border-primary/40 hover:shadow-card"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                      isSelected ? "bg-gradient-primary shadow-glow" : "bg-secondary-soft"
                    )}
                  >
                    <Building2 className={cn("h-7 w-7", isSelected ? "text-primary-foreground" : "text-secondary")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground">{h.name}</h3>
                      {h.recommended && (
                        <Badge className="bg-gradient-primary text-primary-foreground border-0">★ Top Pick</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-semibold text-foreground">{h.rating}</span>
                        <span className="text-xs">({h.reviews.toLocaleString()})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="font-medium">{h.accred}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {h.city} · {h.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        Earliest in {h.waitDays} {h.waitDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Estimated cost</p>
                    <p className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {formatINR(h.cost)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isSelected ? "bg-primary border-primary scale-110" : "border-border"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected.length > 1 && (
        <Card className="p-4 rounded-2xl border border-primary/30 bg-primary-soft/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Users className="h-4 w-4 text-primary" /> Comparison ({selected.length} hospitals)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {selected.map((id) => {
              const h = withDistance.find((x) => x.id === id)!;
              return (
                <div key={id} className="p-3 rounded-xl bg-card border border-border/60">
                  <p className="font-semibold text-foreground truncate">{h.name}</p>
                  <p className="text-muted-foreground mt-1">★ {h.rating} · {h.distance}</p>
                  <p className="font-bold text-primary mt-1">{formatINR(h.cost)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Button
        onClick={handleNext}
        disabled={selected.length === 0}
        className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
      >
        Continue to Financial Planning →
      </Button>
    </div>
  );
};
