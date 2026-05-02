"use client";

import { useSchedule } from "@/lib/ScheduleContext";
import { Palette, CalendarDays, Download } from "lucide-react";
import { useState } from "react";

export default function MobileControls({ children }: { children: React.ReactNode }) {
  const { mobileTab, setMobileTab, setDesktopPanel } = useSchedule();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSheet = () => setIsExpanded(!isExpanded);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 transition-transform duration-300 z-50 ${isExpanded ? 'h-[80vh]' : 'h-[70px]'}`}>
        {/* Handle / Header */}
        <button onClick={toggleSheet} className="w-full flex items-center justify-center p-2 text-zinc-400 hover:text-white">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mb-1" />
        </button>

        {/* Tabs (always visible when collapsed or top of expanded view) */}
        <div className="flex justify-around border-b border-zinc-800 bg-zinc-900 pb-2">
            <button onClick={() => { setMobileTab("start"); setDesktopPanel("start"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'start' ? 'text-green-500' : 'text-zinc-400'}`}><CalendarDays size={20} /><span className="text-[10px] mt-1">Courses</span></button>
            <button onClick={() => { setMobileTab("design"); setDesktopPanel("design"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'design' ? 'text-green-500' : 'text-zinc-400'}`}><Palette size={20} /><span className="text-[10px] mt-1">Design</span></button>
            <button onClick={() => { setMobileTab("export"); setDesktopPanel("export"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'export' ? 'text-green-500' : 'text-zinc-400'}`}><Download size={20} /><span className="text-[10px] mt-1">Export</span></button>
        </div>

        {/* Content Area */}
        <div className={`overflow-y-auto p-4 ${isExpanded ? 'h-[calc(100%-80px)] opacity-100' : 'h-0 opacity-0'} transition-opacity`}>
            {children}
        </div>
    </div>
  );
}