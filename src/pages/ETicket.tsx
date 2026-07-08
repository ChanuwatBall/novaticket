import BookingLayout from "@/components/BookingLayout";
import { useBookingStore } from "@/store/bookingStore";
import { provinces, boardingPoints } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ClockAlert, Download, Mail, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { bookingDetail } from "@/services/api";
import QRCode from "qrcode";
import { t } from "i18next";

const ETicketPage = () => {
  const { bookingref } = useParams<{ bookingref: string }>();
  const store = useBookingStore();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const originName = store.originProvinceId?.name
  const destName = store.destinationProvinceId?.name
  const boardingName = store.boardingPointId?.name
  const dropOffName = store.dropOffPointId?.name
  const tripPrice = store.selectedTrip?.price ?? 0;
  const total = Math.max(0, tripPrice * store.selectedSeats.length - store.discount);

  const continueBooking = () => {
    navigate("/ticket");
  }

  const conf = async () => {
    try {
      const userstr = localStorage.getItem("user");
      if (!userstr) {
        setIsLoading(false);
        return;
      }
      const user = JSON.parse(userstr);
      const res = await bookingDetail({ id: bookingref, token: user.token });
      console.log("bookingDetail res ", res);
      if (res?.error !== undefined) {
        console.log("error booking detail");
      }
      setBooking(res);
      if (res?.tripId && res?.bookingReference) {
        try {
          const qrBookingPayload = JSON.stringify({ "trip": res.tripId, "bookingReference": res.bookingReference });
          QRCode.toDataURL(btoa(qrBookingPayload))
            .then((code) => setQrCode(code))
            .catch((err) => console.error("Error generating QR code:", err));
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
      }
    } catch (error) {
      console.error("Error loading booking detail:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("bookingref ", bookingref);
    if (bookingref) {
      conf();
    } else {
      setIsLoading(false);
    }
  }, [bookingref]);

  if (isLoading) {
    return (
      <BookingLayout showSteps={false} navto={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">{t("กำลังโหลดข้อมูล...")}</p>
        </div>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout showSteps={false} navto={() => navigate(-1)}>
      <div className="px-4 space-y-4 pt-4">
        {/* Success Header */}
        <div className="text-center py-4">
          {booking?.paymentStatus === "paid" ?
            <CheckCircle className="h-16 w-16 mx-auto mb-3 text-[hsl(var(--success))]" /> :
            <ClockAlert className="h-16 w-16 mx-auto mb-3 text-[hsl(var(--destructive))]" />
          }
          <h2 className="text-2xl font-bold"> {booking?.paymentStatus === "paid" ? t("การจองสำเร็จ!") : t("การจองไม่สำเร็จ")}</h2>
          {booking?.paymentStatus === "paid" && <p className="text-muted-foreground mt-1">{t("หมายเลขการจอง")}: <span className="font-bold text-foreground">{booking.bookingReference}</span></p>}
        </div>

        {booking?.paymentStatus === "paid" && <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <div className="bg-card border-2 border-border rounded-xl p-4 mb-3 w-48 h-48 flex items-center justify-center">
              {qrCode ? (
                <img src={qrCode} alt={t("QR Code")} className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{t("Generating QR...")}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("แสดง QR Code นี้เมื่อขึ้นรถ")}</p>
          </CardContent>
        </Card>}

        {/* Booking Details */}

        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <h3 className="font-bold text-base mb-2">{t("รายละเอียดการจอง")}</h3>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("เส้นทาง")}</span><span className="font-medium">{booking?.routeName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("วันที่")}</span><span>{booking?.date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("เวลา")}</span><span>{booking?.departureTime} - {booking?.arrivalTime}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("จุดขึ้นรถ")}</span><span>{booking?.boardingPoint}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("จุดลงรถ")}</span><span>{booking?.dropOffPoint}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("ที่นั่ง")}</span><span>{booking?.passengers.map((s: any) => s.seatNumber).join(", ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("ประเภทรถ")}</span><span>{booking?.busType}</span></div>
            {store?.paymentStatus === "success" && <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg"><span>{t("ยอดชำระ")}</span><span className="text-primary">฿{booking?.total}</span></div>
            </div>}
          </CardContent>
        </Card>


        {/* Passenger List */}
        {booking?.paymentStatus === "paid" && booking?.passengers.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-base mb-2">{t("ผู้โดยสาร")}</h3>
              {booking?.passengers.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span>{p.fullName}</span>
                  <span className="text-muted-foreground">{t("ที่นั่ง")} {p.seatNumber}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {booking?.paymentStatus === "paid" && (
          <div className="space-y-2">
            <Button variant="outline" className="w-full h-12" onClick={() => { }}>
              <Download className="mr-2 h-4 w-4" />
              {t("ดาวน์โหลด")} PDF
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => { }}>
              <Mail className="mr-2 h-4 w-4" />
              {t("ส่งไปยังอีเมล")}
            </Button>

          </div>)}
        <div className="space-y-2 pt-4">
          {booking?.paymentStatus !== "paid" &&
            <Button className="w-full h-12 font-bold" onClick={() => { continueBooking(); }}>
              {t("ทำรายการใหม่")}
            </Button>
          }
          <Button
            className="w-full h-12 font-bold" variant="outline"
            onClick={() => { store.reset(); navigate("/"); }}
          >
            {t("กลับหน้าแรก")}
          </Button>
        </div>
        <div style={{ width: "100%", height: "5rem" }}></div>
      </div>
    </BookingLayout>
  );
};

export default ETicketPage;
