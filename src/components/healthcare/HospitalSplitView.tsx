import { useState, useMemo } from "react";
import { HospitalResult } from "@/lib/api";
import { GeoCoords } from "@/hooks/use-geolocation";
import { HospitalMap } from "@/components/HospitalMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Check, Phone, ExternalLink, Bed, Users,
  Shield, AlertCircle, Building2, Star, Ambulance,
  Droplets, Globe, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnhancedHospital = HospitalResult & {
  distanceKm?: number | null;
  score?: number;
  hospitalType?: string;
};

interface Props {
  hospitals: EnhancedHospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (id: string) => void;
  userLocation: GeoCoords | null;
  fallbackCity: string;
}

type SortKey = "score" | "distance" | "beds";
type TypeFilter = "all" | "government" | "private" | "trust";

// Derive a clean hospital type label
function getHospitalType(h: EnhancedHospital): TypeFilter {
  const cat = (h.hospital_category || h.hospitalType || "").toLowerCase();
  if (cat.includes("gov") || cat.includes("public") || cat.includes("esic") ||
      cat.includes("aiims") || cat.includes("central") || cat.includes("municipal") ||
      cat.includes("district") || cat.includes("civil")) return "government";
  if (cat.includes("trust") || cat.includes("charitable") || cat.includes("mission") ||
      cat.includes("ngo") || cat.includes("society")) return "trust";
  return "private";
}

// Accreditation badges to show
function getAccredBadges(h: EnhancedHospital): string[] {
  const badges: string[] = [];
  if (h.nabh_accredited) badges.push("NABH");
  const acc = (h.accreditation || "").toUpperCase();
  if (acc.includes("JCI")) badges.push("JCI");
  if (acc.includes("ISO")) badges.push("ISO");
  if (acc.includes("NABL")) badges.push("NABL");
  return badges;
}

const TYPE_COLORS: Record<TypeFilter, string> = {
  all:        "",
  government: "bg-blue-500/10 text-blue-700 border-blue-200",
  private:    "bg-purple-500/10 text-purple-700 border-purple-200",
  trust:      "bg-orange-500/10 text-orange-700 border-orange-200",
};

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: "All", government: "Government", private: "Private", trust: "Trust / NGO",
};

