import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, MapPin, Clock, ChevronRight, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import moment from "moment";
import { bookingDetail, bookingList } from "@/services/api";
import { toast } from "sonner";
import { t } from "i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { calculatePaymentSummary } from "@/lib/paymentSummary";

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
    // "id":  string
    // "bookingReference":string
    // "origin":string
    // "destination": string
    // "date": string
    // "departureTime": string
    // "arrivalTime": string
    // "seats": string[] 
    // "status":string
    // "paymentStatus": string
    // "expiresAt": string
    // "total": number
    // "tripId"?: string
   
    "id": "e4fe0fb7-2e9a-468e-beff-f0cdcef33de0",
    "bookingNo": "CB-20260823-8229E95E",
    "status": "held",
    "tripId": "091c2446-ad37-429f-9f1f-428c6195038b",
    "routeName": "กรุงเทพฯ → เชียงใหม่",
    "serviceDate": "2026-08-23",
    "scheduledDeparture": "2026-08-23T01:00:00.000Z",
    "scheduledArrival": "2026-08-23T11:00:00.000Z",
    "seatNumbers": [
        "4B"
    ],
    "totalAmount": 890,
    "paymentStatus": string
    "createdAt": "2026-08-23T06:58:34.410Z"

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

const ticketTabs = ["upcoming", "pending", "confirmed", "failed", "all"] as const;
type TicketTab = typeof ticketTabs[number];

const getValidTicketTab = (tab: string | null): TicketTab => {
  return ticketTabs.includes(tab as TicketTab) ? (tab as TicketTab) : "upcoming";
};

const getStoredCompany = () => {
  try {
    const companyStr = localStorage.getItem("company");
    return companyStr ? JSON.parse(companyStr) : null;
  } catch (error) {
    console.error("Failed to parse company from localStorage:", error);
    return null;
  }
};

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [trackingTicketId, setTrackingTicketId] = useState<string | null>(null)
  const activeTab = getValidTicketTab(searchParams.get("tab"));
  const activeTabIndex = ticketTabs.indexOf(activeTab);
  const swiperRef = useRef<SwiperType | null>(null);

  const handleTabChange = (tab: string) => {
    const nextTab = getValidTicketTab(tab);
    setSearchParams(nextTab === "upcoming" ? {} : { tab: nextTab });
    swiperRef.current?.slideTo(ticketTabs.indexOf(nextTab));
  };

  const getTickets = async (page = 1) => {
    if (loading) return;
    setLoading(true)
    try {
      const bookings = await bookingList()
      console.log("booking ", bookings)
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

  useEffect(() => {
    if (!swiperRef.current || swiperRef.current.activeIndex === activeTabIndex) return;
    swiperRef.current.slideTo(activeTabIndex);
  }, [activeTabIndex])

  useEffect(() => {
    swiperRef.current?.update();
    swiperRef.current?.updateAutoHeight(0);
  }, [tickets, pagination.page, pagination.totalPages, loading, activeTabIndex])

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
        bookingReference: detail.bookingReference || ticket.bookingNo,
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-4 overflow-x-auto justify-start scrollbar-hide">
            <TabsTrigger id="ticket-tab-upcoming" value="upcoming" className="flex-1 text-xs whitespace-nowrap">{t("กำลังจะถึง")}</TabsTrigger>
            <TabsTrigger id="ticket-tab-pending" value="pending" className="flex-1 text-xs whitespace-nowrap">{t("รอชำระเงิน")}</TabsTrigger>
            <TabsTrigger id="ticket-tab-confirmed" value="confirmed" className="flex-1 text-xs whitespace-nowrap">{t("เสร็จสิ้น")}</TabsTrigger>
            <TabsTrigger id="ticket-tab-failed" value="failed" className="flex-1 text-xs whitespace-nowrap">{t("ไม่สำเร็จ")}</TabsTrigger>
            <TabsTrigger id="ticket-tab-all" value="all" className="flex-1 text-xs whitespace-nowrap">{t("ทั้งหมด")}</TabsTrigger>
          </TabsList>

          <Swiper
            autoHeight
            initialSlide={activeTabIndex}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              const nextTab = ticketTabs[swiper.activeIndex] || "upcoming";
              if (nextTab !== activeTab) {
                setSearchParams(nextTab === "upcoming" ? {} : { tab: nextTab });
              }
            }}
          >
            {ticketTabs.map((tab) => (
              <SwiperSlide key={tab}>
                <div className="space-y-3 pt-2" role="tabpanel" aria-labelledby={`ticket-tab-${tab}`}>
                  {tickets && tickets
                    .filter((t) => {
                      const statusKey = getTicketStatus(t).key;
                      if (tab === "all") return true;
                      if (tab === "failed") return statusKey === "cancelled" || statusKey === "expired";
                      return statusKey === tab;
                    })
                    .map((ticket) => {
                      const ticketStatus = getTicketStatus(ticket);
                      const paymentSummary = calculatePaymentSummary(ticket, getStoredCompany());
                      const netTotal = paymentSummary.total + paymentSummary.feeTotal;
                      return (
                        <Link key={ticket.id} to={`/my-tickets/${ticket.id}?tab=${tab}`}>
                          <Card className={`cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all mb-4 ${ticket.status}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">#{ ticket.bookingNo  }</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="font-bold">{ ticket.routeName}</span>
                                  </div>
                                </div>
                                <Badge variant={ticketStatus.variant}>
                                  {t(ticketStatus.label)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{ticket.serviceDate}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {ticket.scheduledDeparture && moment().format("hh:mm:ss DD/MM/YYYY")}
                                </span>
                                <span>{t("ที่นั่ง")} {ticket.seatNumbers.map((seat) => seat).join(", ")}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border gap-3">
                                <span className="font-bold text-primary">฿{netTotal.toLocaleString()}</span>
                                {ticketStatus.key === "pending" && ticket.paymentStatus === "paid" ? (
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
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </Tabs>
        <div className="h-20"></div>
      </div>
    </BookingLayout>
  );
};

export default MyTicketsPage;
