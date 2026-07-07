import { ReactNode } from "react";
import StepIndicator from "./StepIndicator";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BookingLayoutProps {
  children: ReactNode;
  currentStep?: number;
  showSteps?: boolean;
  title?: string;
  navto?: () => void;
}

const BookingLayout = ({ children, currentStep = 1, showSteps = true, title, navto }: BookingLayoutProps) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <header className={cn(
        "w-full z-50 bg-white transition-all duration-300",
        isScrolled ? "fixed top-0 left-0 right-0 shadow-md py-1" : "sticky top-0 border-b py-3"
      )}>
        {title && (
          <div className={cn(
            "px-4 flex items-center gap-4 text-black transition-all",
            isScrolled ? "pt-2 pb-1" : "pt-4 pb-2"
          )}>
            <button onClick={() => { navto ? navto() : navigate(-1) }} className="p-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className={cn("font-bold transition-all", isScrolled ? "text-base" : "text-lg")}>{title}</h2>
          </div>
        )}

        {showSteps && currentStep && (
          <div className={cn("bg-white w-full transition-all", isScrolled ? "pb-1" : "pb-2")}>
            <StepIndicator currentStep={currentStep} />
          </div>
        )}
      </header>

      {/* Spacer when fixed */}
      {isScrolled && <div className="h-[120px]" />}

      {/* Content */}
      <main className="flex-1 w-full pb-32 bg-white flex flex-col pt-2">
        <div className="max-w-lg mx-auto w-full px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BookingLayout;
