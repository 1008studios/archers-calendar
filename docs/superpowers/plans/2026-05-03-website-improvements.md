# Website Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement React Context for global state, reorganize mobile UX with a persistent preview and bottom sheet settings, and optimize high-res image export with dynamic scaling and a loading UI.

**Architecture:** We will extract all schedule-related state from `app/page.tsx` into a `ScheduleContext`. We will then break down the main page into smaller components: `PreviewCanvas`, `MobileControls` (bottom sheet), and `ExportOverlay`. We will modify the `html2canvas` export logic to scale dynamically based on the device and introduce a blocking loading UI during the export process.

**Tech Stack:** Next.js, React, Tailwind CSS, html2canvas, lucide-react

---

### Task 1: Create Schedule Context

**Files:**
- Create: `lib/ScheduleContext.tsx`

- [ ] **Step 1: Define Context Types and Provider**

Create `lib/ScheduleContext.tsx` and move all the state definitions, default values, and helper functions (like `toneFromHex`, `buildGradientBackground`, etc. that are purely related to state manipulation) from `app/page.tsx` into this file.

```tsx
"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { ScheduleEntry } from "@/lib/schedule-parser";
import { ImportSource } from "@/lib/import-calendar";

// --- Types (Moved from page.tsx) ---
export type MobileTab = "start" | "design" | "export";
export type SidebarPanel = "start" | "design" | "export";
export type CalendarTone = "dark" | "light";
export type CalendarThemeMode = "normal" | "light" | "dark";
export type WallpaperStyle = "clean" | "compact" | "bold" | "glass";
export type GridPosition = "center" | "left" | "right" | "top" | "bottom";
export type ExportVariant = "full" | "transparent" | "background";
export type CalendarFont = "geist" | "inter" | "poppins" | "system";
export type AppTheme = "dark" | "light";
export type BackgroundKind = "solid" | "image" | "gradient" | "pattern" | "geometric";
export type GradientType = "linear" | "radial";
export type PatternPreset = "grid" | "diagonal";
export type GeometricKind = "dots" | "grid" | "lines" | "plus" | "blueprint";
export type DeviceId = "iphone" | "ipad_portrait" | "ipad_landscape" | "laptop" | "macbook" | "share";

export type GradientConfig = {
  type: GradientType;
  colors: string[];
  angle: number;
  position: string;
  preset?: string;
};

export type PatternConfig = {
  emoji: string;
  preset: PatternPreset;
  size: number;
  spacing: number;
  opacity: number;
};

export type GeometricConfig = {
  kind: GeometricKind;
  color: string;
  size: number;
  spacing: number;
  opacity: number;
};

// --- Defaults (Moved from page.tsx) ---
export const DEFAULT_GEOMETRIC: GeometricConfig = { kind: "dots", color: "#008c4d", size: 2.5, spacing: 32, opacity: 0.25 };
export const DEFAULT_BACKGROUND = "#185A37";
export const DEFAULT_GRADIENT: GradientConfig = { type: "linear", colors: ["#185A37", "#07120C"], angle: 135, position: "center" };
export const DEFAULT_PATTERN: PatternConfig = { emoji: "✨", preset: "diagonal", size: 24, spacing: 64, opacity: 0.10 };
export const DEFAULT_VISIBLE_DAYS: Record<string, boolean> = { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false };

// --- Context Interface ---
interface ScheduleContextType {
  activeCoursePalette: string[];
  setActiveCoursePalette: (val: string[]) => void;
  rawText: string;
  setRawText: (val: string) => void;
  entries: ScheduleEntry[];
  setEntries: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  visibleDays: Record<string, boolean>;
  setVisibleDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showRoom: boolean;
  setShowRoom: (val: boolean) => void;
  showProfessor: boolean;
  setShowProfessor: (val: boolean) => void;
  showSection: boolean;
  setShowSection: (val: boolean) => void;
  showCourseTitle: boolean;
  setShowCourseTitle: (val: boolean) => void;
  autoHideEmptyDays: boolean;
  setAutoHideEmptyDays: (val: boolean) => void;
  device: DeviceId;
  setDevice: (val: DeviceId) => void;
  wallpaperStyle: WallpaperStyle;
  setWallpaperStyle: (val: WallpaperStyle) => void;
  appTheme: AppTheme;
  setAppTheme: (val: AppTheme) => void;
  calendarThemeMode: CalendarThemeMode;
  setCalendarThemeMode: (val: CalendarThemeMode) => void;
  gridPosition: GridPosition;
  setGridPosition: (val: GridPosition) => void;
  backgroundKind: BackgroundKind;
  setBackgroundKind: (val: BackgroundKind) => void;
  background: string;
  setBackground: (val: string) => void;
  backgroundImage: string;
  setBackgroundImage: (val: string) => void;
  backgroundTone: CalendarTone;
  setBackgroundTone: (val: CalendarTone) => void;
  gradient: GradientConfig;
  setGradient: (val: GradientConfig) => void;
  pattern: PatternConfig;
  setPattern: React.Dispatch<React.SetStateAction<PatternConfig>>;
  geometric: GeometricConfig;
  setGeometric: (val: GeometricConfig) => void;
  mobileTab: MobileTab;
  setMobileTab: (val: MobileTab) => void;
  desktopPanel: SidebarPanel;
  setDesktopPanel: (val: SidebarPanel) => void;
  calendarTitle: string;
  setCalendarTitle: (val: string) => void;
  calendarSubtitle: string;
  setCalendarSubtitle: (val: string) => void;
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;
  isParsing: boolean;
  setIsParsing: (val: boolean) => void;
  importError: string;
  setImportError: (val: string) => void;
  importSource: ImportSource | "";
  setImportSource: (val: ImportSource | "") => void;
  saveNotice: string;
  setSaveNotice: (val: string) => void;
  exportVariant: ExportVariant;
  setExportVariant: (val: ExportVariant) => void;
  calendarFont: CalendarFont;
  setCalendarFont: (val: CalendarFont) => void;
  calendarSize: number;
  setCalendarSize: (val: number) => void;
  expandedCourses: Set<string>;
  setExpandedCourses: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedExportDevices: Set<DeviceId>;
  setSelectedExportDevices: React.Dispatch<React.SetStateAction<Set<DeviceId>>>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  // --- State Initialization (Moved from page.tsx) ---
  const [activeCoursePalette, setActiveCoursePalette] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [visibleDays, setVisibleDays] = useState(DEFAULT_VISIBLE_DAYS);
  const [showRoom, setShowRoom] = useState(true);
  const [showProfessor, setShowProfessor] = useState(false);
  const [showSection, setShowSection] = useState(true);
  const [showCourseTitle, setShowCourseTitle] = useState(false);
  const [autoHideEmptyDays, setAutoHideEmptyDays] = useState(true);
  const [device, setDevice] = useState<DeviceId>("laptop");
  const [wallpaperStyle, setWallpaperStyle] = useState<WallpaperStyle>("clean");
  const [appTheme, setAppTheme] = useState<AppTheme>("dark");
  const [calendarThemeMode, setCalendarThemeMode] = useState<CalendarThemeMode>("normal");
  const [gridPosition, setGridPosition] = useState<GridPosition>("center");
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>("solid");
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundTone, setBackgroundTone] = useState<CalendarTone>("dark");
  const [gradient, setGradient] = useState<GradientConfig>(DEFAULT_GRADIENT);
  const [pattern, setPattern] = useState<PatternConfig>(DEFAULT_PATTERN);
  const [geometric, setGeometric] = useState<GeometricConfig>(DEFAULT_GEOMETRIC);
  const [mobileTab, setMobileTab] = useState<MobileTab>("start");
  const [desktopPanel, setDesktopPanel] = useState<SidebarPanel>("start");
  const [calendarTitle, setCalendarTitle] = useState("Name's Schedule");
  const [calendarSubtitle, setCalendarSubtitle] = useState("Term 3");
  const [isExporting, setIsExporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSource, setImportSource] = useState<ImportSource | "">("");
  const [saveNotice, setSaveNotice] = useState("");
  const [exportVariant, setExportVariant] = useState<ExportVariant>("full");
  const [calendarFont, setCalendarFont] = useState<CalendarFont>("geist");
  const [calendarSize, setCalendarSize] = useState(3);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [selectedExportDevices, setSelectedExportDevices] = useState<Set<DeviceId>>(new Set(["iphone", "macbook"]));

  const value = useMemo(() => ({
    activeCoursePalette, setActiveCoursePalette,
    rawText, setRawText,
    entries, setEntries,
    visibleDays, setVisibleDays,
    showRoom, setShowRoom,
    showProfessor, setShowProfessor,
    showSection, setShowSection,
    showCourseTitle, setShowCourseTitle,
    autoHideEmptyDays, setAutoHideEmptyDays,
    device, setDevice,
    wallpaperStyle, setWallpaperStyle,
    appTheme, setAppTheme,
    calendarThemeMode, setCalendarThemeMode,
    gridPosition, setGridPosition,
    backgroundKind, setBackgroundKind,
    background, setBackground,
    backgroundImage, setBackgroundImage,
    backgroundTone, setBackgroundTone,
    gradient, setGradient,
    pattern, setPattern,
    geometric, setGeometric,
    mobileTab, setMobileTab,
    desktopPanel, setDesktopPanel,
    calendarTitle, setCalendarTitle,
    calendarSubtitle, setCalendarSubtitle,
    isExporting, setIsExporting,
    isParsing, setIsParsing,
    importError, setImportError,
    importSource, setImportSource,
    saveNotice, setSaveNotice,
    exportVariant, setExportVariant,
    calendarFont, setCalendarFont,
    calendarSize, setCalendarSize,
    expandedCourses, setExpandedCourses,
    selectedExportDevices, setSelectedExportDevices
  }), [
    activeCoursePalette, rawText, entries, visibleDays, showRoom, showProfessor, showSection, showCourseTitle, autoHideEmptyDays, device, wallpaperStyle, appTheme, calendarThemeMode, gridPosition, backgroundKind, background, backgroundImage, backgroundTone, gradient, pattern, geometric, mobileTab, desktopPanel, calendarTitle, calendarSubtitle, isExporting, isParsing, importError, importSource, saveNotice, exportVariant, calendarFont, calendarSize, expandedCourses, selectedExportDevices
  ]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ScheduleContext.tsx
git commit -m "refactor: extract state to ScheduleContext"
```