export const HospitalSplitView = ({
  hospitals, selectedHospitalId, onSelectHospital, userLocation, fallbackCity,
}: Props) => {
  const [sortBy, setSortBy] = useState<SortKey>(userLocation ? "distance" : "score");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filteredAndSorted = useMemo(() => {
    let list = [...hospitals];
    if (typeFilter !== "all") {
      list = list.filter(h => getHospitalType(h) === typeFilter);
    }
    if (sortBy === "score")    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sortBy === "distance") list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    if (sortBy === "beds")     list.sort((a, b) => (b.total_beds || 0) - (a.total_beds || 0));
    return list;
  }, [hospitals, sortBy, typeFilter]);

  // Count by type for filter badges
  const counts = useMemo(() => {
    const c = { government: 0, private: 0, trust: 0 };
    hospitals.forEach(h => { c[getHospitalType(h)]++; });
    return c;
  }, [hospitals]);

  return (
    <div className="flex flex-col lg:flex-row h-[760px] border border-border/60 rounded-3xl overflow-hidden bg-card shadow-elevated">

      {/* ── LEFT: List ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-2/5 flex flex-col h-[420px] lg:h-full border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/20 relative">

        {/* Header */}
        <div className="p-4 border-b border-border/40 bg-card z-10 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md mr-2 text-sm">
                {filteredAndSorted.length}
              </span>
              Hospitals Found
            </h3>
            {typeFilter !== "all" && (
              <button onClick={() => setTypeFilter("all")} className="text-xs text-primary hover:underline">
                Clear filter
              </button>
            )}
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "government", "private", "trust"] as TypeFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap",
                  typeFilter === t
                    ? t === "all" ? "bg-primary text-primary-foreground border-primary"
                      : cn(TYPE_COLORS[t], "border-current font-bold")
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {TYPE_LABELS[t]}
                {t !== "all" && (
                  <span className="ml-1 opacity-60">({counts[t]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Sort buttons */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {([["score", "Best Match"], ["distance", "Nearest"], ["beds", "Largest"]] as [SortKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors border",
                  sortBy === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Hospital cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-16">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hospitals match this filter.
            </div>
          ) : (
            filteredAndSorted.map(h => {
              const isSelected = selectedHospitalId === h.id;
              const type = getHospitalType(h);
              const accredBadges = getAccredBadges(h);
              const distLabel = h.distanceKm != null
                ? `${Number(h.distanceKm).toFixed(1)} km`
                : [h.town, h.district, fallbackCity].find(Boolean) || "";
              const scoreLabel = h.score ? (h.score * 10).toFixed(0) + "%" : "—";
              const hasEmergency = !!(h.emergency_services || h.emergency_num);
              const phone = h.telephone?.split(",")[0] || h.mobile?.split(",")[0] || h.emergency_num || "";
              const mapsUrl = h.lat && h.lng
                ? `https://maps.google.com/?q=${h.lat},${h.lng}`
                : `https://maps.google.com/?q=${encodeURIComponent(h.hospital_name + " " + (h.district || fallbackCity))}`;

              return (
                <Card
                  key={h.id}
                  onClick={() => onSelectHospital(h.id)}
                  className={cn(
                    "cursor-pointer transition-all duration-200 overflow-hidden",
                    isSelected
                      ? "border-primary ring-1 ring-primary shadow-md"
                      : "border-border/60 hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <div className="p-3.5">
                    {/* Top row: badges + select */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap gap-1">
                        {/* Type badge */}
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", TYPE_COLORS[type])}>
                          {type === "government" ? "Govt" : type === "trust" ? "Trust" : "Private"}
                        </Badge>
                        {/* Tier */}
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                          {h.tier.replace("_", " ")}
                        </Badge>
                        {/* Accreditation */}
                        {accredBadges.map(b => (
                          <Badge key={b} variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20">
                            {b}
                          </Badge>
                        ))}
                        {/* Emergency */}
                        {hasEmergency && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">
                            24h ER
                          </Badge>
                        )}
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all mt-0.5",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>

                    {/* Name */}
                    <h4 className="font-bold text-sm leading-snug" title={h.hospital_name}>
                      {h.hospital_name}
                    </h4>

                    {/* Address */}
                    {(h.address || h.town || h.district) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {[h.address, h.town, h.district].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="font-semibold text-foreground">{scoreLabel}</span>
                        <span className="text-[10px]">match</span>
                      </span>
                      {distLabel && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {distLabel}
                        </span>
                      )}
                      {h.total_beds && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" /> {h.total_beds} beds
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded panel */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 bg-muted/20 border-t border-border/40",
                    isSelected ? "max-h-[280px] opacity-100" : "max-h-0 opacity-0 border-t-0"
                  )}>
                    <div className="p-3.5 space-y-3">

                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        {h.num_doctors && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5 shrink-0" /> {h.num_doctors} doctors
                          </span>
                        )}
                        {h.established_year && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" /> Est. {h.established_year}
                          </span>
                        )}
                        {h.tariff_range && (
                          <span className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Building2 className="h-3.5 w-3.5 shrink-0" /> {h.tariff_range}
                          </span>
                        )}
                        {h.empanelment && (
                          <span className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Shield className="h-3.5 w-3.5 shrink-0 text-success" />
                            <span className="line-clamp-1">{h.empanelment}</span>
                          </span>
                        )}
                        {h.bloodbank_phone && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Droplets className="h-3.5 w-3.5 shrink-0 text-destructive" /> Blood Bank
                          </span>
                        )}
                        {h.ambulance_phone && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Ambulance className="h-3.5 w-3.5 shrink-0 text-warning" /> Ambulance
                          </span>
                        )}
                      </div>

                      {/* Specialties snippet */}
                      {h.specialties && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          <span className="font-semibold text-foreground">Specialties: </span>
                          {h.specialties}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {phone && (
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                            <a href={`tel:${phone}`} onClick={e => e.stopPropagation()}>
                              <Phone className="h-3 w-3 mr-1" /> Call
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <MapPin className="h-3 w-3 mr-1" /> Directions
                          </a>
                        </Button>
                        {h.website && (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <a href={h.website.startsWith("http") ? h.website : `https://${h.website}`}
                               target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                               title="Visit website">
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none z-10" />
      </div>

      {/* ── RIGHT: Map ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-3/5 h-[400px] lg:h-full relative">
        <HospitalMap
          userLocation={userLocation}
          hospitals={filteredAndSorted as any}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={onSelectHospital}
          fallbackCity={fallbackCity}
        />
      </div>
    </div>
  );
};
