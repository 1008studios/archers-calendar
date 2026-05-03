"use client";

import { useSchedule } from "@/lib/ScheduleContext";
import { Palette, CalendarDays, Download } from "lucide-react";
import { classNames } from "@/lib/utils";
import React from "react";

const MOBILE_TABS = [
  { id: "start",   label: "Courses", icon: CalendarDays },
  { id: "design",  label: "Design",  icon: Palette },
  { id: "export",  label: "Export",  icon: Download },
] as const;

export default function MobileControls({ children }: { children: React.ReactNode }) {
  const { mobileTab, setMobileTab, setDesktopPanel } = useSchedule();

  return (
    <div className="flex shrink-0 flex-col border-t border-white/10 bg-[#090D0B]/95 pb-safe backdrop-blur-xl md:hidden">
      <div className="flex gap-1.5 p-2">
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
                setMobileTab(tab.id as any);
                setDesktopPanel(tab.id as any);
              }}
            >
              <TabIcon size={17} strokeWidth={active ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      <div className="max-h-[45dvh] overflow-y-auto border-t border-white/[0.06] scrollbar-thin">
        {children}
      </div>
    </div>
  );
}