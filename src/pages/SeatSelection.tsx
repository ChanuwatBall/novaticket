import { useMemo, useState, useCallback, useEffect } from "react";
import PageTransition from "@/components/PageTransition";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "@/components/BookingLayout";
import { useBookingStore } from "@/store/bookingStore";
import { generateSeats, getBusLayout, isSpecialCell, type Seat, type SeatStatus, type BusLayout } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CircleDot } from "lucide-react";
import { getTripDetail, tripSeatsLayout } from "@/services/api";
import { TripDetail } from "@/data/TripDetail";

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

const normalizeSeatStatus = (status: string): SeatStatus => {
  if (status === "available" || status === "selected") return status;
  if (status === "unavailable" || status === "blocked") return "unavailable";
  return "booked";
};

const SeatSelection = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const trip = store.selectedTrip;
  const { id } = useParams<{ id: string }>();

  const [layout, setLayout] = useState<BusLayout | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [tripDetail, setTripDetail] = useState<TripDetail>(null);


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
      if (!id) return;

      const tripData = await tripSeatsLayout(id);
      console.log("tripData:", tripData)

      if (tripData && tripData.layout) {
        setLayout(tripData.layout);

        setSeats(
          (tripData.seats || []).map((seat: Seat) => ({
            ...seat,
            status: normalizeSeatStatus(String(seat.status)),
          }))
        );
      }

      const tdetail = await getTripDetail(id)
      console.log("tdetail ", tdetail)
      setTripDetail(tdetail)
    };
    fetchSeats();
  }, [id]);

  const handleContinue = () => {
    store.setSelectedSeats(selectedSeats);
    console.log("selectedSeats ", selectedSeats)
    navigate("/passengers");
  }

  if (!layout) {
    return (
      <PageTransition>
        <BookingLayout currentStep={2} title="เลือกที่นั่ง" navto={() => navigate(-1)}>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            กำลังโหลดข้อมูลที่นั่ง...
          </div>
        </BookingLayout>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <BookingLayout currentStep={2} title="เลือกที่นั่ง" navto={() => navigate(-1)}>
        <div className="px-4">
          {/* Bus type label */}
          {tripDetail && <div className="text-center text-sm font-semibold text-muted-foreground mb-3">
            {/* {layout.name} */}
            {tripDetail?.busType} {tripDetail?.tripType} {tripDetail?.totalSeats} ที่นั่ง
          </div>}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded border-2 border-primary/30 bg-card" /> ว่าง
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded bg-primary" /> เลือก
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded bg-muted opacity-50" /> จองแล้ว
            </div>
          </div>

          {/* Bus layout */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="space-y-2">
              {layout.rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center justify-center gap-1.5">
                  {row.map((cell, colIdx) => {
                    // Aisle gap after col 1
                    const aisleClass = colIdx === 1 ? "mr-4" : "";

                    // Empty cell
                    if (cell === null) {
                      return <div key={colIdx} className={cn("w-11 h-11", aisleClass)} />;
                    }

                    // Special cell (driver, door, toilet, etc.)
                    if (isSpecialCell(cell)) {
                      if (cell === "DRIVER") {
                        return (
                          <div key={colIdx} className={cn("w-11 h-11 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground", aisleClass)}>
                            <CircleDot className="h-4 w-4" />
                            <span className="text-[8px] leading-tight">{specialCellLabels[cell]}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={colIdx} className={cn("w-11 h-11 rounded-lg bg-muted/60 flex items-center justify-center", aisleClass)}>
                          <span className="text-[7px] text-muted-foreground text-center leading-tight px-0.5">{specialCellLabels[cell]}</span>
                        </div>
                      );
                    }

                    // Seat cell
                    const seat = seats.find((s) => s.number === cell);
                    if (!seat) return <div key={colIdx} className={cn("w-11 h-11", aisleClass)} />;

                    return (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeat(seat.id)}
                        disabled={seat.status === "booked" || seat.status === "unavailable"}
                        className={cn(
                          "w-11 h-11 rounded-lg text-xs font-bold transition-all",
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

          {/* Summary */}
          <div className="bg-accent/50 rounded-lg p-3 mb-4">
            <p className="text-sm">
              เลือกแล้ว <span className="font-bold text-primary">{selectedSeats.length}</span> / {store.passengerCount} ที่นั่ง
              {selectedSeats.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  (ที่นั่ง {selectedSeats.map((s) => s.number).join(", ")})
                </span>
              )}
            </p>
          </div>

          <Button
            onClick={handleContinue}
            disabled={selectedSeats.length !== store.passengerCount}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            ดำเนินการต่อ
          </Button>
          <div style={{ width: "100%", height: "10rem" }}></div>
        </div>
      </BookingLayout >
    </PageTransition >
  );
};

export default SeatSelection;
