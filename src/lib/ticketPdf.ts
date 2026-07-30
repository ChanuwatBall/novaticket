import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import moment from "moment";

const COMPANY_PROFILE = {
  name: "Nex Express",
  address: "Nex Express Co., Ltd.",
  phone: "-",
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

export const createTicketPdf = async (booking: any, qrCode: string | null) => {
  const passengers = booking?.passengers || [];
  const seats = passengers.map((p: any) => p.seatNumber).filter(Boolean);
  const seatText = seats.map(escapeHtml).join(", ") || "-";
  const pricePerSeat =
    booking?.pricePerSeat ||
    Math.round(Number(booking?.total || 0) / Math.max(passengers.length, 1));
  const total = Number(booking?.total || 0);
  const discount = Number(booking?.discount || 0);
  const fee = booking?.fee_amt ?? booking?.feeAmt;
  const change = booking?.change;
  const formatMoney = (amount: unknown) => `${Number(amount || 0).toLocaleString()} บาท`;
  const formatDate = (value: unknown) => {
    if (!value) return "-";
    const parsed = moment(String(value));
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : String(value);
  };
  const bookingDate = booking?.bookingDate ? moment(booking.bookingDate).format("DD/MM/YYYY") : moment().format("DD/MM/YYYY");
  const row = (label: string, value: unknown) => `
    <div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;">
      <span style="color:#374151;">${label}</span>
      <span style="font-weight:600;text-align:right;max-width:58%;">${escapeHtml(value)}</span>
    </div>
  `;
  const divider = `<div style="border-top:1px dashed #9ca3af;margin:7px 0;"></div>`;
  const sectionTitle = (value: string) => `<div style="font-weight:700;margin:4px 0 3px;">${value}</div>`;

  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.left = "-10000px";
  node.style.top = "0";
  node.style.width = "384px";
  node.style.padding = "12px 14px";
  node.style.background = "#ffffff";
  node.style.color = "#111827";
  node.style.fontFamily = "Arial, 'Noto Sans Thai', sans-serif";
  node.style.fontSize = "12px";
  node.style.lineHeight = "1.18";
  node.innerHTML = `
    <div>
      <div style="text-align:center;">
        <div style="font-size:18px;font-weight:700;">${escapeHtml(COMPANY_PROFILE.name)}</div>
        <div style="font-size:10px;margin-top:2px;">${escapeHtml(COMPANY_PROFILE.address)} | โทร. ${escapeHtml(COMPANY_PROFILE.phone)}</div>
      </div>
      ${divider}
      <div style="text-align:center;font-weight:700;font-size:15px;">ใบเสร็จรับเงิน / RECEIPT</div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:5px;">
        <span style="font-weight:700;">เลขจอง #${escapeHtml(booking?.bookingReference)}</span>
        <span>${escapeHtml(bookingDate)}</span>
      </div>
      ${divider}
      <div style="text-align:center;width:100%;height:138px;display:flex;align-items:center;justify-content:center;">
        ${qrCode ? `<img src="${qrCode}" style="width:138px;height:138px;object-fit:contain;" />` : `<div style="height:120px;display:flex;align-items:center;justify-content:center;">QR Code</div>`}
      </div>
      ${divider}
      ${sectionTitle("รายละเอียดเที่ยวจอง")}
      ${row("เส้นทาง", booking?.routeName || `${booking?.origin || "-"} - ${booking?.destination || "-"}`)}
      ${row("วัน/เวลา", `${formatDate(booking?.date)} ${booking?.departureTime || "-"} - ${booking?.arrivalTime || "-"}`)}
      ${row("ขึ้น/ลง", `${booking?.boardingPoint || "-"} -> ${booking?.dropOffPoint || "-"}`)}
      ${row("รถ", `${booking?.busPlate || "-"} ${booking?.busType || ""} ${booking?.tripType || ""}`.trim())}
      ${row("ที่นั่ง", seatText)}
      ${divider}
      ${sectionTitle("ผู้โดยสาร")}
      ${passengers.map((passenger: any, index: number) => `
        <div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;">
          <div style="max-width:68%;">
            <div>${index + 1}. ${escapeHtml(passenger.fullName)}</div>
            <div style="font-size:10px;color:#4b5563;">${escapeHtml(passenger.phone)} | ${escapeHtml(passenger.seatNumber)} | ${escapeHtml(passenger.passengerType)}</div>
          </div>
          <div style="font-weight:600;text-align:right;">${escapeHtml(formatMoney(pricePerSeat))}</div>
        </div>
      `).join("")}
      ${divider}
      ${row("วิธีชำระเงิน", booking?.paymentMethod || "-")}
      ${row("สถานะ", booking?.paymentStatus || "-")}
      ${row("ส่วนลด", formatMoney(discount))}
      ${fee !== undefined ? row("ค่าธรรมเนียม", formatMoney(fee)) : ""}
      ${change !== undefined ? row("เงินทอน", formatMoney(change)) : ""}
      ${divider}
      <div style="display:flex;justify-content:space-between;gap:8px;font-weight:700;font-size:14px;">
        <span>ยอดรวมสุทธิ</span>
        <span>${escapeHtml(formatMoney(total))}</span>
      </div>
      ${divider}
      <div style="font-size:9px;color:#334155;line-height:1.12;">
        <span style="font-weight:700;">เงื่อนไข: </span>${escapeHtml(COMPANY_PROFILE.ticketTerms)}
      </div>
      <div style="text-align:center;font-weight:700;margin-top:8px;">ขอบคุณที่ใช้บริการ</div>
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
