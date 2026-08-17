import { Button } from "@/components/ui/button";
import { bookingDetail, getAccessToken } from "@/services/api";
import { getStoredCompany, loadCompany, storeCompany } from "@/lib/company";
import { createTicketPdf, decodeTicketPayload } from "@/lib/ticketPdf";
import { Loader2, Download, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const createBookingQr = async (booking: any) => {
  if (!booking?.tripId || !booking?.bookingReference) return null;

  const qrBookingPayload = JSON.stringify({
    trip: booking.tripId,
    bookingReference: booking.bookingReference,
  });

  return QRCode.toDataURL(btoa(qrBookingPayload));
};

const ETicketPdfDownload = () => {
  const { bookingref } = useParams<{ bookingref: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("กำลังสร้าง PDF...");
  const [booking, setBooking] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [company, setCompany] = useState<unknown>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const didStartAutoDownload = useRef(false);

  const loadTicketData = useCallback(async () => {
    const payload = searchParams.get("payload");

    if (payload) {
      const decoded = decodeTicketPayload<{ booking: any; qrCode: string | null; company?: unknown }>(payload);
      if (decoded.company) {
        storeCompany(decoded.company);
      }

      return {
        booking: decoded.booking,
        qrCode: decoded.qrCode || await createBookingQr(decoded.booking),
        company: decoded.company || await loadCompany(),
      };
    }

    const userstr = localStorage.getItem("user");
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error("ไม่พบข้อมูลตั๋วสำหรับสร้าง PDF");
    }

    const detail = await bookingDetail({ id: bookingref, token: accessToken });
    if (detail?.error) {
      throw new Error(detail.message || detail.error);
    }

    return {
      booking: detail,
      qrCode: await createBookingQr(detail),
      company: await loadCompany(),
    };
  }, [bookingref, searchParams]);

  const downloadPdf = useCallback(async (targetBooking = booking, targetQrCode = qrCode, targetCompany = company) => {
    if (!targetBooking) return;

    setStatus("loading");
    setMessage("กำลังสร้าง PDF...");
    const pdf = await createTicketPdf(targetBooking, targetQrCode, targetCompany || getStoredCompany() || await loadCompany());
    pdf.save(`e-ticket-${targetBooking.bookingReference || bookingref}.pdf`); 
    setHasDownloaded(true);
    setStatus("ready");
    setMessage("ดาวน์โหลด PDF เรียบร้อยแล้ว");
  }, [booking, bookingref, company, qrCode]);

  useEffect(() => {
    let cancelled = false;
    if (didStartAutoDownload.current) return;
    didStartAutoDownload.current = true;

    const run = async () => {
      try {
        const data = await loadTicketData();
        if (cancelled) return;

        setBooking(data.booking);
        setQrCode(data.qrCode);
        setCompany(data.company);
        await downloadPdf(data.booking, data.qrCode, data.company);
      } catch (error: any) {
        if (cancelled) return;
        console.error("Ticket PDF download error:", error);
        setStatus("error");
        setMessage(error?.message || "ไม่สามารถสร้าง PDF ได้");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [downloadPdf, loadTicketData]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-5 text-center shadow-sm">
        {status === "error" ? (
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        ) : (
          <Loader2 className={`mx-auto mb-3 h-10 w-10 text-primary ${status === "loading" ? "animate-spin" : ""}`} />
        )}
        <h1 className="text-lg font-bold">E-Ticket PDF</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {booking && (
          <Button className="mt-4 w-full" onClick={() => downloadPdf()} disabled={status === "loading"}>
            <Download className="mr-2 h-4 w-4" />
            {hasDownloaded ? "ดาวน์โหลดอีกครั้ง" : "ดาวน์โหลด PDF"}
          </Button>
        )}
      </div>
    </main>
  );
};

export default ETicketPdfDownload;