---

### Task 2: Implement Component Splitting (PreviewCanvas)

**Files:**
- Create: `components/PreviewCanvas.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Extract PreviewCanvas Component**

Move the rendering logic for the calendar canvas from `app/page.tsx` into a new `components/PreviewCanvas.tsx` file. Update it to use `useSchedule`.

*(Since this requires moving a huge chunk of code and we are writing the plan, we will describe the structural change in `page.tsx` instead of writing out the entire 1500+ line component here).*

- [ ] **Step 2: Update `app/page.tsx` to use Providers and Components**

Wrap the main layout in `<ScheduleProvider>` and replace the inline canvas code with `<PreviewCanvas />`.

```tsx
// app/page.tsx
"use client";

import { ScheduleProvider } from "@/lib/ScheduleContext";
import PreviewCanvas from "@/components/PreviewCanvas";
// ... imports

export default function Home() {
  return (
    <ScheduleProvider>
      <MainApp />
    </ScheduleProvider>
  )
}

function MainApp() {
    // ... inside the layout where the preview was ...
    // <div className="flex-1 ...">
    //    <PreviewCanvas />
    // </div>
}
```

- [ ] **Step 3: Commit**

```bash
git add components/PreviewCanvas.tsx app/page.tsx
git commit -m "refactor: extract PreviewCanvas component"
```

---

### Task 3: Mobile UX Reorganization (Bottom Sheet)

**Files:**
- Create: `components/MobileControls.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create MobileControls Component**

