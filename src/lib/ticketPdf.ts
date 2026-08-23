import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";
import { calculatePaymentSummary } from "@/lib/paymentSummary";

const COMPANY_PROFILE = {
  name: "Nex Express",
  address: "Nex Express Co., Ltd.",
  contactName: "-",
  phone: "-",
  email: "-",
  taxId: "-",
  ticketTerms:
    "บริษัทฯ ไม่รับผิดชอบสิ่งของผิดกฎหมาย/ต้องห้าม/ตกค้าง กรณีเสียหายหรือสูญหายต้องแจ้งภายใน 8 วัน บริษัทฯ ขอสงวนสิทธิ์ชดใช้ตามส่วน",
};

const escapeHtml = (value: unknown) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const encodeTicketPayload = (payload: unknown) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

export const decodeTicketPayload = <T = any>(payload: string): T =>
  JSON.parse(decodeURIComponent(escape(atob(payload))));

const compactJoin = (items: unknown[], separator = " | ") =>
  items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .join(separator);

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const formatBookingTime = (value: string | undefined) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

export const normalizeBooking = (response: any) => ({
  ...response,
  bookingReference: response?.bookingReference || response?.bookingNo,
  date: response?.date || response?.serviceDate,
  departureTime: response?.departureTime || formatBookingTime(response?.scheduledDeparture),
  arrivalTime: response?.arrivalTime || formatBookingTime(response?.scheduledArrival),
  passengers: (response?.passengers || response?.seats || []).map((passenger: any) => ({
    ...passenger,
    seatNumber: passenger?.seatNumber || passenger?.seat_no,
    fullName: passenger?.fullName || passenger?.full_name,
    passengerType: passenger?.passengerType || passenger?.passenger_type,
  })),
});

const asRecord = (value: unknown) =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : null;

const getCompanySalesSettings = (company: unknown) => {
  const companyData = asRecord(company);
  const settings = companyData?.company_sales_settings || companyData?.companySalesSettings;
  return asRecord(Array.isArray(settings) ? settings[0] : settings);
};

const getCompanyProfile = (company: unknown) => {
  const companyData = asRecord(company);
  const salesSettings = getCompanySalesSettings(company);
  const companySettings = asRecord(companyData?.companySettings || companyData?.company_settings);
  const branding = asRecord(companyData?.branding);
  const theme = asRecord(companyData?.theme);

  return {
    name: firstValue(
      branding?.brandName,
      branding?.appTitle,
      companyData?.name,
      companyData?.companyName,
      COMPANY_PROFILE.name,
    ),
    address: firstValue(companyData?.address, companyData?.companyAddress, COMPANY_PROFILE.address),
    contactName: firstValue(companyData?.contact_name, companyData?.contactName, COMPANY_PROFILE.contactName),
    phone: firstValue(companyData?.phone, companyData?.tel, companyData?.telephone, COMPANY_PROFILE.phone),
    email: firstValue(companyData?.email, COMPANY_PROFILE.email),
    taxId: firstValue(companyData?.tax_id, companyData?.taxId, COMPANY_PROFILE.taxId),
    ticketTerms: firstValue(
      companySettings?.ticket_terms,
      companySettings?.ticketTerms,
      companyData?.ticket_terms,
      companyData?.ticketTerms,
      COMPANY_PROFILE.ticketTerms,
    ),
    logoUrl: firstValue(branding?.logoUrl, branding?.logoDarkUrl),
    primaryColor: firstValue(theme?.primaryColor, "#124985"),
    fee: salesSettings?.fee,
    vipSeatSurcharge: firstValue(
      salesSettings?.vip_seat_surcharge,
      salesSettings?.vipSeatSurcharge,
    ),
  };
};

