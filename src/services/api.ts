import { Capacitor, CapacitorHttp } from "@capacitor/core";
import axios from "axios";

const envBaseUrl = import.meta.env.VITE_API_URL?.trim() || "/";

const isLocalOrLanHost = (hostname: string) => {
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)$/i.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;

  const match = hostname.match(/^172\.(\d+)\./);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
};

export const apiBaseUrl =
  typeof window !== "undefined" &&
  !Capacitor.isNativePlatform() &&
  isLocalOrLanHost(window.location.hostname)
    ? "http://localhost:3001"
    : envBaseUrl;


type ApiConfig = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
};

type ApiResponse<T = any> = {
  data: T;
  status: number;
  headers: Record<string, string>;
  url: string;
};

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return baseUrl && baseUrl !== "/" ? `${baseUrl}${normalizedPath}` : normalizedPath;
};


const request = async <T = any>(
  method: "get" | "post" | "patch",
  path: string,
  data?: any,
  config: ApiConfig = {}
): Promise<ApiResponse<T>> => {
  const options = {
    url: buildUrl(path),
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    },
    params: config.params || {},
    data,
  };

  const response =
    method === "get"
      ? await CapacitorHttp.get(options)
      : method === "post"
        ? await CapacitorHttp.post(options)
        : await CapacitorHttp.patch(options);

  if (response.status >= 400) {
    throw {
      response,
      message: response.data?.error || response.data?.message || `Request failed with status ${response.status}`,
    };
  }

  return response as ApiResponse<T>;
};

const api = {
  get: <T = any>(path: string, config?: ApiConfig) => request<T>("get", path, undefined, config),
  post: <T = any>(path: string, data?: any, config?: ApiConfig) => request<T>("post", path, data, config),
  patch: <T = any>(path: string, data?: any, config?: ApiConfig) => request<T>("patch", path, data, config),
};

const getStoredUser = () => JSON.parse(localStorage.getItem("user") || "{}")

const getAuthHeaders = () => {
  const user = getStoredUser()
  const token = user.accessToken || user.access_token || user.token

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getAccessToken = () => {
  const user = getStoredUser()
  return user.accessToken || user.access_token || user.token || ""
}

const getErrorData = (err: any) => {
  const data = err?.response?.data
  if (data) {
    const error = typeof data.error === "object" ? data.error : undefined
    return {
      ...data,
      error: error?.code || data.error,
      message: error?.message || data.message || err?.message,
    }
  }
  return { error: err?.message ?? "Network error", message: err?.message ?? "Network error" }
}

const unwrapData = <T,>(response: ApiResponse<{ data: T } | T>): T => {
  const payload = response.data
  return payload && typeof payload === "object" && "data" in payload
    ? (payload.data as T)
    : (payload as T)
}

export type PublicCompanyConfig = {
  host?: string;
  config_version: number;
  config_updated_at: string;
  companySettings?: {
    company_id: string;
    block_sales_after_departure?: boolean;
    allow_sales_without_assignment?: boolean;
    ticket_terms?: string | null;
    domain_prod?: string | null;
    domain_dev?: string | null;
    updated_by?: string | null;
    updated_at?: string;
  } | null;
  companyLineConfig: {
    id: string;
    company_id: string;
    channel_id: string | null;
    liff_id: string | null;
    callback_url: string | null;
    provider_id: string | null;
    is_active: boolean;
    has_channel_secret: boolean;
  } | null;
  branding?: {
    appTitle?: string | null;
    appShortName?: string | null;
    brandName?: string | null;
    logoUrl?: string | null;
    logoDarkUrl?: string | null;
    faviconUrl?: string | null;
    loginBackgroundUrl?: string | null;
  } | null;
  theme?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    config?: Record<string, unknown> | null;
  } | null;
};

