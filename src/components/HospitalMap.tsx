import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { Button } from "@/components/ui/button";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export type LatLng = { lat: number; lng: number };

interface Props {
  userLocation: LatLng | null;
  hospitals: any[];
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

const tierColors: Record<string, string> = {
  budget: "#22c55e",
  mid_tier: "#f59e0b",
  premium: "#ef4444",
};

const tierClasses: Record<string, string> = {
  budget: "bg-success-soft text-success",
  mid_tier: "bg-warning-soft text-warning",
  premium: "bg-destructive/10 text-destructive",
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

const getFallbackCenter = (fallbackCity?: string, hospitals: any[] = []): LatLng => {
  const key = normalizeCity(fallbackCity);
  if (key && CITY_COORDS[key]) return CITY_COORDS[key];
  if (hospitals.length && hospitals[0].lat && hospitals[0].lng) return { lat: hospitals[0].lat, lng: hospitals[0].lng };
  return CITY_COORDS.nagpur;
};

export const HospitalMap = ({
  userLocation,
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  fallbackCity,
}: Props) => {
  const isClient = typeof window !== "undefined";
  const [leafletModule, setLeafletModule] = useState<null | typeof import("react-leaflet")>(null);
  const [ClusterModule, setClusterModule] = useState<any>(null);

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

  useEffect(() => {
    let mounted = true;
    if (!isClient) return;
    Promise.all([
      import("react-leaflet"),
      import("react-leaflet-cluster")
    ]).then(([mod, clusterMod]) => {
      if (mounted) {
        setLeafletModule(mod);
        setClusterModule(() => clusterMod.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isClient]);

  if (!isClient || !leafletModule) {
    return (
      <div className="h-[300px] sm:h-[400px] w-full rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
        Loading map...
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } = leafletModule;

  const HospitalPopup = ({
    hospital,
    onSelect,
  }: {
    hospital: any;
    onSelect: (id: string) => void;
  }) => {
    const map = useMap();
    const distance = userLocation && hospital.lat && hospital.lng
      ? `${haversineDistance(userLocation.lat, userLocation.lng, hospital.lat, hospital.lng).toFixed(1)} km away`
      : "Distance unavailable";
    const nabh = hospital.nabh_accredited;

    return (
      <div className="space-y-2">
        <div className="font-semibold text-sm text-foreground">{hospital.hospital_name}</div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${tierClasses[hospital.tier] || tierClasses.budget}`}>
            {hospital.tier?.replace("_", " ") || "budget"}
          </span>
          {nabh && (
            <span className="px-2 py-0.5 rounded-full bg-success-soft text-success font-semibold">NABH</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{distance}</div>
        <div className="text-xs text-foreground">Estimated cost: {hospital.estCostDisplay}</div>
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

  return (
    <div className="h-full w-full absolute inset-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
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

        {ClusterModule && (
          <ClusterModule
            chunkedLoading
            maxClusterRadius={50}
            showCoverageOnHover={false}
          >
            {hospitals.map((hospital) => {
              if (!hospital.lat || !hospital.lng) return null;
              const color = tierColors[hospital.tier] || tierColors.budget;
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
                      onSelect={onSelectHospital}
                    />
                  </Popup>
                </CircleMarker>
              );
            })}
          </ClusterModule>
        )}
      </MapContainer>
    </div>
  );
};
