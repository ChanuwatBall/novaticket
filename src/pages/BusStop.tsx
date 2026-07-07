import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BusStopMock, mockBusRoutes, mockBusStops } from "@/data/busStops";

type MapPoint = {
  lat: number;
  lon: number;
};

type Tile = {
  x: number;
  y: number;
  url: string;
  left: number;
  top: number;
};

const DEFAULT_CENTER: MapPoint = { lat: 13.81386, lon: 100.54945 };
const DEFAULT_ZOOM = 11;
const MIN_ZOOM = 5;
const MAX_ZOOM = 16;
const TILE_SIZE = 256;
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 820;

const typeLabel: Record<BusStopMock["type"], string> = {
  pickup: "จุดขึ้นรถ",
  stop: "จุดแวะจอด",
  dropoff: "จุดลงรถ",
};

const typeClassName: Record<BusStopMock["type"], string> = {
  pickup: "bg-primary text-primary-foreground",
  stop: "bg-[#F37021] text-white",
  dropoff: "bg-emerald-600 text-white",
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const project = (point: MapPoint, zoom: number) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const latRad = (point.lat * Math.PI) / 180;
  return {
    x: ((point.lon + 180) / 360) * scale,
    y:
      ((1 -
        Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
      scale,
  };
};

const unproject = (pixel: { x: number; y: number }, zoom: number): MapPoint => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lon = (pixel.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * pixel.y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return {
    lat: clamp(lat, -85, 85),
    lon: ((lon + 540) % 360) - 180,
  };
};

const makeTileGrid = (center: MapPoint, zoom: number): Tile[] => {
  const centerPixel = project(center, zoom);
  const startX = Math.floor((centerPixel.x - MAP_WIDTH / 2) / TILE_SIZE);
  const endX = Math.floor((centerPixel.x + MAP_WIDTH / 2) / TILE_SIZE);
  const startY = Math.floor((centerPixel.y - MAP_HEIGHT / 2) / TILE_SIZE);
  const endY = Math.floor((centerPixel.y + MAP_HEIGHT / 2) / TILE_SIZE);
  const tileCount = 2 ** zoom;
  const tiles: Tile[] = [];

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      if (y < 0 || y >= tileCount) continue;
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        x,
        y,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - centerPixel.x + MAP_WIDTH / 2,
        top: y * TILE_SIZE - centerPixel.y + MAP_HEIGHT / 2,
      });
    }
  }

  return tiles;
};

const getMarkerPosition = (point: MapPoint, center: MapPoint, zoom: number) => {
  const centerPixel = project(center, zoom);
  const pointPixel = project(point, zoom);

  return {
    left: pointPixel.x - centerPixel.x + MAP_WIDTH / 2,
    top: pointPixel.y - centerPixel.y + MAP_HEIGHT / 2,
  };
};

