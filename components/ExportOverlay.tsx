"use client";
import { useSchedule } from "@/lib/ScheduleContext";
import { Loader2 } from "lucide-react";

export default function ExportOverlay() {
    const { isExporting } = useSchedule();

    if (!isExporting) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-center shadow-2xl">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Generating High-Res Image</h3>
                <p className="text-zinc-400 text-sm">Please wait, this might take a moment on older devices...</p>
            </div>
        </div>
    );
}