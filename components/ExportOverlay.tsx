"use client";
import { useSchedule } from "@/lib/ScheduleContext";
import { Loader2 } from "lucide-react";

export default function ExportOverlay() {
    const { isExporting } = useSchedule();

    if (!isExporting) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-zinc-900 border border-zinc-800 px-8 py-7 rounded-xl flex flex-col items-center shadow-2xl">
                <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Saving</h3>
                <p className="text-zinc-400 text-sm">This can take a moment.</p>
            </div>
        </div>
    );
}
