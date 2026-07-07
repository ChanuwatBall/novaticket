import { Wallet as WalletIcon, ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCw, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getWalletPoint } from "@/services/api";
import { useEffect, useState } from "react";

const mockTransactions = [
  { id: "1", description: "จ่ายค่าตั๋ว กรุงเทพ → เชียงใหม่", date: "28 ก.พ. 2026", amount: -850, type: "payment" as const },
  { id: "2", description: "แลกแต้มสะสม 20 แต้ม", date: "10 ก.พ. 2026", amount: 50, type: "redeem" as const },
  { id: "3", description: "เติมเงินผ่าน QR Code", date: "8 ก.พ. 2026", amount: 500, type: "topup" as const },
  { id: "4", description: "จ่ายค่าตั๋ว กรุงเทพ → ขอนแก่น", date: "5 ก.พ. 2026", amount: -450, type: "payment" as const },
  { id: "5", description: "เติมเงินผ่านโอนเงิน", date: "1 ก.พ. 2026", amount: 1000, type: "topup" as const },
  { id: "6", description: "แลกแต้มสะสม 40 แต้ม", date: "25 ม.ค. 2026", amount: 100, type: "redeem" as const },
];

const getTransactionIcon = (type: string) => {
  switch (type) {
    case "topup": return <ArrowDownCircle className="h-5 w-5 text-success" />;
    case "payment": return <ArrowUpCircle className="h-5 w-5 text-destructive" />;
    case "redeem": return <Star className="h-5 w-5 text-primary fill-primary" />;
    default: return <RefreshCw className="h-5 w-5 text-muted-foreground" />;
  }
};

const getTransactionLabel = (type: string) => {
  switch (type) {
    case "topup": return "เติมเงิน";
    case "payment": return "จ่ายค่าตั๋ว";
    case "redeem": return "แลกแต้ม";
    default: return type;
  }
};

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [transactions, setTransaction] = useState([])

  const getwalletspoint = async () => {
    const res = await getWalletPoint()
    console.log("res wallet point ", res)
    if (res?.error) {
      setBalance(0)
      setAvailablePoints(0)
      setTransaction([])
    } else {
      setBalance(res.balance)
      setAvailablePoints(res.point)
      setTransaction(res.transactions)
    }
  }

  useEffect(() => {
    getwalletspoint()
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-50">
        <Link to="/profile" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">กระเป๋าเงิน</h1>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <WalletIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">ยอดเงินคงเหลือ</p>
                <p className="text-3xl font-bold">฿{balance ? balance.toLocaleString() : " - "}</p>
              </div>
            </div>
            <Separator className="bg-primary-foreground/20 my-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-80">แต้มสะสมที่ใช้ได้</span>
              <Link to="/points" className="flex items-center gap-1 font-semibold hover:underline">
                <Star className="h-4 w-4 fill-current" />
                {availablePoints ? availablePoints : "-"} แต้ม
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors shadow-sm">
            <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5 text-success" />
            </div>
            <span className="text-xs font-medium">เติมเงิน</span>
          </button>
          <Link to="/points" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors shadow-sm">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium">แลกแต้ม</span>
          </Link>
          <Link to="/ticket" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors shadow-sm">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xs font-medium">จ่ายค่าตั๋ว</span>
          </Link>
        </div>

        {/* Redeem Points Banner */}
        {availablePoints > 0 && <Card className="bg-accent/50 border-primary/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-primary fill-primary" />
              <div>
                <p className="text-sm font-semibold">แลก {availablePoints} แต้ม</p>
                <p className="text-xs text-muted-foreground">รับ ฿{availablePoints > 0 ? Math.floor(availablePoints / 10) * 25 : 0} เข้า Wallet</p>
              </div>
            </div>
            <Button size="sm" variant="default" className="rounded-full text-xs">
              แลกเลย
            </Button>
          </CardContent>
        </Card>
        }

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              ประวัติธุรกรรม
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {transactions && transactions.length > 0 ? transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  {getTransactionIcon(tx.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getTransactionLabel(tx.type)}
                      </Badge>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}฿{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              )) :
                <div className="flex items-center justify-center py-10 ">
                  <p className="text-sm text-muted-foreground">ไม่พบประวัติธุรกรรม</p>
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Wallet;
