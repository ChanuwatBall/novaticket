import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import liff from "@line/liff";
import { login, loginWithLine } from "@/services/api";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLineLogin = async () => {
    try {
      await liff.ready;
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        const ltoken = liff.getAccessToken();
        const res = await loginWithLine({ lineAccessToken: ltoken });
        if (res && res.token) {
          localStorage.setItem("user", JSON.stringify(res));
          toast({ title: "เข้าสู่ระบบสำเร็จ!", description: "ยินดีต้อนรับกลับด้วย LINE" });
          navigate("/profile");
        }
      }
    } catch (error) {
      console.error("LINE Login error:", error);
      toast({ title: "เข้าสู่ระบบ LINE ไม่สำเร็จ!", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(form);
      if (res && res.token) {
        localStorage.setItem("user", JSON.stringify(res));
        toast({ title: "เข้าสู่ระบบสำเร็จ!", description: "ยินดีต้อนรับกลับ" });
        navigate("/profile");
      } else {
        toast({ title: "เข้าสู่ระบบไม่สำเร็จ!", description: res.message || "กรุณาตรวจสอบข้อมูล", variant: "destructive" });
      }
    } catch (error) {
      console.log("error ", error)
      toast({ title: "เกิดข้อผิดพลาด!", description: "โปรดลองอีกครั้งในภายหลัง", variant: "destructive" });
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
          <h1 className="text-lg font-bold tracking-tight">เข้าสู่ระบบ</h1>
        </div>
      </header>

      <main className="flex-1 p-4 flex items-center justify-center max-w-lg mx-auto w-full">
        <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">ยินดีต้อนรับ</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">เข้าสู่ระบบเพื่อจัดการบัญชีของคุณ</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white transition-colors"
              onClick={handleLineLogin}
            >
              <MessageCircle className="h-5 w-5 fill-current" />
              เข้าสู่ระบบด้วย LINE
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">หรือ</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" name="email" type="email" placeholder="example@email.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="กรอกรหัสผ่าน" value={form.password} onChange={handleChange} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  ลงทะเบียน
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