Create `components/MobileControls.tsx` that implements a bottom sheet interface.

```tsx
"use client";

import { useSchedule } from "@/lib/ScheduleContext";
import { Palette, CalendarDays, Download, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
// ... import Sidebar panels or the content of the tabs

export default function MobileControls() {
  const { mobileTab, setMobileTab } = useSchedule();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSheet = () => setIsExpanded(!isExpanded);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 transition-transform duration-300 z-50 ${isExpanded ? 'h-[80vh]' : 'h-[60px]'}`}>
        {/* Handle / Header */}
        <button onClick={toggleSheet} className="w-full flex items-center justify-center p-2 text-zinc-400 hover:text-white">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mb-1" />
        </button>

        {/* Tabs (always visible when collapsed or top of expanded view) */}
        <div className="flex justify-around border-b border-zinc-800 bg-zinc-900 pb-2">
            <button onClick={() => { setMobileTab("start"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'start' ? 'text-green-500' : 'text-zinc-400'}`}><CalendarDays size={20} /><span className="text-[10px] mt-1">Courses</span></button>
            <button onClick={() => { setMobileTab("design"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'design' ? 'text-green-500' : 'text-zinc-400'}`}><Palette size={20} /><span className="text-[10px] mt-1">Design</span></button>
            <button onClick={() => { setMobileTab("export"); setIsExpanded(true); }} className={`flex flex-col items-center p-2 ${mobileTab === 'export' ? 'text-green-500' : 'text-zinc-400'}`}><Download size={20} /><span className="text-[10px] mt-1">Export</span></button>
        </div>

        {/* Content Area */}
        <div className={`overflow-y-auto p-4 ${isExpanded ? 'h-[calc(100%-80px)] opacity-100' : 'h-0 opacity-0'} transition-opacity`}>
            {/* Render appropriate content based on mobileTab */}
            {mobileTab === "start" && <div>{/* Courses Content */}</div>}
            {mobileTab === "design" && <div>{/* Design Content */}</div>}
            {mobileTab === "export" && <div>{/* Export Content */}</div>}
        </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `app/page.tsx` for Persistent Preview**

Modify the main layout in `app/page.tsx` to ensure the `PreviewCanvas` is always visible on mobile, sitting above the new `MobileControls`.

- [ ] **Step 3: Commit**

```bash
git add components/MobileControls.tsx app/page.tsx
git commit -m "feat: implement mobile bottom sheet controls"
```

---

### Task 4: Export Optimization (Dynamic Scale & Loading UI)

**Files:**
- Create: `components/ExportOverlay.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create ExportOverlay Component**

Create `components/ExportOverlay.tsx` to display a blocking UI when `isExporting` is true.

```tsx
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
```

- [ ] **Step 2: Update `html2canvas` logic in `app/page.tsx`**

Modify the `exportAsImage` function (or wherever it was moved during component splitting) to dynamically adjust the scale based on the viewport width and set `isExporting` state correctly.

```tsx
// Inside the component handling export (e.g., ExportPanel.tsx or page.tsx)
// ... inside export function
const isMobile = window.innerWidth <= 768;
// Use 4x for desktop, 2x for mobile to save memory
const dynamicScale = isMobile ? 2 : 4; 

setIsExporting(true);
// Use setTimeout to allow the browser to render the loading overlay before blocking the thread
setTimeout(async () => {
    try {
        const canvas = await html2canvas(element, {
            scale: dynamicScale,
            // ... other existing options
        });
        // ... rest of export logic
    } catch (e) {
        console.error("Export failed", e);
    } finally {
        setIsExporting(false);
    }
}, 50);
```

- [ ] **Step 3: Add `<ExportOverlay />` to Layout**

Ensure `<ExportOverlay />` is rendered near the root of the app in `app/page.tsx` so it covers everything.

- [ ] **Step 4: Commit**

```bash
git add components/ExportOverlay.tsx app/page.tsx
git commit -m "perf: optimize export scaling and add loading UI"
```
