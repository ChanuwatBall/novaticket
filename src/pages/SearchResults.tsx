import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import BookingLayout from "@/components/BookingLayout";
import { useBookingStore } from "@/store/bookingStore";
// import { mockTrips } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Bus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
// import { getProvinces, Province, searchTrips, Trip } from "@/services/api";
import { getBusStops, searchTrips } from "@/services/api";
import moment from "moment";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { t } from "i18next";

const SearchResults = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [originName, setOriginName] = useState<string>("");
  const [destName, setDestName] = useState<string>("");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedTripToBook, setSelectedTripToBook] = useState<any>(null);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [localBoardingPoint, setLocalBoardingPoint] = useState<any>(null);
  const [localDropOffPoint, setLocalDropOffPoint] = useState<any>(null);
  const [destBoardingPoints, setDestBoardingPoints] = useState<any[]>([]);
  const [originBoardingPoints, setOriginBoardingPoints] = useState<any[]>([]);

  useEffect(() => {
    const conf = async () => {
      console.log("store.travelDate ", store.travelDate)
      console.log("store.routeId ", store.routeId)
      console.log("store.originProvinceId ", store.originProvinceId)
      console.log("store.destinationProvinceId ", store.destinationProvinceId)
      console.log("store.boardingPointId ", store.boardingPointId)
      console.log("store.dropOffPointId ", store.dropOffPointId)
      console.log("passengerCount", store.passengerCount)

      try {
        const tripsData = await searchTrips({
          originProvinceId: store.originProvinceId.id,
          destinationProvinceId: store.destinationProvinceId.id,
          date: store.travelDate,
          passengerCount: store.passengerCount,
          sort: "asc",
        });

        console.log("trips ", tripsData)
        const filterTrips = (tripsData || [])
          .filter(r => moment(r.date + " " + r.departure_time).format() > moment().format())
          .sort((a, b) => a.departure_time.localeCompare(b.departure_time));
        
        console.log("filterTrips sorted ", filterTrips)
        setTrips(filterTrips)

        const routeIds = [...new Set(filterTrips.map((trip) => trip.route_id?.id || trip.routeId).filter(Boolean))];
        const stops = (await Promise.all(routeIds.map((routeId: string) =>
          getBusStops(routeId, {
            originProvinceId: store.originProvinceId.id,
            destinationProvinceId: store.destinationProvinceId.id,
            origin: store.originProvinceId.name,
            destination: store.destinationProvinceId.name,
          })
        ))).flat();
        setBusStops(stops);
      } catch (error) {
        throw error
      }

    }
    conf()

  }, [store])

  // const originBoardingPoints = useMemo(() => {
  //   if (!busStops.length) return [];
  //   return busStops.filter(r => r.route_id == store.routeId?.id);
  // }, [busStops]);

  // const destBoardingPoints = useMemo(() => {
  //   if (!busStops.length) return [];
  //   return busStops.filter(r => r.route_id == store.routeId?.id);
  // }, [busStops]);

  const handleSelectTrip = (trip: typeof trips[0]) => {
    if (store.boardingPointId && store.dropOffPointId) {
      store.setSelectedTrip(trip);
      navigate("/seats/" + trip.id);
      return;
    }

    setSelectedTripToBook(trip);
    console.log("handleSelectTrip trip ", trip)
    console.log("handleSelectTrip busStops ", busStops)
    store.setSelectedTrip(trip);
    const routeId = trip.route_id?.id || trip.routeId;
    const originBoardingPoints = busStops.filter(r => r.route_id.id == routeId).filter((r) => r.type == "pickup" || r.type == "stop");
    const destBoardingPoints = busStops.filter(r => r.route_id.id == routeId).filter((r) => r.type == "dropoff" || r.type == "stop");
    console.log("originBoardingPoints ", originBoardingPoints)
    console.log("destBoardingPoints ", destBoardingPoints)
    setOriginBoardingPoints(originBoardingPoints);
    setDestBoardingPoints(destBoardingPoints);
    if (store.boardingPointId) setLocalBoardingPoint(store.boardingPointId);
    if (store.dropOffPointId) setLocalDropOffPoint(store.dropOffPointId);
    setIsPopupOpen(true);
  };

  const handleConfirmPoints = () => {
    if (localBoardingPoint && localDropOffPoint) {
      store.setBoardingPoint(localBoardingPoint);
      store.setDropOffPoint(localDropOffPoint);
      store.setSelectedTrip(selectedTripToBook);
      setIsPopupOpen(false);
      navigate("/seats/"+selectedTripToBook.id);
    }
  };

  return (
    <BookingLayout currentStep={1} title={t("เลือกเที่ยวรถ")} navto={() => navigate(-1)}>
      <div className="px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="h-3.5 w-3.5" />
          <span>{t(`${store.originProvinceId?.name}`)} → {t(`${store.destinationProvinceId?.name}`)}</span>
          <span className="ml-auto">{store.travelDate}</span>
        </div>

        {!trips || trips.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bus className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t("ไม่พบเที่ยวรถในเส้นทางนี้")}</p>
            <p className="text-sm mt-1">{t("กรุณาเลือกเส้นทางอื่น")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isLoadingTrips ? <div> Loading </div> :
              trips && trips.map((trip) => (
                <Card
                  key={trip.id}
                  className="cursor-pointer hover:ring-2 hover:ring-primary/30 active:scale-[0.98] transition-all"
                  onClick={() => handleSelectTrip(trip)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold">{trip.departure_time}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-lg font-bold">{trip.arrival_time}</span>
                      </div>
                      <span className="text-xl font-bold text-primary">฿{trip.price}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{trip.trip_type}</Badge>
                      <Badge variant="outline">{trip.bus_type_id?.name}</Badge>
                      <div className="flex items-center gap-1 ml-auto text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{t("ว่าง")} {trip.available_seats} {t("ที่นั่ง")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      <Drawer open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DrawerContent className="sm:max-w-[425px] mx-auto w-full px-4 pb-4">
          <DrawerHeader>
            <DrawerTitle className="text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{store.originProvinceId?.name} - {store.destinationProvinceId?.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{store.travelDate}</span>
                <small className="text-muted-foreground" style={{ fontWeight: "400" }}>เลือกจุดขึ้นรถและจุดลงรถ</small>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          {selectedTripToBook && (
            <div className="bg-muted p-3 rounded-lg mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-base font-bold">{selectedTripToBook.departure_time}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-base font-bold">{selectedTripToBook.arrival_time}</span>
                </div>
                <span className="text-base font-bold text-primary">฿{selectedTripToBook.price}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{selectedTripToBook.trip_type}</Badge>
                <Badge variant="outline" className="text-xs">{selectedTripToBook.bus_type_id?.name}</Badge>
              </div>
            </div>
          )}
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">จุดขึ้นรถ</label>
              <Select value={localBoardingPoint?.id} onValueChange={(val) => {
                const pt = originBoardingPoints.find(p => p.id === val);
                setLocalBoardingPoint(pt);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกจุดขึ้นรถ" />
                </SelectTrigger>
                <SelectContent>
                  {originBoardingPoints.filter(p => p.id !== localDropOffPoint?.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.type === "stop" ? "จุดจอด" : "จุดขึ้นรถ"} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">จุดลงรถ</label>
              <Select value={localDropOffPoint?.id} onValueChange={(val) => {
                const pt = destBoardingPoints.find(p => p.id === val);
                setLocalDropOffPoint(pt);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกจุดลงรถ" />
                </SelectTrigger>
                <SelectContent>
                  {destBoardingPoints.filter(p => p.id !== localBoardingPoint?.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.type === "stop" ? "จุดจอด" : "จุดลงรถ"} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter className="px-0 pt-2">
            <Button onClick={handleConfirmPoints} disabled={!localBoardingPoint || !localDropOffPoint}>
              ยืนยัน
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </BookingLayout>
  );
};

export default SearchResults;
