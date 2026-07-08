import { Link, useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, MapPin, Clock, ChevronRight, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import moment from "moment";
import { bookingDetail, bookingList } from "@/services/api";
import { toast } from "sonner";
import { t } from "i18next";

const mockTickets = [
  {
    id: "NEX001",
    origin: "กรุงเทพฯ",
    destination: "เชียงใหม่",
    date: "2026-03-05",
    departureTime: "20:00",
    arrivalTime: "06:00",
    seats: ["12", "13"],
    status: "upcoming" as const,
    total: 1300,
  },
  {
    id: "NEX002",
    origin: "กรุงเทพฯ",
    destination: "หาดใหญ่",
    date: "2026-02-20",
    departureTime: "18:00",
    arrivalTime: "07:00",
    seats: ["5"],
    status: "completed" as const,
    total: 850,
  },
  {
    id: "NEX003",
    origin: "กรุงเทพฯ",
    destination: "อุดรธานี",
    date: "2026-02-10",
    departureTime: "19:00",
    arrivalTime: "05:00",
    seats: ["22"],
    status: "cancelled" as const,
    total: 480,
  },
];

type Ticket = {
    "id":  string
    "bookingReference":string
    "origin":string
    "destination": string
    "date": string
    "departureTime": string
    "arrivalTime": string
    "seats": string[] 
    "status":string
    "paymentStatus": string
    "expiresAt": string
    "total": number
    "tripId"?: string
}

export const statusConfig: Record<string, { label: string, variant: "default" | "success" | "destructive" | "outline" | "secondary" }> = {
  pending: { label:  "รอชำระเงิน", variant: "secondary" },
  upcoming: { label:  "กำลังจะถึง", variant: "default" },
  confirmed: { label:  "เสร็จสิ้น", variant: "success" },
  cancelled: { label:  "ยกเลิก", variant: "destructive" },
  expired: { label:  "หมดเวลาชำระเงิน", variant: "outline" },
};

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

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [trackingTicketId, setTrackingTicketId] = useState<string | null>(null)

  const getTickets = async (page = 1) => {
    if (loading) return;
    setLoading(true)
    try {
      const bookings = await bookingList(page)
      if (bookings.error) {
        toast.error("ไม่สามารถดึงข้อมูลตั๋วได้ " + bookings.error)
        return
      }

      if (page === 1) {
        setTickets(bookings.data)
      } else {
        setTickets(prev => [...prev, ...bookings.data])
      }

      if (bookings.pagination) {
        setPagination(bookings.pagination)
      }

    } catch (error) {
      console.log("error ", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getTickets(1)
  }, [])

  const handleTrackTicket = async (ticket: Ticket) => {
    setTrackingTicketId(ticket.id);
    try {
      const detail = ticket.tripId ? ticket : await bookingDetail({ id: ticket.id });
      if (!detail?.tripId) {
        toast.error("ไม่พบรหัสเที่ยวรถสำหรับติดตามตำแหน่ง");
        return;
      }

      const params = new URLSearchParams({
        tripId: detail.tripId,
        bookingReference: detail.bookingReference || ticket.bookingReference,
      });
      navigate(`/track?${params.toString()}`);
    } catch (error) {
      console.error("track ticket error", error);
      toast.error(t("ไม่สามารถเปิดหน้าติดตามรถได้"));
    } finally {
      setTrackingTicketId(null);
    }
  };

  return (
    <BookingLayout showSteps={false} title={t("ตั๋วของฉัน")} navto={() => navigate(-1)}  >
      <div className="px-4">
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full mb-4 overflow-x-auto justify-start scrollbar-hide">
            <TabsTrigger value="upcoming" className="flex-1 text-xs whitespace-nowrap">{t("กำลังจะถึง")}</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs whitespace-nowrap">{t("รอชำระเงิน")}</TabsTrigger>
            <TabsTrigger value="confirmed" className="flex-1 text-xs whitespace-nowrap">{t("เสร็จสิ้น")}</TabsTrigger>
            <TabsTrigger value="failed" className="flex-1 text-xs whitespace-nowrap">{t("ไม่สำเร็จ")}</TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs whitespace-nowrap">{t("ทั้งหมด")}</TabsTrigger>
          </TabsList>

          {["upcoming", "pending", "confirmed", "failed", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {tickets && tickets
                .filter((t) => {
                  const statusKey = getTicketStatus(t).key;
                  if (tab === "all") return true;
                  if (tab === "failed") return statusKey === "cancelled" || statusKey === "expired";
                  return statusKey === tab;
                })
                .map((ticket) => {
                  const ticketStatus = getTicketStatus(ticket);
                  return (
                    <Link key={ticket.id} to={`/my-tickets/${ticket.id}`}>
                      <Card className={`cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all mb-4 ${ticket.status}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs text-muted-foreground">#{ ticket.bookingReference  }</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="font-bold">{t(ticket.origin)} → {t(ticket.destination)}</span>
                              </div>
                            </div>
                            <Badge variant={ticketStatus.variant}>
                              {t(ticketStatus.label)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{ticket.date}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ticket.departureTime}
                            </span>
                            <span>{t("ที่นั่ง")} {ticket.seats.map((seat) => seat).join(", ")}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border gap-3">
                            <span className="font-bold text-primary">฿{ticket?.total}</span>
                            {ticketStatus.key === "upcoming" && ticket.paymentStatus === "paid" ? (
                              <button 
                                className="h-9 rounded-full px-3 text-xs flex flex-row items-center gap-1 font-bold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                                disabled={trackingTicketId === ticket.id}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleTrackTicket(ticket);
                                }}
                              >
                                <Navigation className="mr-1.5 h-3.5 w-3.5" />
                                {trackingTicketId === ticket.id ? t("กำลังเปิด...") : t("ดูตำแหน่งรถ")}
                              </button>
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}

              {pagination.page < pagination.totalPages && (
                <div className="py-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => getTickets(pagination.page + 1)}
                    disabled={loading}
                    className="w-full h-11"
                  >
                    {loading ? t("กำลังโหลด...") : t("โหลดเพิ่มเติม")}
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        <div className="h-20"></div>
      </div>
    </BookingLayout>
  );
};

export default MyTicketsPage;
