import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import PageTransition from "@/components/PageTransition";
import { useBookingStore } from "@/store/bookingStore";
import { provinces, boardingPoints } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QrCode, Wallet, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const eWalletOptions = [
  // { value: "alipay", label: "AliPay", sublabel: "QR Code", icon: "🅰️" },
  { value: "wechat_pay_mpm", label: "WeChatPay", sublabel: "QR Code", icon: "/assets/icon/wechat.svg" },
];

const PaymentPage = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [eWalletExpanded, setEWalletExpanded] = useState(false);
  const [selectedEWallet, setSelectedEWallet] = useState("");

  const tripPrice = store.selectedTrip?.price ?? 0;
  const subtotal = tripPrice * store.selectedSeats.length;
  const total = Math.max(0, subtotal - store.discount);

  const originName = store.originProvinceId?.name ?? "";
  const destName = store.destinationProvinceId?.name ?? "";
  const boardingName = store.boardingPointId.name ?? "";
  const dropOffName = store.dropOffPointId.name ?? "";

  const handlePaymentMethodChange = (value: string) => {
    store.setPaymentMethod(value);
    if (value === "wallet") {
      setEWalletExpanded(true);
    } else {
      setEWalletExpanded(false);
      setSelectedEWallet("");
    }
  };

  const isPayable =
    store.paymentMethod === "qr" ||
    (store.paymentMethod === "wallet" && selectedEWallet !== "");

  const handleConfirmPayment = useCallback(() => {
    const bookingDetail = {
      route: {
        origin: originName,
        destination: destName,
        date: store.travelDate,
        time: store.selectedTrip?.departure_time,
        arrive: store.selectedTrip?.arrival_time,
        busType: store.selectedTrip?.bus_type_id?.name,
        boardingPoint: boardingName,
        dropOffPoint: dropOffName,
      },
      seat: store.selectedSeats,
      subtotal: subtotal,
      discount: store.discount,
      total: total,
    }
    const body = {
      "tripId": store.selectedTrip?.id,
      "travelDate": store.travelDate,
      "originProvinceId": store.originProvinceId?.id,
      "destinationProvinceId": store.destinationProvinceId?.id,
      "boardingPointId": store.boardingPointId?.name,
      "dropOffPointId": store.dropOffPointId?.name,
      "passengers": store.passengers.map((passenger) => {
        return {
          "seatId": passenger.seatId,
          "seatNumber": passenger.seatNumber,
          "fullName": passenger.fullName,
          "thaiId": passenger.thaiId,
          "phone": passenger.phone,
          "passengerType": passenger.passengerType
        }
      }),
      "promoCode": store.promoCode
    }
    const sourceType = store.paymentMethod === "qr" ? "promptpay" : selectedEWallet;
    console.log("body ", body)

    navigate("/payment/qr", { state: { bookingBody: body, sourceType, total, bookingDetail } });
  }, [navigate, store.paymentMethod, selectedEWallet, total]);

  return (
    <PageTransition direction="left">
      <BookingLayout currentStep={4} title="ชำระเงิน" navto={() => navigate(-1)}>
        <div className="px-4 space-y-4">
          {/* Booking Summary */}
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <h3 className="font-bold text-base mb-2">สรุปการจอง</h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เส้นทาง</span>
                <span>{originName} → {destName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันที่</span>
                <span>{store.travelDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เวลา</span>
                <span>{store.selectedTrip?.departure_time} - {store.selectedTrip?.arrival_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จุดขึ้นรถ</span>
                <span>{boardingName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จุดลงรถ</span>
                <span>{dropOffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ที่นั่ง</span>
                <span>{store.selectedSeats.map((s) => s.number).join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ประเภทรถ</span>
                <span>{store.selectedTrip?.bus_type_id?.name}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span>ราคาตั๋ว × {store.selectedSeats.length}</span>
                  <span>฿{subtotal}</span>
                </div>
                {store.discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>ส่วนลด</span>
                    <span>-฿{store.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-1">
                  <span>ยอดชำระ</span>
                  <span className="text-primary">฿{total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-base mb-3">เลือกวิธีชำระเงิน</h3>
              <RadioGroup
                value={store.paymentMethod}
                onValueChange={handlePaymentMethodChange}
                className="space-y-3"
              >
                {/* QR PromptPay */}
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="qr" id="qr" />
                  <Label htmlFor="qr" className="flex items-center gap-2 cursor-pointer flex-1">
                    <QrCode className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">QR PromptPay</div>
                      <div className="text-xs text-muted-foreground">สแกนจ่ายผ่าน Mobile Banking</div>
                    </div>
                  </Label>
                </div>

                {/* E-Wallet */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center space-x-3 p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label
                      htmlFor="wallet"
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Wallet className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">E-Wallet</div>
                        <div className="text-xs text-muted-foreground">ชำระด้วยกระเป๋าเงิน</div>
                      </div>
                    </Label>
                    {store.paymentMethod === "wallet" && (
                      <motion.div
                        animate={{ rotate: eWalletExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer p-1"
                        onClick={() => setEWalletExpanded(!eWalletExpanded)}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence>
                    {store.paymentMethod === "wallet" && eWalletExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
                          {eWalletOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setSelectedEWallet(opt.value)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${selectedEWallet === opt.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-accent/30"
                                }`}
                            >
                              <span className="text-xl">
                                <img src={opt.icon} alt="" style={{ width: "30px", height: "30px" }} />
                              </span>
                              <div>
                                <div className="font-medium text-sm">{opt.label}</div>
                                <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Button
            onClick={handleConfirmPayment}
            disabled={!isPayable}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            ยืนยันชำระเงิน ฿{total}
          </Button>
        </div>
      </BookingLayout>
    </PageTransition>
  );
};

export default PaymentPage;
