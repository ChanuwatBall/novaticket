type Route = {
    id: string, // id ของ route ex north-1
    origin: string, // ต้นทาง ex กรุงเทพฯ
    destination: string, // ปลายทาง เชียงใหม่
    distance: number, // ระยะทาง  700
    duration: string, // ระยะเวลา 10 ชั่วโมง
    base_price: number, // ราคาพื้นฐาน 500
    region_id: string, // id ของภาค north
    created_at: string // วันที่สร้าง 2022-01-01
}

type BusStops = { 
    id:  string,
    route_id: {
        id: string,
        origin: string,
        distance: number,
        duration: string,
        origin_id: string,
        region_id: string,
        base_price: 550,
        created_at: string
        destination: string
        destination_id: string
    },
    name: string,
    type: string
    order: number,
    created_at: string
}
export type { Route, BusStops}