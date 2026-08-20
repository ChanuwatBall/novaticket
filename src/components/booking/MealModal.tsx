import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MealItem, PassengerMeal, MealSelection } from "@/store/bookingStore";
import { ShoppingBag, Check } from "lucide-react";
import { t } from "i18next";

// const MENU: MealItem[] = [
//   {
//       "id": "ad000001-0000-4000-8000-000000000001",
//       "name": "น้ำดื่ม",
//       "nameEn": "Drinking Water",
//       "category": "beverage",
//       "price": 10,
//       "imageUrl": null,
//       "stockLeft": 40
//     }
// ];

interface Props {
  open: boolean;
  onClose: () => void;
  seatNumber: string;
  passengerName: string;
  initial: PassengerMeal | null;
  onConfirm: (meal: PassengerMeal, seatId: string) => void;
  seatId: string;
  mealsMenu: MealItem[];
}

// categories removed: now allow selecting any number of items across categories

export default function MealModal({ open, onClose, seatNumber, passengerName, initial, onConfirm, seatId , mealsMenu }: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selected, setSelected] = useState<MealSelection[]>(
    initial ? initial.items.map(i => ({ item: i.item, qty: i.qty })) : []
  );

  const mealGroups = useMemo(() => {
    const groups = new Map<string, MealItem[]>();

    mealsMenu.forEach((item) => {
      const category = item.categoryName?.trim() || "อื่นๆ";
      groups.set(category, [...(groups.get(category) ?? []), item]);
    });

    return Array.from(groups, ([category, items]) => ({ category, items }));
  }, [mealsMenu]);

  const total = selected.reduce((s, it) => s + (Number(it.item.unitPrice )* it.qty), 0);

  const scrollToCategory = (category: string) => {
    const list = listRef.current;
    const section = categoryRefs.current[category];
    if (!list || !section) return;

    const listTop = list.getBoundingClientRect().top;
    const sectionTop = section.getBoundingClientRect().top;
    list.scrollTo({
      top: list.scrollTop + sectionTop - listTop - 8,
      behavior: "smooth",
    });
  };

  const changeQty = (item: MealItem, delta: number) => {
    setSelected(prev => {
      const idx = prev.findIndex(p => p.item.id === item.id);
      if (idx === -1) {
        if (delta <= 0) return prev;
        return [...prev, { item, qty: delta }];
      }
      const next = [...prev];
      const nextQty = next[idx].qty + delta;
      if (nextQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], qty: nextQty };
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({ seatId, items: selected }, seatId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="top-[46%] max-w-md w-[94vw] rounded-2xl p-0 border-none shadow-2xl max-h-[86dvh] flex flex-col overflow-hidden gap-0 sm:top-[50%]">
        <DialogHeader className="p-5 pb-4   rounded-t-2xl shrink-0">
          <DialogTitle className="text-black font-bold text-lg">{t("เลือกบริการ")}</DialogTitle>
          <p className="text-black/80 text-xs mt-1">{t("ผู้โดยสาร")}: {passengerName || `${t("ที่นั่ง")} ${seatNumber}`}</p>
        </DialogHeader>

        {mealGroups.length > 0 && (
          <div className="shrink-0 bg-white border-b px-4 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {mealGroups.map(group => (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => scrollToCategory(group.category)}
                  className="h-8 rounded-full border border-primary/20 bg-primary/5 px-3 text-xs font-bold text-primary whitespace-nowrap hover:bg-primary/10"
                >
                  {t(group.category)?.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3">{t("เลือกได้มากกว่า 1 รายการ")}</p>
          {mealGroups.map(group => (
            <div
              key={group.category}
              ref={(node) => {
                categoryRefs.current[group.category] = node;
              }}
              className="scroll-mt-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800">{t(group.category)?.toLocaleUpperCase()}</h3>
                <span className="text-[10px] font-bold text-muted-foreground">{group.items.length} {t("รายการ")}</span>
              </div>
              <div className="space-y-2">
                {group.items.map(item => {
                  const sel = selected.find(s => s.item.id === item.id);
                  const qty = sel?.qty ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${qty > 0 ? `border-primary bg-primary/5` : "border-border bg-white hover:border-muted-foreground/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        {
                           item?.imageUrl ? <img src={item.imageUrl} alt={item.title}  style={{width:"4rem"}} />  :
                        <div style={{width:"4rem" ,height:"2rem"}} className={`  rounded-full flex items-center justify-center ${qty > 0 ? "bg-primary/10" : "bg-slate-100"}`}>
                          {qty > 0 ? <Check className={`h-4 w-4 text-primary`} /> :
                          item.categoryName === "beverage" ? <ShoppingBag className="h-4 w-4 text-muted-foreground" /> :
                          
                           <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                        </div>}
                        <span className="font-medium text-sm">
                          {t(item.title)} <br/>
                          {/* <Badge variant="outline" className={`font-bold text-xs ${qty > 0 ? `text-primary border-primary` : ""}`}>
                          ฿{item.price}
                        </Badge> */}
                         ฿{item.unitPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => changeQty(item, -1)} className="w-7 h-7 rounded-md bg-slate-100 text-sm font-bold">-</button>
                          <div className="w-8 text-center font-bold">{qty}</div>
                          <button onClick={() => changeQty(item, +1)} className="w-7 h-7 rounded-md bg-slate-100 text-sm font-bold">+</button>
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {mealGroups.length === 0 && (
            <div className="rounded-xl border bg-white p-4 text-center text-sm text-muted-foreground">
              {t("ไม่มีรายการบริการบนรถ")}
            </div>
          )}
        </div>

        {/* Summary + Confirm */}
        <div className="p-4 border-t bg-white shrink-0 space-y-3">
          <div className="space-y-2">
            <div className="rounded-xl p-2 bg-slate-50 border max-h-24 overflow-y-auto">
              {selected.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/70">{t("ยังไม่ได้เลือกอาหาร")}</p>
              ) : (
                <div className="space-y-1">
                  {selected.map(it => (
                    <div key={it.item.id} className="flex justify-between gap-3 text-sm">
                      <span className="truncate">{t(it.item.title)} x{it.qty}</span>
                      <span className="font-bold text-primary">฿{(Number(it.item.unitPrice) * it.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              {/* <div>
                <p className="text-[10px] text-muted-foreground">{t("ราคารวม")}</p>
                <p className="text-xl font-extrabold text-primary">฿{total.toLocaleString()}</p>
              </div> */}
              <Button onClick={handleConfirm} className="h-11 px-8 font-bold bg-primary hover:opacity-90 border-none text-white flex items-center   gap-2 w-full" style={{justifyContent:"space-between"}} >
                {t("ตกลง")}
                <p className="text-xl font-extrabold text-white">฿{total.toLocaleString()}</p>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
