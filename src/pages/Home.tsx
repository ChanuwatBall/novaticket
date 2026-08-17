import { Link, useNavigate } from "react-router-dom";
import { Users, CalendarIcon, MapPin, Tag, Ticket, UserCircle, Check, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
// import { mockPromotions, provinces, routes } from "@/data/mockData";
import { format } from "date-fns";
import { useEffect, useMemo, useState, useRef } from "react";
import { useBookingStore } from "@/store/bookingStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import "../css/Home.css";
import { mockPromotions } from "@/data/mockData";
// import { getRoutes, getPromotions, Province } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { loginWithLine, getUserMe, getPromotions, getProvinces, getRoutes, getBusStops, getFaqs, bookingList, updatePassengerLocation, bookingDetail, getBoardingPoints } from "@/services/api";
import liff from "@line/liff";
import moment from "moment";
import { statusConfig } from "./MyTickets";
import { t } from "i18next";
import { supabase } from "@/supabase/client";

const Home = () => {
  const store = useBookingStore();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(store.travelDate ? new Date(store.travelDate) : undefined);
  const [openOrigin, setOpenOrigin] = useState(false);
  const [startpoint, setStartpoint] = useState("");
  const [openDestination, setOpenDestination] = useState(false);
  const [destination, setDestination] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [routesGroup, setRoutesGroup] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [openRoute, setOpenRoute] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [userMe, setUserMe] = useState<any>(null);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [maxPassenger, setMaxPassenger] = useState(3);
  const [introducRoute, setIntroduceRoute] = useState<any[]>([]);
  // API Queries

  // const { data: promotions = [], isLoading: isLoadingPromotions } = useQuery({
  //   queryKey: ['promotions'],
  //   queryFn: () => getPromotions().then(res => res.data),
  // });



  const filteredDestProvinces = useMemo(() => {
    const list = selectedRouteId
      ? provinces.filter((p) => p.region_id == selectedRouteId)
      : provinces;
    return list?.filter((v, i, a) => a.findIndex(t => t.destination === v.destination) === i);
  }, [selectedRouteId, provinces]);


  const handleBooking = () => {
    if (!date) {
      alert("กรุณาเลือกวันที่เดินทาง");
      return;
    }
    if (!store.originProvinceId || !store.destinationProvinceId) {
      alert("กรุณาเลือกต้นทางและปลายทาง");
      return;
    }
    if (!store.boardingPointId || !store.dropOffPointId) {
      alert("กรุณาเลือกจุดขึ้นและจุดลงรถ");
      return;
    }
    store.setTravelDate(format(date, "yyyy-MM-dd"));
    navigate("/booking");
  };

  const handleSwapOriginDestination = () => {
    if (!store.originProvinceId || !store.destinationProvinceId) {
      return;
    }

    const nextOrigin = store.destinationProvinceId;
    const nextDestination = store.originProvinceId;

    store.setOriginProvince(nextOrigin);
    store.setDestinationProvince(nextDestination);
    store.setBoardingPoint(null);
    store.setDropOffPoint(null);
    setStartpoint(nextOrigin?.name ?? "");
    setDestination(nextDestination?.name ?? "");
    setOpenOrigin(false);
    setOpenDestination(false);
  };

  useEffect(() => {

    const fetchUser = async () => {
      try {
        const preferencesstr = localStorage.getItem("preferences");
        const preferences = preferencesstr ? JSON.parse(preferencesstr) : null;
        console.log("preferences ", preferences)
        setMaxPassenger(preferences?.booking?.maxPassenger || 3);
      } catch (error) { }
      try {
        const userme = await getUserMe();
        if (userme?.error === 'Unauthorized') {
          if (liff.isLoggedIn()) {
            const ltoken = liff.getAccessToken();
            if (!ltoken) return;
            const reslogin = await loginWithLine({ lineAccessToken: ltoken });
            if (reslogin && reslogin.accessToken) {
              localStorage.setItem("user", JSON.stringify(reslogin));
              const refreshedUser = await getUserMe();
              if (refreshedUser && refreshedUser.id) {
                setUserMe(refreshedUser);
                localStorage.setItem("user", JSON.stringify({ ...reslogin, user: refreshedUser }));
              }
              return;
            }
          }
          return;
        }
        if (userme && userme.id) {
          setUserMe(userme);
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...existingUser, user: userme }));
        }
      } catch (e) {
        console.error("Home user check failed", e);
      }

    };

    const conf = async () => {
      try{
        const { data: company, error } = await supabase
          .from('companies')
          .select(`
            *,
            company_sales_settings (
              *
            )
          `)
          .eq('name', import.meta.env.VITE_COMPANY_NAME)
          .single()

        if (error) {
          console.error("Failed to load company", error)
        } else {
          localStorage.setItem("company", JSON.stringify(company))
          console.log("company ", company)
        }
      }catch(e){
        console.error("Home company check failed", e)
      }
      try {
        const data: any = await getRoutes()
        console.log("routes_group ", data)
        setRoutesGroup(data)
      } catch (error) {
        throw error
      }

      try {
        const data = await getProvinces()
        console.log("provinces ", data)
        setProvinces(data)
      } catch (error) {
        throw error
      }

      try {
        const data = await getPromotions({ memberOnly: "", visibility: "", routeId: "", dayOfWeek: "" });
        if (data) {
          console.log("promotions ", data);
          setPromotions(data);
        }
      } catch (err) {
        console.error("promotions fetch error", err);
      }

      try {
        const data = await getFaqs();
        console.log("faqs ", data);
        setFaqs(data);
      } catch (error) {
        console.error("conf error", error);
      }
    }
    fetchUser();
    conf();
    checkTicketStatus();
    getRoutes();

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        window.navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [])

  useEffect(() => {
    const today = moment().startOf("day").toDate();
    setDate(today);
    store.setPassengerCount(1);
  }, [])

  useEffect(() => {
    const fetchBusStopsForRoute = async () => {
      console.log("store.originProvinceId   ", store.originProvinceId);
      console.log("store.destinationProvinceId   ", store.destinationProvinceId);
      if (store.originProvinceId && store.destinationProvinceId) {
        const matchedRouteId = await supabase
          .from('routes')
          .select('id')
          .eq('origin_id', store.originProvinceId.id)
          .eq('destination_id', store.destinationProvinceId.id)
          .single()
          .then((response) => {
            if (response.error) {
              console.error("Error fetching matched route ID:", response.error);
              return null;
            }
            return response.data?.id || null;
          });

        console.log("matchedRouteId ", matchedRouteId)
        if (matchedRouteId) {
          try {
            const data = await getBusStops(matchedRouteId, {
              originProvinceId: store.originProvinceId.id,
              destinationProvinceId: store.destinationProvinceId.id,
              origin: store.originProvinceId.name,
              destination: store.destinationProvinceId.name,
            });
            if (data) setBusStops(data);
          } catch (error) {
            console.error("fetch bus stops error", error);
          }
        } else {
          setBusStops([]);
        }
      }
    };

    fetchBusStopsForRoute();
  }, [store.originProvinceId, store.destinationProvinceId]);

  const getRoutes = async () => {
    const { data: routes, error } = await supabase.from('routes').select('*')
    if (error) {
      console.error("Error fetching routes:", error);
      return;
    }
    setIntroduceRoute(routes);
  }



  const filteredRoutes = useMemo(() => {
    if (!store?.routeGroupid) return routes;
    return routes.filter((r) => r.region_id === store.routeGroupid);
  }, [routes, store?.routeGroupid]);

  const filteredProvinces = useMemo(() => {
    if (!store?.routeGroupid) return provinces;
    return provinces.filter(p => p.routeIds?.some((routeId: string) => routeId.startsWith(`${store.routeGroupid}-`)));
  }, [provinces, store?.routeGroupid]);

  const filteredProvinceByDestination = useMemo(() => {
    if (!store.originProvinceId) return filteredProvinces;

    return filteredProvinces.filter(p =>
      p.id !== store.originProvinceId?.id &&
      p.routeIds?.some((routeId: string) => store.originProvinceId?.routeIds?.includes(routeId))
    );
  }, [filteredProvinces, store?.originProvinceId]);

  const filteredOriginBusStops = useMemo(() => {
    if (!store.originProvinceId || !busStops.length) return [];
    return busStops.filter(r =>
      r.route_id?.origin_id === store.originProvinceId.id &&
      (r.type === "pickup" || r.type === "stop")
    );
  }, [busStops, store.originProvinceId]);

  const filteredDestBusStops = useMemo(() => {
    if (!store.destinationProvinceId || !busStops.length) return [];
    return busStops.filter(r =>
      r.route_id?.destination_id === store.destinationProvinceId.id &&
      (r.type === "dropoff" || r.type === "stop")
    );
  }, [busStops, store.destinationProvinceId]);


  const selectRoute = (route: any) => {
    console.log("route ", route)
    store.setRoute(`${route.origin} - ${route.destination}`);
    setOpenRoute(false);

    const pStart = provinces.find(p => p.id === route.origin_id);
    console.log("pStart ", pStart)

    if (pStart) store.setOriginProvince(pStart.id);
    const pEnd = provinces.find(p => p.id === route.destination_id);
    store.setOriginProvince(pStart.id)
    setStartpoint(pStart.name)
    console.log("pEnd ", pEnd)
    if (pEnd) store.setDestinationProvince(pEnd.name);
    store.setDestinationProvince(pEnd.id)
    setDestination(pEnd.name)
  }
  const chooseGroup = (r: any) => {
    if (store?.routeGroupid === r.g_route_id) {
      store?.setRouteGroupId(null)
    } else {
      store?.setRouteGroupId(r.g_route_id)
    }
    store.setRoute(null)
    store.setOriginProvince(null)
    store.setDestinationProvince(null)
  }

  const lastUpdateRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const UPDATE_INTERVAL = 30000; // อัพเดททุก 30 วินาที

  const getTicketStatus = (ticket: any) => {
    let key = 'confirmed';
    if (ticket.status === "cancelled") key = "cancelled";
    else if (ticket.status === "expired") key = "expired";
    else if (ticket.paymentStatus === "pending") {
      if (moment().isBefore(moment(ticket.expiresAt))) {
        key = "pending";
      } else {
        key = "expired";
      }
    } else {
      // For paid tickets, check trip time
      const tripTime = moment(`${ticket.date} ${ticket.departureTime}`, "YYYY-MM-DD HH:mm");
      if (moment().isBefore(tripTime)) {
        key = "upcoming";
      } else {
        key = "confirmed";
      }
    }

    return { ...statusConfig[key], key };
  };
  const chooseRoute = (p) => {
    selectRoute(p);
    const sp = provinces.find(pr => pr.id == p.origin)
    const ep = provinces.find(pr => pr.id == p.destination)
    store?.setOriginProvince(sp);
    store?.setDestinationProvince(ep);
  }

  const autoHandleBooking = async (route: any) => {
    const today = moment().startOf("day").toDate();
    setDate(today);
    store.setPassengerCount(1);

    const originProvince = provinces.find(
      (p) => String(p.id) === String(route.origin_id ?? route.origin)
        || p.name === route.origin
        || p.nameEn === route.origin
        || p.name_en === route.origin
    );
    const destinationProvince = provinces.find(
      (p) => String(p.id) === String(route.destination_id ?? route.destination)
        || p.name === route.destination
        || p.nameEn === route.destination
        || p.name_en === route.destination
    );

    if (!originProvince || !destinationProvince) {
      alert("ไม่พบข้อมูลต้นทางหรือปลายทาง");
      return;
    }

    store.setRoute(`${originProvince.name} - ${destinationProvince.name}`);
    store.setOriginProvince(originProvince);
    store.setDestinationProvince(destinationProvince);
    setStartpoint(originProvince.name);
    setDestination(destinationProvince.name);

    try {
      const matchedRouteId = route.id
        || await supabase
          .from('routes')
          .select('id')
          .eq('origin_id', originProvince.id)
          .eq('destination_id', destinationProvince.id)
          .single()
          .then((response) => {
            if (response.error) {
              return null;
            }
            return response.data?.id || null;
          });

      if (!matchedRouteId) {
        alert("ไม่พบเส้นทางสำหรับการจอง");
        return;
      }

      const stops = await getBusStops(matchedRouteId, {
        originProvinceId: originProvince.id,
        destinationProvinceId: destinationProvince.id,
        origin: originProvince.name,
        destination: destinationProvince.name,
      });

      const originStops = (stops || []).filter(
        (r: any) => r.route_id?.origin_id === originProvince.id && (r.type === "pickup" || r.type === "stop")
      );
      const destinationStops = (stops || []).filter(
        (r: any) => r.route_id?.destination_id === destinationProvince.id && (r.type === "dropoff" || r.type === "stop")
      );

      const firstBoardingPoint = originStops[0];
      const lastDropOffPoint = destinationStops[destinationStops.length - 1];

      if (!firstBoardingPoint || !lastDropOffPoint) {
        alert("ไม่พบจุดขึ้นหรือจุดลงรถสำหรับเส้นทางนี้");
        return;
      }

      setBusStops(stops || []);
      store.setBoardingPoint(firstBoardingPoint);
      store.setDropOffPoint(lastDropOffPoint);
      store.setTravelDate(format(today, "yyyy-MM-dd"));
      navigate("/booking");
    } catch (error) {
      console.error("auto handle booking error", error);
      alert("เกิดข้อผิดพลาดในการจองอัตโนมัติ");
    }
  }

  const checkTicketStatus = async () => {
    console.log("start checking TicketStatus ....")
    
    // ล้าง watch เก่าถ้ามี
    if (watchIdRef.current !== null) {
      window.navigator.geolocation.clearWatch(watchIdRef.current);
    }

    let userLocation: any = {}
    watchIdRef.current = window.navigator.geolocation.watchPosition(
      async (position) => {
        if (position.coords) {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_m: position.coords.accuracy
          };

          // จำกัดความถี่ในการอัพเดท (throttle)
          const now = Date.now();
          if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
            console.log("Skipping update - too soon since last update");
            return;
          }
          lastUpdateRef.current = now;

          try {
            const bookings = await supabase.from('bookings').select('*')
            .eq('user_id', userMe?.id).in('status', ['confirmed', 'upcoming']).in('paymentStatus', ['paid']);
            // await bookingList(1, 100)
            const currentTicket = bookings?.data?.filter((ticket) => (getTicketStatus(ticket).key === "upcoming" || getTicketStatus(ticket).key === "confirmed") && (moment().isBefore(moment(`${ticket.date} ${ticket.arrivalTime}`, "YYYY-MM-DD HH:mm"))) && (ticket.paymentStatus === "paid"))

            console.log("Founded current tickets: ", currentTicket)
            if (currentTicket.length > 0) {
              // ใช้ Promise.all แทน forEach เพื่อรอให้ async operations เสร็จ
              await Promise.all(currentTicket.map(async (ticket) => {
                console.log("upcoming ticket: ", ticket?.id);
                const bookDe: any = await bookingDetail({ id: ticket?.id })
                console.log("Updating location for booking: ", bookDe);
                await updatePassengerLocation(bookDe?.tripId, userLocation);
              }));
            } else {
              console.log("No upcoming tickets found, skipping location update");
            }
          } catch (error) {
            console.error("Error checking ticket status: ", error);
          }

        }
      },
      (error) => {
        console.error("Geolocation error: ", error);
      },
      {
        enableHighAccuracy: false, // ลดความแม่นยำเพื่อประหยัด battery
        maximumAge: 10000, // ยอมรับตำแหน่งที่เก็บไว้ได้ถึง 10 วินาที
        timeout: 5000
      }
    )
  }
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-start justify-between gap-3 shadow-md sticky top-0  z-50 pt-8 rounded-b-3xl " style={{ height: "10rem" }}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold" > {t("Booking your best trip")}</h1>
        </div>
        <Link to="/profile">
          {userMe?.avatarUrl ? (
            <img src={userMe.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full border-2 border-white/50 object-cover" />
          ) : (
            <UserCircle className="h-8 w-8" />
          )}
        </Link>
      </header>

      <main className=" space-y-6 max-w-lg mx-auto w-full relative "  >

        <div className="p-4 space-y-6 max-w-lg mx-auto w-full absolute " style={{ width: "100%", minHeight: "7rem", zIndex: 51, marginTop: "-10vh" }} >
          <div className="bg-white rounded-2xl p-3 mb-4  text-lg drop-shadow-xl " >
            <div className="grid  " >

              <div className="grid grid-cols-6">

                <div className="col-span-5" >
                  <div className="relative" style={{ position: "relative" }} >
                    <div className="space-y-1.5 mt-3">
                      <label className="text-sm font-medium text-muted-foreground ">
                        {t("ต้นทาง")}
                      </label>
                      <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
                        <MapPin className="h-3.5 w-3.5  text-muted-foreground" />
                        <input
                          type="text"
                          value={store?.originProvinceId ? t(`${store.originProvinceId?.name}`) || "" : ""}
                          placeholder={t("เลือกต้นทาง")}
                          onFocus={() => setOpenOrigin(true)}
                          onChange={(e) => setStartpoint(e.target.value)}
                          onBlur={() => setTimeout(() => setOpenOrigin(false), 150)}
                          className="w-full h-12   border-b border-input bg-card focus:outline-none focus:ring-2 focus:ring-ring font-medium text-muted-foreground cursor-pointer px-3 py-2"
                        />
                        {openOrigin && <div className="absolute inset-0 bg-white  mt-14" style={{ zIndex: "9999" }} onClick={() => setOpenOrigin(false)}>
                          <ul className="max-h-60 overflow-y-auto  bg-white border border-input rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                            {filteredProvinces.map((p) => (
                              <li
                                key={p.id}
                                className="cursor-pointer hover:bg-accent px-2 py-1 border-b border-gray-100"
                                onClick={() => {
                                  setStartpoint(p.origin);
                                  setOpenOrigin(false);
                                  store.setOriginProvince(p);
                                }}
                              >
                                {p.name} <br /><sub>{p?.nameEn}</sub>
                              </li>
                            ))}
                          </ul>
                        </div>}
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-3">
                      <label className="text-sm font-medium text-muted-foreground  gap-1">
                        {t("ปลายทาง")}
                      </label>
                      <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
                        <MapPin className="h-3.5 w-3.5  text-muted-foreground" />
                        <input
                          type="text"
                          value={store?.destinationProvinceId ? t(`${store?.destinationProvinceId?.name}`) || "" : ""}
                          placeholder={t("เลือกปลายทาง")}
                          onFocus={() => setOpenDestination(true)}
                          onChange={(e) => { setDestination(e.target.value) }}
                          onBlur={() => setTimeout(() => setOpenDestination(false), 150)}
                          className="w-full h-12   border-b border-input bg-card focus:outline-none focus:ring-2 focus:ring-ring font-medium text-muted-foreground cursor-pointer px-3 py-2"
                        />
                        {openDestination && <div className="absolute inset-0 bg-white  mt-14" style={{ zIndex: "9999" }} onClick={() => setOpenDestination(false)}>
                          <ul className="max-h-60 overflow-y-auto  bg-white border border-input rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                            {filteredProvinceByDestination.map((p) => (
                              <li
                                key={p.id}
                                className="cursor-pointer hover:bg-accent px-2 py-1 border-b border-gray-100"
                                onClick={() => {
                                  setDestination(p);
                                  setOpenDestination(false);
                                  store.setDestinationProvince(p);
                                }}
                              >
                                {p.name} <br /><sub>{p?.nameEn}</sub>
                              </li>
                            ))}
                          </ul>
                        </div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleSwapOriginDestination}
                    disabled={!store.originProvinceId || !store.destinationProvinceId}
                    aria-label={t("สลับต้นทางปลายทาง")}
                    title={t("สลับต้นทางปลายทาง")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

              </div>

              <div>
                {store.originProvinceId && store.destinationProvinceId && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("จุดขึ้นรถ")}</label>
                      <Select
                        value={store.boardingPointId?.id}
                        onValueChange={(val) => {
                          const pt = filteredOriginBusStops.find(p => p.id === val);
                          store.setBoardingPoint(pt);
                        }}
                      >
                        <SelectTrigger className="h-12 border-none bg-transparent" style={{ borderBottom: "1px solid #DDD", borderRadius: "0px" }}>
                          <SelectValue placeholder={t("เลือกจุดขึ้น")} />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: "999" }}>
                          {filteredOriginBusStops.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">{t("จุดลงรถ")}</label>
                      <Select
                        value={store.dropOffPointId?.id}
                        onValueChange={(val) => {
                          const pt = filteredDestBusStops.find(p => p.id === val);
                          store.setDropOffPoint(pt);
                        }}
                      >
                        <SelectTrigger className="h-12 border-none bg-transparent" style={{ borderBottom: "1px solid #DDD", borderRadius: "0px" }}>
                          <SelectValue placeholder={t("เลือกจุดลง")} />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: "999" }}>
                          {filteredDestBusStops.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

              </div>

              <div className="grid grid-cols-2 gap-2 mt-2" >
                <div className="space-y-1.5 ">
                  <label className="text-sm font-medium text-muted-foreground">{t("วันที่เดินทาง")}</label><br />
                  <Popover  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className={cn("w-full  h-12 justify-start font-normal text-muted-foreground ")}
                        style={{ borderBottom: "1px solid  #DDD", borderRadius: "0px", margin: "0px", paddingLeft: "0px" }}  >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: th }) : t("เลือกวันที่")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < moment().startOf("day").toDate()} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    {t("จำนวนผู้โดยสาร")}
                  </label>
                  <Select value={String(store.passengerCount)} onValueChange={(v) => store.setPassengerCount(Number(v))}>
                    <SelectTrigger className="h-12 border-none bg-transparent " style={{ borderBottom: "1px solid  #DDD", borderRadius: "0px" }} >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> <SelectValue placeholder={t("เลือกจำนวนผู้โดยสาร")} className="text-black" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: "999" }} >
                      {Array.from({ length: maxPassenger }).map((n, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{i + 1} {t("คน")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleBooking} className="w-full h-14 text-lg font-bold mt-4" size="lg">
                <Ticket className="mr-2 h-5 w-5" />
                {t("ค้นหาเที่ยวรถ")}
              </Button>

            </div>
          </div>

          <section className="mb-6 bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-xl font-bold mb-3">{t("เส้นทางแนะนำ")}</h2>
            {introducRoute && introducRoute.map((route, i) => (
              <span className="text-black text-xs mb-1 mr-2" key={i} onClick={() => autoHandleBooking(route)} style={{ cursor: "pointer", display: "inline-block", padding: "4px 8px", backgroundColor: "#f0f0f0", borderRadius: "12px" }}>
                {route.origin} - {route.destination}
              </span>
            ))}
          </section>


          {/* Promotions */}
          <section>
            <h2 className="text-xl font-bold mb-3">{t("โปรโมชั่นล่าสุด")}</h2>
            <Link to="/promotions">
              <Button variant="outline" className="w-full h-12 font-bold">
                <Tag className="mr-2 h-4 w-4" />
                {t("ดูโปรโมชั่นทั้งหมด")}
              </Button>
            </Link> <br /> <br />
            <Swiper
              slidesPerView={2.5} spaceBetween={3}
              onSlideChange={() => console.log('slide change')}
              onSwiper={(swiper) => console.log(swiper)}
            >
              {
                promotions && promotions.map((promo) =>
                  <SwiperSlide className="text-left" key={promo.id}>
                    <div
                      onClick={() => navigate(`/promotions/${promo.id}`)}
                      className={cn(
                        "w-full rounded-xl overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02] shadow-sm",
                        "from-primary to-primary/80"
                      )}
                      style={{ height: "10rem" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-black text-xl font-bold mb-1">{promo.title}</span>
                        <p className="text-black/80 text-xs line-clamp-2">{promo?.description}</p>
                        <div className="mt-3 bg-primary/90 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white">
                          {promo.code}
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                )
              }
            </Swiper>
          </section>

          {faqs && faqs.length > 0 && (
            <section className="mt-8 mb-6">
              <h2 className="text-xl font-bold mb-3">{t("คำถามที่พบบ่อย")}</h2>
              <Accordion type="single" collapsible className="w-full bg-white rounded-2xl p-4 shadow-sm">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap text-left">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          <div className="w-100" style={{ height: "6rem" }} ></div>
        </div>

      </main>
    </div>
  );
};

export default Home;
