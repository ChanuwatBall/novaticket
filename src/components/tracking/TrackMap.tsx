import { memo, useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type DriverMarkerPoint = LatLngPoint & {
  headingDeg?: number;
  label?: string;
  driverName?: string;
  speedKmh?: number;
  reportedAt?: string;
  stale?: boolean;
};

export type BusStopMarkerPoint = LatLngPoint & {
  id: string;
  name: string;
  type?: string;
  stopOrder?: number;
};

type TrackMapProps = {
  driver?: DriverMarkerPoint | null;
  user?: LatLngPoint | null;
  stops: BusStopMarkerPoint[];
  selectedTripId?: string | null;
  onCenterUser?: () => void;
};

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ZOOM = 12;

const createDriverIcon = (headingDeg = 0) =>
  L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:9999px;background:#082b5c;color:#fff;box-shadow:0 10px 25px rgba(8,43,92,.35);transform:rotate(${headingDeg}deg);border:3px solid white;">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"></path><path d="M16 6v6"></path><path d="M6 13h12"></path><path d="M6 17h12"></path><path d="M8 21h.01"></path><path d="M16 21h.01"></path><rect width="16" height="16" x="4" y="3" rx="2"></rect>
        </svg>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });

const createStopIcon = (type?: string) => {
  const isPickup = type === "pickup";
  const isDropoff = type === "dropoff";
  const color = isPickup ? "#1268B3" : isDropoff ? "#F37021" : "#334155";

  return L.divIcon({
    className: "",
    html: `
      <div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 6px 14px rgba(15,23,42,.28);"></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const createUserIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:22px;height:22px;border-radius:9999px;background:#2563eb;border:4px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 8px 16px rgba(37,99,235,.35);"></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const MapAutoFit = memo(({ driver, user, stops, selectedTripId }: TrackMapProps) => {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (driver) points.push([driver.lat, driver.lng]);
    if (user) points.push([user.lat, user.lng]);
    stops.forEach((stop) => points.push([stop.lat, stop.lng]));

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    map.fitBounds(points, { padding: [48, 120], maxZoom: 15 });
  }, [driver?.lat, driver?.lng, user?.lat, user?.lng, selectedTripId, stops, map]);

  return null;
});

MapAutoFit.displayName = "MapAutoFit";

const TrackMap = ({ driver, user, stops, selectedTripId }: TrackMapProps) => {
  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0)),
    [stops],
  );
  const routeLine = useMemo(
    () => sortedStops.map((stop) => [stop.lat, stop.lng] as [number, number]),
    [sortedStops],
  );
  const initialCenter = useMemo<[number, number]>(() => {
    if (driver) return [driver.lat, driver.lng];
    if (user) return [user.lat, user.lng];
    if (sortedStops[0]) return [sortedStops[0].lat, sortedStops[0].lng];
    return DEFAULT_CENTER;
  }, [driver, user, sortedStops]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      preferCanvas
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <MapAutoFit driver={driver} user={user} stops={sortedStops} selectedTripId={selectedTripId} />

      {routeLine.length > 1 && (
        <Polyline positions={routeLine} pathOptions={{ color: "#2448c6", weight: 4, opacity: 0.72 }} />
      )}

      {sortedStops.map((stop) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createStopIcon(stop.type)}>
          <Popup>
            <div className="space-y-1">
              <p className="font-bold">{stop.name}</p>
              <p className="text-xs text-slate-500">ลำดับจุดจอด {stop.stopOrder || "-"}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {user && (
        <Marker position={[user.lat, user.lng]} icon={createUserIcon()}>
          <Popup>ตำแหน่งปัจจุบันของคุณ</Popup>
        </Marker>
      )}

      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={createDriverIcon(driver.headingDeg)}>
          <Popup>
            <div className="space-y-1">
              <p className="font-bold">{driver.label || "รถบัส"}</p>
              {driver.driverName && <p>คนขับ: {driver.driverName}</p>}
              {typeof driver.speedKmh === "number" && <p>ความเร็ว: {driver.speedKmh} กม./ชม.</p>}
              {driver.stale && <p className="text-amber-700">ตำแหน่งนี้อาจไม่ใช่ข้อมูลล่าสุด</p>}
            </div>
          </Popup>
        </Marker>
      )}

      {!driver && !user && sortedStops.length === 0 && (
        <CircleMarker center={DEFAULT_CENTER} radius={0} pathOptions={{ opacity: 0 }} />
      )}
    </MapContainer>
  );
};

export default memo(TrackMap);
