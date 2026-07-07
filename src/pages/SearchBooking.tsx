import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Phone, Search, ChevronDown, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bookingList, getProvinces, login } from "@/services/api";

const SearchBooking = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [departureTime, setDepartureTime] = useState("");

  const [selectOrigin, setSelectOrigin] = useState<any>(null);
  const [selectDest, setSelectDest] = useState<any>(null);
  const [openOrigin, setOpenOrigin] = useState(false);
  const [openDestination, setOpenDestination] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const fetchProvinces = async () => {
      const sign = await login({ email: "admin@nexexpress.co.th", password: "nexadmin2026" })
      console.log("sign ", sign)
      setToken(sign.token)

      try {
        const data = await getProvinces();
        if (data) setProvinces(data);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };
    fetchProvinces();
  }, []);

  const handleSearch = async () => {
    if (!selectOrigin || !selectDest || !date || !phone) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {

      const bookings = await bookingList(1, 10, token);
      console.log("bookingList ", bookings)
    } catch (error: any) {
      console.error("Search booking error:", error);
      toast.error("เกิดข้อผิดพลาดในการค้นหา: " + (error.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BookingLayout showSteps={false} navto={() => navigate(-1)} title="ค้นหาตั๋วที่จองไว้">
      <div className="px-4 space-y-4 pb-20">
        <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-border/50">
          {/* Origin */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> ต้นทาง
            </label>
            <div className="relative">
              <div
                className="flex items-center justify-between h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                onClick={() => setOpenOrigin(!openOrigin)}
              >
                <span>{selectOrigin?.name || "เลือกต้นทาง"}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
              {openOrigin && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {provinces.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setSelectOrigin(p);
                        setOpenOrigin(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> ปลายทาง
            </label>
            <div className="relative">
              <div
                className="flex items-center justify-between h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                onClick={() => setOpenDestination(!openDestination)}
              >
                <span>{selectDest?.name || "เลือกปลายทาง"}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
              {openDestination && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {provinces.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setSelectDest(p);
                        setOpenDestination(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" /> วันที่เดินทาง
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-11 justify-start font-normal", !date && "text-muted-foreground")}>
                  {date ? format(date, "PPP", { locale: th }) : "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Departure Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> เวลาออกเดินทาง (เช่น 08:00)
            </label>
            <Input
              type="text"
              placeholder="HH:mm"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> เบอร์โทรศัพท์
            </label>
            <Input
              type="tel"
              placeholder="0XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11"
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full h-12 text-lg font-bold"
          >
            <Search className="mr-2 h-5 w-5" />
            {loading ? "กำลังค้นหา..." : "ค้นหาข้อมูลการจอง"}
          </Button>
        </div>

        {/* Results */}
        {searched && (
          <div className="space-y-4 pt-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              ผลการค้นหา ({results.length})
            </h3>

            {results.length > 0 ? (
              results.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden"
                  onClick={() => navigate(`/my-tickets/${ticket.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">#{ticket.bookingReference}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-bold">{ticket.origin} → {ticket.destination}</span>
                        </div>
                      </div>
                      <Badge variant={ticket.status === 'confirmed' ? "success" : "secondary"}>
                        {ticket.status === 'confirmed' ? 'เสร็จสิ้น' : ticket.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {ticket.date}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {ticket.departureTime}
                      </div>
                      <div className="col-span-2">
                        ที่นั่ง: {ticket.seats.join(", ")}
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-4 pt-4 border-t border-border">
                      <span className="font-bold text-primary text-lg">฿{ticket.total}</span>
                      <div className="flex items-center text-primary text-sm font-medium">
                        ดูรายละเอียด <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : !loading && (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">ไม่พบรายการจองที่ตรงกับข้อมูลของคุณ</p>
                <p className="text-xs text-muted-foreground mt-1">กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง</p>
              </div>
            )}
          </div>
        )}
      </div>
    </BookingLayout>
  );
};

export default SearchBooking;
