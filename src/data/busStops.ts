export type BusStopType = "pickup" | "stop" | "dropoff";

export type BusStopMock = {
  id: string;
  name: string;
  place: string;
  type: BusStopType;
  stopOrder: number;
  routeId: string;
  lat: number;
  lon: number;
};

export type BusRouteMock = {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
};

export const mockBusRoutes: BusRouteMock[] = [
  {
    id: "ne-1",
    code: "NE-1",
    name: "กรุงเทพฯ - ขอนแก่น",
    origin: "กรุงเทพฯ",
    destination: "ขอนแก่น",
  },
  {
    id: "ne-2",
    code: "NE-2",
    name: "กรุงเทพฯ - อุดรธานี",
    origin: "กรุงเทพฯ",
    destination: "อุดรธานี",
  },
  {
    id: "n-1",
    code: "N-1",
    name: "กรุงเทพฯ - เชียงใหม่",
    origin: "กรุงเทพฯ",
    destination: "เชียงใหม่",
  },
  {
    id: "e-1",
    code: "E-1",
    name: "กรุงเทพฯ - ระยอง",
    origin: "กรุงเทพฯ",
    destination: "ระยอง",
  },
];

export const mockBusStops: BusStopMock[] = [
  {
    id: "2e045b5b-2bb1-4c88-9805-b4690e3fd8c0",
    name: "บขส.หมอชิตใหม่ ช่องจำหน่ายตั๋ว 58 ชานชาลา 119",
    place: "สถานีขนส่งผู้โดยสารกรุงเทพ (จตุจักร)",
    type: "pickup",
    stopOrder: 1,
    routeId: "ne-1",
    lat: 13.81386,
    lon: 100.54945,
  },
  {
    id: "f7e0f114-45ad-41ab-a01a-b1993cf3e726",
    name: "รังสิต จุดรับหน้าฟิวเจอร์พาร์ค",
    place: "ถนนพหลโยธิน หน้า Future Park Rangsit",
    type: "stop",
    stopOrder: 2,
    routeId: "ne-1",
    lat: 13.98763,
    lon: 100.61869,
  },
  {
    id: "ce5c6be3-a773-44b5-a332-0bb2718520ec",
    name: "บขส.ขอนแก่น ช่องจอดผู้โดยสารขาเข้า",
    place: "สถานีขนส่งผู้โดยสารจังหวัดขอนแก่น",
    type: "dropoff",
    stopOrder: 3,
    routeId: "ne-1",
    lat: 16.43219,
    lon: 102.82362,
  },
  {
    id: "6a26afbd-9be7-4f65-b6a4-9034effb9026",
    name: "บขส.หมอชิตใหม่ อาคารผู้โดยสารขาออก",
    place: "สถานีขนส่งผู้โดยสารกรุงเทพ (จตุจักร)",
    type: "pickup",
    stopOrder: 1,
    routeId: "n-1",
    lat: 13.81295,
    lon: 100.5489,
  },
  {
    id: "d9cb77d8-720f-4809-b497-7974fb681354",
    name: "นครสวรรค์ จุดพักรถหลักกิโลเมตร 238",
    place: "ถนนพหลโยธิน จังหวัดนครสวรรค์",
    type: "stop",
    stopOrder: 2,
    routeId: "n-1",
    lat: 15.70442,
    lon: 100.13717,
  },
  {
    id: "f3517c61-3f26-41df-8c56-1d18d1d62ef3",
    name: "อาเขตเชียงใหม่ ชานชาลา 12",
    place: "สถานีขนส่งผู้โดยสารเชียงใหม่ แห่งที่ 3",
    type: "dropoff",
    stopOrder: 3,
    routeId: "n-1",
    lat: 18.79958,
    lon: 99.01796,
  },
  {
    id: "fa3a70c9-977d-46cc-9982-c639a450a62d",
    name: "เอกมัย ช่องจำหน่ายตั๋วสายตะวันออก",
    place: "สถานีขนส่งผู้โดยสารกรุงเทพ (เอกมัย)",
    type: "pickup",
    stopOrder: 1,
    routeId: "e-1",
    lat: 13.71922,
    lon: 100.58539,
  },
  {
    id: "cbd2d166-0975-41c0-90c9-5a7d1c4dc8d7",
    name: "จุดรับบางนา กม.1",
    place: "ถนนบางนา-ตราด ฝั่งขาออก",
    type: "stop",
    stopOrder: 2,
    routeId: "e-1",
    lat: 13.66833,
    lon: 100.63571,
  },
  {
    id: "f0b2d91a-9f8c-4d27-84e5-85661a940b4a",
    name: "บขส.ระยอง ชานชาลาขาเข้า",
    place: "สถานีขนส่งผู้โดยสารจังหวัดระยอง",
    type: "dropoff",
    stopOrder: 3,
    routeId: "e-1",
    lat: 12.68301,
    lon: 101.27588,
  },
  {
    id: "0a4c171c-4044-4ef8-971d-575739f091a4",
    name: "บขส.โคราช จุดจอดรับ-ส่ง",
    place: "สถานีขนส่งผู้โดยสารนครราชสีมา แห่งที่ 2",
    type: "stop",
    stopOrder: 2,
    routeId: "ne-2",
    lat: 14.99589,
    lon: 102.11606,
  },
  {
    id: "0ff9cc0e-2f81-44dc-8efd-5d0df7ee882f",
    name: "บขส.อุดรธานี ชานชาลา 6",
    place: "สถานีขนส่งผู้โดยสารจังหวัดอุดรธานี",
    type: "dropoff",
    stopOrder: 3,
    routeId: "ne-2",
    lat: 17.40837,
    lon: 102.79272,
  },
];
