/**
 * mockData.ts
 *
 * Re-exports shared types from api.ts for backward compatibility.
 * Static mock data ยังคงอยู่เพื่อใช้ระหว่าง development / fallback
 * เมื่อเชื่อมต่อ API จริงแล้ว ให้เรียกผ่าน services/api.ts แทน
 */

// ─────────────────────────────────────────────
// Re-export types จาก api.ts (Single source of truth)
// ─────────────────────────────────────────────
export type {
  Route,
  Province,
  BoardingPoint,
  Trip,
  SeatStatus,
  Seat,
  BusLayout,
  Promotion,
} from "@/services/api";

// ─────────────────────────────────────────────
// Bus Layout Helpers (client-side only)
// ─────────────────────────────────────────────
import type { BusLayout, SeatStatus, Seat } from "@/services/api";

const SPECIAL_CELLS = ['DRIVER', 'DOOR1', 'DOOR2', 'TOILET', 'EMERGENCY', 'STAIRS'];

// 7.3m bus — ~24 seats, single floor
export const layout7m: BusLayout = {
  id: '7m',
  name: 'รถตู้ 7.3 เมตร',
  rows: [
    ['DOOR1', null, null, 'DRIVER'],
    ['1A', '1B', null, null],
    ['2A', '2B', null, null],
    ['3A', '3B', null, '3D'],
    ['4A', '4B', null, '4D'],
    ['5A', '5B', null, '5D'],
    ['6A', '6B', null, '6D'],
    ['7A', '7B', '7C', '7D'],
  ],
};

// 12m bus — ~32-40 seats, single floor
export const layout12m: BusLayout = {
  id: '12m',
  name: 'รถบัส 12 เมตร',
  rows: [
    ['DOOR1', null, null, 'DRIVER'],
    ['1A', '1B', '1C', '1D'],
    ['2A', '2B', '2C', '2D'],
    ['3A', '3B', '3C', '3D'],
    ['4A', '4B', '4C', '4D'],
    ['TOILET', null, '5C', '5D'],
    ['DOOR2', null, '6C', '6D'],
    ['5A', '5B', '7C', '7D'],
    ['6A', '6B', null, 'EMERGENCY'],
    ['7A', '7B', '8C', '8D'],
    ['8A', '8B', '9C', '9D'],
  ],
};

export function getBusLayout(busType: string, totalSeats: number): BusLayout {
  if (totalSeats <= 24 || busType.includes('VIP 24') || busType.includes('First Class')) {
    return layout7m;
  }
  return layout12m;
}

export function isSpecialCell(label: string | null): boolean {
  return label !== null && SPECIAL_CELLS.includes(label);
}

export const generateSeats = (layout: BusLayout): Seat[] => {
  const seats: Seat[] = [];
  layout.rows.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      if (cell === null || isSpecialCell(cell)) return;
      seats.push({
        id: `s-${cell}`,
        number: cell,
        row: rowIdx,
        col: colIdx,
        status: "available",
        floor: 1,
      });
    });
  });
  return seats;
};

// ─────────────────────────────────────────────
// Static Mock Data (Fallback / Dev)
// TODO: Replace usage in pages with API calls
// ─────────────────────────────────────────────
import type { Route, Province, BoardingPoint, Trip, Promotion } from "@/services/api";

export const routes: Route[] = [
  { id: 'southern', name: 'สายใต้', nameEn: 'Southern Line' },
  { id: 'northern', name: 'สายเหนือ', nameEn: 'Northern Line' },
  { id: 'northeast', name: 'สายอีสาน', nameEn: 'Northeastern Line' },
  { id: 'eastern', name: 'สายตะวันออก', nameEn: 'Eastern Line' },
];

export const provinces: Province[] = [
  { id: 'bkk', name: 'กรุงเทพฯ', nameEn: 'Bangkok', routeIds: ['southern', 'northern', 'northeast', 'eastern'] },
  { id: 'cnx', name: 'เชียงใหม่', nameEn: 'Chiang Mai', routeIds: ['northern'] },
  { id: 'cri', name: 'เชียงราย', nameEn: 'Chiang Rai', routeIds: ['northern'] },
  { id: 'nkr', name: 'นครราชสีมา', nameEn: 'Nakhon Ratchasima', routeIds: ['northeast'] },
  { id: 'udn', name: 'อุดรธานี', nameEn: 'Udon Thani', routeIds: ['northeast'] },
  { id: 'skn', name: 'สุราษฎร์ธานี', nameEn: 'Surat Thani', routeIds: ['southern'] },
  { id: 'hdy', name: 'หาดใหญ่', nameEn: 'Hat Yai', routeIds: ['southern'] },
  { id: 'pty', name: 'พัทยา', nameEn: 'Pattaya', routeIds: ['eastern'] },
  { id: 'ryn', name: 'ระยอง', nameEn: 'Rayong', routeIds: ['eastern'] },
];

