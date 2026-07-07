import { Link, useNavigate } from "react-router-dom";
import { Users, CalendarIcon, MapPin, Tag, Ticket, UserCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
// import { mockPromotions, provinces, routes } from "@/data/mockData";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
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
import { loginWithLine, getUserMe, getPromotions, getProvinces, getRoutes, getBusStops, getFaqs, bookingList, updatePassengerLocation, bookingDetail } from "@/services/api";
import liff from "@line/liff";
import moment from "moment";
import { statusConfig } from "./MyTickets";

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
  // API Queries

  // const { data: promotions = [], isLoading: isLoadingPromotions } = useQuery({
  //   queryKey: ['promotions'],
  //   queryFn: () => getPromotions().then(res => res.data),
  // });



  const filteredDestProvinces = useMemo(() => {
    const list = selectedRouteId
      ? provinces.filter((p) => p.region_id == selectedRouteId)
      : provinces;
    return list.filter((v, i, a) => a.findIndex(t => t.destination === v.destination) === i);
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

  useEffect(() => {
    
    const fetchUser = async () => {
      try {
        const preferencesstr = localStorage.getItem("preferences");
        const preferences = preferencesstr ? JSON.parse(preferencesstr) : null;
        console.log("preferences ", preferences)
        setMaxPassenger(preferences?.booking?.maxPassenger || 3);
      } catch (error) {}
      try {
        const userme = await getUserMe();
        if (userme?.error === 'Unauthorized') {
          if (liff.isLoggedIn()) {
            const ltoken = liff.getAccessToken();
            if (!ltoken) return;
            const reslogin = await loginWithLine({ lineAccessToken: ltoken });
            if (reslogin && reslogin.token) {
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
      try {
        const data = await getRoutes()
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
  }, [])

  useEffect(() => {
    const fetchBusStopsForRoute = async () => {
      if (store.originProvinceId && store.destinationProvinceId) {
        const matchedRouteId = store.originProvinceId.routeIds?.find((routeId: string) =>
          store.destinationProvinceId?.routeIds?.includes(routeId)
        );

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

  const checkTicketStatus = async () => {
    console.log("start checking TicketStatus ....")
    let userLocation: any = {}
    window.navigator.geolocation.watchPosition(
      async (position) => {
        if (position.coords) {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_m: position.coords.accuracy
          };

          try {
            const bookings = await bookingList(1, 100)
            const upcomingTickets = bookings?.data.filter((ticket) => getTicketStatus(ticket).key === "upcoming" && ticket.paymentStatus === "paid")
            if (upcomingTickets.length > 0) {
              console.log("Founded upcoming tickets: ")

              await upcomingTickets.forEach(async (ticket) => {
                console.log("upcoming ticket: ", ticket?.id);
                const bookDe: any = await bookingDetail({ id: ticket?.id })
                console.log("Updating location for booking: ", bookDe);
                updatePassengerLocation(bookDe?.tripId, userLocation);
              });
            } else {
              console.log("No upcoming tickets found, skipping location update");
            }
          } catch (error) {
            console.error("Error checking ticket status: ", error);
          }

        }
      }
    )
  }
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-start justify-between gap-3 shadow-md sticky top-0  z-50 pt-8 rounded-b-3xl " style={{ height: "10rem" }}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold" > Booking your best trip</h1>
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
              <div className="scrollbar flex-shrink-0 flex " style={{ width: "100%", overflowX: "scroll" }}>
                {/* {routesGroup.map((r) => (
                  <button key={r.id} onClick={() => {
                    chooseGroup(r)
                  }}>
                    <span className={cn("block text-center py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap mr-1", store?.routeGroupid === r.g_route_id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/80")}>
                      {r.name}
                    </span>
                  </button>
                ))} */}
              </div>
              <div>


                <div className="space-y-1.5 mt-3">
                  <label className="text-sm font-medium text-muted-foreground ">
                    ต้นทาง
                  </label>
                  <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
                    <MapPin className="h-3.5 w-3.5  text-muted-foreground" />
                    <input
                      type="text"
                      value={store.originProvinceId?.name || ""}
                      placeholder="เลือกต้นทาง"
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
                            className="cursor-pointer hover:bg-accent rounded-sm px-2 py-1"
                            onClick={() => {
                              setStartpoint(p.origin);
                              setOpenOrigin(false);
                              store.setOriginProvince(p);
                            }}
                          >
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    </div>}
                  </div>
                </div>

                <div className="space-y-1.5 mt-3">
                  <label className="text-sm font-medium text-muted-foreground  gap-1">
                    ปลายทาง
                  </label>
                  <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
                    <MapPin className="h-3.5 w-3.5  text-muted-foreground" />
                    <input
                      type="text"
                      value={store?.destinationProvinceId?.name || ""}
                      placeholder="เลือกปลายทาง"
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
                            className="cursor-pointer hover:bg-accent rounded-sm px-2 py-1"
                            onClick={() => {
                              setDestination(p);
                              setOpenDestination(false);
                              store.setDestinationProvince(p);
                            }}
                          >
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    </div>}
                  </div>
                </div>

                {store.originProvinceId && store.destinationProvinceId && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">จุดขึ้นรถ</label>
                      <Select
                        value={store.boardingPointId?.id}
                        onValueChange={(val) => {
                          const pt = filteredOriginBusStops.find(p => p.id === val);
                          store.setBoardingPoint(pt);
                        }}
                      >
                        <SelectTrigger className="h-12 border-none bg-transparent" style={{ borderBottom: "1px solid #DDD", borderRadius: "0px" }}>
                          <SelectValue placeholder="เลือกจุดขึ้น" />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: "999" }}>
                          {filteredOriginBusStops.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">จุดลงรถ</label>
                      <Select
                        value={store.dropOffPointId?.id}
                        onValueChange={(val) => {
                          const pt = filteredDestBusStops.find(p => p.id === val);
                          store.setDropOffPoint(pt);
                        }}
                      >
                        <SelectTrigger className="h-12 border-none bg-transparent" style={{ borderBottom: "1px solid #DDD", borderRadius: "0px" }}>
                          <SelectValue placeholder="เลือกจุดลง" />
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
                  <label className="text-sm font-medium text-muted-foreground">วันที่เดินทาง</label><br />
                  <Popover  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className={cn("w-full  h-12 justify-start font-normal text-muted-foreground ")}
                        style={{ borderBottom: "1px solid  #DDD", borderRadius: "0px", margin: "0px", paddingLeft: "0px" }}  >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: th }) : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < moment().startOf("day").toDate()} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    จำนวนผู้โดยสาร
                  </label>
                  <Select value={String(store.passengerCount)} onValueChange={(v) => store.setPassengerCount(Number(v))}>
                    <SelectTrigger className="h-12 border-none bg-transparent " style={{ borderBottom: "1px solid  #DDD", borderRadius: "0px" }} >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> <SelectValue placeholder="เลือกจำนวนผู้โดยสาร" className="text-black" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: "999" }} >
                      {Array.from({ length: maxPassenger }).map((n,i) => (
                        <SelectItem key={i} value={String(i+1)}>{i+1} คน</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleBooking} className="w-full h-14 text-lg font-bold mt-4" size="lg">
                <Ticket className="mr-2 h-5 w-5" />
                ค้นหาเที่ยวรถ
              </Button>

            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">ปลายทางยอดนิยม</h2>
            <div className="grid grid-cols-2 gap-3">
              {["กรุงเทพฯ", "เชียงใหม่", "ภูเก็ต", "ขอนแก่น"].map((city) => (
                <Link
                  key={city}
                  to="/ticket"
                  className="block text-center bg-accent text-accent-foreground py-4 rounded-lg font-medium hover:bg-accent/80 transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </section>

          {/* Promotions */}
          <section>
            <h2 className="text-xl font-bold mb-3">โปรโมชั่นล่าสุด</h2>
            <Link to="/promotions">
              <Button variant="outline" className="w-full h-12 font-bold">
                <Tag className="mr-2 h-4 w-4" />
                ดูโปรโมชั่นทั้งหมด
              </Button>
            </Link> <br /> <br />
            <Swiper
              slidesPerView={2.5} spaceBetween={3}
              onSlideChange={() => console.log('slide change')}
              onSwiper={(swiper) => console.log(swiper)}
            >
              {/* {mockPromotions.map((promo) => (
                <SwiperSlide className="text-left" key={promo.id}>
                  <Link to={`/promotions/${promo.id}`} key={promo.id}>
                    <img src={promo.imageUrl} alt={promo.title} className=" object-cover rounded-xl mb-2" />
                    <span className="m-3 text-sm" >{promo.title}</span>
                  </Link>
                </SwiperSlide>))} */}
              {
                promotions && promotions.map((promo) =>
                  <SwiperSlide className="text-left" key={promo.id}>
                    <div
                      onClick={() => navigate(`/promotions/${promo.id}`)}
                      className={cn(
                        "w-full rounded-xl overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02] shadow-sm",
                        promo.bg_color || "from-primary to-primary/80"
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
              <h2 className="text-xl font-bold mb-3">คำถามที่พบบ่อย</h2>
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
