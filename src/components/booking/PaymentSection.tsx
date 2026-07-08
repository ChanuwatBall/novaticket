import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QrCode, Wallet, ChevronDown, Bus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "i18next";

const eWalletOptions = [
  { value: "wechat_pay_mpm", label: "WeChatPay", sublabel: "QR Code", icon: "/assets/icon/wechat.svg" },
];

const getPassengerMultiplier = (type: string) => {
  switch (type) {
    case "child": return 0.5;
    case "monk": return 0.8;
    default: return 1.0;
  }
};

const PaymentSection = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [eWalletExpanded, setEWalletExpanded] = useState(false);
  const [selectedEWallet, setSelectedEWallet] = useState("");

  const tripPrice = store.selectedTrip?.price ?? 0;
  const subtotal = store.passengers.reduce((sum, p) => {
    return sum + (tripPrice * getPassengerMultiplier(p.passengerType));
  }, 0);
  const totalMealCost = store.mealAddons.reduce((sum, m) => sum + m.items.reduce((s, it) => s + (it.item.price * it.qty), 0), 0);


  const total = Math.max(0, (subtotal + totalMealCost) - store.discount);

  const handlePaymentMethodChange = (value: string) => {
    store.setPaymentMethod(value);
    setEWalletExpanded(value === "wallet");
    if (value !== "wallet") setSelectedEWallet("");
  };

  const isPayable =
    store.paymentMethod === "qr" ||
    (store.paymentMethod === "wallet" && selectedEWallet !== "");

  const setupmeal = async (meals) => {
    console.log(" meals  ", meals)
    let next = []
    if (meals.length > 0) {
      await meals.map(async (m: any) => {
        const items = Object.values(m?.items)
        console.log("items ", items)
        await items?.map((i: any) => {
          console.log("i ", i)
          next = [...next, { addOnId: i?.item?.id, qty: i?.qty }]
        })
      })

      console.log("meals ", next)
    }
    return next
  }
  const handleConfirmPayment = useCallback(async () => {
    const bookingDetail = {
      route: {
        origin: store.originProvinceId?.name,
        destination: store.destinationProvinceId?.name,
        date: store.travelDate,
        time: store.selectedTrip?.departure_time,
        arrive: store.selectedTrip?.arrival_time,
        busType: store.selectedTrip?.bus_type_id?.name,
        boardingPoint: store.boardingPointId?.name,
        dropOffPoint: store.dropOffPointId?.name,
      },
      seat: store.selectedSeats,
      subtotal,
      discount: store.discount,
      total,
    };

    console.log(" ConfirmPayment passengers ", store.passengers)
    console.log(" ConfirmPayment mealAddons ", store.mealAddons)
    const addons = await setupmeal(store.mealAddons)
    const body = {
      tripId: store.selectedTrip?.id,
      travelDate: store.travelDate,
      originProvinceId: store.originProvinceId?.id,
      destinationProvinceId: store.destinationProvinceId?.id,
      boardingPointId: store.boardingPointId?.name,
      dropOffPointId: store.dropOffPointId?.name,
      passengers: store.passengers,
      promoCode: store.promoCode,
      addOns: addons
    };

    const sourceType = store.paymentMethod === "qr" ? "promptpay" : selectedEWallet;
    navigate("/payment/qr", { state: { bookingBody: body, sourceType, total, bookingDetail } });
  }, [navigate, store, total, subtotal, selectedEWallet]);

  return (
    <div className="px-4 space-y-4">
      <h3 className="text-lg font-bold">3. {t("สรุปข้อมูลการจองและชำระเงิน")}</h3>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-primary/10">
            <h4 className="font-bold text-primary flex items-center gap-2">
              <Bus className="h-4 w-4" /> {t("รายละเอียดการเดินทาง")}
            </h4>
            <Badge variant="outline" className="bg-white">{store.selectedTrip?.bus_type_id?.name}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">{t("ต้นทาง")} ({store.originProvinceId?.name})</p>
              <p className="text-[13px] font-bold leading-tight">{store.boardingPointId?.name || t("จุดขึ้นรถหลัก")}</p>
              <p className="text-xs text-primary font-bold">{store.selectedTrip?.departure_time}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">{t("ปลายทาง")} ({store.destinationProvinceId?.name})</p>
              <p className="text-[13px] font-bold leading-tight">{store.dropOffPointId?.name || t("จุดลงรถหลัก")}</p>
              <p className="text-xs text-primary font-bold">{store.selectedTrip?.arrival_time}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-primary/10 space-y-3">
           <div className="space-y-2">
            {store?.mealAddons && (totalMealCost > 0) &&(<span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("รายการอาหารและอื่นๆ")}</span>)}
            {store?.mealAddons && (totalMealCost > 0) && (
              <div className="mt-2 space-y-1">
                {store?.mealAddons.map(addon => addon.items).flat().map(it => (
                  <div key={it.item.id} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{t(it.item.name)} x{it.qty}</span><span className="font-bold text-primary">฿{(it.item.price * it.qty).toLocaleString()}</span></div>
                ))}
                {/* <div className="flex justify-between text-[11px] font-extrabold pt-1 border-t border-primary/20">
                  <span className="text-primary">รวมอาหาร</span>
                  <span className="text-primary">฿{totalMealCost.toLocaleString()}</span>
                </div> */}
              </div>
            )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{t("ผู้โดยสารและที่นั่ง")} ({store.passengers.length} {t("ท่าน")})</span>
              <div className="grid grid-cols-1 gap-2">
                {store.passengers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-primary/5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{p.fullName}</span>
                    </div>
                    <Badge variant="secondary" className="font-black bg-primary text-white hover:bg-primary h-6 px-3">
                      {p.seatNumber}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

           
          </div>

          <div className="pt-3 border-t border-primary/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("ยอดรวม")} ({store.selectedSeats.length} {t("ที่นั่ง")})</span>
              <span className="font-bold">฿{subtotal}</span>
            </div>
            {store.discount > 0 && (
              <div className="flex justify-between text-xs text-primary font-bold">
                <span>{t("ส่วนลดโปรโมชั่น")}</span>
                <span>-฿{store.discount}</span>
              </div>
            )} 
            <div className="flex justify-between items-center pt-2 border-t border-primary/10">
              <span className="font-black text-sm uppercase">{t("รวมที่ต้องชำระ")}</span>
              <span className="text-xl font-black text-primary">฿{total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <label className="text-sm font-bold">{t("เลือกวิธีชำระเงิน")}</label>
        <RadioGroup
          value={store.paymentMethod}
          onValueChange={handlePaymentMethodChange}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="qr" id="qr-flow" />
            <Label htmlFor="qr-flow" className="flex items-center gap-2 cursor-pointer flex-1">
              <QrCode className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{t("QR PromptPay")}</div>
                <div className="text-[10px] text-muted-foreground">{t("สแกนจ่ายผ่าน Mobile Banking")}</div>
              </div>
            </Label>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center space-x-3 p-3 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="wallet" id="wallet-flow" />
              <Label htmlFor="wallet-flow" className="flex items-center gap-2 cursor-pointer flex-1">
                <Wallet className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">{t("E-Wallet")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("ชำระด้วย WeChat Pay")}</div>
                </div>
              </Label>
              {store.paymentMethod === "wallet" && (
                <ChevronDown className={`h-4 w-4 transition-transform ${eWalletExpanded ? 'rotate-180' : ''}`} onClick={() => setEWalletExpanded(!eWalletExpanded)} />
              )}
            </div>

            <AnimatePresence>
              {store.paymentMethod === "wallet" && eWalletExpanded && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t px-3 pb-3 pt-2 bg-slate-50">
                  {eWalletOptions.map(opt => (
                    <button key={opt.value} onClick={() => setSelectedEWallet(opt.value)} className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left ${selectedEWallet === opt.value ? 'border-primary bg-white ring-1 ring-primary' : 'bg-transparent border-transparent'}`}>
                      <img src={opt.icon} className="h-6 w-6" alt="" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </RadioGroup>
      </div>

      <Button onClick={handleConfirmPayment} disabled={!isPayable} className="w-full h-14 text-lg font-bold shadow-lg" size="lg">
        {t("ชำระเงินรวม")} ฿{total}
      </Button>
    </div>
  );
};

export default PaymentSection;
