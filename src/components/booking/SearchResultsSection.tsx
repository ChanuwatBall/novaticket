import { useEffect, useState } from "react";
import { useBookingStore } from "@/store/bookingStore";
import { getBusStops, searchTrips } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Clock,
  Users,
  Bus,
  MapPin,
  ChevronRight,
  Wifi,
  Zap,
  Waves,
  Coffee,
  Info,
  Circle
} from "lucide-react";
import moment from "moment"; 
import { cn } from "@/lib/utils";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import TripCardSkeleton from "./TripCardSkeleton";
import { t } from "i18next";

interface SearchResultsSectionProps {
  onSelectTrip: (trip: any) => void;
}
interface TripResult  {
    "id": string
    "routeId": string
    "routeName": string
    "originStationId": string
    "destinationStationId": string
    "origin": string
    "destination": string
    "serviceDate": string
    "departureTime": string
    "arrivalTime": string
    "vehicleType": string
    "totalSeats": number
    "availableSeats": number
    "startingFare": string
    "status": string
}[]
const SearchResultsSection = ({ onSelectTrip }: SearchResultsSectionProps) => {
  const store = useBookingStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = moment().add(i, "days").locale("th");
    return {
      full: d.format("YYYY-MM-DD"),
      day: d.format("D"),
      dayName: d.format("ddd"),
      month: d.format("MMM"),
    };
  });

  useEffect(() => {
    const fetchTrips = async () => {
      if (!store.originProvinceId || !store.destinationProvinceId) return;
      setLoading(true);
      try {
        const tripsData = await searchTrips({
          originProvinceId: store.originProvinceId.id,
          destinationProvinceId: store.destinationProvinceId.id,
          date: store.travelDate,
          passengerCount: store.passengerCount,
          sort: "asc",
        });

        const routeIds = [...new Set((tripsData || []).map((trip: any) => trip.route_id?.id || trip.routeId).filter(Boolean))];
        const stopsData = (await Promise.all(routeIds.map((routeId: string) =>
          getBusStops(routeId, {
            originProvinceId: store.originProvinceId.id,
            destinationProvinceId: store.destinationProvinceId.id,
            origin: store.originProvinceId.name,
            destination: store.destinationProvinceId.name,
          })
        ))).flat();

        if (tripsData) {
          const processed = tripsData
            .filter(r => moment(r.date + " " + r.departure_time).format() > moment().format())
            .map(trip => ({
              ...trip,
              stops: stopsData?.filter(s => s.route_id?.id === (trip.route_id?.id || trip.routeId)) || []
            }))
            .sort((a, b) => a.departure_time.localeCompare(b.departure_time));
          console.log("processed ", processed)
          setTrips(processed);
        }
      } catch (error) {
        console.error("fetch trips error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [store.originProvinceId, store.destinationProvinceId, store.travelDate, store.passengerCount]);

  return (
    <div className="px-4 space-y-8">
      {/* Date Slider with Swiper */}
      <div className="w-full pb-2">
        <Swiper
          slidesPerView={4.5}
          spaceBetween={10}
          initialSlide={dates.findIndex(d => d.full === store.travelDate)}
          centeredSlides={false}
          className="date-swiper"
        >
          {dates.map((d) => (
            <SwiperSlide key={d.full} className="py-2">
              <button
                onClick={() => {
                  store.setTravelDate(d.full);
                }}
                className={cn(
                  "w-full h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border-2",
                  store.travelDate === d.full
                    ? "bg-white border-primary text-primary shadow-sm scale-105 z-10"
                    : "bg-white border-slate-100 hover:border-primary/20 text-slate-600"
                )}
              >
                <span className={cn("text-sm font-black", store.travelDate === d.full ? "text-primary" : "text-slate-600")}>
                  {d.day} {d.month}
                </span>
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div style={{ marginTop: "5px" }}>
        {loading ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 mb-4 animate-pulse">
              <h3 className="text-lg font-bold">{t("เลือกเที่ยวรถ")}</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-slate-100 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            </div>
            <TripCardSkeleton />
          </div>

        ) : (
          <>
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="text-lg font-bold">{t("เลือกเที่ยวรถ")}</h3>
              <div className="flex items-center justify-between  ">
                <div className="flex items-center  gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{t(store.originProvinceId?.name)} → {t(store.destinationProvinceId?.name)}</span>

                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {moment(store.travelDate).locale("th").format("DD MMM YYYY")}
                </div>
              </div>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Bus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-slate-500">{t("ไม่พบเที่ยวรถในเส้นทางนี้")}</p>
                <p className="text-xs text-slate-400 mt-1">{t("ลองเปลี่ยนวันที่หรือเส้นทางอื่น")}</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {trips.map((trip, i) => (
                  <AccordionItem
                    key={trip.id}
                    value={trip.id}
                    className={cn(
                      "border rounded-2xl bg-card overflow-hidden transition-all duration-300",
                      store.selectedTrip?.trip?.id === trip.id ? "ring-2 ring-primary border-primary shadow-lg" : "hover:border-primary/40 shadow-sm border-slate-200"
                    )}
                  >
                    <AccordionTrigger className="hover:no-underline p-0 [&>svg]:hidden w-full group">
                      <div className="w-full p-4 md:p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/10">
                                <Bus className="h-5 w-5 text-primary" />
                              </div>
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <p className="font-bold text-lg" >{trip?.departure_time}</p>
                                  <span className="text-sm font-bold text-slate-400">
                                    {trip.route_id?.origin_id?.toUpperCase()}
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center min-w-[100px]" >
                                  <div className="flex-1 flex flex-col items-center gap-1">
                                    <div className="flex items-center w-full px-2">
                                      <div className="h-[1.5px] flex-1 bg-slate-200 rounded-full" />
                                      <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />
                                      <div className="h-[1.5px] flex-1 bg-slate-200 rounded-full" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 tracking-tight">
                                      {trip.route_id?.duration }
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-lg" >{trip?.arrival_time}</p>
                                  <span className="text-sm font-bold text-slate-400">
                                    {trip.route_id?.destination_id?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-center h-full min-w-[80px]">
                            <span className="text-md mt-2 font-black text-primary leading-none">฿{trip.startingFare}</span>
                            <Badge variant="secondary" className="h-5 px-2 text-[9px] text-slate-400 font-bold bg-slate-100/50 hover:bg-slate-100">
                              ({t("ว่าง")}) {trip.available_seats} {t("ที่นั่ง")}
                            </Badge>
                          </div>
                        </div>



                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">

                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                            {t("ดูรายละเอียด")} <ChevronRight className={cn("h-3 w-3 transition-transform duration-300", store.selectedTrip?.trip?.id === trip.id ? "rotate-90" : "")} />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="bg-slate-50/50 border-t border-slate-100 p-0 overflow-hidden">
                      <div className="p-5 space-y-6">
                        <div className="space-y-0 relative">
                          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 border-dashed" />

                          {trip.stops.length > 0 ? (
                            trip.stops.map((stop: any, stopIdx: number) => (
                              <div key={stop.id} className={cn("flex gap-4 relative", stopIdx === trip.stops.length - 1 ? "items-end" : "pb-6")}>
                                <div className={cn(
                                  "h-3.5 w-3.5 rounded-full border-2 bg-white z-10",
                                  stop.type === 'pickup' ? "border-primary" : "border-slate-300",
                                  stopIdx === 0 ? "mt-1" : (stopIdx === trip.stops.length - 1 ? "mb-1" : "")
                                )} />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="max-w-[70%]">
                                      <p className="font-bold  text-sm  mt-0.5">
                                        {stopIdx === 0 ? trip.departure_time : (stopIdx === trip.stops.length - 1 ? trip.arrival_time : "")} &nbsp;
                                        {stop.type === 'pickup' ? trip?.route_id?.origin : trip?.route_id?.destination}
                                      </p>
                                      <p className="text-muted-foreground  text-xs">
                                        {stop.name}
                                      </p>
                                      {/* <p className="text-xs text-muted-foreground mt-0.5">
                                  {stop.type === 'pickup' ? "จุดขึ้นรถ" : "จุดลงรถ"}
                                </p> */}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                      {moment(trip.date).locale("th").format('D MMM YYYY')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex gap-4 relative">
                                <div className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-white z-10" />
                                <div className="flex-1 pb-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-sm">{trip.departure_time} — {store.originProvinceId?.name}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{t("สถานีขนส่งต้นทาง")}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">{moment(trip.date).locale("th").format('D MMM YYYY')}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-4 relative items-end">
                                <div className="mb-1 h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white z-10" />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-sm">{trip.arrival_time} — {store.destinationProvinceId?.name}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{t("สถานีขนส่งปลายทาง")}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">{moment(trip.date).locale("th").format('D MMM YYYY')}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Amenities */}
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("สิ่งอำนวยความสะดวก")}</p>
                          <div className="flex gap-4">
                            {trip.bus_type_id?.amenities?.map((amenity: string, idx: number) => (
                              <div key={idx} className="flex flex-col items-center gap-1.5 grayscale opacity-70">
                                {amenity === "WiFi" && <Wifi className="h-4 w-4" />}
                                {amenity === "ปลั๊กชาร์จ" && <Zap className="h-4 w-4" />}
                                {amenity === "ผ้าห่ม" && <Waves className="h-4 w-4" />}
                                {amenity === "น้ำดื่ม" && <Coffee className="h-4 w-4" />}
                                <span className="text-[8px] font-bold">{amenity}</span>
                              </div>
                            )) || (
                                <p className="text-xs text-muted-foreground italic">{t("ข้อมูลมาตรฐาน")}</p>
                              )}
                          </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-primary/5 rounded-xl p-4 flex gap-3 border border-primary/10">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                            ราคาที่แสดงรวมค่าธรรมเนียมการจัดการแล้ว สามารถเลือกที่นั่งและระบุข้อมูลผู้โดยสารเพื่อดำเนินการต่อ
                          </p>
                        </div>

                        {/* Select Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() =>{
                               onSelectTrip(trip)
                            }}
                            className="rounded-full px-10 h-12 text-base font-black shadow-lg shadow-primary/25 active:scale-95 transition-all"
                          >
                            {t("เลือกเที่ยวนี้")}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResultsSection;
