import BookingLayout from "@/components/BookingLayout";
import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ClockAlert, Download, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { bookingDetail } from "@/services/api";
import QRCode from "qrcode";
import { t } from "i18next";
import liff from "@line/liff";
import { useToast } from "@/hooks/use-toast";
import { encodeTicketPayload } from "@/lib/ticketPdf";
import { calculatePaymentSummary } from "@/lib/paymentSummary";

const getStoredCompany = () => {
  try {
    const companyStr = localStorage.getItem("company");
    return companyStr ? JSON.parse(companyStr) : null;
  } catch (error) {
    console.error("Failed to parse company from localStorage:", error);
    return null;
  }
};

const ETicketPage = () => {
  const { toast } = useToast();
  const { bookingref } = useParams<{ bookingref: string }>();
  const store = useBookingStore();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const paymentSummary = calculatePaymentSummary(booking, getStoredCompany());

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

  const handleDownloadPdf = async () => {
    if (!booking) return;

    setIsPdfLoading(true);
    try {
      const payload = encodeTicketPayload({ booking, qrCode });
      const downloadUrl = new URL(`/e-ticket/${booking.bookingReference || bookingref}/pdf?openExternalBrowser=1`, window.location.origin);
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
            <div className="flex justify-between"><span className="text-muted-foreground">{t("ที่นั่ง")}</span><span>{booking?.passengers?.map((s: any) => s.seatNumber).join(", ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("ประเภทรถ")}</span><span>{booking?.busType}</span></div>
            {(store?.paymentStatus === "success" || booking?.paymentStatus === "paid") && <div className="border-t border-border pt-2 mt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("ยอดรวม")} {paymentSummary.seatCount} {t("ที่นั่ง")}</span>
                <span className="font-bold">฿{paymentSummary.seatSubtotal.toLocaleString()}</span>
              </div>
              {paymentSummary.discount > 0 && (
                <div className="flex justify-between text-xs text-primary font-bold">
                  <span>{t("ส่วนลดโปรโมชั่น")}</span>
                  <span>-฿{paymentSummary.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("ค่าบริการ")} {t("และอื่นๆ")} {t("รวม")}</span>
                <span className="font-bold">฿{booking?.addonTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("ค่าธรรมเนียม")}</span>
                <span className="font-bold">฿{paymentSummary.feeTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>{t("ยอดรวมสุทธิ")}</span>
                <span className="text-primary">฿{(paymentSummary.total + paymentSummary.feeTotal ).toLocaleString()}</span>
              </div>
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
            <Button variant="outline" className="w-full h-12" onClick={handleDownloadPdf} disabled={isPdfLoading || !qrCode}>
              {isPdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isPdfLoading ? t("กำลังเปิด PDF...") : `${t("ดาวน์โหลด")} PDF`}
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
