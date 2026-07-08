import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bus, User, Camera, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getUserMe, updateMyProfile } from "@/services/api";
import { cn } from "@/lib/utils";
import { normalizeOcrText } from "@/lib/ocr";
import Webcam from "react-webcam";
import { useTesseract } from "react-tesseract";
import { Ocr, TextDetections } from '@capacitor-community/image-to-text';
import axios from "axios";
import { t } from "i18next";

const identityDocumentOptions = [
  { value: "id_card", label: "บัตรประชาชน" },
  { value: "passport", label: "หนังสือเดินทาง" },
];

const UpdateProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // const [ocrLoading, setOcrLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam | null>(null);
  const { recognize, error, result, isRecognizing } = useTesseract();
  

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    avatarUrl: "",
    idType: "id_card",
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
          idType: res.idType || "id_card",
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

  const handleScanCard = async () => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      setShowCamera(true);
    } catch (error) {
      console.error("Scan card failed", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปิดกล้องได้",
        variant: "destructive",
      });
    }
  };

  const handleCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast({
        title: "ไม่จับภาพได้",
        description: "ลองเปิดกล้องและถ่ายภาพใหม่อีกครั้ง",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], "document.jpg", { type: blob.type || "image/jpeg" });
      const imageUrl = URL.createObjectURL(file);

      if (!imageUrl) {
        return;
      }

      //ak_1c8ada0da28745c5a8d61f7c18d2fa70
  //     curl -X POST 'https://backend.aksonocr.com/api/v2/ocr' \
  // -H 'X-API-Key: <YOUR_API_KEY>' \
  // -H 'Content-Type: application/json' \
  // -d '{
  //   "model": "AksonOCR-preview",
  //   "tokenConfidence": true,
  //   "document": {
  //     "type": "image_url",
  //     "image_url": "https://example.com/receipt.png"
  //   }
  // }'
    const resp =  await axios.post('https://backend.aksonocr.com/api/v2/ocr', {
        model: "AksonOCR-preview",
        tokenConfidence: true,
        document: {
          type: "image_url",
          image_url: imageUrl
        }
      }, {
        headers: {
          'X-API-Key': 'ak_1c8ada0da28745c5a8d61f7c18d2fa70',
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log("OCR API response:", response.data);
       
        // Process the OCR result here
       
        return response.data
      })
      .catch(error => {
        console.error("OCR API error:", error);
        toast({
          title: "สแกนล้มเหลว",
          description: "ไม่สามารถประมวลผลภาพได้" + JSON.stringify(error),
          variant: "destructive",
        });
      });
      //  const textDetections = response.data?.textDetections || [];
       toast({
          title: " สแกนสำเร็จ",
          description:  resp.map((detection: any) => detection.text).join(" "),
          variant: "destructive",
        });
        alert(JSON.stringify(resp))
      // await recognize(imageUrl, {
      //   language: "tha+eng",
      //   errorHandler: (err) => console.error("OCR error:", err),
      //   tessedit_ocr_engine_mode: 1,
      //   tessedit_pageseg_mode: 3,
      //   preserve_interword_spaces: 1,
      // });

      // const normalizedText = normalizeOcrText(result);
      // console.log("OCR result:", result);
      // console.log("Normalized OCR text:", normalizedText);

    // const data: TextDetections = await Ocr.detectText({ filename: imageUrl  });
    // for (let detection of data.textDetections) {
    //     console.log(detection.text);
    // }


      // if (normalizedText) {
      //   setForm((prev) => ({ ...prev, idNumber: normalizedText }));
      //   toast({
      //     title: "สแกนสำเร็จ",
      //     description: "ระบบดึงข้อมูลเลขเอกสารจากภาพเรียบร้อยแล้ว",
      //   });
      // } else {
      //   toast({
      //     title: "ไม่สามารถอ่านข้อมูลได้",
      //     description: "ลองถ่ายภาพที่ชัดเจนขึ้นอีกครั้ง",
      //     variant: "destructive",
      //   });
      // }
    } catch (error) {
      console.error("OCR failed", error);
      const message = error instanceof Error ? error.message : "ไม่ทราบสาเหตุ";
      toast({
        title: "สแกนล้มเหลว",
        description: `ไม่สามารถประมวลผลภาพได้: ${message}`,
        variant: "destructive",
      });
    } finally {
      setShowCamera(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateMyProfile(form);
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
              {/* <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL รูปโปรไฟล์</Label>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatarUrl}
                  onChange={handleChange}
                />
              </div> */}
              <div className="space-y-2">
                {/* <Label htmlFor="idType">ประเภทเอกสาร</Label> */}
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
                    onClick={handleScanCard}
                    disabled={isRecognizing}
                    className="shrink-0"
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    {isRecognizing ? t("กำลังสแกน...") : t("สแกนบัตร")}
                  </Button>
                </div>
                <Dialog open={showCamera} onOpenChange={setShowCamera}>
                  <DialogContent className="fixed inset-0 z-50 flex   w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-black p-0" 
                   style={{ height: "80vh", width: "100vw" }}>
                    <div className="flex items-center justify-between px-4 py-3 text-white">
                      <p className="text-sm font-medium">{t("ถ่ายภาพเอกสาร")}</p>
                      <button type="button" onClick={() => setShowCamera(false)} className="rounded-full p-1 hover:bg-white/10">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden bg-black">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "environment" }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="border-t border-white/10 bg-black/90 p-4">
                      <Button type="button" onClick={handleCapture} disabled={isRecognizing} className="w-full">
                        {isRecognizing ? t("กำลังประมวลผล...") : t("ถ่ายภาพ")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">{t("วันหมดอายุเอกสาร")}</Label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={handleChange}
                />
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
    </div>
  );
};

export default UpdateProfile;
