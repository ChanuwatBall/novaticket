import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { routes, provinces, boardingPoints } from "@/data/mockData";
import { useBookingStore } from "@/store/bookingStore";
import { CalendarIcon, MapPin, Users, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
// import { boardingPoints } from "@/data/mockData";
// import { getRoutes, Province, Route, getBoardingPoints, BoardingPoint } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { BusStops } from "@/http/type";
import { getBusStops, getProvinces, getRoutes } from "@/services/api";

const Ticket = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [date, setDate] = useState<Date | undefined>(store.travelDate ? new Date(store.travelDate) : store.travelDate === '' ? undefined : undefined);

  const [routeGroup, setRouteGroup] = useState<any[]>([]);
  const [rgId, setRgId] = useState<any>(null);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [busStops,setBusStops] = useState<BusStops[]>([])
  const [routes, setRoutes] = useState<any[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<[]>([]);
  const [selectOrigin, setSelectOrigin] = useState<any>(null);
  const [selectDest, setSelectDest] = useState<any>(null);
  const [originBoardingPoints, setOriginBoardingPoints] = useState<any[]>([]);
  const [openOriginBoardingPoints, setOpenOriginBoardingPoints] = useState(false);
  const [destBoardingPoints, setDestBoardingPoints] = useState<any[]>([]);
  const [openOrigin, setOpenOrigin] = useState(false);
  const [startpoint, setStartpoint] = useState("");
  const [droppoints, setDropPoints] = useState([])
  const [openDestination, setOpenDestination] = useState(false);
  const [destination, setDestination] = useState("");
  const [openDestinationBoardingPoints, setOpenDestinationBoardingPoints] = useState(false);



  useEffect(() => {
    const conf = async () => {

      try {
        const data = await getRoutes()
        console.log(data)
        setRouteGroup(data)
      } catch (error) {
        throw error
      }

      try {
        const data = await getProvinces()
        console.log(data)
        setProvinces(data)
      } catch (error) {
        throw error
      }

      try { 
        const matchedRouteId = store.originProvinceId?.routeIds?.find((routeId: string) =>
          store.destinationProvinceId?.routeIds?.includes(routeId)
        );
        const busStopsData = matchedRouteId
          ? await getBusStops(matchedRouteId, {
            originProvinceId: store.originProvinceId?.id,
            destinationProvinceId: store.destinationProvinceId?.id,
            origin: store.originProvinceId?.name,
            destination: store.destinationProvinceId?.name,
          })
          : [];
        setBusStops(busStopsData)
        console.log("busStopsData ",busStopsData)
        if (store?.originProvinceId) {
          chooseOrigin(store.originProvinceId?.id, busStopsData )
        }

        if (store?.destinationProvinceId) {
          chooseDest(store.destinationProvinceId?.id, busStopsData )
       } 
        
      } catch (error) {
        throw error
      }



    }
    conf()
  }, [store])

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

  const chooseOrigin = async (province_id: any, busstops: any[] ) => {
    console.log("chooseOrigin province_id ", province_id)
    console.log("chooseOrigin busstops ", busstops)

    try { 
     const ress = busstops.filter(r =>
      store?.destinationProvinceId ? store?.destinationProvinceId?.id != r.route_id?.origin_id && r.route_id?.origin_id == province_id 
      : r.route_id?.origin_id == province_id
     ).filter(r => r.type == "pickup" || r.type == "stop")
     console.log("chooseOrigin bustop in  "+province_id+" is: ", ress)
      setOriginBoardingPoints(ress)
    } catch (error) {
      throw error
    }
  }


  const chooseDest = async (province_id: any, busstops: any[] ) => { 
    console.log("chooseDest province_id ", province_id) 
    try {
     const ress = busstops.filter(r =>
       store?.originProvinceId ? store?.originProvinceId?.id != r.route_id?.destination_id && r.route_id?.destination_id == province_id 
       : r.route_id?.destination_id == province_id
      ).filter(r => r.type == "dropoff" || r.type == "stop")
     console.log("chooseDest bustop in  "+province_id+" is: ", ress)
      console.log("chooseDest busstops dest ",   ress)
      setDestBoardingPoints(ress)
    } catch (error) {
      throw error
    }
  }

  const canSearch =
    date &&
    store.originProvinceId &&
    store.destinationProvinceId;

  const handleSearch = () => {
    if (!canSearch || !date) return;
    store.setTravelDate(format(date, "yyyy-MM-dd"));
    navigate("/search");
  };

  return (
    <BookingLayout currentStep={1} navto={() => navigate(-1)} title="จองตั๋วรถโดยสาร">
      <div className="px-4 space-y-4">
        <div className="grid  " >
          <div className="scrollbar flex-shrink-0 flex " style={{ width: "100%", overflowX: "scroll" }}>
            {routeGroup.map((r) => (
              <button key={r.id} onClick={() => chooseGroup(r)}>
                <span className={cn("block text-center py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap mr-1", store?.routeGroupid === r.g_route_id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-accent/80")}>
                  {r.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Origin */}
        <div className="space-y-1.5 mt-3">
          <label className="text-sm font-medium text-muted-foreground ">
            ต้นทาง
          </label>
          <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
            <div className="flex items-center gap-1 h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
              <input
                type="text"
                value={store.originProvinceId?.name || ""}
                placeholder="เลือกต้นทาง"
                onFocus={() => setOpenOrigin(true)}
                onChange={(e) => { setStartpoint(e.target.value); }}
                onBlur={() => setTimeout(() => setOpenOrigin(false), 150)}
                className="h-10 w-full bg-transparent  px-3 py-2"
              >
              </input>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            {openOrigin && <div className="absolute inset-0 bg-white  mt-14" style={{ zIndex: "9999" }} onClick={() => setOpenOrigin(false)}>
              <ul className="max-h-60 overflow-y-auto  bg-white border border-input rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                {filteredProvinces.map((p) => (
                  <li
                    key={p.id}
                    className="cursor-pointer hover:bg-accent rounded-sm px-2 py-1"
                    onClick={() => {
                      chooseOrigin(p.id, droppoints)
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

        {/* Destination */}
        <div className="space-y-1.5 mt-3">
          <label className="text-sm font-medium text-muted-foreground ">
            ปลายทาง
          </label>
          <div className={cn("w-full h-12 justify-start font-normal relative flex items-center gap-1")}>
            <div className="flex items-center gap-1 h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
              <input
                type="text"
                value={store.destinationProvinceId?.name || ""}
                placeholder="เลือกปลายทาง  "
                onFocus={() => setOpenDestination(true)}
                // onChange={(e) => { setStartpoint(e.target.value); }}
                onBlur={() => setTimeout(() => setOpenDestination(false), 150)}
                className="h-10 w-full bg-transparent  px-3 py-2"
              >
              </input>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            {openDestination && <div className="absolute inset-0 bg-white  mt-14" style={{ zIndex: "9999" }} onClick={() => setOpenOrigin(false)}>
              <ul className="max-h-60 overflow-y-auto  bg-white border border-input rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                {filteredProvinceByDestination.map((p) => (
                  <li
                    key={p.id}
                    className="cursor-pointer hover:bg-accent rounded-sm px-2 py-1"
                    onClick={() => {
                      chooseDest(p.id, droppoints)
                      store.setDestinationProvince(p);
                      setOpenDestination(false);
                    }}
                  >
                       {p.name}
                  </li>
                ))}
              </ul>
            </div>}
          </div>
        </div>
        {/* <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> ปลายทาง
          </label>
          <Select value={store.destinationProvinceId?.id} onValueChange={store.setDestinationProvince}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="เลือกจังหวัดปลายทาง" />
            </SelectTrigger>
            <SelectContent>
              {filteredProvinceByDestination.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}


        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">วันที่เดินทาง</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full h-12 justify-start font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: th }) : "เลือกวันที่"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < moment().startOf("day").toDate()} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Passengers */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> จำนวนผู้โดยสาร
          </label>
          <Select value={String(store.passengerCount)} onValueChange={(v) => store.setPassengerCount(Number(v))}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} คน</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <br/>
        {/* CTA */}
        <Button onClick={handleSearch} disabled={!canSearch} className="w-full h-14 text-lg font-bold mt-4  " size="lg">
          <Search className="mr-2 h-5 w-5" />
          ค้นหาเที่ยวรถ
        </Button>
      </div>
    </BookingLayout>
  );
};

export default Ticket;
