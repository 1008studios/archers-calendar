"use client";

import { useSchedule } from "@/lib/ScheduleContext";
import { Palette, CalendarDays, Download, Files } from "lucide-react";
import { classNames } from "@/lib/utils";
import React, { useRef, useEffect } from "react";

const MOBILE_TABS = [
  { id: "start",   label: "Courses", icon: CalendarDays },
  { id: "saved",   label: "Stored",  icon: Files },
  { id: "design",  label: "Design",  icon: Palette },
  { id: "export",  label: "Export",  icon: Download },
] as const;

export default function MobileControls({ children }: { children: React.ReactNode }) {
  const { mobileTab, setMobileTab, setDesktopPanel, isMobileExpanded, setIsMobileExpanded } = useSchedule();
  
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ y: number; time: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Sync React state to DOM inline styles when NOT dragging
  useEffect(() => {
    if (!contentRef.current) return;
    if (touchStartRef.current) return; // Do not interrupt an active drag
    
    const el = contentRef.current;
    el.style.transition = "max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease, border-width 0.3s ease";
    
    if (isMobileExpanded) {
      el.style.maxHeight = "50dvh";
      el.style.opacity = "1";
      el.style.borderTopWidth = "1px";
    } else {
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
      el.style.borderTopWidth = "0px";
    }
  }, [isMobileExpanded]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!contentRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    const startHeight = contentRef.current.getBoundingClientRect().height;
    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now(),
      height: startHeight
    };
    contentRef.current.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !contentRef.current) return;
    
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    let newHeight = touchStartRef.current.height - deltaY;
    
    const maxH = window.innerHeight * 0.5;
    if (newHeight < 0) newHeight = 0;
    // Add rubber banding effect when dragging past the max height
    if (newHeight > maxH) newHeight = maxH + (newHeight - maxH) * 0.15;
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    // Use requestAnimationFrame for 120fps display syncing
    rafRef.current = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      contentRef.current.style.maxHeight = `${newHeight}px`;
      contentRef.current.style.opacity = `${Math.min(1, newHeight / 40)}`; // Fade in quickly
      contentRef.current.style.borderTopWidth = newHeight > 0 ? "1px" : "0px";
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !contentRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = deltaY / deltaTime; 
    
    touchStartRef.current = null;
    
    const el = contentRef.current;
    el.style.transition = "max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease, border-width 0.3s ease";
    
    const currentHeight = el.getBoundingClientRect().height;
    const maxH = window.innerHeight * 0.5;
    
    let shouldExpand = isMobileExpanded;
    // Fast swipe down
    if (velocity > 0.5) shouldExpand = false;
    // Fast swipe up
    else if (velocity < -0.5) shouldExpand = true;
    // Slow drag, snap to nearest boundary
    else shouldExpand = currentHeight > maxH / 2;
    
    if (shouldExpand !== isMobileExpanded) {
      setIsMobileExpanded(shouldExpand);
    } else {
      // Revert visually if state didn't change
      el.style.maxHeight = shouldExpand ? "50dvh" : "0px";
      el.style.opacity = shouldExpand ? "1" : "0";
      el.style.borderTopWidth = shouldExpand ? "1px" : "0px";
    }
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-white/10 bg-[#090D0B]/95 pb-safe backdrop-blur-xl md:hidden">
      <div
        className="touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                    setIsMobileExpanded(!isMobileExpanded);
                  } else {
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
        ref={contentRef}
        className="overflow-y-auto border-white/[0.06] scrollbar-thin"
        style={{
          maxHeight: isMobileExpanded ? "50dvh" : "0px",
          opacity: isMobileExpanded ? 1 : 0,
          borderTopWidth: isMobileExpanded ? "1px" : "0px",
        }}
      >
        {children}
      </div>
    </div>
  );
}