const BusStop = () => {
  const navigate = useNavigate();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    centerPixel: { x: number; y: number };
  } | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStop, setSelectedStop] = useState<BusStopMock | null>(null);
  const [userLocation, setUserLocation] = useState<MapPoint | null>(null);
  const [mapCenter, setMapCenter] = useState<MapPoint>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("กำลังค้นหาตำแหน่งปัจจุบัน...");

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงตำแหน่ง");
      return;
    }

    setIsLocating(true);
    setLocationStatus("กำลังค้นหาตำแหน่งปัจจุบัน...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPoint = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setUserLocation(currentPoint);
        setMapCenter(currentPoint);
        setZoom((currentZoom) => Math.max(currentZoom, 13));
        setLocationStatus("ใช้ตำแหน่งปัจจุบันของคุณแล้ว");
        setIsLocating(false);
      },
      () => {
        setLocationStatus("ไม่สามารถเข้าถึงตำแหน่งได้ แสดงแผนที่เริ่มต้นที่หมอชิตใหม่");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      },
    );
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  const filteredStops = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return mockBusStops;

    return mockBusStops.filter((stop) => {
      const route = mockBusRoutes.find((item) => item.id === stop.routeId);
      return [stop.name, stop.place, stop.type, route?.code, route?.name]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(keyword));
    });
  }, [query]);

  const selectedRoutes = useMemo(() => {
    if (!selectedStop) return [];
    return mockBusRoutes.filter((route) => route.id === selectedStop.routeId);
  }, [selectedStop]);

  const tiles = useMemo(() => makeTileGrid(mapCenter, zoom), [mapCenter, zoom]);

  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setZoom((currentZoom) => Math.max(currentZoom, 13));
      return;
    }

    requestUserLocation();
  };

  const changeZoom = (nextZoom: number) => {
    setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, [role='dialog']")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerPixel: project(mapCenter, zoom),
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;

    const nextPixel = {
      x: dragRef.current.centerPixel.x + dragRef.current.startX - event.clientX,
      y: dragRef.current.centerPixel.y + dragRef.current.startY - event.clientY,
    };
    setMapCenter(unproject(nextPixel, zoom));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY > 0 ? -1 : 1));
  };

  const searchPassingBus = () => {
    if (!selectedStop) return;
    navigate(`/search?busStopId=${selectedStop.id}&routeId=${selectedStop.routeId}`);
  };

  return (
    <main className="min-h-screen bg-background pb-16">
      <section
        className={cn(
          "relative h-[calc(100vh-4rem)] min-h-[620px] overflow-hidden bg-secondary touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4">
          <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-foreground">แผนที่จุดจอดรถบัส</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{locationStatus}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 px-3"
                onClick={requestUserLocation}
                disabled={isLocating}
                aria-label="ใช้ตำแหน่งปัจจุบัน"
              >
                <LocateFixed className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isLocating ? "กำลังค้นหา" : "ตำแหน่งฉัน"}
                </span>
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาเที่ยว, จุดจอด, เส้นทาง"
                className="h-11 rounded-lg bg-background pl-10 pr-4"
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[820px] w-[1200px] -translate-x-1/2 -translate-y-1/2">
            {tiles.map((tile) => (
              <img
                key={`${tile.x}-${tile.y}`}
                src={tile.url}
                alt=""
                className="absolute h-64 w-64 select-none"
                style={{ left: tile.left, top: tile.top }}
                draggable={false}
              />
            ))}

            {userLocation && (
              <button
                type="button"
                className="absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-xl"
                style={getMarkerPosition(userLocation, mapCenter, zoom)}
                onClick={centerOnUser}
                aria-label="ตำแหน่งปัจจุบันของคุณ"
              >
                <Crosshair className="h-5 w-5" />
              </button>
            )}

            {filteredStops.map((stop) => {
              const route = mockBusRoutes.find((item) => item.id === stop.routeId);
              return (
                <button
                  key={stop.id}
                  type="button"
                  className="group absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center"
                  style={getMarkerPosition({ lat: stop.lat, lon: stop.lon }, mapCenter, zoom)}
                  onClick={() => setSelectedStop(stop)}
                >
                  <span
                    className={cn(
                      "mb-1 hidden max-w-44 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground shadow-md group-hover:block sm:block",
                      query ? "block" : "",
                    )}
                  >
                    {route?.code} {stop.name}
                  </span>
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-xl transition-transform group-hover:scale-110",
                      typeClassName[stop.type],
                    )}
                  >
                    <MapPin className="h-5 w-5" />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.28),rgba(248,250,252,0.02)_42%,rgba(248,250,252,0.12))]" />
        </div>

        <div className="absolute right-4 top-40 z-30 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none border-b border-border text-lg font-bold"
            onClick={() => changeZoom(zoom + 1)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="ซูมเข้า"
          >
            +
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none text-lg font-bold"
            onClick={() => changeZoom(zoom - 1)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="ซูมออก"
          >
            -
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-30 rounded-md bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur">
          พบ {filteredStops.length} จุดจอด · ซูม {zoom}
        </div>
      </section>

      <Dialog open={!!selectedStop} onOpenChange={(open) => !open && setSelectedStop(null)}>
        <DialogContent className="max-w-[92vw] rounded-lg sm:max-w-lg">
          {selectedStop && (
            <>
              <DialogHeader className="pr-6 text-left">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className={typeClassName[selectedStop.type]}>{typeLabel[selectedStop.type]}</Badge>
                  <Badge variant="secondary">ลำดับที่ {selectedStop.stopOrder}</Badge>
                </div>
                <DialogTitle className="leading-7">{selectedStop.name}</DialogTitle>
                <DialogDescription className="flex items-start gap-2 pt-1">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{selectedStop.place}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/60 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Route className="h-4 w-4 text-primary" />
                    เส้นทางที่ขับผ่านจุดนี้
                  </div>
                  <div className="space-y-2">
                    {selectedRoutes.map((route) => (
                      <div
                        key={route.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-semibold">{route.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {route.origin} ไป {route.destination}
                          </div>
                        </div>
                        <Badge variant="outline">{route.code}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">ละติจูด</div>
                    <div className="font-semibold">{selectedStop.lat.toFixed(5)}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">ลองจิจูด</div>
                    <div className="font-semibold">{selectedStop.lon.toFixed(5)}</div>
                  </div>
                </div>

                <Button type="button" className="h-11 w-full" onClick={searchPassingBus}>
                  <Bus className="h-4 w-4" />
                  ค้นหารถที่จะผ่านจุดนี้
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setMapCenter({ lat: selectedStop.lat, lon: selectedStop.lon })}
                >
                  <Navigation className="h-4 w-4" />
                  โฟกัสตำแหน่งนี้บนแผนที่
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default BusStop;
