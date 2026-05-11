"use client";
import { useSchedule } from "@/lib/ScheduleContext";
import { Loader2 } from "lucide-react";

export default function ExportOverlay() {
    const { isExporting, exportProgress } = useSchedule();

    if (!isExporting) return null;
    const total = Math.max(exportProgress?.total ?? 1, 1);
    const current = Math.min(exportProgress?.current ?? 0, total);
    const progress = Math.max(6, Math.min(100, Math.round((current / total) * 100)));

    return (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[210] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
            <div className="animate-popover-in rounded-xl border border-white/[0.12] bg-[#0B100D]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-dlsu-vivid" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-black text-white">{exportProgress?.label || "Saving"}</p>
                            <p className="text-[10px] font-black text-white/35">{progress}%</p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-dlsu-vivid transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
