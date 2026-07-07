import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "@/store/bookingStore";
import BookingLayout from "@/components/BookingLayout";
import PageTransition from "@/components/PageTransition";
import SearchResultsSection from "@/components/booking/SearchResultsSection";
import SeatSelectionSection from "@/components/booking/SeatSelectionSection";
import PassengerInfoSection from "@/components/booking/PassengerInfoSection";
import PaymentSection from "@/components/booking/PaymentSection";

const BookingFlow = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [currentStep, setCurrentStep] = useState(1);

  // Refs for scrolling
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!store.originProvinceId || !store.destinationProvinceId || !store.travelDate) {
      navigate("/");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const step = parseInt(entry.target.id.split("-")[1]);
            if (!isNaN(step)) setCurrentStep(step);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    const steps = ["step-1", "step-2", "step-3"];
    steps.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [store.selectedTrip, store.selectedSeats.length, store.passengers.length]);

  const stepTitles: Record<number, string> = {
    1: "เลือกเที่ยวรถ",
    2: "เลือกที่นั่งและข้อมูลผู้โดยสาร",
    3: "ชำระเงิน"
  };

  return (
    <BookingLayout currentStep={currentStep} title={stepTitles[currentStep] || "จองตั๋ว"}>
      <div className="flex flex-col pb-32">
        {/* Step 1: Select Trip */}
        <div id="step-1" className="scroll-mt-32 min-h-[calc(100vh-160px)] py-4 pt-0">
          <SearchResultsSection
            onSelectTrip={(trip) => {
              store.setSelectedTrip(trip);
              setTimeout(() => scrollTo(step2Ref), 100);
            }}
          />
        </div>

        {/* Step 2: Select Seat & Info */}
        {store.selectedTrip && (
          <div id="step-2" ref={step2Ref} className="scroll-mt-32 py-4 border-t border-slate-100">
            <SeatSelectionSection
              onContinue={() => {
                setTimeout(() => scrollTo(step3Ref), 100);
              }}
            />

            {store.selectedSeats.length > 0 && (
              <div ref={step3Ref} className="mt-8 pt-8 border-t border-dashed border-slate-200">
                <PassengerInfoSection
                  onContinue={() => {
                    setTimeout(() => scrollTo(step4Ref), 100);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Payment */}
        {store.passengers.length > 0 && (
          <div id="step-3" ref={step4Ref} className="scroll-mt-32 min-h-[calc(100vh-160px)] py-4 border-t border-slate-100">
            <PaymentSection />
          </div>
        )}
      </div>
    </BookingLayout>
  );
};

export default BookingFlow;