export const boardingPoints: BoardingPoint[] = [
  { id: 'bkk-mo-chit', name: 'หมอชิต 2', nameEn: 'Mo Chit 2', provinceId: 'bkk' },
  { id: 'bkk-sai-tai', name: 'สายใต้ใหม่', nameEn: 'Southern Terminal', provinceId: 'bkk' },
  { id: 'bkk-ekkamai', name: 'เอกมัย', nameEn: 'Ekkamai', provinceId: 'bkk' },
  { id: 'cnx-arcade', name: 'อาเขต', nameEn: 'Arcade Bus Terminal', provinceId: 'cnx' },
  { id: 'cri-terminal', name: 'สถานีขนส่งเชียงราย', nameEn: 'Chiang Rai Terminal', provinceId: 'cri' },
  { id: 'nkr-terminal', name: 'สถานีขนส่งโคราช', nameEn: 'Korat Terminal', provinceId: 'nkr' },
  { id: 'udn-terminal', name: 'สถานีขนส่งอุดร', nameEn: 'Udon Terminal', provinceId: 'udn' },
  { id: 'skn-terminal', name: 'สถานีขนส่งสุราษฎร์', nameEn: 'Surat Terminal', provinceId: 'skn' },
  { id: 'hdy-terminal', name: 'สถานีขนส่งหาดใหญ่', nameEn: 'Hat Yai Terminal', provinceId: 'hdy' },
  { id: 'pty-terminal', name: 'สถานีขนส่งพัทยา', nameEn: 'Pattaya Terminal', provinceId: 'pty' },
  { id: 'ryn-terminal', name: 'สถานีขนส่งระยอง', nameEn: 'Rayong Terminal', provinceId: 'ryn' },
];

export const mockTrips: Trip[] = [
  { id: 't1', routeId: 'northern', originProvinceId: 'bkk', destinationProvinceId: 'cnx', departureTime: '08:00', arrivalTime: '18:00', price: 550, availableSeats: 24, totalSeats: 40, tripType: 'ด่วนพิเศษ', busType: 'VIP 24 ที่นั่ง', date: '2026-03-05' },
  { id: 't2', routeId: 'northern', originProvinceId: 'bkk', destinationProvinceId: 'cnx', departureTime: '20:00', arrivalTime: '06:00', price: 650, availableSeats: 12, totalSeats: 32, tripType: 'ด่วนพิเศษ', busType: 'VIP 32 ที่นั่ง', date: '2026-03-05' },
  { id: 't3', routeId: 'northern', originProvinceId: 'bkk', destinationProvinceId: 'cnx', departureTime: '21:30', arrivalTime: '07:30', price: 750, availableSeats: 6, totalSeats: 24, tripType: 'ด่วนพิเศษ', busType: 'VIP First Class', date: '2026-03-05' },
  { id: 't4', routeId: 'southern', originProvinceId: 'bkk', destinationProvinceId: 'hdy', departureTime: '18:00', arrivalTime: '07:00', price: 850, availableSeats: 18, totalSeats: 40, tripType: 'ด่วนพิเศษ', busType: 'VIP 24 ที่นั่ง', date: '2026-03-05' },
  { id: 't5', routeId: 'northeast', originProvinceId: 'bkk', destinationProvinceId: 'udn', departureTime: '19:00', arrivalTime: '05:00', price: 480, availableSeats: 30, totalSeats: 40, tripType: 'ปรับอากาศ', busType: 'ป.1 (ป.อ.)', date: '2026-03-05' },
  { id: 't6', routeId: 'southern', originProvinceId: 'bkk', destinationProvinceId: 'skn', departureTime: '19:00', arrivalTime: '05:30', price: 600, availableSeats: 20, totalSeats: 40, tripType: 'ด่วนพิเศษ', busType: 'VIP 24 ที่นั่ง', date: '2026-03-05' },
  { id: 't7', routeId: 'southern', originProvinceId: 'bkk', destinationProvinceId: 'skn', departureTime: '21:00', arrivalTime: '07:00', price: 700, availableSeats: 14, totalSeats: 32, tripType: 'ด่วนพิเศษ', busType: 'VIP 32 ที่นั่ง', date: '2026-03-05' },
  { id: 't8', routeId: 'eastern', originProvinceId: 'bkk', destinationProvinceId: 'pty', departureTime: '09:00', arrivalTime: '12:00', price: 200, availableSeats: 35, totalSeats: 40, tripType: 'ปรับอากาศ', busType: 'ป.1 (ป.อ.)', date: '2026-03-05' },
];

export const mockPromotions: Promotion[] = [
  {
    id: 'p1', title: 'ส่วนลด 10% สายเหนือ', description: 'รับส่วนลด 10% สำหรับเส้นทางสายเหนือทุกเที่ยว',
    imageUrl: '../assets/promotion/discount10.jpg', promoCode: 'NORTH10', discountPercent: 10, discountAmount: 0,
    remainingQuota: 50, expiryDate: '2026-04-30', validityDays: 30, memberOnly: false,
  },
  {
    id: 'p2', title: 'สมาชิกลด 100 บาท', description: 'สมาชิกรับส่วนลด 100 บาท เมื่อจองผ่านแอป',
    imageUrl: '../assets/promotion/member100.jpg', promoCode: 'MEMBER100', discountPercent: 0, discountAmount: 100,
    remainingQuota: 20, expiryDate: '2026-03-31', validityDays: 15, memberOnly: true,
  },
  {
    id: 'p3', title: 'เดินทางคู่ ลดพิเศษ', description: 'จอง 2 ที่นั่งขึ้นไป รับส่วนลด 15%',
    imageUrl: '../assets/promotion/duo15.jpg', promoCode: 'DUO15', discountPercent: 15, discountAmount: 0,
    remainingQuota: 100, expiryDate: '2026-05-15', validityDays: 60, memberOnly: false,
  },
];
