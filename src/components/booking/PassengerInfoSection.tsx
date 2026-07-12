import { useState, useEffect } from "react";
import { useBookingStore, type PassengerInfo, type PassengerMeal } from "@/store/bookingStore";
import { getAddons, getPromotions, getPromotionsTrip, getUserMe, userPoints, validatePromo } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tag, Ticket as TicketIcon, Check, User, Coins, Route, UtensilsCrossed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import MealModal from "./MealModal";
import { t } from "i18next";

interface PassengerInfoSectionProps {
  onContinue: () => void;
}

const passengerTypes = [
  { value: "male", label: "ชาย" },
  { value: "female", label: "หญิง" },
  { value: "child", label: "เด็ก" },
  { value: "monk", label: "พระสงฆ์" },
] as const;

const PassengerInfoSection = ({ onContinue }: PassengerInfoSectionProps) => {
  const store = useBookingStore();
  const tripPrice = store.selectedTrip?.price ?? 0;

  const [passengers, setPassengers] = useState<PassengerInfo[]>(() => {
    const user = localStorage.getItem("user");
    const userData = user ? JSON.parse(user) : null;
    
    return store.selectedSeats.map((seat, index) => {
      const existing = store.passengers.find(p => p.seatId === seat.id);
      
      // Auto-fill ผู้โดยสารคนแรกด้วยข้อมูลโปรไฟล์
      if (index === 0 && !existing && userData?.user) {
        return {
          seatId: seat.id,
          seatNumber: seat.number,
          fullName: userData.user.fullName || userData.user.name || "",
          thaiId: "",
          phone: userData.user.phone || "",
          passengerType: "male",
        };
      }
      
      return existing || {
        seatId: seat.id,
        seatNumber: seat.number,
        fullName: "",
        thaiId: "",
        phone: "",
        passengerType: "male",
      };
    });
  });

  const [mealAddons, setMealAddons] = useState<PassengerMeal[]>(store.mealAddons ?? []);
  const [mealModalSeatId, setMealModalSeatId] = useState<string | null>(null);
  const [mealsmenu, setMealsMenu] = useState<any[]>([]);
  const [promoInput, setPromoInput] = useState(store.promoCode);
  const [promoApplied, setPromoApplied] = useState(store.discount > 0);
  const [promoError, setPromoError] = useState("");
  const [applyAllPhone, setApplyAllPhone] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [userPointsValue, setUserPointsValue] = useState<any>({
  "totalPoints": 1,
  "nextRewardAt": 1,
  "rewardValue": 1
});

  const redeemableCoupons = [
    // { id: 'coupon-1', title: 'คูปองส่วนลด 50 บาท', pointsRequired: 200, promoCode: 'PT50', discountAmount: 50 },
    // { id: 'coupon-2', title: 'คูปองส่วนลด 100 บาท', pointsRequired: 500, promoCode: 'PT100', discountAmount: 100 },
  ];

  useEffect(() => {
    const user = localStorage.getItem("user");
    const getpoints = async () => {
        const userpoint = await userPoints(); 
        console.log("User points:", userpoint);
        setUserPointsValue(userpoint);
    }
    getpoints();
    if (user) { 
      const userData = JSON.parse(user);
      console.log("User data from localStorage:", userData);

      getPromotionsTrip({ 
        routeId: store.selectedTrip?.id, 
        phone: userData?.user?.phone,
    } )
      .then(data => {
        const apiPromos = data || [];
        // const routeOrigin = store.selectedTrip?.origin || 'กรุงเทพฯ';
        // const routeDest = store.selectedTrip?.destination || 'นครราชสีมา';
        // const freeRoutePromo = {
        //   id: 'free-route-1',
        //   promoCode: 'FREERIDE10',
        //   title: `ฟรี 1 เที่ยว ${routeOrigin}-${routeDest}`,
        //   description: 'สะสมครบ 10 เที่ยวแล้ว!',
        //   discountAmount: tripPrice,
        //   isRouteReward: true,
        // };
        console.log("Fetched promotions:", apiPromos);
        setPromotions(apiPromos);
      });
    }
   

    getAddons(store.selectedTrip?.id , 1 ,10).then(data => {
      console.log("Fetched meal addons:", data);
      setMealsMenu(data || []);
    })
  }, [store.selectedTrip, tripPrice]);

  useEffect(() => {
    setPassengers((prev) => {
      const user = localStorage.getItem("user");
      const userData = user ? JSON.parse(user) : null;
      const existingMap = new Map(prev.map(p => [p.seatId, p]));
      
      return store.selectedSeats.map((seat, index) => {
        if (existingMap.has(seat.id)) return existingMap.get(seat.id)!;
        const inStore = store.passengers.find(p => p.seatId === seat.id);
        
        // Auto-fill ผู้โดยสารคนแรกด้วยข้อมูลโปรไฟล์
        if (index === 0 && !inStore && userData?.user) {
          return {
            seatId: seat.id,
            seatNumber: seat.number,
            fullName: userData.user.fullName || userData.user.name || "",
            thaiId: "",
            phone: userData.user.phone || "",
            passengerType: "male",
          };
        }
        
        return inStore || { seatId: seat.id, seatNumber: seat.number, fullName: "", thaiId: "", phone: "", passengerType: "male" };
      });
    });
  }, [store.selectedSeats]);

  const updatePassenger = (index: number, field: keyof PassengerInfo, value: string) => {
    setPassengers((prev) => {
      const newPassengers = prev.map((p, i) => (i === index ? { ...p, [field]: value } : p));
      if (index === 0 && field === "phone" && applyAllPhone) {
        return newPassengers.map(p => ({ ...p, phone: value }));
      }
      return newPassengers;
    });
  };

  const getMeal = (seatId: string) => mealAddons.find(m => m.seatId === seatId) ?? null;
  const getMealTotal = (seatId: string) => {
    const m = getMeal(seatId);
    if (!m) return 0;
    return m.items.reduce((s, it) => s + (it.item.price * it.qty), 0);
  };

  const totalMealCost = mealAddons.reduce((sum, m) => sum + m.items.reduce((s, it) => s + (it.item.price * it.qty), 0), 0);

  const calculateSubtotal = () => passengers.length * tripPrice;

  const doApplyPromo = async (code: string) => {
    if (!code) return;
    const redeemed = redeemableCoupons.find(c => c.promoCode === code.toUpperCase());
    if (redeemed) {
      setPromoError(""); setPromoApplied(true);
      store.setPromoCode(code); store.setDiscount(redeemed.discountAmount);
      toast.success("ใช้โค้ดลดจากคูปองพอยท์สำเร็จ!"); return;
    }
    if (code.toUpperCase() === 'FREERIDE10') {
      setPromoError(""); setPromoApplied(true);
      store.setPromoCode(code); store.setDiscount(tripPrice);
      toast.success("ใช้สิทธิ์นั่งฟรี 1 เที่ยวสำเร็จ!"); return;
    }
    const promo: any = await validatePromo(code.toUpperCase(), store.selectedTrip?.id ?? "");
    if (!promo.valid) {
      setPromoError(promo.message); setPromoApplied(false);
      store.setDiscount(0); toast.error(promo.message);
    } else {
      setPromoError(""); setPromoApplied(true);
      store.setPromoCode(code);
      const subtotal = calculateSubtotal();
      const discount = promo.discountPercent > 0 ? Math.round(subtotal * promo.discountPercent / 100) : promo.discountAmount;
      store.setDiscount(discount);
      toast.success("ใช้โค้ดลดสำเร็จ!");
    }
  };

  const applyPromo = () => doApplyPromo(promoInput);

  const handleRedeemCoupon = (coupon: any) => {
    const isAlreadyAdded = promotions.find(p => p.promoCode === coupon.promoCode);
    if (!isAlreadyAdded) {
      setPromotions([{ ...coupon, isRedeemed: true, description: `แลกคูปองด้วย ${coupon.pointsRequired} พอยท์` }, ...promotions]);
    }
    setPromoInput(coupon.promoCode);
    setShowCouponDialog(false);
    toast.success(`${t("แลกคูปอง")} ${coupon.title} ${t("สำเร็จ! ระบบได้เลือกใช้งานอัตโนมัติ")}`);
    doApplyPromo(coupon.promoCode);
  };

  const handleMealConfirm = (meal: PassengerMeal) => {
    setMealAddons(prev => {
      const without = prev.filter(m => m.seatId !== meal.seatId);
      const hasSomething = meal.items && meal.items.length > 0;
      const next = hasSomething ? [...without, meal] : without;
      store.setMealAddons(next);
      return next;
    });
  };

  const allValid = passengers.every(p => p.fullName.trim() && p.phone.trim().length >= 9);

  const handleContinue = () => {
    store.setPassengers(passengers);
    store.setMealAddons(mealAddons);
    onContinue();
  };

  const subtotal = calculateSubtotal();
  const grandTotal = Math.max(0, subtotal + totalMealCost - store.discount);

  const mealModalPassenger = passengers.find(p => p.seatId === mealModalSeatId);

  return (
    <div className="px-4 space-y-4">
      <h3 className="text-lg font-bold">{t("ข้อมูลผู้โดยสาร")}</h3>

      <Accordion type="multiple" defaultValue={passengers.map(p => p.seatId)} className="space-y-3">
        {passengers.map((p, i) => {
          const mealTotal = getMealTotal(p.seatId);
          const meal = getMeal(p.seatId);
          return (
            <AccordionItem key={p.seatId} value={p.seatId} className="border rounded-xl bg-card px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4 text-left">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {t("ผู้โดยสาร")} #{i + 1} {p.fullName && `- ${p.fullName}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">{t("ที่นั่ง")} {p.seatNumber}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto bg-primary/5 text-primary border-primary/20">
                    {t(passengerTypes.find(t => t.value === p.passengerType)?.label)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4 pt-2 border-t border-dashed">
                <div className="space-y-3">
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">{t("ชื่อ-นามสกุล")}</label>
                      <Input placeholder={t("กรอกชื่อ-นามสกุล")} value={p.fullName} onChange={(e) => updatePassenger(i, "fullName", e.target.value)} className="h-11 shadow-sm" />
                    </div>

                    {(i === 0 || !applyAllPhone) && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">{t("เบอร์โทรศัพท์")}</label>
                        <Input placeholder="08X-XXX-XXXX" value={p.phone} onChange={(e) => updatePassenger(i, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-11 shadow-sm" inputMode="tel" />
                      </div>
                    )}

                    {i === 0 && (
                      <div className="flex items-center gap-2 text-xs py-1">
                        <Checkbox id="apply-all" checked={applyAllPhone} onCheckedChange={(c) => {
                          setApplyAllPhone(c as boolean);
                          if (c) setPassengers(prev => prev.map(p => ({ ...p, phone: passengers[0].phone })));
                        }} />
                        <label htmlFor="apply-all" className="cursor-pointer font-medium text-muted-foreground">{t("ใช้เบอร์นี้กับทุกคน")}</label>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">{t("ประเภทผู้โดยสาร")}</label>
                      <Select value={p.passengerType} onValueChange={(v) => updatePassenger(i, "passengerType", v)}>
                        <SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {passengerTypes.map((pt) => <SelectItem key={pt.value} value={pt.value}>{t(pt.label)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Seat price row */}
                  <div className="bg-primary/5 rounded-lg p-2.5 flex justify-between items-center mt-2">
                    <span className="text-[10px] font-bold text-primary uppercase">{t("ราคาที่นั่งนี้")}</span>
                    <span className="text-sm font-bold text-primary">฿{tripPrice.toLocaleString()}</span>
                  </div>

                  {/* Meal addon row */}
                  <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary">{t("อาหารบนรถ")}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-bold border-primary/30 text-primary bg-white hover:bg-primary/5"
                        onClick={() => setMealModalSeatId(p.seatId)}
                      >
                        {meal ? t("เปลี่ยนอาหาร") : t("+ เพิ่มอาหาร")}
                      </Button>
                    </div>
                      {meal && (mealTotal > 0) ? (
                        <div className="mt-2 space-y-1">
                          {meal.items.map(it => (
                            <div key={it.item.id} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{it.item.name} x{it.qty}</span><span className="font-bold text-primary">฿{(it.item.price * it.qty).toLocaleString()}</span></div>
                          ))}
                          <div className="flex justify-between text-[11px] font-extrabold pt-1 border-t border-primary/20">
                            <span className="text-primary">{t("รวมอาหาร")}</span>
                            <span className="text-primary">฿{mealTotal}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-primary/60 mt-1">{t("ยังไม่ได้เลือกอาหาร")}</p>
                      )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0" /> {t("โปรโมชั่นและคูปอง")}
            </label>
            {redeemableCoupons.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 shrink-0" onClick={() => setShowCouponDialog(true)}>
                <Coins className="h-3 w-3 mr-1" /> {t("แลกด้วยพอยท์")}
              </Button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 mb-4 -mx-1 px-1 scrollbar-hide">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                onClick={() => { setPromoInput(promo.promoCode); setPromoError(""); setPromoApplied(false);  }}
                className={`flex-shrink-0 w-48 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${promoInput === promo.promoCode
                  ? (promo.isRedeemed ? "border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-400/20" : promo.isRouteReward ? "border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-400/20" : "border-primary bg-primary/5 shadow-sm")
                  : "border-border hover:border-muted-foreground/30 bg-card"}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className={`p-1 rounded-lg ${promo.isRedeemed ? 'bg-amber-100/50' : promo.isRouteReward ? 'bg-emerald-100/50' : 'bg-primary/10'}`}>
                    {promo.isRedeemed ? <Coins className="h-3 w-3 text-amber-500" /> : promo.isRouteReward ? <Route className="h-3 w-3 text-emerald-500" /> : <TicketIcon className="h-3 w-3 text-primary" />}
                  </div>
                  {promoInput === promo.promoCode && (
                    <Badge className={`h-4 px-1 text-white border-0 ${promo.isRedeemed ? 'bg-amber-500' : promo.isRouteReward ? 'bg-emerald-500' : 'bg-primary'}`}>
                      <Check className="h-2 w-2" />
                    </Badge>
                  )}
                </div>
                <h4 className={`font-bold text-xs truncate ${promo.isRedeemed ? 'text-amber-800' : promo.isRouteReward ? 'text-emerald-800' : ''}`}>{promo.title}</h4>
                <p className={`text-[10px] line-clamp-1 ${promo.isRedeemed ? 'text-amber-700/60 font-medium' : promo.isRouteReward ? 'text-emerald-700/60 font-medium' : 'text-muted-foreground'}`}>{promo.description}</p>
                <div className={`mt-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block ${promo.isRedeemed ? 'bg-amber-100/50 text-amber-600' : promo.isRouteReward ? 'bg-emerald-100/50 text-emerald-600' : 'bg-primary/5 text-primary'}`}>
                  {promo.promoCode}
                </div>
              </div>
            ))}
            {promotions.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center w-full">{t("ไม่มีโปรโมชั่นที่เลือกได้ในขณะนี้")}</p>
            )}
          </div>

          <label className="text-sm font-bold flex items-center gap-1.5 mb-2">{t("หรือระบุรหัสโปรโมชั่น")}</label>
          <div className="flex gap-2">
            <Input placeholder={t("กรอกรหัส")} value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setPromoApplied(false); setPromoError(""); }} className="h-12 flex-1 border-dashed" />
            <Button onClick={applyPromo} variant="outline" className="h-12 px-6">{t("ใช้โค้ด")}</Button>
          </div>
          {promoError && <p className="text-xs text-destructive mt-1">{promoError}</p>}
          {promoApplied && <p className="text-xs text-primary mt-1 font-medium italic">✓ {t("ใช้โค้ดสำเร็จ ลดเพิ่ม")} ฿{store.discount}</p>}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="bg-slate-50 border rounded-xl p-4 space-y-1 text-sm shadow-inner">
        <div className="flex justify-between">
          <span>{t("ราคาสุทธิ")} ({t("รายที่นั่ง")})</span>
          <span>฿{subtotal.toLocaleString()}</span>
        </div>
        {totalMealCost > 0 && (
          <div className="flex justify-between text-primary font-medium">
            <span>{t("ค่าอาหารบนรถ")}</span>
            <span>+฿{totalMealCost.toLocaleString()}</span>
          </div>
        )}
        {store.discount > 0 && (
          <div className="flex justify-between text-primary font-bold">
            <span>{redeemableCoupons.find(c => c.promoCode === promoInput?.toUpperCase()) ? t("ส่วนลดจากคูปองพอยท์") : promoInput?.toUpperCase() === 'FREERIDE10' ? t("สิทธิ์นั่งฟรี 1 เที่ยว") : t("ส่วนลดโปรโมชั่น")}</span>
            <span>-฿{store.discount}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-base pt-2 border-t mt-1">
          <span>{t("รวมยอดที่ต้องชำระ")}</span>
          <span className="text-primary text-lg">฿{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Coupon dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl mx-auto flex flex-col gap-0 p-0 border-none shadow-xl max-h-[80vh]">
          <DialogHeader className="p-5 pb-3 border-b bg-amber-50/50 rounded-t-2xl">
            <DialogTitle className="text-left font-bold text-lg flex items-center gap-2 text-amber-800">
              <Coins className="h-5 w-5 text-amber-500" /> {t("แลกคูปองด้วยพอยท์")}
            </DialogTitle>
            <DialogDescription className="text-left text-xs text-amber-700/70">
              {t("สะสมพอยท์คงเหลือของคุณ")}: <span className="font-bold text-amber-700">
                {userPointsValue?.totalPoints} {t("พอยท์")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 overflow-y-auto space-y-3 bg-slate-50/50 rounded-b-2xl">
            {redeemableCoupons.map(coupon => (
              <div key={coupon.id} className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full shrink-0"><Coins className="h-4 w-4 text-amber-600" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 leading-none mb-1.5">{coupon.title}</h4>
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 inline-block">{t("ใช้")} {coupon.pointsRequired} {t("พอยท์")}</p>
                  </div>
                </div>
                <Button onClick={() => handleRedeemCoupon(coupon)} size="sm" className="bg-amber-500 hover:bg-amber-600 h-8 text-xs font-bold text-white shadow-sm shrink-0">{t("แลกเลย")}</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Modal */}
      {mealModalSeatId && mealModalPassenger && (
        <MealModal
          open={!!mealModalSeatId}
          onClose={() => setMealModalSeatId(null)}
          seatId={mealModalSeatId}
          seatNumber={mealModalPassenger.seatNumber}
          passengerName={mealModalPassenger.fullName}
          initial={getMeal(mealModalSeatId)}
          onConfirm={handleMealConfirm}
          mealsMenu={mealsmenu}
        />
      )}

      <Button onClick={handleContinue} disabled={!allValid} className="w-full h-12 text-base font-bold">
        {t("ยืนยันข้อมูลผู้โดยสาร")}
      </Button>
    </div>
  );
};

export default PassengerInfoSection;
