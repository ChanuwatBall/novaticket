import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bus, User, Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getUserMe, updateMyProfile, type CustomerProfileUpdate } from "@/services/api";
import { cn } from "@/lib/utils";
import { getDefaultOCRStatus, handleCardCaptured, maskThaiID, scanPassportOCR, scanThaiIdCardOCR } from "@/lib/OCR/ocr";
import IDCardCamera from "@/lib/OCR/CameraPreview";
import { t } from "i18next";
 
const identityDocumentOptions = [
  { value: "id", label: "บัตรประชาชน" },
  { value: "passport", label: "หนังสือเดินทาง" },
];

const UpdateProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState(getDefaultOCRStatus());
  const [showCamera, setShowCamera] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    avatarUrl: "",
    idType: "id",
    idNumber: "",
    expiryDate: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const res = await getUserMe();
      if (res && res.id) {
        setForm({
          fullName: res.fullName || "",
          phone: res.phone || "",
          email: res.email || "",
          avatarUrl: res.avatarUrl || "",
          idType: res.idType || "id",
          idNumber: res.idNumber || "",
          expiryDate: res.expiryDate || "",
        });
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleCapture = async () => {
  try {
    setOcrLoading(true);
    if (form.idType === "passport") {
      const { passportData } = await scanPassportOCR({
        onProgress: ({ progress, status }) => {
          setOcrProgress(progress);
          setOcrStatus(status);
        },
      });

      if (!passportData.passportNumber) {
        throw new Error("ไม่พบเลขพาสปอร์ต กรุณาถ่ายรูปใหม่ให้ชัดและตรง");
      }

      const fullName = `${passportData.firstName ?? ""} ${passportData.lastName ?? ""}`.trim();

      setForm((prev) => ({
        ...prev,
        idNumber: passportData.passportNumber ?? prev.idNumber,
        fullName: fullName || prev.fullName,
        expiryDate: passportData.expiryDate ?? prev.expiryDate,
      }));

      toast({
        title: "อ่านพาสปอร์ตสำเร็จ",
        description: fullName
          ? `พบเลขพาสปอร์ต ${passportData.passportNumber} (${fullName})`
          : `พบเลขพาสปอร์ต ${passportData.passportNumber}`,
      });
    } else {
      const { cardData } = await scanThaiIdCardOCR({
        onProgress: ({ progress, status }) => {
          setOcrProgress(progress);
          setOcrStatus(status);
        },
      });

      if (!cardData.idNumber) {
        throw new Error("ไม่พบเลขบัตรประชาชน กรุณาถ่ายรูปใหม่ให้ชัดและตรง");
      }

      const fullName = `${cardData.firstName ?? ""} ${cardData.lastName ?? ""}`.trim();

      setForm((prev) => ({
        ...prev,
        idNumber: cardData.idNumber ?? prev.idNumber,
        fullName: fullName || prev.fullName,
        expiryDate: cardData.expiryDate ?? prev.expiryDate,
      }));

      toast({
        title: "อ่านบัตรสำเร็จ",
        description: cardData.firstName
          ? `พบเลขบัตรประชาชน ${maskThaiID(cardData.idNumber)} (${cardData.firstName} ${cardData.lastName})`
          : `พบเลขบัตรประชาชน ${maskThaiID(cardData.idNumber)}`,
      });
    }
  } catch (error) {
    console.error("OCR failed:", error);

    const message =
      error instanceof Error ? error.message : "ไม่ทราบสาเหตุ";

    toast({
      title: "สแกนล้มเหลว",
      description: `ไม่สามารถประมวลผลภาพได้: ${message}`,
      variant: "destructive",
    });
  } finally {
    setOcrLoading(false);
    setOcrProgress(0);
    setOcrStatus(getDefaultOCRStatus());
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CustomerProfileUpdate = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        avatarUrl: form.avatarUrl,
        idType: form.idType,
        idNumber: form.idNumber,
        expiryDate: form.expiryDate,
      };
      const res = await updateMyProfile(payload);
      if (res && res.phone !== "" && res.email !== "") {
        toast({ title: "อัปเดตสำเร็จ!", description: "ข้อมูลโปรไฟล์ของคุณถูกบันทึกแล้ว" });

        // Update local storage to reflect changes immediately in UI components like BottomNav
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.user) {
            userData.user = { ...userData.user, ...form };
            localStorage.setItem("user", JSON.stringify(userData));
          }
        }

        navigate("/profile");
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: res.message || "ไม่สามารถอัปเดตโปรไฟล์ได้ เบอร์โทรศัพท์ หรืออีเมลล์ถูกใช้งานแล้ว",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "โปรดลองอีกครั้งในภายหลัง",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  return ( 
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bus className="h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight">{t("แก้ไขข้อมูลส่วนตัว")}</h1>
        </div>
      </header>
     
      <main className="flex-1 p-4 max-w-lg mx-auto w-full" style={{ paddingBottom: "5rem" }}>
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="relative mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-primary" />
              )}
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                <Camera className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-xl">{t("ข้อมูลส่วนตัว")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("อัปเดตข้อมูลของคุณให้เป็นปัจจุบัน")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4"> 
              <div className="space-y-2"> 
                <select
                  id="idType"
                  name="idType"
                  value={form.idType}
                  onChange={handleChange}
                  className="sr-only"
                  aria-label={t("ประเภทเอกสาร")}
                >
                  {identityDocumentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-md border border-input p-1 bg-muted/30">
                  {identityDocumentOptions.map((option) => {
                    const isActive = form.idType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setForm({ ...form, idType: option.value })}
                        className={cn(
                          "flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              
              <div className="space-y-2">
                <Label htmlFor="idNumber">{form.idType === "passport" ? t("เลขหนังสือเดินทาง") : t("เลขบัตรประชาชน")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="idNumber"
                    name="idNumber"
                    placeholder={form.idType === "passport" ? t("กรอกเลขหนังสือเดินทาง") : t("กรอกเลขบัตรประชาชน")}
                    value={form.idNumber}
                    onChange={handleChange}
                    maxLength={form.idType === "passport" ? 12 : 13}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>  handleCapture() }
                    disabled={ocrLoading}
                    className="shrink-0"
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    {ocrLoading ? t("กำลังสแกน...") : t("สแกนบัตร")}
                  </Button>
                </div> 
              </div> 
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("ชื่อ-นามสกุล")}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder={t("กรอกชื่อ-นามสกุล")}
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="phone">{t("เบอร์โทรศัพท์")}</Label>
                  {!form.phone && (
                    <span className="text-[10px] text-destructive font-bold uppercase animate-pulse">{t("Required")}</span>
                  )}
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="0XX-XXX-XXXX"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className={cn(
                    "transition-all",
                    !form.phone && "border-destructive focus-visible:ring-destructive bg-destructive/5"
                  )}
                />
                {!form.phone && (
                  <p className="text-[10px] text-destructive font-medium">กรุณาใส่เบอร์โทรศัพท์เพื่อใช้ในการยืนยันการจอง</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("อีเมล")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t("กำลังบันทึก...") : t("บันทึกการแก้ไข")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={ocrLoading}>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="space-y-3">
            <h3 className="text-base font-semibold">กำลังสแกนเอกสาร</h3>
            <p className="text-sm text-muted-foreground">{ocrStatus}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
            <p className="text-right text-sm font-medium">{ocrProgress}%</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  ) 
};

export default UpdateProfile;