export const getConfig = async (): Promise<PublicCompanyConfig> => {
  const configUrl = import.meta.env.VITE_CONFIG_API_URL?.trim() || "http://localhost:3001/api/v1/config";
  const response = await axios.get<{ data: PublicCompanyConfig }>(configUrl);
  const config = response.data?.data;

  if (!config) throw new Error("Config API returned an invalid response");

  return config;
};
export const login = async (body: any) => {
  return await api.post("/api/v1/customer/auth/login", body)
    .then((res) => {
      console.log("login res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("login err ", err)
      return getErrorData(err)
    })
}

export const register = async (body: any) => {
  return await api.post("/api/v1/customer/auth/register", body)
    .then((res) => {
      console.log("register res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("register err ", err)
      return getErrorData(err)
    })
}

export const loginWithLine = async (body: { lineAccessToken: string }) => {
  return await api.post("/api/v1/customer/auth/line", body)
    .then((res) => {
      console.log("loginWithLine res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("loginWithLine err ", err)
      return getErrorData(err)
    })
}

export const refreshToken = async (body: { refreshToken: string }) => {
  return await api.post("/api/v1/customer/auth/refresh", body)
    .then((res) => {
      console.log("refreshToken res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("refreshToken err ", err)
      return getErrorData(err)
    })
}

export const logout = async () => {
  const user = getStoredUser()
  return await api.post("/api/v1/customer/auth/logout", {
    refreshToken: user.refreshToken
  }, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("logout res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("logout err ", err)
      return getErrorData(err)
    })
}

// curl -X 'GET' \
  // 'http://localhost:3001/api/v1/customer/payment-methods' \
  // -H 'accept: */*'
export const paymentMethods=async()=>{

  return await api.get("/api/v1/customer/payment-methods").then((res)=>{
    console.log("payment-methods  res ",res)
    return res.data?.data
  }).catch(err =>{
    console.log("payment-methods err ",err)
    return [
      {
      "group": "qr_payment",
      "groupName": "QR PromptPay",
      "methods": [
        { 
          "source": "promptpay",
          "group": "qr_payment",
          "groupName": "QR PromptPay",
          "name": "QR PromptPay",
          "fee": 0,
          "onlineEnabled": true,
          "offlineEnabled": false
        }
      ]
    },
    ]
  })
}

export type NewBooking = {
  "tripId": string,
  "travelDate": string,
  "originProvinceId": string,
  "destinationProvinceId": string,
  "boardingPointId": string,
  "dropOffPointId": string,
  "paymentMethod"?: "promptpay" | "alipay" | "wechat_pay_mpm",
  "useStamp": boolean,
  "passengers": {
    "seatId": string,
    "seatNumber": string,
    "fullName": string,
    "thaiId": string,
    "phone": string,
    "passengerType": string
  }[],
  "promoCode"?: string
  "omiseChargeId"?: string
  "addOns":any[]
}
export const createBooking = async (body: NewBooking) => {
  return await api.post("/api/v1/customer/bookings", body, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("bookings res ", res)
      return res.data?.data
    })
    .catch((err) => {
      console.log("bookings err ", err)
      return getErrorData(err)
    })
}
export type BookingPayment= {
  bookingId: string
  paymentMethod: "promptpay" | "alipay" | "wechat_pay_mpm" 
}
export const createBookingPayment=async(body:BookingPayment)=>{
  return await api.post("/api/v1/customer/bookings/" + body.bookingId + "/payment", {paymentMethod: body.paymentMethod} ,{
    headers: getAuthHeaders()
  })
  .then((res)=>{
    console.log("booking res ",res)
    return res.data.data
  }).catch((err)=>{
    console.log("err ",err)
    return null
  })
}
// curl '/api/trips/{id}/driver-location' \
//   --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

export const getDriverLocation = async (tripId: string) => {
  return await api.get(`/api/trips/${tripId}/driver-location`, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getDriverLocation res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("getDriverLocation err ", err)
      return getErrorData(err)
    })
}
 
export const updatePassengerLocation = async (tripId: string, body: { latitude: number, longitude: number, accuracy_m: number }) => {
  return await api.post(`/api/trips/${tripId}/passenger-location`, body, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("updatePassengerLocation res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("updatePassengerLocation err ", err)
      return getErrorData(err)
    })
}

export type PromotionFilters = {
  memberOnly?: boolean;
  visibility?: string;
  routeId?: string;
  dayOfWeek?: string;
  time?: string;
  phone?: string;
  limit?: number;
  offset?: number;
};

export const getPromotionsTrip = async (params?: PromotionFilters) => {
  return await api.get(`/api/v1/customer/promotions`, {
    params: params || {} ,
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getPromotions res ", res)
      return unwrapData<any[]>(res)
    })
    .catch((err) => {
      console.log("getPromotions err ", err)
      return getErrorData(err)
    })
}


export const getAddons = async (id: string,page: number, limit: number) => {
  // curl '/api/trips/{id}/add-ons'
  return api.get(`/api/v1/customer/trips/${id}/add-ons`, {
    params: { page, limit },
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getAddons res ", res)
      return res.data?.data
    })
    .catch((err) => {
      console.log("getAddons err ", err)
      return getErrorData(err)
    })
}

export const bookingList = () => {
  return api.get(`/api/v1/customer/bookings`, { 
    headers:   getAuthHeaders()
  })
    .then((res) => {
      console.log("bookingList res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("bookingList err ", err)
      return getErrorData(err)
    })
}

export const bookingDetail = async ({ id, token }: any) => {
  return await api.get(`/api/v1/customer/bookings/${id}`, { 
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("bookingDetail res ", res)
      return res.data?.data
    })
    .catch((err) => {
      console.log("bookingDetail err ", err)
      return getErrorData(err)
    })
}
export const tripSeatsLayout = async (tripid: string) => {
  // Customer booking API returns the payload under `data`.
  return await api.get(`/api/v1/customer/trips/${tripid}/seats`)
    .then((res) => {
      console.log("tripSeatsLayout res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("tripSeatsLayout err ", err)
      return getErrorData(err)
    })
}

export const getTripDetail = async (tripid: string) => {
  return await api.get(`/api/v1/customer/trips/${tripid}`)
    .then((res) => {
      console.log("tripDetail res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("tripDetail err ", err)
      return getErrorData(err)
    })
}

export const getBusLicensePlate=async()=>{
  return await api.get("/api/v1/customer/buses/registrations" ,{
    headers:   getAuthHeaders()
  })
  .then(res =>{
    return res.data
  })
  .catch(err=>{
    console.log("err ",err)
    return []
  })
}
///api/v1/passenger-types
export const getPassengerType= async()=>{
  return await api.get("/api/v1/customer/passenger-types",{
    params:{
      requiresDocument:false,
      status:"active" ,
      limit:50,
      offset:0
    }
  }).then(
    (res) =>{
      console.log("getPassengerType res ",res)
      return res.data?.data
    }
  ).catch(err =>{
    console.log("getPassengerType err ",err)
    return [{
        "id": "be2a30d0-ef13-491a-89fc-58ff3a9cf537",
        "code": "adult",
        "name": "ทั่วไป",
        "nameEn": null,
        "description": "ผู้โดยสารทั่วไป",
        "requiresDocument": false,
        "sortOrder": 30,
        "status": "active"
    }]
  })
}

export const chargeWechatPayment = async (amount: any) => {
  return await api.post("/api/payment/wechat-pay", {
    amount: amount
  }, {
    params: { amount }
  })
    .then((res) => {
      console.log("chargeWechatPayment res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("chargeWechatPayment err ", err)
      return getErrorData(err)
    })
}

export const chargeAlipayPayment = async (amount: any) => {
  return await api.post("/api/payment/alipay-qr", {
    amount: amount
  }, {
    params: { amount }
  })
    .then((res) => {
      console.log("chargeAlipayPayment res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("chargeAliPayment err ", err)
      return getErrorData(err)
    })
}

// export const chargeQrPayment = async (amount: any) => {
//   return await api.post("/api/payment/qr", {
//     amount: amount
//   }, {
//     params: { amount }
//   })
//     .then((res) => {
//       console.log("chargeQrPayment res ", res)
//       return res.data
//     })
//     .catch((err) => {
//       console.log("chargeQrPayment err ", err)
//       return getErrorData(err)
//     })
// }

export const paymentStatus = async (bookingId: string) => { 
  return await api.get(`/api/v1/customer/bookings/${bookingId}/payment`, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("paymentStatus res ", res)
      return res.data?.data
    })
    .catch((err) => {
      console.log("paymentStatus err ", err)
      return getErrorData(err)
    })
}

export const userPoints = async () => {
  return await api.get(`/api/v1/customer/points`, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("userPoints res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("userPoints err ", err)
      return getErrorData(err)
    })
}

export const getpointHistory = async (params?: {
  from?: string;
  to?: string;
  type?: "earn" | "redeem";
  limit?: number;
  offset?: number;
}) => {
  return await api.get(`/api/v1/customer/points/history`, {
    headers: getAuthHeaders(),
    params: params || {},
  })
    .then((res) => {
      console.log("getpointHistory res ", res)
      return unwrapData<any[]>(res)
    })
    .catch((err) => {
      console.log("getpointHistory err ", err)
      return getErrorData(err)
    })
}

export const getWalletPoint = async (params?: { limit?: number; offset?: number }) => {
  return await api.get(`/api/v1/customer/wallet`, {
    headers: getAuthHeaders(),
    params: params || {},
  })
    .then((res) => {
      console.log("getWalletPoint res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("getWalletPoint err ", err)
      return getErrorData(err)
    })
}

export const getUserMe = async () => {
  return await api.get(`/api/v1/customer/me`, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getUserMe res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("getUserMe err ", err)
      return getErrorData(err)
    })
}

export type CustomerProfileUpdate = {
  fullName?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  idType?: string;
  idNumber?: string;
  expiryDate?: string;
};

export const updateMyProfile = async (body: CustomerProfileUpdate) => {
  return await api.patch(`/api/v1/customer/me`, body, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("updateMyProfile res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("updateMyProfile err ", err)
      return getErrorData(err)
    })
}
 
export const cancelBooking = (bookingId: string) => {
  return api.patch(`/api/bookings/${bookingId}/cancel`, {}, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("cancelBooking res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("cancelCharge err ", err)
      return getErrorData(err)
    })
}

export const cancelCharge = (chargeId: string) => {
  return api.post(`/api/payment/cancel/${chargeId}`, {}, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("cancelCharge res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("cancelCharge err ", err)
      return getErrorData(err)
    })
}

export const checkinSelf = async (body: { ticketNumber: string, qrCode: string }) => {
  return await api.post("/api/checkin/self", body, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("checkinSelf res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("checkinSelf err ", err)
      return getErrorData(err)
    })
}

interface ComplaintPayload {
  reporterPhone:string,
  complaintText:string,
  vehiclePlate?:string,tripId?:string,bookingId?:string,seatCode?:string,attachments?:string[]}
export const createComplaint = async (body: ComplaintPayload) => {
  return await api.post("/api/v1/customer/complaints", body, {
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("createComplaint res ", res);
      return res.data;
    })
    .catch((err) => {
      console.log("createComplaint err ", err);
      return getErrorData(err);
    });
};

export const getPromotions = async (params?: PromotionFilters) => {
  return await api.get(`/api/v1/customer/promotions`, {
    params: params || {}
  })
    .then((res) => {
      console.log("getPromotions res ", res)
      return unwrapData<any[]>(res)
    })
    .catch((err) => {
      console.log("getPromotions err ", err)
      return getErrorData(err)
    })
}

export const getPromotionDetail = async (id: string) => {
  return await api.get(`/api/v1/customer/promotions/${id}`)
    .then((res) => {
      console.log("getPromotionDetail res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("getPromotionDetail err ", err)
      return getErrorData(err)
    })
}

 
 export const validatePromo = async (
  promoCode: string,
  tripId: string,
  options?: { passengerCount?: number; addOns?: { productId: string; quantity: number }[] },
) => {
  return await api.post(`/api/v1/customer/promotions/validate`, {
    promoCode,
    tripId,
    ...options,
  }, {
    headers: getAuthHeaders(),
  })
    .then((res) => {
      console.log("validatePromo res ", res)
      return unwrapData(res)
    })
    .catch((err) => {
      console.log("validatePromo err ", err)
      return getErrorData(err)
    })
}

export const getProvinces = async (routeId?: string) => {
  return await api.get(`/api/v1/customer/provinces`, {
    params: routeId ? { routeId } : {} ,
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getProvinces res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("getProvinces err ", err)
      return getErrorData(err)
    })
}

export const getRoutes = async () => {
  return await api.get(`/api/routes`)
    .then((res) => {
      console.log("getRoutes res ", res)
      return (res.data || []).map((route: any) => ({
        ...route,
        g_route_id: route.id,
      }))
    })
    .catch((err) => {
      console.log("getRoutes err ", err)
      return getErrorData(err)
    })
}

const normalizeTrip = (trip: any) => ({
  ...trip,
  route_id: {
    id: trip.routeId,
    origin_id: trip.originProvinceId,
    destination_id: trip.destinationProvinceId,
    origin: trip.origin,
    destination: trip.destination,
  },
  routeId: trip.routeId,
  originProvinceId: trip.originProvinceId,
  destinationProvinceId: trip.destinationProvinceId,
  departure_time: trip.departureTime,
  arrival_time: trip.arrivalTime,
  available_seats: trip.availableSeats,
  total_seats: trip.totalSeats,
  trip_type: trip.tripType,
  bus_type_id: {
    id: trip.busType,
    name: trip.busType,
  },
})

export const searchTrips = async (body: {
  routeId?: string;
  originProvinceId: string;
  destinationProvinceId: string;
  date?: string;
  passengerCount?: number;
  sort?: "asc" | "desc";
}) => {
  return await api.post(`/api/v1/customer/trips/search`, body)
    .then((res) => {
      console.log("searchTrips res ", res)
      return (res.data?.data || []).map(normalizeTrip)
    })
    .catch((err) => {
      console.log("searchTrips err ", err)
      return getErrorData(err)
    })
}

export const getFaqs = async (filters?: string | {
  category?: string;
  locale?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = typeof filters === "string"
    ? { category: filters }
    : filters || {};

  return await api.get(`/api/v1/customer/faqs`, {
    params
  })
    .then((res) => {
      console.log("getFaqs res ", res)
      return unwrapData<any[]>(res)
    })
    .catch((err) => {
      console.log("getFaqs err ", err)
      return getErrorData(err)
    })
}
// curl /api/boarding-points
export const getBoardingPoints = async (provinceId?: string) => {
  return await api.get(`/api/boarding-points`, {
    params: provinceId ? { provinceId } : {}
  })
    .then((res) => {
      console.log("getBoardingPoints res ", res)
      return res.data
    })
    .catch((err) => {
      console.log("getBoardingPoints err ", err)
      return getErrorData(err)
    })
}
export const getBusStops = async (routeId: string, routeMeta?: { originProvinceId?: string; destinationProvinceId?: string; origin?: string; destination?: string }) => {
  return await api.get(`/api/v1/customer/bus-stops`, {
    params: { routeId },
    headers: getAuthHeaders()
  })
    .then((res) => {
      console.log("getBusStops res ", res)
      return (res.data?.data || []).map((stop: any) => ({
        ...stop,
        order: stop.stopOrder,
        route_id: {
          id: stop.routeId,
          origin_id: routeMeta?.originProvinceId,
          destination_id: routeMeta?.destinationProvinceId,
          origin: routeMeta?.origin,
          destination: routeMeta?.destination,
        },
      }))
    })
    .catch((err) => {
      console.log("getBusStops err ", err)
      return getErrorData(err)
    })
}

// // ─────────────────────────────────────────────
// // Axios Instance
// // ─────────────────────────────────────────────
// const apiUrl = `${baseUrl}/api`;

// // ─────────────────────────────────────────────
// // Interfaces — Route & Geography
// // ─────────────────────────────────────────────
export interface Route {
  id: string;
  name: string;
  nameEn: string;
}

export interface Province {
  id: string;
  name: string;
  nameEn: string;
  routeIds: string[];
}

export interface BoardingPoint {
  id: string;
  name: string;
  nameEn: string;
  provinceId: string;
}

// // ─────────────────────────────────────────────
// // Interfaces — Trip & Search
// // ─────────────────────────────────────────────
// export interface TripSearchParams {
//   routeId?: string;
//   originProvinceId: string;
//   destinationProvinceId: string;
//   date: string;
//   passengerCount?: number;
// }

// export interface Trip {
//   id: string;
//   route_id: string;
//   origin_province_id: string;
//   destination_province_id: string;
//   departure_time: string;
//   arrival_time: string;
//   price: number;
//   available_seats: number;
//   total_seats: number;
//   trip_type: string;
//   bus_type_id: {
//     id: string;
//     name: string;
//   };
//   date: string;
//   origin: string;
//   destination: string;
//   fare: number;
// }
export interface Trip {
    "trip": {
        "id":  string
        "routeId": string
        "serviceDate": string
        "departureTime": string
        "arrivalTime":string
        "vehicleType": string
        "status": string
        "routeName": string
        "originStationId": string
        "destinationStationId":string
        "default_amount": number
    },
    "stops":  {
      "stationId": string
            "name": string
            "stopOrder":  number
            "latitude": string
            "longitude":string
    }[]
    "passengerTypes":{
            "code":string
            "name": string
            "description": string
        }[]
    "fares":{
            "origin_station_id": string
            "destination_station_id": string
            "passenger_type": string
            "amount": string | number
            "name": string ,
            "description":string
     }[]
    "salesSettings": {
        "blockSalesAfterDeparture":  boolean
        "allowSalesWithoutAssignment": boolean,
        "ticketTerms": string
        fee: number
    }
}

// // ─────────────────────────────────────────────
// // Interfaces — Seat
// // ─────────────────────────────────────────────
export type SeatStatus = "available" | "booked" | "unavailable" | "selected";

export interface Seat {
  id: string;
  number: string;
  row: number;
  col: number;
  status: SeatStatus;
  floor: number;
  type?: string;
}

export interface BusLayout {
  id: string;
  name: string;
  rows: (string | null)[][];
}

export interface TripSeatsResponse {
  tripId: string;
  layout: BusLayout;
  seats: Seat[];
}

// // ─────────────────────────────────────────────
// // Interfaces — Booking
// // ─────────────────────────────────────────────
// export interface PassengerPayload {
//   seatId: string;
//   seatNumber: string;
//   fullName: string;
//   thaiId: string;
//   phone: string;
//   passengerType: "child" | "male" | "female" | "monk";
// }

// export interface CreateBookingPayload {
//   tripId: string;
//   travelDate: string;
//   originProvinceId: string;
//   destinationProvinceId: string;
//   boardingPointId: string;
//   dropOffPointId: string;
//   passengers: PassengerPayload[];
//   promoCode?: string;
// }

// export interface BookingListItem {
//   id: string;
//   origin: string;
//   destination: string;
//   date: string;
//   departureTime: string;
//   arrivalTime: string;
//   seats: string[];
//   status: "upcoming" | "completed" | "cancelled";
//   total: number;
// }

// export interface BookingDetail extends BookingListItem {
//   boardingPoint: string;
//   dropOffPoint: string;
//   busType: string;
//   tripType: string;
//   busPlate: string;
//   routeName: string;
//   paymentMethod: string;
//   promoCode: string;
//   discount: number;
//   pricePerSeat: number;
//   bookingDate: string;
//   passengers: {
//     fullName: string;
//     thaiId: string;
//     phone: string;
//     seatNumber: string;
//     passengerType: string;
//   }[];
// }

// export interface CreateBookingResponse {
//   bookingId: string;
//   status: string;
//   total: number;
// }

// // ─────────────────────────────────────────────
// // Interfaces — Promotion
// // ─────────────────────────────────────────────
export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  promoCode: string;
  discountPercent: number;
  discountAmount: number;
  remainingQuota: number;
  expiryDate: string;
  validityDays: number;
  memberOnly: boolean;
}

// export interface ValidatePromoResponse {
//   valid: boolean;
//   discountPercent: number;
//   discountAmount: number;
//   message?: string;
// }

// // ─────────────────────────────────────────────
// // Interfaces — Payment
// // ─────────────────────────────────────────────
export type PaymentSourceType = "promptpay" | "alipay" | "wechat_pay_mpm";

export interface CreateChargePayload {
  amount: number;
  sourceType: PaymentSourceType;
  bookingId?: string;
}

export interface CreateChargeResponse {
  chargeId: string;
  qrCodeUrl: string;
  status: string;
  expiresAt: string;
}
 
const sourceTypeToPath = (sourceType: PaymentSourceType) => {
  if (sourceType === "alipay") return "alipay-qr";
  if (sourceType === "wechat_pay_mpm") return "wechat-pay";
  return "qr"; // promptpay
};

// /** POST /payment/:type — สร้าง QR charge สำหรับชำระเงิน */
export const createCharge = (total: number, sourceType: PaymentSourceType, bookingDetail: any) =>
  api.post<CreateChargeResponse>(
    `/api/payment/${sourceTypeToPath(sourceType)}`,
    bookingDetail,
    { params: { amount: total } }
  );
 
