import { useState, useEffect } from "react";
import liff from "@line/liff";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Bus, Loader2 } from "lucide-react";
import Home from "./pages/Home";
import Ticket from "./pages/Ticket";
import SearchResults from "./pages/SearchResults";
import BookingFlow from "./pages/BookingFlow";
import SeatSelection from "./pages/SeatSelection";
import PassengerInfo from "./pages/PassengerInfo";
import Payment from "./pages/Payment";
import PaymentQR from "./pages/PaymentQR";
import ETicket from "./pages/ETicket";
import Complaints from "./pages/Complaints";
import MyTickets from "./pages/MyTickets";
import TicketDetail from "./pages/TicketDetail";
import Promotions from "./pages/Promotions";
import Profile from "./pages/Profile";
import Points from "./pages/Points";
import Wallet from "./pages/Wallet";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UpdateProfile from "./pages/UpdateProfile";
import SearchBooking from "./pages/SearchBooking";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import PromotionDetail from "./pages/PromotionDetail";
import BusStop from "./pages/BusStop";
import { getPreferences, loginWithLine, refreshToken } from "./services/api";
import { applyPreferences, resolvePreferences, storePreferences } from "./lib/preferences";
import { applyRemoteLanguageResources } from "./i18n/remoteResources";

const queryClient = new QueryClient();
const LINE_AUTH_RETRY_KEY = "lineAuthRetryAttempted";
const USER_LOCATION_STORAGE_KEY = "userLocation";
const LIFF_INIT_TIMEOUT_MS = 12_000;

const shouldSkipLiffInit = () => {
  const { protocol } = window.location;
  return protocol !== "https:" || window.location.href.startsWith("https://lovable.dev");
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string) => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
};

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  const accesslocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        localStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(userLocation));
      },
      (error) => {
        console.warn("Unable to access user location", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      },
    );
  };

  useEffect(() => {
    const initPreferences = async () => {
      const response = await getPreferences();
      const preferences = resolvePreferences(response);

      if (!preferences) {
        console.error("Preferences fetch failed", response);
        return;
      }

      storePreferences(preferences);
      applyRemoteLanguageResources(preferences.languageResources);
      applyPreferences(preferences);
    };

    if (shouldSkipLiffInit()) {
      console.log("Non-LIFF URL detected, skipping LIFF init");
      setIsInitializing(false);
      initPreferences();
      return;
    }

    // Safety timeout — ถ้า LIFF/API ค้างนาน 12 วิ ให้ปล่อยผ่านไปก่อน
    const safetyTimer = setTimeout(() => {
      console.warn("LIFF init safety timeout reached, releasing loading screen");
      setIsInitializing(false);
    }, 12000);

    const initLiff = async () => {
      try {
        await withTimeout(
          liff.init({ liffId: import.meta.env.VITE_LIFF_ID }),
          LIFF_INIT_TIMEOUT_MS,
          "LIFF init",
        );
        console.log("LIFF init succeeded");

        if (!liff.isLoggedIn()) {
          // กำลัง redirect ไป LINE login ไม่ต้องเคลียร์ loading
          liff.login();
          return;
        }

        const ltoken = liff.getAccessToken();
        console.log("ltoken ", ltoken);

        if (!ltoken) {
          console.warn("LIFF is logged in but no access token was returned");
          return;
        }

        try {
          let [reslogin, profile] = await Promise.all([
            loginWithLine({ lineAccessToken: ltoken }),
            liff.getProfile(),
          ]);

          console.log("Login and profile fetched", { reslogin, profile });

          if (!reslogin || !reslogin.token) {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const userObj = JSON.parse(userStr);
              if (userObj.refresh_token) {
                console.log("Trying to refresh token...");
                const refreshRes = await refreshToken({ refresh_token: userObj.refresh_token });
                if (refreshRes && refreshRes.token) {
                  reslogin = refreshRes;
                }
              }
            }
          }

          if (reslogin && reslogin.token) {
            localStorage.setItem("user", JSON.stringify(reslogin));
            localStorage.setItem("userProfile", JSON.stringify(profile));
            sessionStorage.removeItem(LINE_AUTH_RETRY_KEY);
          } else {
            console.error("Backend login failed or returned invalid session", reslogin);
            const alreadyRetried = sessionStorage.getItem(LINE_AUTH_RETRY_KEY) === "true";
            if (!alreadyRetried) {
              sessionStorage.setItem(LINE_AUTH_RETRY_KEY, "true");
              liff.logout();
              liff.login();
              return;
            }
          }
        } catch (apiError) {
          console.error("API error with current token:", apiError);
        }
      } catch (error) {
        console.error("LIFF init / auth error:", error);
      } finally {
        clearTimeout(safetyTimer);
        setIsInitializing(false);
      }
    };

    initLiff();
    initPreferences();
    accesslocation();

    return () => clearTimeout(safetyTimer);
  }, []);

 

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Bus className="h-12 w-12 text-primary animate-bounce mb-4" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-lg font-medium">กำลังเตรียมความพร้อม...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ticket" element={<Ticket />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/booking" element={<BookingFlow />} />
            <Route path="/seats/:id" element={<SeatSelection />} />
            <Route path="/passengers" element={<PassengerInfo />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/qr" element={<PaymentQR />} />
            <Route path="/e-ticket/:bookingref" element={<ETicket />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/my-tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/promotions/:promoId" element={<PromotionDetail />} />
            <Route path="/busstop" element={<BusStop />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/update-profile" element={<UpdateProfile />} />
            <Route path="/points" element={<Points />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search-booking" element={<SearchBooking />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
