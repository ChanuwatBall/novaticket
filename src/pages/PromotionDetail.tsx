import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { mockPromotions } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tag, Clock, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getPromotionDetail } from "@/services/api";


const PromotionDetail = () => {
  const { promoId } = useParams<{ promoId: string }>();
  const [promo, setPromo] = useState<any>(null)
  // const promo = promoId ? mockPromotions.find((p) => p.id === promoId) : null;
  const navigate = useNavigate();

  useEffect(() => {
    const conf = async () => {
      const promotionsData = await getPromotionDetail(promoId)
      if (promotionsData) setPromo(promotionsData);

    }
    conf()
  }, [])

  return (promo ?
    <BookingLayout showSteps={false} title="รายละเอียดโปรโมชั่น" navto={() => navigate(-1)}>
      <div className="px-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            {promo.imageUrl && <img src={promo.imageUrl} alt={promo.title} className="w-full object-cover rounded-md" />}
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{promo.title}</h3>
            </div>
            {promo.memberOnly && <Badge variant="secondary">สมาชิกเท่านั้น</Badge>}
            <p className="text-sm text-muted-foreground">{promo.description}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">โควต้าคงเหลือ</span>
                <span className="font-bold">{promo.remainingQuota} สิทธิ์</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">หมดอายุ</span>
                <span>{promo.expiryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ระยะเวลาใช้งาน</span>
                <span>{promo.validityDays} วันหลังรับสิทธิ์</span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="bg-accent/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">รหัสโปรโมชั่น</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold tracking-widest text-primary">{promo.promoCode}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(promo.promoCode);
                    toast.success("คัดลอกรหัสแล้ว");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full h-12 font-bold"
              onClick={() => navigate("/")}
            >
              ใช้โค้ดนี้จองตั๋ว
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => navigate(-1)}>
              กลับ
            </Button>
          </CardContent>
        </Card>
      </div>
    </BookingLayout> :
    <BookingLayout showSteps={false} title="รายละเอียดโปรโมชั่น" navto={() => navigate("/")}>
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground">ไม่พบข้อมูลโปรโมชั่น</p>
        <Link to="/promotions" className="text-primary font-medium mt-2 inline-block">กลับหน้าส่งเสริมการขาย</Link>
      </div>
    </BookingLayout>
  )
}

export default PromotionDetail;
