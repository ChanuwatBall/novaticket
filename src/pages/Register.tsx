import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bus, Eye, EyeOff, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import liff from "@line/liff";
import { register, loginWithLine } from "@/services/api";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
          toast({ title: "เชื่อมต่อ LINE สำเร็จ!", description: "ยินดีต้อนรับสู่ Nova Express" });
          navigate("/profile");
        }
      }
    } catch (error) {
      console.error("LINE Login error:", error);
      toast({ title: "เชื่อมต่อ LINE ไม่สำเร็จ!", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "รหัสผ่านไม่ตรงกัน", description: "กรุณาตรวจสอบรหัสผ่านอีกครั้ง", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "รหัสผ่านสั้นเกินไป", description: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        password: form.password
      });

      if (res && res.token) {
        localStorage.setItem("user", JSON.stringify(res));
        toast({ title: "ลงทะเบียนสำเร็จ!", description: "ยินดีต้อนรับสู่ Nova Express" });
        navigate("/profile");
      } else {
        toast({ 
          title: "ลงทะเบียนไม่สำเร็จ", 
          description: res.message || "กรุณาตรวจสอบข้อมูลอีกครั้ง", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: "โปรดลองอีกครั้งในภายหลัง", 
        variant: "destructive" 
      });
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
          <h1 className="text-lg font-bold tracking-tight">ลงทะเบียน</h1>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <Card className="border-none shadow-none sm:border sm:shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">สร้างบัญชี Nova Express</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">สมัครสมาชิกเพื่อสะสมแต้มและรับสิทธิพิเศษ</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white transition-colors"
              onClick={handleLineLogin}
            >
              <MessageCircle className="h-5 w-5 fill-current" />
              ลงทะเบียนด้วย LINE
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
                <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                <Input id="fullName" name="fullName" placeholder="กรอกชื่อ-นามสกุล" value={form.fullName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input id="phone" name="phone" type="tel" placeholder="0XX-XXX-XXXX" value={form.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" name="email" type="email" placeholder="example@email.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="อย่างน้อย 6 ตัวอักษร" value={form.password} onChange={handleChange} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="กรอกรหัสผ่านอีกครั้ง" value={form.confirmPassword} onChange={handleChange} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "กำลังดำเนินการ..." : "ลงทะเบียน"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Register;
