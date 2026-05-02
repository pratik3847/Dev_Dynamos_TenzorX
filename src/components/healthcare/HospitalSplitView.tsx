import { useState, useMemo } from "react";
import { HospitalResult } from "@/lib/api";
import { GeoCoords } from "@/hooks/use-geolocation";
import { HospitalMap } from "@/components/HospitalMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Star, Shield, MapPin, Check, Phone, ExternalLink, Bed, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  hospitals: (HospitalResult & { distanceKm?: number; score?: number })[];
  selectedHospitalId: string | null;
  onSelectHospital: (id: string) => void;
  userLocation: GeoCoords | null;
  fallbackCity: string;
}

type SortKey = "rating" | "distance" | "beds";

export const HospitalSplitView = ({ hospitals, selectedHospitalId, onSelectHospital, userLocation, fallbackCity }: Props) => {
  const [sortBy, setSortBy] = useState<SortKey>(userLocation ? "distance" : "rating");
  const [filterTier, setFilterTier] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    let list = [...hospitals];
    
    if (filterTier) {
      list = list.filter(h => h.tier === filterTier);
    }

    if (sortBy === "rating") {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === "distance") {
      list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sortBy === "beds") {
      list.sort((a, b) => (b.total_beds || 0) - (a.total_beds || 0));
    }
    
    return list;
  }, [hospitals, sortBy, filterTier]);

  return (
    <div className="flex flex-col lg:flex-row h-[700px] border border-border/60 rounded-3xl overflow-hidden bg-card shadow-elevated">
      {/* LEFT PANEL: List View */}
      <div className="w-full lg:w-2/5 flex flex-col h-[400px] lg:h-full border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/20 relative">
        <div className="p-4 border-b border-border/40 bg-card z-10 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md mr-2">{filteredAndSorted.length}</span>
              Hospitals Found
            </h3>
            {filterTier && (
              <button 
                onClick={() => setFilterTier(null)}
                className="text-xs text-primary hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
          
          {/* Scrollable Filters */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-2 px-2">
            {(["rating", "distance", "beds"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  sortBy === k ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"
                )}
              >
                Sort by {k}
              </button>
            ))}
            <div className="w-px h-6 bg-border mx-1 my-auto shrink-0" />
            <button
              onClick={() => setFilterTier(filterTier === "premium" ? null : "premium")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                filterTier === "premium" ? "bg-secondary text-secondary-foreground border-secondary" : "bg-card border-border hover:bg-muted"
              )}
            >
              Premium Tier
            </button>
            <button
              onClick={() => setFilterTier(filterTier === "mid_tier" ? null : "mid_tier")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                filterTier === "mid_tier" ? "bg-secondary text-secondary-foreground border-secondary" : "bg-card border-border hover:bg-muted"
              )}
            >
              Mid Tier
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No hospitals match the current filters.
            </div>
          ) : (
            filteredAndSorted.map((h) => {
              const isSelected = selectedHospitalId === h.id;
              const displayDistance = h.distanceKm != null ? `${h.distanceKm.toFixed(1)} km` : h.district || h.town || fallbackCity;
              const displayScore = h.score ? h.score.toFixed(1) : "8.5";
              
              return (
                <Card
                  key={h.id}
                  onClick={() => onSelectHospital(h.id)}
                  className={cn(
                    "cursor-pointer transition-all duration-300 overflow-hidden",
                    isSelected
                      ? "border-primary ring-1 ring-primary shadow-md bg-card"
                      : "border-border/60 hover:border-primary/40 hover:shadow-sm bg-card"
                  )}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {h.nabh_accredited && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20">NABH</Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                            {h.tier.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-base leading-tight truncate" title={h.hospital_name}>
                          {h.hospital_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="font-semibold text-foreground">{displayScore}</span>
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[120px]" title={displayDistance}>
                            <MapPin className="h-3 w-3" /> {displayDistance}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details when selected */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 bg-muted/10",
                      isSelected ? "max-h-[200px] border-t border-border/40 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          <span>{h.total_beds || "Unknown"} Beds</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{h.num_doctors || "Unknown"} Doctors</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        {h.telephone && (
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-background" asChild>
                            <a href={`tel:${h.telephone.split(',')[0]}`} onClick={e => e.stopPropagation()}>
                              <Phone className="h-3 w-3 mr-1.5" /> Call
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-background" asChild>
                          <a href={`https://maps.google.com/?q=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3 mr-1.5" /> Directions
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
        
        {/* Bottom Fade Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none z-10" />
      </div>

      {/* RIGHT PANEL: Map View */}
      <div className="w-full lg:w-3/5 h-[400px] lg:h-full relative">
        <HospitalMap
          userLocation={userLocation}
          hospitals={filteredAndSorted as any}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={onSelectHospital}
          fallbackCity={fallbackCity}
        />
        
        {/* Overlay Search Button */}
        {userLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400]">
            <Button size="sm" className="shadow-elevated rounded-full bg-card text-foreground hover:bg-muted border border-border">
              Search this area
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
