import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, MapPin, Clock, Bus, User, CreditCard, ArrowLeft, Download, Mail, Phone, IdCard, AlertCircle, Check as CheckIcon, Navigation, ShoppingBag, Loader2 } from "lucide-react";
import { useBookingStore } from "@/store/bookingStore";
import { useEffect, useState } from "react";
import { bookingDetail, cancelBooking, cancelCharge, checkinSelf, getAccessToken, getProvinces, getTripDetail, searchTrips } from "@/services/api";
import QRCode from "qrcode";
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";
import "../css/TicketDetail.css"
import { t } from "i18next";
import liff from "@line/liff";
import { calculatePaymentSummary } from "@/lib/paymentSummary";
import { encodeTicketPayload } from "@/lib/ticketPdf";
import { getStoredCompany } from "@/lib/company";

const statusConfig: Record<string, { label: string, variant: "default" | "success" | "destructive" | "outline" | "secondary" }> = {
  pending: { label:  "รอชำระเงิน", variant: "secondary" },
  upcoming: { label:  "กำลังจะถึง", variant: "default" },
  confirmed: { label:  "เสร็จสิ้น", variant: "success" },
  cancelled: { label:  "ยกเลิก", variant: "destructive" },
  expired: { label:  "หมดเวลาชำระเงิน", variant: "outline" },
};

const getTicketStatus = (ticket: any) => {
  if (ticket.status === "cancelled") return statusConfig.cancelled;
  if (ticket.status === "expired") return statusConfig.expired;

  if (ticket.paymentStatus === "pending") {
    if (moment().isBefore(moment(ticket.expiresAt))) {
      return statusConfig.pending;
    } else {
      return statusConfig.expired;
    }
  }

  // For paid tickets, check trip time
  const tripTime = moment(`${ticket.date} ${ticket.departureTime}`, "YYYY-MM-DD HH:mm");
  if (moment().isBefore(tripTime)) {
    return statusConfig.upcoming;
  } else {
    return statusConfig.confirmed;
  }
};

const getTripArrivalTime = (ticket: any) => {
  return moment(`${ticket.date} ${ticket.arrivalTime}`, "YYYY-MM-DD HH:mm");
};

const hasTripEnded = (ticket: any) => {
  const arrivalTime = getTripArrivalTime(ticket);
  return arrivalTime.isValid() && moment().isAfter(arrivalTime);
};

const passengerTypeLabels: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  child: "เด็ก",
  monk: "พระสงฆ์",
};

type TicketAddOn = {
  name?: string;
  nameEn?: string;
  category?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
};

type TicketDetail = {
    "id": "5c2bdfc9-4002-4823-83ba-a0b890cca687",
    "bookingId": "5c2bdfc9-4002-4823-83ba-a0b890cca687",
    "bookingNo": "CB-20260824-B9B1D128",
    "status": string,
    "paymentStatus": string,
    "boardingPoint": {
        "id": "20000000-0000-0000-0000-000000000001",
        "name": "สถานีขนส่งหมอชิต 2"
    },
    "dropOffPoint": {
        "id": "20000000-0000-0000-0000-000000000002",
        "name": "สถานีขนส่งเชียงใหม่ อาเขต"
    },
    "paymentMethod": "promptpay",
    "promoCode": null,
    "discount": 0,
    "origin": "สถานีขนส่งหมอชิต 2",
    "originProvinceId": "6cb9fa31-84d2-5aff-a29e-4558e580f993",
    "destination": "สถานีขนส่งเชียงใหม่ อาเขต",
    "destinationProvinceId": "31b9d10a-1280-5bc9-9c2f-76de4075bfb1",
    "vehicleType": "VIP 24",
    "vehiclePlate": "2ขข-5567",
    "omiseChargeId": "chrg_test_68sdxmq4qyupb33kz4l",
    "fee": 8.08508116084604,
    "tripId": "db17d02a-8f0a-479e-8eed-5d27b93cd65b",
    "routeName": "กรุงเทพฯ → เชียงใหม่",
    "serviceDate": "2026-08-25",
    "scheduledDeparture": "2026-08-25T01:00:00.000Z",
    "scheduledArrival": "2026-08-25T11:00:00.000Z",
    "totalAmount": 498.09,
    "seats": [
        {
            "seat_no": "5C",
            "fare_amount": "490.00",
            "full_name": "CH.Thongbut",
            "passenger_type": "child",
            "phone": "0903326911"
        }
    ],
    "passengers": [
        {
            "seat_no": "5C",
            "fare_amount": "490.00",
            "full_name": "CH.Thongbut",
            "passenger_type": "child",
            "phone": "0903326911"
        }
    ],
    "addOns": [],
    "company": {
        "name": "NOVA Transport Co., Ltd.",
        "address": "99/9 Mockup Road,Bangkok 10110",
        "phone": "02-000-0000"
    },
    "ticketTerms": "บริษัทไม่รับผิดชอบสิ่งของผิดกฎหมาย/ต้องห้าม/ตกค้าง\r\nกรณีเสียหายหรือสูญหายต้องแจ้งภายใน 8 วัน บริษัทฯ ขอสงวนสิทธิ์ชดใช้ตามส่วน",
    "qrCode": "CB-20260824-B9B1D128"
}

