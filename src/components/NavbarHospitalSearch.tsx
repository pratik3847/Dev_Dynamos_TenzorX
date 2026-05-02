import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Building2, MapPin } from "lucide-react";
import { searchHospitals, HospitalResult } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const NavbarHospitalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HospitalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [byDistrict, byName] = await Promise.all([
          searchHospitals(token, { district: query.trim(), limit: 10 }),
          searchHospitals(token, { name: query.trim(), limit: 10 })
        ]);

        // Merge and deduplicate
        const mergedMap = new Map<string, HospitalResult>();
        [...byName, ...byDistrict].forEach(h => mergedMap.set(h.id, h));
        
        const mergedArray = Array.from(mergedMap.values());
        setResults(mergedArray.slice(0, 8)); // Keep top 8
      } catch (err) {
        console.error("Navbar search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, token]);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/hospital/${id}`);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          type="text"
          className="pl-9 bg-card/50 border-border/50 h-9 text-sm rounded-full focus-visible:ring-primary/30"
          placeholder="Search hospitals..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 3) setIsOpen(true);
          }}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {isOpen && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 shadow-elevated rounded-2xl overflow-hidden z-[100] max-h-[350px] overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((h) => (
                <li key={h.id}>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors flex flex-col gap-1"
                    onClick={() => handleSelect(h.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm leading-tight truncate">
                        {h.hospital_name}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {h.nabh_accredited && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20">NABH</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> 
                        {h.district || h.town}, {h.state}
                      </span>
                      <span className="capitalize">{h.tier?.replace('_', ' ')}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hospitals found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
