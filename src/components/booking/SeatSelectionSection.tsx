import { useState, useEffect, useCallback, useMemo } from "react";
import { useBookingStore } from "@/store/bookingStore";
import { tripSeatsLayout, getTripDetail } from "@/services/api";
import { type Seat, type SeatStatus, type BusLayout, isSpecialCell } from "@/data/mockData";
import { type TripDetail } from "@/data/TripDetail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CircleDot } from "lucide-react";

interface SeatSelectionSectionProps {
  onContinue: () => void;
}

const statusColors: Record<SeatStatus, string> = {
  available: "bg-card border-2 border-primary/30 text-foreground hover:bg-primary/10 cursor-pointer",
  booked: "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
  unavailable: "bg-muted/50 text-muted-foreground/30 cursor-not-allowed",
  selected: "bg-primary text-primary-foreground ring-2 ring-primary/40 cursor-pointer",
};

const specialCellLabels: Record<string, string> = {
  DRIVER: "พขร.",
  DOOR1: "ประตู 1",
  DOOR2: "ประตู 2",
  TOILET: "ห้องน้ำ",
  EMERGENCY: "ประตูหนีไฟ",
  STAIRS: "บันได",
};

const SeatSelectionSection = ({ onContinue }: SeatSelectionSectionProps) => {
  const store = useBookingStore();
  const trip = store.selectedTrip;
  const [layout, setLayout] = useState<BusLayout | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedSeats = useMemo(() => seats.filter((s) => s.status === "selected"), [seats]);

  const toggleSeat = useCallback((seatId: string) => {
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id !== seatId) return s;
        if (s.status === "booked" || s.status === "unavailable") return s;
        if (s.status === "selected") return { ...s, status: "available" as SeatStatus };
        if (selectedSeats.length >= store.passengerCount && s.status === "available") return s;
        return { ...s, status: "selected" as SeatStatus };
      })
    );
  }, [selectedSeats.length, store.passengerCount]);

  useEffect(() => {
    const fetchSeats = async () => {
      if (!trip?.id) return;
      setLoading(true);
      try {
        const [tripData, tdetail] = await Promise.all([
          tripSeatsLayout(trip.id),
          getTripDetail(trip.id)
        ]);

        if (tripData && tripData.layout) {
          setLayout(tripData.layout);
          const updatedSeats = (tripData.seats || []).map((s: Seat) => {
            const isBooked = s.status === "available" ? false : true;
            return isBooked ? { ...s, status: "booked" as SeatStatus } : s;
          });
          setSeats(updatedSeats);
        }
        setTripDetail(tdetail);
      } catch (error) {
        console.error("fetch seats error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();
  }, [trip?.id]);

  const handleContinue = () => {
    store.setSelectedSeats(selectedSeats);
    onContinue();
  };

  if (loading) return <div className="p-4 text-center">กำลังโหลดข้อมูลที่นั่ง...</div>;
  if (!layout) return null;

  return (
    <div className="px-4 space-y-4">
      <h3 className="text-lg font-bold">เลือกที่นั่ง ({selectedSeats.length}/{store.passengerCount})</h3>

      {tripDetail && (
        <div className="text-center text-xs font-semibold text-muted-foreground">
          {tripDetail?.busType} {tripDetail?.tripType} {tripDetail?.totalSeats} ที่นั่ง
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] mb-2 justify-center">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-primary/30 bg-card" /> ว่าง
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-primary" /> เลือก
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted opacity-50" /> จองแล้ว
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="space-y-1.5">
          {layout.rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-center gap-1">
              {row.map((cell, colIdx) => {
                const aisleClass = colIdx === 1 ? "mr-4" : "";
                if (cell === null || cell === "") return <div key={colIdx} className={cn("w-10 h-10", aisleClass)} />;

                if (isSpecialCell(cell)) {
                  return (
                    <div key={colIdx} className={cn("w-10 h-10 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground text-[7px] leading-tight", aisleClass)}>
                      {cell === "DRIVER" && <CircleDot className="h-3 w-3 mb-0.5" />}
                      <span className="text-center px-0.5">{specialCellLabels[cell]}</span>
                    </div>
                  );
                }

                const seat = seats.find((s) => s.number === cell);
                if (!seat) return <div key={colIdx} className={cn("w-10 h-10", aisleClass)} />;

                return (
                  <button
                    key={seat.id}
                    onClick={() => toggleSeat(seat.id)}
                    disabled={seat.status === "booked" || seat.status === "unavailable"}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xs font-bold transition-all",
                      statusColors[seat.status],
                      aisleClass
                    )}
                  >
                    {seat.number}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={selectedSeats.length !== store.passengerCount}
        className="w-full h-12 text-base font-bold"
      >
        ยืนยันที่นั่ง
      </Button>
    </div>
  );
};

export default SeatSelectionSection;
