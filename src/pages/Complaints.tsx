import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, ChevronRight, CheckCircle2, MessageSquare, AlertCircle, Bus } from "lucide-react";
import { bookingList, createComplaint, getBusLicensePlate } from "@/services/api";
import { toast } from "sonner";
import moment from "moment";
import { cn } from "@/lib/utils";
import { t } from "i18next";

type Ticket = {
    "id": string
    "bookingNo":string
    "status":string
    "tripId": string
    "routeName": string
    "serviceDate": string
    "scheduledDeparture": string
    "scheduledArrival": string
    "seatNumbers": string[]
    "totalAmount": number
    "paymentStatus": string
    "createdAt": string
}

const Complaints = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [complaintText, setComplaintText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busPlate, setBusPlate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [caseId, setCaseId] = useState("");
  const [step, setStep] = useState(1); // 1: Select Ticket, 2: Write Complaint, 3: Success
  const [isGeneralComplaint, setIsGeneralComplaint] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [busPlateOptions , setBusPlateOptions] = useState<String[]>([])
  
  // // Mock bus plates - ทะเบียนรถตัวอย่าง
  // const busPlateOptions = [
  //   "ไม่ระบุ",
  //   "ก 1234 กระบี่",
  //   "ก 5678 พิษณุโลก",
  //   "ก 9101 นครสวรรค์",
  //   "ก 1112 อุตรดิตถ์",
  //   "ก 1314 เพชรบูรณ์",
  //   "ก 1516 แพร่",
  //   "ก 1718 น่าน",
  //   "ก 1920 สุโขทัย",
  // ];



  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user?.user?.phone) {
        // setPhoneNumber(user.user.phone.replace(/\D/g, "").slice(0, 10));
      }
    }
  }, []);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await bookingList();
        if (res && res.data) {
          // Filter for paid/confirmed tickets
          const successful = res.data.filter((t: any) => t.paymentStatus === "paid" || t.status === "confirmed");
          setTickets(successful);
        }
      } catch (error) {
        console.error("Error fetching tickets for complaints:", error);
        toast.error("ไม่สามารถดึงข้อมูลการจองได้");
      } finally {
        setLoading(false);
      }
      const plates = await getBusLicensePlate()
      console.log("plates ",plates)
      setBusPlateOptions(plates)
    };
    fetchTickets();
  }, []);

  const handleSubmit = async () => {
    if (!selectedTicket && !isGeneralComplaint) return;

    if (!complaintText.trim()) {
      toast.error("กรุณากรอกรายละเอียดเรื่องที่ต้องการร้องเรียน");
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error("กรุณากรอกเบอร์โทรศัพท์ติดต่อ");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reporterPhone: phoneNumber,
        complaintText: complaintText,
        vehiclePlate: busPlate  || "",
        tripId: selectedTicket?.tripId || null,
        bookingNo: selectedTicket?.bookingNo,
        seatCode: selectedTicket ? selectedTicket.seatNumbers.join(", ") : ""
      };

      const res = await createComplaint(payload);

      if (res?.data?.id) {
        setCaseId(res.data.id);
        setStep(3);
        toast.success("ส่งข้อร้องเรียนเรียบร้อยแล้ว");
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch (error) {
      console.error("Submit complaint error:", error);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BookingLayout
      showSteps={false}
      title={t("แจ้งเรื่องร้องเรียน")}
      navto={() => {
        if (step === 2 || step === 3) {
          setStep(1);
          setIsGeneralComplaint(false);
        } else {
          navigate(-1);
        }
      }}
    >
      <div className="px-4 space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                {t("ขั้นตอนที่ 1: เลือกรายการจอง หรือ เรื่องทั่วไป")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t("กรุณาเลือกลักษณะของปัญหาหรือข้อร้องเรียน")}</p>
            </div>

            <div>
              <Card
                className="cursor-pointer transition-all border-2 border-slate-200 hover:border-primary shadow-sm"
                onClick={() => {
                  setSelectedTicket(null);
                  setIsGeneralComplaint(true);
                  setStep(2);
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-primary">{t("ร้องเรียนเรื่องทั่วไป")}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t("สถานีจำหน่ายตั๋ว, พนักงาน, หรือรถโดยสารที่ไม่ได้ทำการจองบนระบบ")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-4 py-1">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("หรือร้องเรียนจากรายการจอง")}</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <Card
              className="cursor-pointer transition-all border-2 border-slate-200 hover:border-primary shadow-sm"
              onClick={() => setShowTickets(true)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-primary">{t("ร้องเรียนจากรายการจอง")}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t("แจ้งปัญหาการเดินทาง, สภาพรถ, หรือพนักงาน ในรอบที่ท่านเดินทาง")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>

            <Dialog open={showTickets} onOpenChange={setShowTickets}>
              <DialogContent className="max-w-full w-full h-[100dvh] rounded-none flex flex-col gap-0 p-0 border-none shadow-none">
                <DialogHeader className="p-5 pb-3 border-b bg-slate-50/50">
                  <DialogTitle className="text-left font-bold text-lg">{t("เลือกรายการจอง")}</DialogTitle>
                  <DialogDescription className="text-left text-xs">
                    {t("เลือกรายการจองที่ต้องการแจ้งปัญหา หรือข้อร้องเรียน")}
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 overflow-y-auto flex-1 h-full space-y-4">
                  {loading ? (
                    <div className="py-20 text-center text-muted-foreground animate-pulse">{t("กำลังโหลดข้อมูลการจอง...")}</div>
                  ) : tickets.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <MessageSquare className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="font-bold">{t("ไม่พบรายการจอง")}</h3>
                        <p className="text-sm text-muted-foreground">{t("ท่านต้องมีรายการจองที่สำเร็จแล้วจึงจะสามารถแจ้งร้องเรียนได้")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <Card
                          key={ticket.id}
                          className={cn(
                            "cursor-pointer transition-all border-2",
                            selectedTicket?.id === ticket.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-slate-200"
                          )}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">#{ticket.bookingNo}</p>
                                <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
                                  <MapPin className="h-3.5 w-3.5 text-primary" />
                                  {t(ticket?.routeName)}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {ticket?.serviceDate}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {moment(ticket.scheduledDeparture).format("HH:MM DD/MM")}
                              </span>
                              <span>{t("ที่นั่ง")} {ticket?.seatNumbers?.join(", ")}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 pb-24 border-t bg-white mt-auto">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 font-bold"
                      onClick={() => {
                        setShowTickets(false);
                        setSelectedTicket(null);
                      }}
                    >
                      {t("ย้อนกลับ")}
                    </Button>
                    <Button
                      className="flex-1 h-12 font-bold shadow-lg"
                      disabled={!selectedTicket}
                      onClick={() => {
                        setShowTickets(false);
                        setIsGeneralComplaint(false);
                        setStep(2);
                      }}
                    >
                      {t("ถัดไป")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {step === 2 && (selectedTicket || isGeneralComplaint) && (
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                {t("ขั้นตอนที่ 2: รายละเอียดข้อร้องเรียน")}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t("กรุณาระบุรายละเอียดให้ชัดเจนเพื่อให้เจ้าหน้าที่ดำเนินการแก้ไข")}</p>
            </div>

            {selectedTicket && (
              <Card className="bg-slate-50 border-primary/10 overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-primary/10 px-3 py-2 flex justify-between items-center">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">{t("Ticket Info")}</span>
                    <span className="text-[10px] font-bold text-primary/60">#{selectedTicket.bookingNo}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("Route")}</p>
                        <p className="text-sm font-black">{t(selectedTicket?.routeName)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("Date")}</p>
                        <p className="text-sm font-black">{moment(selectedTicket.serviceDate).format('D MMM YYYY')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("Time")}</p>
                        <p className="text-xs font-bold">{moment(selectedTicket.scheduledDeparture).format('D MMM YYYY')} - {moment(selectedTicket.scheduledArrival).format('D MMM YYYY')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("Seats")}</p>
                        <p className="text-xs font-bold text-primary">{selectedTicket.seatNumbers.join(", ")}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-bold text-muted-foreground">{t("ยอดชำระ")}</span>
                      <span className="text-sm font-black text-primary">฿{selectedTicket?.totalAmount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="busPlate" className="text-xs font-bold flex items-center gap-1.5">
                    <Bus className="h-3 w-3" /> {t("ทะเบียนรถ")} {isGeneralComplaint && <span className="text-slate-400 font-normal ml-1">({t("ถ้ามี")})</span>}
                  </Label>
                  <Select value={busPlate} onValueChange={setBusPlate}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder={t("เลือกทะเบียนรถ")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {busPlateOptions.map((plate:any) => (
                        <SelectItem key={plate} value={plate} className="text-sm">
                          {plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs font-bold flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {t("เบอร์โทรศัพท์")}
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder={t("เบอร์โทรติดต่อ")}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    className="h-10 text-sm focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint" className="font-bold text-sm">{t("รายละเอียดเรื่องร้องเรียน")}</Label>
                <Textarea
                  id="complaint"
                  placeholder={t("เช่น บริการพนักงานขับรถ, สภาพรถ, ความล่าช้า ฯลฯ")}
                  className="min-h-[150px] resize-none focus:ring-primary shadow-sm"
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                />
              </div>


            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={() => {
                setStep(1);
                setIsGeneralComplaint(false);
              }}>{t("ย้อนกลับ")}</Button>
              <Button
                className="flex-1 h-12 shadow-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? t("กำลังส่ง...") : t("ส่งข้อร้องเรียน")}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-12 text-center space-y-6">
            <div className="relative">
              <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-in zoom-in">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute top-0 right-1/2 translate-x-12 translate-y-2">
                <div className="h-4 w-4 bg-[hsl(var(--success))] rounded-full animate-ping" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t("ส่งเรื่องเรียบร้อยแล้ว")}</h2>
              <p className="text-sm text-muted-foreground px-8">
                {t("เราได้รับข้อร้องเรียนของท่านแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและติดต่อกลับภายใน 24-48 ชั่วโมง")}
              </p>
            </div>

            {/* <Card className="max-w-xs mx-auto bg-slate-50 border-none shadow-sm">
              <CardContent className="p-4 text-xs">
                <p className="font-bold text-slate-400 mb-2 uppercase tracking-widest text-[9px]">หมายเลขรับเรื่อง</p>
                <p className="text-lg font-black text-primary">{caseId || `CASE-${Math.floor(Math.random() * 900000) + 100000}`}</p>
              </CardContent>
            </Card> */}

            <div className="pt-6 space-y-3">
              <Button
                className="w-full h-12 font-bold shadow-md"
                onClick={() => {
                  setStep(1);
                  setIsGeneralComplaint(false);
                }}
              >
                {t("กลับไปที่หน้าโปรไฟล์")}
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="h-20"></div>
    </BookingLayout>
  );
};

export default Complaints;