export const createTicketPdf = async (booking: any, qrCode: string | null, company?: any) => {
  const companyProfile = getCompanyProfile(company);
  const passengers = booking?.passengers || [];
  const seats = passengers.map((p: any) => p.seatNumber).filter(Boolean);
  const seatText = seats.map(escapeHtml).join(", ") || "-";
  const paymentSummary = calculatePaymentSummary(booking, company);
  const netTotal = paymentSummary.total + paymentSummary.feeTotal;
  const pricePerSeat =
    booking?.pricePerSeat ||
    Math.round(paymentSummary.seatSubtotal / Math.max(passengers.length, 1));
  const vipSeatSurcharge = booking?.vipSeatSurcharge ?? booking?.vip_seat_surcharge ?? companyProfile.vipSeatSurcharge;
  const change = booking?.change;
  const formatMoney = (amount: unknown) => `${Number(amount || 0).toLocaleString()} บาท`;
  const formatDate = (value: unknown) => {
    if (!value) return "-";
    const parsed = moment(String(value));
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : String(value);
  };
  const bookingDate = booking?.bookingDate ? moment(booking.bookingDate).format("DD/MM/YYYY") : moment().format("DD/MM/YYYY");
  const row = (label: string, value: unknown) => `
    <div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;font-size:10px;">
      <span style="color:#000000;font-weight:600;">${label}</span>
      <span style="text-align:right;max-width:58%;">${escapeHtml(value)}</span>
    </div>
  `;
  const divider = `<div style="border-top:1px dashed #9ca3af;margin:7px 0;"></div>`;
  const sectionTitle = (value: string) => `<div style="font-weight:700;margin:4px 0 3px;">${value}</div>`;

  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.left = "-10000px";
  node.style.top = "0";
  node.style.width = "330px";
  node.style.padding = "12px 14px";
  node.style.background = "#ffffff";
  node.style.color = "#000000";
  node.style.fontFamily = "Arial, 'Noto Sans Thai', sans-serif";
  node.style.fontSize = "12px";
  node.style.lineHeight = "1.18";
  node.innerHTML = `
    <div>
      <div style="text-align:center;">
        ${companyProfile.logoUrl ? `<img src="${escapeHtml(companyProfile.logoUrl)}" crossorigin="anonymous" style="display:block;max-width:90px;max-height:48px;object-fit:contain;margin:0 auto 5px;" />` : ""}
        <div style="font-size:18px;font-weight:700;margin-bottom:5px;">${escapeHtml(companyProfile.name)}</div>
        <div style="font-size:10px;margin-top:2px;">${escapeHtml(companyProfile.address)}
         | โทร. / Tel. ${companyProfile.phone}
        </div>
        <div style="font-size:10px;margin-top:2px;">${escapeHtml(compactJoin([
          `อีเมล ${companyProfile.email}`,
        ]))}</div>
      </div>
      
      <div style="text-align:center;font-size:15px;font-weight:700;color:${escapeHtml(companyProfile.primaryColor)};margin:7px 0 10px;">ใบเสร็จรับเงิน / RECEIPT</div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:5px;">
        <span style="font-weight:600;font-size:12px;">Booking Ref: ${escapeHtml(booking?.bookingReference)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:5px;margin-bottom:7px;">
        <span style="font-size:12px;">Booking Date: ${bookingDate}</span> 
      </div><br/>
      
      <div style="text-align:center;width:100%;height:170px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        ${qrCode ? `<img src="${qrCode}" style="width:170px;height:170px;object-fit:contain;" />` : `<div style="height:120px;display:flex;align-items:center;justify-content:center;">QR Code</div>`}
        <small>QR Code</small>
      </div><br/>
      
      ${sectionTitle("รายละเอียดเที่ยวจอง/Trip Details")}
      ${row("เส้นทาง Route", booking?.routeName || `${booking?.origin || "-"} - ${booking?.destination || "-"}`)}
      ${row("วัน/เวลา Date-Time", `${formatDate(booking?.date)} ${booking?.departureTime || "-"} - ${booking?.arrivalTime || "-"}`)}
      ${row("ขึ้น/ลง up-down", `${booking?.boardingPoint || "-"} -> ${booking?.dropOffPoint || "-"}`)}
      ${row("รถ/ Bus", `${booking?.busPlate || "-"} ${booking?.busType || ""} ${booking?.tripType || ""}`.trim())}
      ${row("ที่นั่ง", seatText)}
      <br/>
      ${sectionTitle("ผู้โดยสาร / Passengers")}
      ${passengers.map((passenger: any, index: number) => `
        <div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;">
          <div style="max-width:68%;">
            <div>${index + 1}. ${escapeHtml(passenger.fullName)}</div>
            <div style="font-size:10px;color:#000000;">${escapeHtml(passenger.phone)} | ${escapeHtml(passenger.seatNumber)} | ${escapeHtml(passenger.passengerType)}</div>
          </div>
          <div style="text-align:right;">${escapeHtml(formatMoney(pricePerSeat))}</div>
        </div>
      `).join("")}
     <br/>
      ${row("วิธีชำระเงิน Payment: ", booking?.paymentMethod || "-")}
      ${row("สถานะ Status:", booking?.paymentStatus || "-")}
      <br/>
      ${row(`ยอดรวม ${paymentSummary.seatCount} ที่นั่ง / Seat Total:`, formatMoney(paymentSummary.seatSubtotal))}
      ${paymentSummary.discount > 0 ? row("ส่วนลดโปรโมชั่น / Discount:", `-${formatMoney(paymentSummary.discount)}`) : ""}
      ${row("ค่าบริการและอื่นๆ รวม / Service Total:", formatMoney(paymentSummary.serviceTotal))}
      ${row("ค่าธรรมเนียม / Fee:", formatMoney(paymentSummary.feeTotal))}
      ${ row("เงินทอน Change:", change? formatMoney(change) : " บาท")}
      ${row("ยอดรวมสุทธิ / Net Total:", formatMoney(netTotal))}
     <br/>
     
     
      <div style="font-size:10px;color:#000000;line-height:1.12;">
        <span  >เงื่อนไขการให้บริการ / Terms and Conditions: </span><br/>${escapeHtml(companyProfile.ticketTerms)}
      </div><br/> 
    </div>
  `;

  document.body.appendChild(node);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  } finally {
    document.body.removeChild(node);
  }

  const receiptWidthMm = 80;
  const receiptHeightMm = Math.max(120, (canvas.height * receiptWidthMm) / canvas.width);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [receiptWidthMm, receiptHeightMm],
  });

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, receiptWidthMm, receiptHeightMm);

  return pdf;
};
