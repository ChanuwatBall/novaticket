import { create } from 'zustand';
import type { Trip, Seat } from '@/data/mockData';

export interface PassengerInfo {
  seatId: string;
  seatNumber: string;
  fullName: string;
  thaiId: string;
  phone: string;
  passengerType: 'child' | 'male' | 'female' | 'monk';
}

export interface MealItem {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  category:  string;
  imageUrl: string | null;
  stockLeft: number;
}

export interface MealSelection {
  item: MealItem;
  qty: number;
}

export interface PassengerMeal {
  seatId: string;
  items: MealSelection[];
}

type SelectedProvince = {
  id: any;
  name: string;
  name_en?: string;
  nameEn?: string;
  routeIds?: string[];
};

interface BookingState {
  // Step 1
  routeGroupid: any;
  routeId: any;
  travelDate: any;
  originProvinceId: SelectedProvince | null;
  destinationProvinceId: SelectedProvince | null;
  boardingPointId: any;
  dropOffPointId: any;
  passengerCount: number;

  // Step 2
  selectedTrip: Trip | null;

  // Step 3
  selectedSeats: Seat[];

  // Step 4
  passengers: PassengerInfo[];
  mealAddons: PassengerMeal[];
  promoCode: string;
  discount: number;

  // Step 5
  paymentMethod: any;
  bookingId: any;
  booking_qrcode: string;
  paymentStatus: 'pending' | 'success' | 'failed' | null;
  newBookingId: any;
  bookingReference: any;
  // Actions
  setRouteGroupId: (routeGroupid: any) => void;
  setRoute: (routeId: any) => void;
  setTravelDate: (date: any) => void;
  setOriginProvince: (id: any) => void;
  setDestinationProvince: (id: any) => void;
  setBoardingPoint: (id: any) => void;
  setDropOffPoint: (id: any) => void;
  setPassengerCount: (count: number) => void;
  setSelectedTrip: (trip: Trip) => void;
  setSelectedSeats: (seats: Seat[]) => void;
  setPassengers: (passengers: PassengerInfo[]) => void;
  setMealAddons: (mealAddons: PassengerMeal[]) => void;
  setPromoCode: (code: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: string) => void;
  setBookingId: (id: string) => void;
  setPaymentStatus: (status: 'pending' | 'success' | 'failed' | null) => void;
  setBookingQrcode: (booking_qrcode: string) => void;
  setNewBookingId: (newBookingId: any) => void;
  setBookingReference: (bookingReference: any) => void;
  reset: () => void;
}

const initialState = {
  routeGroupid: "",
  routeId: '',
  travelDate: '',
  originProvinceId: null,
  destinationProvinceId: null,
  boardingPointId: '',
  dropOffPointId: '',
  passengerCount: 1,
  selectedTrip: null,
  selectedSeats: [],
  passengers: [],
  mealAddons: [],
  promoCode: '',
  discount: 0,
  paymentMethod: '',
  bookingId: '',
  booking_qrcode: '',
  paymentStatus: null as 'pending' | 'success' | 'failed' | null,
  newBookingId: '',
  bookingReference: '',
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  setRouteGroupId: (routeGroupid) => set({ routeGroupid }),
  setRoute: (routeId) => set({ routeId }),
  setTravelDate: (travelDate) => set({ travelDate }),
  setOriginProvince: (originProvinceId) => set({ originProvinceId, boardingPointId: '' }),
  setDestinationProvince: (destinationProvinceId) => set({ destinationProvinceId, dropOffPointId: '' }),
  setBoardingPoint: (boardingPointId) => set({ boardingPointId }),
  setDropOffPoint: (dropOffPointId) => set({ dropOffPointId }),
  setPassengerCount: (passengerCount) => set({ passengerCount }),
  setSelectedTrip: (selectedTrip) => set({ selectedTrip, selectedSeats: [], passengers: [], mealAddons: [], discount: 0 }),
  setSelectedSeats: (selectedSeats) => set({ selectedSeats, passengers: [], mealAddons: [] }),
  setPassengers: (passengers) => set({ passengers }),
  setMealAddons: (mealAddons) => set({ mealAddons }),
  setPromoCode: (promoCode) => set({ promoCode }),
  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setBookingId: (bookingId) => set({ bookingId }),
  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),
  setBookingQrcode: (booking_qrcode) => set({ booking_qrcode }),
  setNewBookingId: (newBookingId) => set({ newBookingId }),
  setBookingReference: (bookingReference) => set({ bookingReference }),
  reset: () => set(initialState),
}));
