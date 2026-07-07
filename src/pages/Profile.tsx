import { User, Ticket, Star, Wallet, ChevronRight, Bus, LogIn, UserPlus, LogOut, Search, MessageSquareWarning, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { getUserMe, loginWithLine, logout as apiLogout } from "@/services/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { AppLanguage, LanguageOption } from "@/i18n/resources";
import { getLanguageOptions, LANGUAGE_RESOURCES_UPDATED_EVENT } from "@/i18n/remoteResources";

const menuItems = [
  { label: "ตั๋วของฉัน", icon: Ticket, to: "/my-tickets", key: "tickets" },
  { label: "สะสมแต้ม", icon: Star, to: "/points", key: "points" },
  { label: "ร้องเรียน", icon: MessageSquareWarning, to: "/complaints", key: "complaints" },
  // { label: "กระเป๋าเงิน", icon: Wallet, to: "/wallet", key: "wallet" },
];
type UserMe = {
  "id": string,
  "fullName": string,
  "phone": string,
  "email": string,
  "lineUserId": string,
  "avatarUrl": string,
  "idNumber": string,
  "idType": string,
  "points": number,
  "walletBalance": number,
  "memberSince": string
}
const Profile = () => {
  const { i18n, t } = useTranslation();
  const [userMe, setUserMe] = useState<UserMe | null>(null)
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>(() => getLanguageOptions());


  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshLanguageOptions = () => {
      setLanguageOptions(getLanguageOptions());
    };

    window.addEventListener(LANGUAGE_RESOURCES_UPDATED_EVENT, refreshLanguageOptions);
    i18n.on("languageChanged", refreshLanguageOptions);

    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Try getting fresh data from the server
        const userme = await getUserMe();
        console.log("userme res:", userme)

        if (userme?.error === 'Unauthorized') {
          if (liff.isLoggedIn()) {
            const ltoken = liff.getAccessToken();
            if (!ltoken) return;
            const reslogin = await loginWithLine({ lineAccessToken: ltoken });
            if (reslogin && reslogin.token) {
              localStorage.setItem("user", JSON.stringify(reslogin));
              const refreshedUser = await getUserMe();
              if (refreshedUser && refreshedUser.id) {
                setUserMe(refreshedUser);
                localStorage.setItem("user", JSON.stringify({ ...reslogin, user: refreshedUser }));
              }
              return;
            }
          }
          return;
        }

        if (userme && userme.id) {
          setUserMe(userme);
          // Sync back to localStorage for other components
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...existingUser, user: userme }));
        } else {
          // Fallback to localStorage if server fails
          const storedUser = localStorage.getItem("user");
          if (storedUser && storedUser !== "undefined") {
            const parsedToken = JSON.parse(storedUser);
            if (parsedToken && parsedToken.user) {
              setUserMe(parsedToken.user);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    return () => {
      window.removeEventListener(LANGUAGE_RESOURCES_UPDATED_EVENT, refreshLanguageOptions);
      i18n.off("languageChanged", refreshLanguageOptions);
    };
  }, [i18n]);

  const logout = async () => {
    await apiLogout()
    liff.logout()
    localStorage.removeItem("user")
    setUserMe(null)
  }

  const changeLanguage = (language: AppLanguage) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <Bus className="h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight">Nova Express</h1>
        </Link>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-3">
            {
              userMe && userMe?.avatarUrl ? (
                <img src={userMe?.avatarUrl} alt="avatar" className="h-30 w-30 rounded-full" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )
            }
          </div>

          <h2 className="text-lg font-bold">
            {
              userMe && userMe?.fullName ? userMe?.fullName : t("ผู้ใช้ทั่วไป")
            }
          </h2>
          <p className="text-sm text-muted-foreground">{userMe ? userMe.phone : t("ยังไม่ได้เข้าสู่ระบบ")}</p>
          <div className="flex gap-3 mt-4 w-full max-w-xs">
            {
              !userMe && <Button asChild className="flex-1" size="lg">
                <Link to="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  {t("เข้าสู่ระบบ")}
                </Link>
              </Button>
            }
            {
              !userMe && <Button asChild variant="outline" className="flex-1" size="lg">
                <Link to="/register">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("ลงทะเบียน")}
                </Link>
              </Button>
            }
            {
              userMe &&
              <Button className="flex-1" size="lg" onClick={() => {
                logout()
              }}>
                <LogOut className="h-4 w-4 mr-2" />
                {t("ออกจากระบบ")}
              </Button>
            }
          </div>
        </div>

        {/* Menu */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {/* {!userMe && (
              <>
                <Link
                  to="/ticket"
                  className="flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors text-primary"
                >
                  <div className="flex items-center gap-3">
                    <Bus className="h-5 w-5" />
                    <span className="font-medium">ค้นหาตั๋ว</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/search-booking"
                  className="flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors text-primary"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5" />
                    <span className="font-medium">ค้นหาตั๋วที่จองแล้ว (Guest)</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            )} */}
            {menuItems.map(({ label, icon: Icon, to, key }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t(label)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {key === "points" && userMe && (
                    <Badge variant="secondary" className="font-semibold">
                      {userMe.points} {t("แต้ม")}
                    </Badge>
                  )}
                  {key === "wallet" && userMe && (
                    <Badge variant="secondary" className="font-semibold">
                      ฿{userMe.walletBalance.toLocaleString()}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Languages className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{t("ตั้งค่าภาษา")}</span>
                  <span className="text-xs text-muted-foreground">Language</span>
                </div>
              </div>
              <Select value={i18n.language} onValueChange={(value) => changeLanguage(value as AppLanguage)}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder={t("ภาษา")} />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userMe && (
              <Link
                to="/update-profile"
                className="flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <User className="h-5 w-5 text-muted-foreground" />
                    {!userMe.phone && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("font-medium", !userMe.phone && "text-destructive")}>{t("อัปเดตข้อมูลโปรไฟล์")}</span>
                    {!userMe.phone && (
                      <span className="text-[10px] text-destructive/80 font-bold">{t("กรุณาเพิ่มเบอร์โทรศัพท์")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!userMe.phone && <Badge variant="destructive" className="text-[9px] px-1.5 font-black uppercase tracking-tighter">Required</Badge>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
