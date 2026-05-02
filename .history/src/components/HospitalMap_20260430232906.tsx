import { useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Hospital } from "@/lib/healthcare-data";
import { Button } from "@/components/ui/button";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export type LatLng = { lat: number; lng: number };

interface Props {
  userLocation: LatLng | null;
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (id: string) => void;
  fallbackCity?: string;
}

const CITY_COORDS: Record<string, LatLng> = {
  nagpur: { lat: 21.1458, lng: 79.0882 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
};

const tierColors: Record<Hospital["tier"], string> = {
  budget: "#22c55e",
  mid_tier: "#f59e0b",
  premium: "#ef4444",
};

const tierClasses: Record<Hospital["tier"], string> = {
  budget: "bg-success-soft text-success",
  mid_tier: "bg-warning-soft text-warning",
  premium: "bg-destructive/10 text-destructive",
};

const formatLakhs = (value: number) => `₹${(value / 100000).toFixed(2)} L`;

const estimateRange = (cost: number) => {
  const min = Math.round(cost * 0.9);
  const max = Math.round(cost * 1.1);
  return `${formatLakhs(min)} – ${formatLakhs(max)}`;
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const normalizeCity = (city?: string) => (city || "").trim().toLowerCase();

const getFallbackCenter = (fallbackCity?: string, hospitals: Hospital[] = []): LatLng => {
  const key = normalizeCity(fallbackCity);
  if (key && CITY_COORDS[key]) return CITY_COORDS[key];
  if (hospitals.length) return { lat: hospitals[0].lat, lng: hospitals[0].lng };
  return CITY_COORDS.nagpur;
};

const HospitalPopup = ({
  hospital,
  userLocation,
  onSelect,
}: {
  hospital: Hospital;
  userLocation: LatLng | null;
  onSelect: (id: string) => void;
}) => {
  const map = useMap();
  const distance = userLocation
    ? `${haversineDistance(userLocation.lat, userLocation.lng, hospital.lat, hospital.lng).toFixed(1)} km away`
    : "Distance unavailable";
  const nabh = hospital.nabh_accredited || hospital.accred.includes("NABH");

  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm text-foreground">{hospital.name}</div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`px-2 py-0.5 rounded-full font-semibold ${tierClasses[hospital.tier]}`}>
          {hospital.tier.replace("_", " ")}
        </span>
        {nabh && (
          <span className="px-2 py-0.5 rounded-full bg-success-soft text-success font-semibold">NABH</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{distance}</div>
      <div className="text-xs text-foreground">Estimated cost: {estimateRange(hospital.cost)}</div>
      <Button
        size="sm"
        className="mt-2 w-full rounded-lg"
        onClick={() => {
          onSelect(hospital.id);
          map.closePopup();
        }}
      >
        Select this hospital
      </Button>
    </div>
  );
};

export const HospitalMap = ({
  userLocation,
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  fallbackCity,
}: Props) => {
  const isClient = typeof window !== "undefined";
  const center = useMemo(() => {
    return userLocation ?? getFallbackCenter(fallbackCity, hospitals);
  }, [userLocation, fallbackCity, hospitals]);

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: "user-location-pin",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    []
  );

  if (!isClient) {
    return (
      <div className="h-[300px] sm:h-[400px] w-full rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
        Loading map...
      </div>
    );
  }

  return (
    <div className="h-[300px] sm:h-[400px] w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full rounded-2xl"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-xs font-semibold">You are here</div>
            </Popup>
          </Marker>
        )}

        {hospitals.map((hospital) => {
          const color = tierColors[hospital.tier];
          const isSelected = selectedHospitalId === hospital.id;
          return (
            <CircleMarker
              key={hospital.id}
              center={[hospital.lat, hospital.lng]}
              radius={isSelected ? 12 : 10}
              pathOptions={{ color, weight: isSelected ? 3 : 2, fillColor: color, fillOpacity: 0.9 }}
            >
              <Popup>
                <HospitalPopup
                  hospital={hospital}
                  userLocation={userLocation}
                  onSelect={onSelectHospital}
                />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
