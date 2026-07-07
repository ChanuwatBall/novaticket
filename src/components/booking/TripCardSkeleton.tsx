import { cn } from "@/lib/utils";

const TripCardSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-full p-4 md:p-5 flex flex-col gap-4 border border-slate-100 rounded-2xl bg-white animate-pulse">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-1.5 rounded-lg h-9 w-9" />
                <div className="grid grid-cols-4 gap-4 min-w-[200px]">
                  <div>
                    <div className="h-5 w-12 bg-slate-100 rounded mb-1" />
                    <div className="h-3 w-8 bg-slate-100 rounded" />
                  </div>
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="h-0.5 w-16 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-12 bg-slate-100 rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TripCardSkeleton;
