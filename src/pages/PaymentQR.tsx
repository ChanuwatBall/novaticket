import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import BookingLayout from "@/components/BookingLayout";
import PageTransition from "@/components/PageTransition";
import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, AlertCircle, CheckCircle2, Store } from "lucide-react";
import { createCharge, cancelCharge, createBooking, NewBooking, chargeQrPayment, paymentStatus, chargeWechatPayment, chargeAlipayPayment, updatePassengerLocation } from "@/services/api";
import QRCode from "qrcode";
import liff from "@line/liff";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import moment from "moment";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { t } from "i18next";

const TIMER_SECONDS = 10 * 60; // 15 minutes

const PaymentQRPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const setPaymentStatus = useBookingStore((s) => s.setPaymentStatus);
  const resetStore = useBookingStore((s) => s.reset);
  const store = useBookingStore();
  const [bookingref, setBookingRef] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null);
  // ดึง Base URL ของ API (เช่น http://localhost:8080)
  const baseUrl = import.meta.env.VITE_SOCKET_URL;

  const { sourceType, total, bookingDetail, bookingBody } = (location.state as any) || {
    sourceType: "promptpay",
    total: 0,
  };

  // const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [chargeStatus, setChargeStatus] = useState<string>("pending");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [paymenttimeout, setPaymentTimeout] = useState(300000); // 5 minutes in milliseconds

  // ใช้ Ref เพื่อเก็บ instance ของ WebSocket Client ไม่ให้หายไปเมื่อ Re-render
  const stompClientRef = useRef<Client | null>(null);

  const handlePaymentSuccess = useCallback(async () => {
    if (chargeStatus === "successful") return;
 

    setChargeStatus("successful");
    setPaymentStatus("success");
    // setBookingId(`NEX${Date.now().toString(36).toUpperCase()}`);
    setTimeout(() => navigate("/e-ticket/" + store?.newBookingId), 2000);
  }, [chargeStatus, store, bookingBody, setPaymentStatus, navigate]);

  const handlePaymentFailed = useCallback(async (id: string) => {
    if (chargeStatus === "failed") return;

    setChargeStatus("failed");
    setPaymentStatus("failed");
  }, [chargeStatus, setPaymentStatus]);

  // --- Countdown Timer ---
  useEffect(() => {
    const interval = setInterval(() => {
      setPaymentTimeout((prev) => (prev <= 1 ? 0 : prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Polling for Payment Status ---
  useEffect(() => {
    if (!chargeId || chargeStatus !== "pending") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await paymentStatus(chargeId);
        console.log("Polling Payment Status:", response);
        const status = response.status.toLowerCase();

        if (status === "success" || status === "successful") {
          handlePaymentSuccess();
          window.navigator.geolocation.getCurrentPosition(
            (position) => {
              if(position.coords){
                const userLocation = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy_m: position.coords.accuracy
                }; 
                updatePassengerLocation(bookingBody?.tripId, userLocation);
              }
            }
          )
          clearInterval(pollInterval);
        } else if (status === "failed") {
          handlePaymentFailed(chargeId);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [chargeId, chargeStatus, handlePaymentSuccess, handlePaymentFailed]);

  // --- Handle Timeout ---
  useEffect(() => {
    if (paymenttimeout === 0 && chargeStatus === "pending" && chargeId) {
      console.log("Payment timed out, running cleanup...");
      handlePaymentFailed(chargeId);
    }
  }, [paymenttimeout, chargeStatus, chargeId, handlePaymentFailed]);

  const hasInitialized = useRef(false);

  // --- Create Charge & Start WebSocket ---
  useEffect(() => {
    if (total <= 0 || hasInitialized.current) return;
    hasInitialized.current = true;

    const initPayment = async () => {
      setQrLoading(true);
      setQrError(null);
      try {
        var payqr: {
          "chargeId": string
          "qrCodeUrl": string
          "status": string
          "expiresAt": string
        } = null
        if (sourceType === "promptpay") {
          payqr = await chargeQrPayment(total)
        } else if (sourceType === "wechat_pay_mpm") {
          payqr = await chargeWechatPayment(total)
        } else if (sourceType === "alipay") {
          payqr = await chargeAlipayPayment(total)
        }
        console.log("payqr ", payqr)
        setQrUrl(payqr.qrCodeUrl);
        setChargeId(payqr.chargeId);

        const bookingPayload: NewBooking = {
          "tripId": bookingBody?.tripId,
          "travelDate": bookingBody?.travelDate,
          "originProvinceId": bookingBody?.originProvinceId,
          "destinationProvinceId": bookingBody?.destinationProvinceId,
          "boardingPointId": bookingBody?.boardingPointId,
          "dropOffPointId": bookingBody?.dropOffPointId,
          "passengers": store.passengers.map(e => {
            return {
              ...e,
              price: store?.selectedTrip?.price,
              trip_id: store?.selectedTrip?.id
            }
          }),
          "addOns": bookingBody?.addOns ,
          "promoCode": store.promoCode,
          "omiseChargeId": payqr.chargeId,
          "useStamp": false
        }
        console.log("bookingPayload ", bookingPayload)
        const bookingres = await createBooking(bookingPayload)
        console.log("bookingres ", bookingres)
        if (bookingres.error) {
          toast({
            title: "ไม่สามารถจองตั๋วได้",
            description: bookingres.error,
            variant: "destructive",
            duration: Infinity,
            action: (
              <ToastAction altText="ตกลง">
                ตกลง
              </ToastAction>
            ),
          });
          await cancelCharge(payqr.chargeId)
          setTimeout(() => {
            navigate(-1)
          }, 1000)
          return
        } else {
          setBookingId(bookingres?.bookingId)
          setBookingRef(bookingres?.bookingReference)
          store.setNewBookingId(bookingres?.bookingId)
          // console.log("bookingbody ", bookingbody)
          const qrBookingPayload = JSON.stringify({ "trip": bookingBody?.tripId, "bookingReference": bookingres.bookingReference });
          const qrBookingCode = await QRCode.toDataURL(btoa(qrBookingPayload));
          store.setBookingQrcode(qrBookingCode);
        }
        // console.log("inserted booking data ", data)
        // เปลี่ยนจากการทำ Interval มาใช้ WebSocket แทน
        // connectWebSocket(orderId);
      } catch (err: any) {
        // setQrError(err.message);
      } finally {
        setQrLoading(false);
      }
    };
    setTimeout(() => {
      initPayment();
    }, 2500)


    // Cleanup: เมื่อออกจากหน้า ให้ปิด WebSocket ทันที
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [total, sourceType]);

  const handleDownloadQR = useCallback(async () => {
    if (!qrUrl) return;
    if (liff.isInClient && liff.isInClient()) {
      liff.openWindow({ url: qrUrl, external: true });
    } else {
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `qr-code-${chargeId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
        window.open(qrUrl, "_blank");
      }
    }
  }, [qrUrl, chargeId]);

  const handleCancelCharge = async () => {
    if (chargeId) await cancelCharge(chargeId).catch(console.error);
    if (stompClientRef.current) stompClientRef.current.deactivate();
    navigate(-1);
  };

  const minutes = Math.floor(paymenttimeout / 60000);
  const seconds = (paymenttimeout % 60000) / 1000;

  // --- Render logic ---
  if (paymenttimeout === 0 && chargeStatus !== "successful" && chargeStatus !== "failed") {
    return (
      <BookingLayout currentStep={4} navto={() => navigate(-1)} title="หมดเวลา" showSteps={false}>
        <div className="px-4 text-center py-16">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-xl font-bold mb-2">{t("หมดเวลาชำระเงิน")}</h3>
          <p className="text-muted-foreground mb-6">{t("กรุณาทำรายการใหม่อีกครั้ง")}</p>
          <Button onClick={() => { resetStore(); navigate("/"); }} className="h-12 px-8">{t("กลับหน้าแรก")}</Button>
        </div>
      </BookingLayout>
    );
  }

  if (chargeStatus === "failed") {
    return (
      <BookingLayout currentStep={4} navto={() => navigate(-1)} title={t("ชำระเงินไม่สำเร็จ")} showSteps={false}>
        <div className="px-4 text-center py-16">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-xl font-bold mb-2">{t("ชำระเงินไม่สำเร็จ")}</h3>
          <p className="text-muted-foreground">{t("กรุณาทำรายการใหม่อีกครั้ง")}</p><br />
          <Button onClick={() => { resetStore(); navigate("/"); }} className="h-12 px-8">{t("กลับหน้าแรก")}</Button>
        </div>
      </BookingLayout>
    );
  }

  if (chargeStatus === "successful") {
    return (
      <BookingLayout currentStep={4} navto={() => navigate(-1)} title={t("ชำระเงินสำเร็จ")} showSteps={false}>
        <div className="px-4 text-center py-16">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold mb-2">{t("ชำระเงินสำเร็จ")}</h3>
          <p className="text-muted-foreground">{t("กำลังนำไปยังหน้า E-Ticket...")}</p>
        </div>
      </BookingLayout>
    );
  }

  return (
    <BookingLayout currentStep={4} navto={() => navigate(-1)} title={t("สแกน QR ชำระเงิน")} showSteps={false}>
      <div className="px-4 space-y-4">
        <div className="bg-destructive/10 rounded-lg p-3 flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4 text-destructive" />
          <span>{t("กรุณาชำระภายใน")}</span>
          <span className="font-bold text-destructive ml-auto text-lg">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>

        <Card>
          <CardContent className="p-4 text-center space-y-4 border-none">
            {qrLoading ? (
              <div className="py-8">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">{t("กำลังสร้าง QR Code...")}</p>
              </div>
            ) : qrError ? (
              <div className="py-4">
                <p className="text-destructive text-sm">{qrError}</p>
              </div>
            ) : (
              qrUrl && (
                <div className="flex flex-col items-center">
                  <img src={qrUrl} alt={t("Payment QR")} className="w-72 object-contain" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{t("รอการชำระเงิน...")}</span>
                  </div>
                </div>
              )
            )}
            <h3 className="font-bold text-base">{t("สแกน QR Code เพื่อชำระเงิน")}</h3>
            <p className="text-2xl font-bold text-primary">฿{total}</p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={handleDownloadQR} disabled={!qrUrl || qrLoading} className="w-full h-12 bg-primary text-white hover:bg-primary/90">
          {t("บันทึก QR Code")}
        </Button>
        <Button variant="outline" onClick={() => setIsCancelDialogOpen(true)} className="w-full h-12">
          {t("ยกเลิก")}
        </Button>
        <div className="w-full h-32"></div>
      </div>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ยกเลิกรายการชำระเงิน?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("คุณต้องการยกเลิกและกลับไปยังหน้าก่อนหน้าใช่หรือไม่?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ไม่ยกเลิก")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelCharge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("ยืนยันการยกเลิก")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BookingLayout>
  );
};

export default PaymentQRPage;
