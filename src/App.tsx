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
import ETicketPdfDownload from "./pages/ETicketPdfDownload";
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
import TrackBus from "./pages/TrackBus";
import { getConfig, loginWithLine, refreshToken } from "./services/api";
import { applyPreferences, configToPreferences, getStoredPreferences, storePreferences } from "./lib/preferences";
import { getStoredCompany, storeCompanyConfig } from "./lib/company";

const queryClient = new QueryClient();
const LINE_AUTH_RETRY_KEY = "lineAuthRetryAttempted";
const USER_LOCATION_STORAGE_KEY = "userLocation";
const LIFF_INIT_TIMEOUT_MS = 12_000;

const shouldSkipLiffInit = () => {
  const { protocol } = window.location;
  if (/^\/e-ticket\/[^/]+\/pdf\/?$/.test(window.location.pathname)) return true;
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
    const configPromise = getConfig().then((config) => {
      const storedCompany = getStoredCompany();
      const localVersion = Number(storedCompany?.config_version);
      const remoteVersion = Number(config.config_version);
      const hasLocalVersion = Number.isFinite(localVersion);
      const hasRemoteVersion = Number.isFinite(remoteVersion);
      const shouldUpdateConfig =
        !hasLocalVersion ||
        !hasRemoteVersion ||
        remoteVersion > localVersion;

      if (shouldUpdateConfig) {
        storeCompanyConfig(config);
        const preferences = configToPreferences(config);
        storePreferences(preferences);
        applyPreferences(preferences);
      } else if (!getStoredPreferences()) {
        // Recover preferences if that storage entry was cleared independently.
        const preferences = configToPreferences(storedCompany);
        storePreferences(preferences);
        applyPreferences(preferences);
      }

      return config;
    });

    if (shouldSkipLiffInit()) {
      console.log("Non-LIFF URL detected, skipping LIFF init");
      setIsInitializing(false);
      configPromise.catch((error) => console.error("Config initialization failed", error));
      return;
    }

    // Safety timeout — ถ้า LIFF/API ค้างนาน 12 วิ ให้ปล่อยผ่านไปก่อน
    const safetyTimer = setTimeout(() => {
      console.warn("LIFF init safety timeout reached, releasing loading screen");
      setIsInitializing(false);
    }, 12000);

    const initLiff = async () => {
      try {
        const config = await configPromise;
        console.log("config ",config)
        const lineConfig = config.companyLineConfig;

        if (!lineConfig?.is_active) {
          throw new Error("LINE login is disabled for this company");
        }

        const liffId = lineConfig.liff_id?.trim();
        if (!liffId) {
          throw new Error("LINE LIFF ID is not configured for this company");
        }

        await withTimeout(
          liff.init({ liffId }),
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
          const [initialLogin, profile] = await Promise.all([
            loginWithLine({ lineAccessToken: ltoken }),
            liff.getProfile(),
          ]);
          let reslogin:any = initialLogin;

          console.log("Login and profile fetched", { reslogin, profile });

          if (!reslogin || !reslogin?.accessToken) {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const userObj = JSON.parse(userStr);
              if (userObj.refreshToken) {
                console.log("Trying to refresh token...");
                const refreshRes = await refreshToken({ refreshToken: userObj.refreshToken });
                if (refreshRes && refreshRes.accessToken) {
                  reslogin = refreshRes;
                }
              }
            }
          }

          if (reslogin && reslogin.accessToken) {
            localStorage.setItem("user", JSON.stringify(reslogin));
            localStorage.setItem("userProfile", JSON.stringify(profile));
            sessionStorage.removeItem(LINE_AUTH_RETRY_KEY);
          } else {
            console.error("Backend login failed or returned invalid session", reslogin);
            if (reslogin?.error === "LINE_AUTH_UNAVAILABLE") {
              return;
            }
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
            <Route path="/e-ticket/:bookingref/pdf" element={<ETicketPdfDownload />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/my-tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/promotions/:promoId" element={<PromotionDetail />} /> 
            <Route path="/profile" element={<Profile />} />
            <Route path="/update-profile" element={<UpdateProfile />} />
            <Route path="/points" element={<Points />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search-booking" element={<SearchBooking />} />
            <Route path="/track" element={<TrackBus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
