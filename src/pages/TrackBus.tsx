import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Ticket,
  X,
} from "lucide-react";
import { bookingDetail, bookingList, getBusStops, getDriverLocation, getTripDetail } from "@/services/api";
import type { BusStopMarkerPoint, DriverMarkerPoint, LatLngPoint } from "@/components/tracking/TrackMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusConfig } from "./MyTickets";
import { t } from "i18next";

type TrackingTicket = {
  id?: string;
  bookingReference?: string;
  tripId?: string;
  routeId?: string;
  route_id?: { id?: string };
  originProvinceId?: string;
  destinationProvinceId?: string;
  origin?: string;
  destination?: string;
  routeName?: string;
  date?: string;
  departureTime?: string;
  arrivalTime?: string;
  paymentStatus?: string;
  status?: string;
  expiresAt?: string;
  seats?: string[];
};

type DriverLocationResponse = {
  trip_id?: string;
  status?: string;
  reason?: string;
  driver_name?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    speed_kmh?: number;
    heading_deg?: number;
    reported_at?: string;
    stale?: boolean;
  };
  error?: string;
};

const getTicketStatus = (ticket: TrackingTicket) => {
  let key = "confirmed";
  if (ticket.status === "cancelled") key = "cancelled";
  else if (ticket.status === "expired") key = "expired";
  else if (ticket.paymentStatus === "pending") {
    key = moment().isBefore(moment(ticket.expiresAt)) ? "pending" : "expired";
  } else {
    const tripTime = moment(`${ticket.date} ${ticket.departureTime}`, "YYYY-MM-DD HH:mm");
    key = moment().isBefore(tripTime) ? "upcoming" : "confirmed";
  }

  return { ...statusConfig[key], key };
};

const getRouteLabel = (ticket?: TrackingTicket | null) => {
  if (!ticket) return t("เลือกเที่ยวที่ต้องการติดตาม");
  if (ticket.origin || ticket.destination) return `${t(ticket.origin) || "-"} → ${t(ticket.destination) || "-"}`;
  return t(ticket.routeName) || t("ข้อมูลเที่ยวรถ");
};

const getTripTitle = (ticket?: TrackingTicket | null, fallbackTripId?: string | null) => {
  return ticket?.bookingReference || fallbackTripId || "-";
};

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getRouteId = (data?: TrackingTicket | null) => data?.routeId || data?.route_id?.id || null;
const TrackMap = lazy(() => import("@/components/tracking/TrackMap"));

