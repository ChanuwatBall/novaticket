import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { mockPromotions } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tag, Clock, Copy, CheckCircle, Coins, Route } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getPromotions } from "@/services/api";

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState<any[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    const conf = async () => {
      const promotionsData = await getPromotions()
      
      const mockedPromotions = [
        {
          id: 'mock-1',
          title: 'เดินทางครบ 10 เที่ยว ฟรี 1 เที่ยว',
          description: 'สะสมจำนวนเที่ยวการเดินทางเส้นทางใดก็ได้ครบ 10 ครั้ง รับสิทธิ์เดินทางฟรี 1 ครั้งในรอบถัดไป',
          memberOnly: true,
          expiryDate: '31 ธ.ค. 2026',
          remainingQuota: 'ไม่จำกัด',
          type: 'route_count',
          currentCount: 3,
          targetCount: 10
        },
        {
          id: 'mock-2',
          title: 'คูปองส่วนลด 100 บาท',
          description: 'ใช้คะแนนสะสม 500 พอยท์ เพื่อแลกรับคูปองส่วนลดค่าโดยสารมูลค่า 100 บาท ไว้ใช้กับการจองครั้งต่อไป',
          memberOnly: true,
          expiryDate: '30 พ.ย. 2026',
          remainingQuota: 50,
          type: 'points',
          pointsRequired: 500
        }
      ];

      const apiPromos = (promotionsData || []).map((p: any) => ({...p, type: p.type || 'discount'}));
      setPromotions([...mockedPromotions, ...apiPromos]);
    }
    conf()
  }, [])
  return (
    <BookingLayout showSteps={false} title="โปรโมชั่น" navto={() => navigate(-1)}>
      <div className="px-4">
        <Tabs defaultValue="all">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="member" className="flex-1">สมาชิก</TabsTrigger>
          </TabsList>

          {["all", "member"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {promotions
                .filter((p) => tab === "all" || p.memberOnly)
                .map((promo) => {
                  let icon = <Tag className="h-4 w-4 text-primary" />;
                  let badgeColor = "bg-primary/10 text-primary";
                  let ribbonColor = "bg-primary";

                  if (promo.type === 'route_count') {
                    icon = <Route className="h-4 w-4 text-emerald-600" />;
                    badgeColor = "bg-emerald-100 text-emerald-700";
                    ribbonColor = "bg-emerald-500";
                  } else if (promo.type === 'points') {
                    icon = <Coins className="h-4 w-4 text-amber-600" />;
                    badgeColor = "bg-amber-100 text-amber-700";
                    ribbonColor = "bg-amber-500";
                  }

                  return (
                    <Link to={`/promotions/${promo.id}`} key={promo.id}>
                      <Card className="cursor-pointer hover:shadow-md transition-all mb-3 overflow-hidden border border-slate-100 shadow-sm relative group bg-white">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${ribbonColor} group-hover:w-2 transition-all`} />
                        <CardContent className="p-4 pl-5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1 pr-2">
                              <div className={`p-2 rounded-xl ${badgeColor} shrink-0`}>
                                {icon}
                              </div>
                              <div className="pt-0.5">
                                <h3 className="font-bold text-[13px] leading-snug">{promo.title}</h3>
                              </div>
                            </div>
                            {promo.memberOnly && <Badge variant="secondary" className="text-[9px] px-1.5 shrink-0 bg-slate-100 text-slate-500 border-none font-bold uppercase tracking-wider">สมาชิก</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed ml-11">{promo.description}</p>
                          
                          <div className="ml-11">
                            {promo.type === 'route_count' && (
                              <div className="mb-3 space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                  <span className="text-emerald-700 flex items-center gap-1"><Route className="h-3 w-3" /> สะสม {promo.currentCount} จาก {promo.targetCount} เที่ยว</span>
                                  <span>{Math.round((promo.currentCount / promo.targetCount) * 100)}%</span>
                                </div>
                                <Progress value={(promo.currentCount / promo.targetCount) * 100} className="h-1.5 bg-slate-100" />
                              </div>
                            )}

                            {promo.type === 'points' && (
                              <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50 px-2 py-1.5 rounded-lg border border-amber-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-2">
                                  <div className="bg-white p-1 rounded-full shadow-sm border border-amber-100">
                                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-amber-600/80 font-bold leading-none mb-0.5">คะแนนที่ใช้แลก</span>
                                    <span className="text-amber-700 font-extrabold text-[13px] leading-none">{promo.pointsRequired} <span className="text-[9px] font-semibold">พอยท์</span></span>
                                  </div>
                                </div>
                                <div className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm">
                                  <Tag className="h-3 w-3" />
                                  แลกคูปอง
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-dashed">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> หมดอายุ {promo.expiryDate}
                              </span>
                              <span>เหลือ {promo.remainingQuota} สิทธิ์</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </BookingLayout>
  );
};

export default PromotionsPage;