const formatCurrency = (amount: unknown) =>
  Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TicketDetail = () => {
  const { toast } = useToast();
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate()
  const store = useBookingStore();
  const [ticket, setTicket] = useState<TicketDetail|null>(null)
  const [qr, setQr] = useState("")
  const [isCheckinLoading, setIsCheckinLoading] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [route, setRoute] = useState<any>(null)
  const [provinces, setProvinces] = useState<any[]>([])

  // ticketId ? mockTicketDetails[ticketId] : null;
  const findTripForTicket = async (detail: any) => {
    if (detail.tripId) return getTripDetail(detail.tripId);
      
  };

  const fetchTicket = async (fetchRoute = false) => {
    if (!ticketId) return;
    try {
      const userstr = localStorage.getItem("user");
      const user = JSON.parse(userstr || "{}");
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const detail = await bookingDetail({ id: ticketId, token: accessToken });
      console.log("booking id detail", detail);
      setTicket(detail);

      console.log("fetchRoute ",fetchRoute)
      if (fetchRoute) {
        // const trip = await findTripForTicket(detail);
        // console.log("trip ",JSON.stringify(trip))
        // if (trip) {
          try{
            // setRoute(trip.route_id);
            const qrBookingPayload = JSON.stringify({ "trip": detail.tripId, "bookingReference": detail.bookingReference });
            const qrBookingCode = await QRCode.toDataURL(btoa(qrBookingPayload));
            setQr(qrBookingCode);
          } catch (err) {
            console.error("Error generating QR code:", err);
          }
        // }
      }else{
        console.log("Skipping route fetch");
      }


    } catch (err) {
      console.error("Error in fetchTicket:", err);
    }
  };

  const getprovinces = async () => {
    try {
      const data = await getProvinces()
      console.log("provinces ", data)
      setProvinces(data)
    } catch (err) {
      console.error("Error in getprovinces:", err);
    }
  }
  useEffect(() => {
    getprovinces()
    fetchTicket(true);
  }, [ticketId]);

  useEffect(() => {
    if (!ticket) return;

    const isPending = ticket.paymentStatus === "pending" && moment().isBefore(moment(ticket.scheduledArrival));

    if (isPending) {
      const interval = setInterval(() => {
        console.log("Polling booking detail...");
        fetchTicket(false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [ticket?.paymentStatus, ticket?.scheduledArrival, ticketId]);

  const returnTab = searchParams.get("tab");
  const myTicketsPath = returnTab ? `/my-tickets?tab=${encodeURIComponent(returnTab)}` : "/my-tickets";

  if (!ticket) {
    return (
      <BookingLayout showSteps={false} title="รายละเอียดตั๋ว">
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลตั๋ว</p>
          <Link to={myTicketsPath} className="text-primary font-medium mt-2 inline-block">กลับหน้าตั๋วของฉัน</Link>
        </div>
      </BookingLayout>
    );
  }

  const statusInfo = getTicketStatus(ticket);
  const isTripEnded = hasTripEnded(ticket);
  const addOns: TicketAddOn[] = Array.isArray(ticket?.addOns) ? ticket.addOns : [];
  const paymentSummary = calculatePaymentSummary(ticket, getStoredCompany());
  const netTotal = paymentSummary.total + paymentSummary.feeTotal;

  const handleContinuePayment = async () => {
    const trip = await findTripForTicket(ticket)
    console.log("trip", trip)
    if (!trip) return;
    store.setSelectedTrip(trip)
    // Map existing data to store
    store.setPaymentMethod(ticket.paymentMethod || "promptpay");
    store.setTravelDate(ticket.serviceDate);
    store.setPromoCode(ticket.promoCode || "");
    store.setDiscount(ticket.discount || 0);
    store.setBookingId(ticket.id);
    store.setNewBookingId(ticket.bookingNo);
    store.setRoute(`${ticket.routeName}`);
    //
    store.setSelectedTrip(trip)
    store.setBookingReference(ticket.bookingNo)

    // Construct province objects for the store
    if (ticket.originProvinceId) {
      store.setOriginProvince({ id: ticket.originProvinceId, name: ticket.origin, name_en: ticket.routeName?.split(" - ")[0] || "" });
    }
    if (ticket.destinationProvinceId) {
      store.setDestinationProvince({ id: ticket.destinationProvinceId, name: ticket.destination, name_en: ticket.routeName?.split(" - ")[1] || "" });
    }

    store.setBoardingPoint({ name: ticket.boardingPoint?.name, id: ticket.boardingPoint?.id });
    store.setDropOffPoint({ name: ticket.dropOffPoint?.name, id: ticket.dropOffPoint?.id});
    store.setPassengerCount(ticket.passengers.length);

    // Map passengers with all required fields
    store.setPassengers(ticket.passengers.map((p: any) => ({
      fullName: p.fullName,
      thaiId: p.thaiId,
      phone: p.phone,
      seatNumber: p.seatNumber,
      passengerType: p.passengerType,
      seatId: p.seatId || p.seatNumber,
    })));

    // Map seats (mocking Seat objects for the store)
    store.setSelectedSeats(ticket.seats.map((s) => ({
      id: s.seat_no,
      number: s.seat_no,
      status: 'booked',
    } as any)));

    // Set trip details
    // store.setSelectedTrip({
    //   id: trip.id,
    //   price: ticket.pricePerSeat,
    //   route_id: ticket.routeName,
    //   origin_province_id: ticket.originProvinceId,
    //   destination_province_id: ticket.destinationProvinceId,
    //   departure_time: ticket.departureTime,
    //   arrival_time: ticket.arrivalTime,
    //   date: ticket.date,
    // } as any);
    await cancelBooking(ticket.id)
    await cancelCharge(ticket.omiseChargeId)

    // Navigate to Payment page with full context
    navigate("/payment", {
      state: {
        total: ticket.totalAmount,
        sourceType: ticket.paymentMethod || "promptpay",
        bookingBody: {
          tripId: trip.id,
          travelDate: ticket.serviceDate,
          originProvinceId: ticket.originProvinceId,
          destinationProvinceId: ticket.destinationProvinceId,
          boardingPointId: ticket.boardingPoint?.id,
          dropOffPointId: ticket.dropOffPoint?.id ,
        }
      }
    });
  };

  const handleCheckin = async () => {
    if (!ticket) return;

    if (hasTripEnded(ticket)) return;

    const departureTime = moment(`${ticket.scheduledDeparture}`, "YYYY-MM-DD HH:mm");
    if (moment().isBefore(departureTime)) {
      toast({
        title: t("ยังไม่ถึงเวลาเดินทาง"),
        description: `${t("คุณสามารถเช็คอินได้ใน")} ${t("วันที่")} ${ticket.serviceDate} ${t("เวลา")} ${ticket.scheduledDeparture} ${t("น.")}  `,
        variant: "destructive",
      });
      return;
    }

    setIsCheckinLoading(true);
    try {
      const res = await checkinSelf({
        ticketNumber: ticket.bookingNo,
        qrCode: qr
      });
      console.log("Check-in result:", res);
      if (res.status === "success" || res.success) {
        toast({
          title: t("เช็คอินสำเร็จ"),
          description: t("ขอให้คุณมีความสุขกับการเดินทาง"),
        });
        fetchTicket(false); // Refresh status
      } else {
        toast({
          title: t("เช็คอินไม่สำเร็จ"),
          description: res.message || t("เกิดข้อผิดพลาดบางอย่าง"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Check-in error:", error);
      toast({
        title: t("เกิดข้อผิดพลาด"),
        description: t("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"),
        variant: "destructive",
      });
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const handleTrackBus = () => {
    if (!ticket?.tripId || hasTripEnded(ticket)) return;
    const params = new URLSearchParams({
      tripId: ticket.tripId,
      bookingReference: ticket.bookingNo || "",
    });
    navigate(`/track?${params.toString()}`);
  };

  const handleDownloadTicket = () => {
    if (!ticket?.bookingNo) return;

    setIsPdfLoading(true);
    try {
      const payload = encodeTicketPayload({ booking: ticket, qrCode: qr || null, company: getStoredCompany() });
      const downloadUrl = new URL(`/e-ticket/${ticket.bookingNo}/pdf?openExternalBrowser=1`, window.location.origin);
      downloadUrl.searchParams.set("payload", payload);

      if (liff.isInClient?.()) {
        liff.openWindow({
          url: downloadUrl.toString(),
          external: true,
        });
      } else {
        window.open(downloadUrl.toString(), "_blank", "noopener,noreferrer");
      }

      toast({
        title: t("กำลังเปิดเบราว์เซอร์"),
        description: t("ระบบจะสร้างและดาวน์โหลด PDF ในเบราว์เซอร์ภายนอก"),
      });
    } catch (error) {
      console.error("Error opening ticket PDF download page:", error);
      toast({
        title: t("เกิดข้อผิดพลาด"),
        description: t("ไม่สามารถเปิดหน้าดาวน์โหลด PDF ได้"),
        variant: "destructive",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <BookingLayout showSteps={false} title={t("รายละเอียดตั๋ว")} navto={() => navigate(-1)} >
      <div className="px-4 space-y-4 pb-6">
        {/* Continue Payment Action */}
        {ticket.paymentStatus === "pending" && ticket.status === "pending" && moment().isBefore(moment(ticket.scheduledDeparture)) && (
          <Card className="bg-amber-50 border-amber-200 overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-900">{t("รอการชำระเงิน")}</p>
                  <p className="text-xs text-amber-700">{t("กรุณาชำระเงินเพื่อยืนยันการจองตั๋วของคุณ")}</p>
                </div>
              </div>
              <Button onClick={handleContinuePayment} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11">
                {t("ดำเนินการชำระเงินต่อ")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Route Header */}
        <Card className={`overflow-hidden ${ticket.status}`}>
          <div className={`${ticket.status === "pending" || ticket.status === "confirmed" ? "bg-primary" : "bg-gray-400"} text-primary-foreground px-4 py-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs opacity-80">#{ticket.bookingNo}</span>
              <Badge variant={statusInfo.variant} className="text-xs">{t(statusInfo.label)}</Badge>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="h-5 w-5 shrink-0" />
              {t(ticket.origin)} → {t(ticket.destination)}
            </div>
            <p className="text-sm opacity-80 mt-1">{ticket.routeName} · {ticket.vehicleType}</p>
          </div>

          {/* QR for upcoming */}
          {ticket.paymentStatus === "paid" ? (
            <div className="flex flex-col items-center py-5 bg-card">
              <div className="border-2 border-border rounded-xl p-1 mb-1">
                {/* <QrCode className="h-28 w-28 text-foreground" /> */}
                {qr ? (
                  <img src={qr} alt="qr code" className="h-40 w-40 text-foreground" />
                ) : (
                  <Skeleton className="h-40 w-40" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("แสดง QR Code นี้เมื่อขึ้นรถ")}</p>
            </div>
          ) : <></>}
        </Card>

        {/* Trip Info */}
        <Card className={`${ticket.status}`}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t("ข้อมูลเที่ยวรถ")}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">{t("วันที่เดินทาง")}</span>
              <span className="text-right font-medium">{ticket.serviceDate}</span>
              <span className="text-muted-foreground">{t("เวลาออก")}</span>
              <span className="text-right font-medium">{ticket.scheduledDeparture} น.</span>
              <span className="text-muted-foreground">{t("เวลาถึง (โดยประมาณ)")}</span>
              <span className="text-right font-medium">{ticket.scheduledArrival} น.</span>
              <span className="text-muted-foreground">{t("จุดขึ้นรถ")}</span>
              <span className="text-right font-medium">{ticket.boardingPoint?.name}</span>
              <span className="text-muted-foreground">{t("จุดลงรถ")}</span>
              <span className="text-right font-medium">{ticket.dropOffPoint?.name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bus Info */}
        <Card className={`${ticket.status}`}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Bus className="h-4 w-4 text-primary" />
              {t("ข้อมูลรถ")}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">{t("ประเภทรถ")}</span>
              <span className="text-right font-medium">{ticket.vehicleType}</span>
              <span className="text-muted-foreground">{t("ทะเบียนรถ")}</span>
              <span className="text-right font-medium">{ticket.vehiclePlate}</span>
              <span className="text-muted-foreground">{t("ที่นั่ง")}</span>x
              <span className="text-right font-medium">
                {ticket.seats.join(", ")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Passengers */}
        <Card className={`${ticket.status}`}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t("ผู้โดยสาร")} {ticket.passengers.length} {t("คน")}
            </h3>
            <div className="space-y-3">
              {ticket.passengers.map((p, i) => (
                <div key={i} className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{p.full_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {t("ที่นั่ง")} {p.seat_no}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                    {/* <span className="flex items-center gap-1.5">
                      <IdCard className="h-3 w-3" />
                      {p.thaiId}
                    </span> */}
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {p.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {passengerTypeLabels[p.passenger_type]  }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        {addOns.length > 0 && (
          <Card className={`${ticket.status}`}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                {t("Add-ons")}
              </h3>
              <div className="space-y-2">
                {addOns.map((addOn, i) => (
                  <div
                    key={`${addOn.name || addOn.nameEn || "add-on"}-${i}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate  ">{t(addOn.name || addOn.nameEn || "-")} <br/> <small>  {Number(addOn.qty || 0).toLocaleString()}x{formatCurrency(addOn.unitPrice)} </small> </span>
                      {/* {addOn.category && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {t(addOn.category)}
                        </Badge>
                      )} */}
                    </div>
                    {/* <span className="whitespace-nowrap text-xs text-muted-foreground">
                      x {formatCurrency(addOn.unitPrice)}
                    </span> */}
                    <span className="whitespace-nowrap text-right font-semibold text-primary">
                      {formatCurrency(addOn.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking & Payment Info */}
        <Card className={`${ticket.status}`}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              {t("ข้อมูลการจอง")}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">{t("วันที่จอง")}</span>
              <span className="text-right font-medium">{ticket.serviceDate ? moment(ticket.serviceDate).local().format("DD MMM YYYY HH:mm") : "-"}</span>
              <span className="text-muted-foreground">{t("ช่องทางชำระ")}</span>
              <span className="text-right font-medium">{ticket?.paymentMethod?.toUpperCase()}</span>
              {/* <span className="text-muted-foreground">{t("ราคา/ที่นั่ง")}</span>
              <span className="text-right font-medium">฿{ticket.pricePerSeat?.toLocaleString()}</span> */}
              <span className="text-muted-foreground">{t("จำนวนที่นั่ง")}</span>
              <span className="text-right font-medium">{ticket.seats.length}</span>
              {ticket.promoCode && (
                <>
                  <span className="text-muted-foreground">{t("โค้ดส่วนลด")}</span>
                  <span className="text-right font-medium text-success">{ticket.promoCode}</span>
                </>
              )}
              {paymentSummary.discount > 0 && (
                <>
                  <span className="text-muted-foreground">{t("ส่วนลด")}</span>
                  <span className="text-right font-medium text-success">-฿{paymentSummary.discount.toLocaleString()}</span>
                </>
              )}
              <span className="text-muted-foreground">{t("ค่าธรรมเนียม")}</span>
              <span className="text-right font-medium">฿{paymentSummary.feeTotal.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("ยอดสุทธิ")}</span>
              <span className="text-primary">฿{netTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {(statusInfo.label === t("กำลังจะถึง") || statusInfo.label === t("เสร็จสิ้น")) && ticket.paymentStatus === "paid" && (
          <div className="space-y-4 ">
            {/* <div className="space-y-2">
              <Button variant="outline" className="w-full h-11">
                <Download className="mr-2 h-4 w-4" />
                ดาวน์โหลด PDF
              </Button>
              <Button variant="outline" className="w-full h-11">
                <Mail className="mr-2 h-4 w-4" />
                ส่งไปยังอีเมล
              </Button>
            </div> */}
 
              <Button
                onClick={handleTrackBus}
                disabled={isTripEnded}
                className="w-full h-14 bg-brand-gradient text-white font-bold text-lg shadow-lg"
              >
                <Navigation className="mr-2 h-6 w-6" />
                {t("ดูตำแหน่งรถ")}
              </Button> 

            <Button
              onClick={handleCheckin}
              disabled={isCheckinLoading || isTripEnded}
              className="w-full h-14 bg-primary hover:bg-primary-700 text-white font-bold text-lg shadow-lg"
            >
              <CheckIcon className="mr-2 h-6 w-6" />
              {isCheckinLoading ? t("กำลังดำเนินการ...") : t("เช็คอิน")}
            </Button>

            <Button
              onClick={handleDownloadTicket}
              disabled={isPdfLoading}
              variant="outline"
              className="w-full h-14 font-bold text-lg shadow-sm"
            >
              {isPdfLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Download className="mr-2 h-6 w-6" />}
              {isPdfLoading ? t("กำลังเปิด PDF...") : t("ดาวน์โหลดตั๋ว")}
            </Button>
          </div>
        )}

        <Link to={myTicketsPath} >
          <Button variant="outline" className="w-full h-11 bg-grey-400 mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("กลับหน้าตั๋วของฉัน")}
          </Button>
        </Link>
        <div className="h-10"></div>
      </div>
    </BookingLayout>
  );
};

export default TicketDetail; 