const TrackBus = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");
  const bookingReferenceParam =
    searchParams.get("bookingReference") || searchParams.get("bookingRef") || searchParams.get("booking");

  const [tickets, setTickets] = useState<TrackingTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TrackingTicket | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocationResponse | null>(null);
  const [userLocation, setUserLocation] = useState<LatLngPoint | null>(null);
  const [busStops, setBusStops] = useState<BusStopMarkerPoint[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [openTicketModal, setOpenTicketModal] = useState(!tripIdParam && !bookingReferenceParam);
  const [message, setMessage] = useState("");

  const driverMarker = useMemo<DriverMarkerPoint | null>(() => {
    const lat = toNumber(driverLocation?.location?.latitude);
    const lng = toNumber(driverLocation?.location?.longitude);
    if (lat === null || lng === null) return null;

    return {
      lat,
      lng,
      headingDeg: driverLocation?.location?.heading_deg || 0,
      label: selectedTicket?.bookingReference || driverLocation?.trip_id || "รถบัส",
      driverName: driverLocation?.driver_name,
      speedKmh: driverLocation?.location?.speed_kmh,
      reportedAt: driverLocation?.location?.reported_at,
      stale: driverLocation?.location?.stale,
    };
  }, [driverLocation, selectedTicket]);

  const etaLabel = selectedTicket?.arrivalTime ? `${selectedTicket.arrivalTime} น.` : "-";
  const selectedTripId = selectedTicket?.tripId || tripIdParam;

  const resetTrackingMarkers = useCallback(() => {
    setDriverLocation(null);
    setBusStops([]);
    setMessage("");
  }, []);

  const clearSelectedTrip = useCallback(() => {
    setSelectedTicket(null);
    resetTrackingMarkers();
    setSearchParams({});
    setOpenTicketModal(true);
  }, [resetTrackingMarkers, setSearchParams]);

  const loadDriverLocation = useCallback(async (tripId: string) => {
    setLoadingLocation(true);
    setMessage("");
    try {
      const location = await getDriverLocation(tripId);
      setDriverLocation(location);
      if (location?.error || !location?.location) {
        setMessage(location?.reason || location?.error || "ยังไม่พบตำแหน่งรถ อาจยังไม่ถึงรอบ หรือรถยังไม่ออกจากสถานี");
      }
    } catch (error) {
      console.error("loadDriverLocation error", error);
      setDriverLocation(null);
      setMessage("ไม่สามารถดึงตำแหน่งรถได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const resolveTicketDetail = useCallback(async (ticket: TrackingTicket) => {
    if (!ticket.id) return ticket;
    const detail = await bookingDetail({ id: ticket.id });
    return { ...ticket, ...detail, id: ticket.id };
  }, []);

  const loadBusStopsForTrip = useCallback(async (ticket: TrackingTicket) => {
    setLoadingStops(true);
    setBusStops([]);

    try {
      let routeId = getRouteId(ticket);
      let tripDetail: any = null;

      if (!routeId && ticket.tripId) {
        tripDetail = await getTripDetail(ticket.tripId);
        routeId = getRouteId(tripDetail) || tripDetail?.routeId || tripDetail?.route_id?.id;
      }

      if (!routeId) return;

      const stops = await getBusStops(routeId, {
        originProvinceId: ticket.originProvinceId || tripDetail?.originProvinceId,
        destinationProvinceId: ticket.destinationProvinceId || tripDetail?.destinationProvinceId,
        origin: ticket.origin || tripDetail?.origin,
        destination: ticket.destination || tripDetail?.destination,
      });

      const validStops = (Array.isArray(stops) ? stops : [])
        .map((stop: any) => {
          const lat = toNumber(stop.lat);
          const lng = toNumber(stop.lng);
          if (lat === null || lng === null) return null;

          return {
            id: stop.id,
            name: stop.name,
            type: stop.type,
            stopOrder: stop.stopOrder || stop.order,
            lat,
            lng,
          } satisfies BusStopMarkerPoint;
        })
        .filter(Boolean) as BusStopMarkerPoint[];
      const filteredStops = validStops.filter((a) => a.lat !== null && a.lng !== null && a.lat !== 0 && a.lng !== 0);
      setBusStops(filteredStops);
    } catch (error) {
      console.error("loadBusStopsForTrip error", error);
    } finally {
      setLoadingStops(false);
    }
  }, []);

  const selectTicket = useCallback(
    async (ticket: TrackingTicket, shouldPushParams = true) => {
      resetTrackingMarkers();
      const detail = await resolveTicketDetail(ticket);
      setSelectedTicket(detail);
      setOpenTicketModal(false);

      if (!detail.tripId) {
        setMessage("ไม่พบรหัสเที่ยวรถของรายการจองนี้");
        return;
      }

      if (shouldPushParams) {
        setSearchParams({
          tripId: detail.tripId,
          bookingReference: detail.bookingReference || "",
        });
      }

      await Promise.all([
        loadDriverLocation(detail.tripId),
        loadBusStopsForTrip(detail),
      ]);
    },
    [loadBusStopsForTrip, loadDriverLocation, resetTrackingMarkers, resolveTicketDetail, setSearchParams],
  );

  useEffect(() => {
    let watchId: number | null = null;

    if (!navigator.geolocation) return undefined;

    const updateUserLocation = (position: GeolocationPosition) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    };

    navigator.geolocation.getCurrentPosition(updateUserLocation, console.warn, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 10_000,
    });

    watchId = navigator.geolocation.watchPosition(updateUserLocation, console.warn, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 20_000,
    });

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const bookings = await bookingList(1, 100);
        const upcomingTickets = bookings?.data?.filter(
          (ticket: TrackingTicket) => 
            (getTicketStatus(ticket).key === "upcoming" || getTicketStatus(ticket).key === "confirmed") && (moment().isBefore(moment(ticket.date+" "+ticket.departureTime))) && ticket.paymentStatus === "paid",
        ) || [];
        setTickets(upcomingTickets);

        const matchedTicket = upcomingTickets.find((ticket: TrackingTicket) => {
          return (
            (bookingReferenceParam && ticket.bookingReference === bookingReferenceParam) ||
            (tripIdParam && ticket.tripId === tripIdParam)
          );
        });

        if (matchedTicket) {
          await selectTicket(matchedTicket, false);
          return;
        }

        if (tripIdParam) {
          const fallbackTicket = {
            tripId: tripIdParam,
            bookingReference: bookingReferenceParam || undefined,
          };
          setSelectedTicket(fallbackTicket);
          setOpenTicketModal(false);
          await Promise.all([
            loadDriverLocation(tripIdParam),
            loadBusStopsForTrip(fallbackTicket),
          ]);
        } else {
          setOpenTicketModal(true);
        }
      } catch (error) {
        console.error("loadTickets error", error);
        setMessage("ไม่สามารถดึงรายการเที่ยวที่จองแล้วได้");
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-950">
      <div className="absolute inset-0">
        <Suspense fallback={<div className="h-full w-full bg-slate-200" />}>
          <TrackMap
            driver={driverMarker}
            user={userLocation}
            stops={selectedTicket ? busStops : []}
            selectedTripId={selectedTripId}
          />
        </Suspense>
      </div>

      <header className="absolute left-0 right-0 top-0 z-[800] flex items-center justify-between px-5 pb-3 pt-6 text-[#092c5c]">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-extrabold">{t("ติดตามรถ")}</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm" onClick={() => setOpenTicketModal(true)}>
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="absolute bottom-20 left-3 right-3 z-[800] mx-auto max-w-lg">
        {selectedTicket && (
          <div className="rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700">#{getTripTitle(selectedTicket, tripIdParam)}</p>
                <h2 className="mt-1 truncate text-base font-extrabold text-slate-950">{getRouteLabel(selectedTicket)}</h2>
              </div>
              <Badge className="shrink-0 rounded-full bg-[#244b82] px-3 py-1 text-white hover:bg-[#244b82]">
                {driverLocation?.status === "live" ? t("กำลังเดินทาง") : t("รอติดตาม")}
              </Badge>
            </div>

            <div className="mb-3 border-t border-slate-200" />

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">{("เวลาที่คาดว่าจะถึง")}</p>
                <p className="text-lg font-extrabold text-[#8a340f]">{etaLabel}</p>
              </div>
            </div>

            {message && (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                {message}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <span>{t("จุดจอด")} {loadingStops ? t("กำลังโหลด...") : `${busStops.length} ${t("จุด")}`}</span>
              <span className="text-right">
                {t("อัปเดต")} {driverLocation?.location?.reported_at ? moment(driverLocation.location.reported_at).format("HH:mm") : "-"}
              </span>
              {driverLocation?.location && (
                <>
                  <span>{t("ความเร็ว")} {driverLocation.location.speed_kmh ?? "-"} {t("กม./ชม.")}</span>
                  <span className="text-right">{driverLocation.location.stale ? t("ข้อมูลเก่า") : t("ข้อมูลล่าสุด")}</span>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                className="h-11 flex-1 rounded-md bg-gradient-to-r from-[#244b82] to-[#8a340f] font-bold text-white"
                onClick={() => selectedTicket?.tripId && loadDriverLocation(selectedTicket.tripId)}
                disabled={loadingLocation || !selectedTicket?.tripId}
              >
                {loadingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t("อัปเดตตำแหน่ง")}
              </Button>
              <Button variant="outline" className="h-11 rounded-md" onClick={() => setOpenTicketModal(true)}>
                <Ticket className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-11 rounded-md" onClick={clearSelectedTrip}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {openTicketModal && (
        <section className="fixed inset-x-0 bottom-16 z-[1000] mx-auto max-h-[72vh] w-full max-w-lg overflow-hidden rounded-b-none rounded-t-[30px] border border-x-0 border-b-0 bg-background p-0 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="px-5 pb-2 pt-5 text-left">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold leading-none tracking-tight">{t("เลือกเที่ยวที่จองแล้ว")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("แสดงเฉพาะเที่ยวที่ชำระเงินแล้วและยังไม่ถึงเวลาเดินทาง")}</p>
                </div>
                <button className="rounded-full p-1 text-muted-foreground hover:bg-muted" onClick={() => setOpenTicketModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto px-4 pb-5">
            {loadingTickets ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("กำลังโหลดรายการเที่ยว...")}
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-lg bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                {t("ยังไม่มีเที่ยวที่สามารถติดตามได้")}
              </div>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicket?.bookingReference === ticket.bookingReference;
                return (
                  <button
                    key={ticket.id || ticket.bookingReference}
                    className={cn(
                      "w-full rounded-lg border bg-white p-4 text-left shadow-sm transition",
                      isSelected ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-primary/50",
                    )}
                    onClick={() => selectTicket(ticket)}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground">#{ticket.bookingReference}</p>
                        <p className="mt-1 truncate font-extrabold text-slate-950">{getRouteLabel(ticket)}</p>
                      </div>
                      <Badge variant="default" className="shrink-0">{t("กำลังจะถึง")}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {ticket.date || "-"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {ticket.departureTime || "-"} น.
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {t("ที่นั่ง")} {ticket.seats?.join(", ") || "-"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
            </div>
          </section>
      )}
    </div>
  );
};

export default TrackBus;
