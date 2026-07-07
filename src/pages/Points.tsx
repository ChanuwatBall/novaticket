import { Star, ArrowLeft, Gift, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { getpointHistory, userPoints } from "@/services/api";
import { toast } from "sonner";

const mockPointsHistory = [
  { id: "1", description: "จอง กรุงเทพ → เชียงใหม่", date: "28 ก.พ. 2026", amount: 850, points: 8, type: "earn" as const },
  { id: "2", description: "จอง กรุงเทพ → สุราษฎร์ธานี", date: "15 ก.พ. 2026", amount: 650, points: 6, type: "earn" as const },
  { id: "3", description: "แลกแต้มเป็นส่วนลด 10 บาท", date: "10 ก.พ. 2026", amount: 0, points: -20, type: "redeem" as const },
  { id: "4", description: "จอง กรุงเทพ → ขอนแก่น", date: "5 ก.พ. 2026", amount: 450, points: 4, type: "earn" as const },
  { id: "5", description: "จอง กรุงเทพ → หาดใหญ่", date: "1 ก.พ. 2026", amount: 1200, points: 12, type: "earn" as const },
];

const Points = () => {
  const [points, setPoints] = useState<{
    totalPoints: number;
    nextRewardAt: number;
    rewardValue: number;
  } | null>(null)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [pointHistory, setPointHistory] = useState<any[]>([])
  // const totalPoints = 156;
  // const nextRewardAt = 200;
  // const progressPercent = (totalPoints / nextRewardAt) * 100;

  const getpoints = async () => {
    const usrp = await userPoints()
    console.log("usrp ", usrp)
    if (usrp?.error) {
      // toast.error("ไม่สามารถดึงข้อมูลแต้มได้ " + usrp.error) 
      setPoints({
        totalPoints: 0,
        nextRewardAt: 0,
        rewardValue: 0
      })
    } else {
      setPoints(usrp)
      setProgressPercent((usrp.totalPoints / usrp.nextRewardAt) * 100)
    }
  }

  const getHistory = async () => {
    const phis = await getpointHistory()
    if (phis.error) {
      toast.error("ไม่สามารถดึงข้อมูลประวัติแต้มได้ " + phis.error)
      return
    }
    setPointHistory(phis)
  }
  useEffect(() => {
    getpoints()
    getHistory()
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-50">
        <Link to="/profile" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">สะสมแต้ม</h1>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Points Summary Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent border-primary/20">
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 mb-3">
              <Star className="h-8 w-8 text-primary fill-primary" />
            </div>
            <p className="text-sm text-muted-foreground">แต้มสะสมของคุณ</p>
            <p className="text-4xl font-bold text-primary mt-1">{points?.totalPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">แต้ม</p>
          </CardContent>
        </Card>

        {/* Progress to next reward */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gift className="h-4 w-4" />
                รางวัลถัดไปที่ {points?.nextRewardAt} แต้ม
              </span>
              <span className="font-bold text-primary">{points?.totalPoints}/{points?.nextRewardAt}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              อีก <span className="font-semibold text-foreground">{points ? (points?.nextRewardAt - points?.totalPoints) : "-"} แต้ม</span> จะได้รับส่วนลด 50 บาท
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              วิธีสะสมแต้ม
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">จองตั๋วรถโดยสาร</p>
                <p className="text-xs text-muted-foreground">ทุก 100 บาท = 1 แต้ม</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">สะสมแต้มครบ</p>
                <p className="text-xs text-muted-foreground">นำไปแลกส่วนลดหรือเติมเงิน Wallet</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">แลกแต้มเป็นเงิน</p>
                <p className="text-xs text-muted-foreground">10 แต้ม = 25 บาท ใน E-Wallet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redeem CTA */}
        {/* <Link
          to="/wallet"
          className="block w-full rounded-xl bg-primary text-primary-foreground text-center py-3 font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          แลกแต้มเป็นเงิน Wallet
        </Link> */}

        {/* Points History */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              ประวัติแต้มสะสม
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pointHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge
                    variant={item.type === "earn" ? "default" : "secondary"}
                    className={item.type === "earn" ? "bg-success text-success-foreground" : ""}
                  >
                    {item.type === "earn" ? "+" : ""}{item.points} แต้ม
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Points;
