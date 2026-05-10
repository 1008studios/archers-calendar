"use client";

import { useSchedule } from "@/lib/ScheduleContext";
import { Palette, CalendarDays, Download } from "lucide-react";
import { classNames } from "@/lib/utils";
import React, { useState, TouchEvent } from "react";

const MOBILE_TABS = [
  { id: "start",   label: "Courses", icon: CalendarDays },
  { id: "design",  label: "Design",  icon: Palette },
  { id: "export",  label: "Export",  icon: Download },
] as const;

export default function MobileControls({ children }: { children: React.ReactNode }) {
  const { mobileTab, setMobileTab, setDesktopPanel, isMobileExpanded, setIsMobileExpanded } = useSchedule();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 40;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;
    const isUpSwipe = distance > minSwipeDistance;
    
    if (isDownSwipe && isMobileExpanded) {
      setIsMobileExpanded(false);
    } else if (isUpSwipe && !isMobileExpanded) {
      setIsMobileExpanded(true);
    }
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-white/10 bg-[#090D0B]/95 pb-safe backdrop-blur-xl md:hidden">
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Toggle button */}
        <button 
          onClick={() => setIsMobileExpanded(!isMobileExpanded)} 
          className="flex w-full items-center justify-center py-2 text-white/40 hover:text-white/80 transition-colors"
        >
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </button>

        <div className="flex gap-1.5 px-2 pb-2">
          {MOBILE_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const active = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                className={classNames(
                  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-bold transition-all",
                  active ? "bg-dlsu-vivid text-white shadow-md shadow-dlsu-vivid/25" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
                )}
                type="button"
                onClick={() => {
                  if (active) {
                    // If tapping the active tab, toggle expansion
                    setIsMobileExpanded(!isMobileExpanded);
                  } else {
                    // If tapping a new tab, switch to it and expand
                    setMobileTab(tab.id as any);
                    setDesktopPanel(tab.id as any);
                    setIsMobileExpanded(true);
                  }
                }}
              >
                <TabIcon size={17} strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      <div 
        className={classNames(
          "overflow-y-auto border-white/[0.06] scrollbar-thin transition-all duration-300 ease-in-out",
          isMobileExpanded ? "max-h-[50dvh] border-t opacity-100" : "max-h-0 border-t-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}