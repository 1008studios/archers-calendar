"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { ScheduleEntry } from "@/lib/schedule-parser";
import { ImportSource } from "@/lib/import-calendar";
import type { CalendarFont } from "@/lib/calendar-fonts";
export type { CalendarFont } from "@/lib/calendar-fonts";

// --- Types (Moved from page.tsx) ---
export type MobileTab = "start" | "design" | "export";
export type SidebarPanel = "start" | "design" | "export";
export type CalendarTone = "dark" | "light";
export type WallpaperStyle = "clean" | "compact" | "bold" | "glass" | "glass_light" | "glass_dark";
export type GridPosition = "center" | "left" | "right" | "top" | "bottom";
export type ExportVariant = "full" | "transparent" | "background";
export type AppTheme = "dark" | "light";
export type BackgroundKind = "solid" | "image" | "gradient" | "pattern" | "geometric";
export type OverlayKind = "none" | "pattern" | "geometric";
export type GradientType = "linear" | "radial";
export type PatternPreset = "grid" | "diagonal";
export type GeometricKind = "dots" | "grid" | "lines" | "plus" | "blueprint";
export type DeviceId = "iphone" | "ipad_portrait" | "ipad_landscape" | "laptop" | "macbook" | "share";
export type ExportProgress = {
  label: string;
  current: number;
  total: number;
};

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
  dash: number;
};

// --- Defaults (Moved from page.tsx) ---
export const DEFAULT_GEOMETRIC: GeometricConfig = { kind: "dots", color: "#008c4d", size: 2.5, spacing: 32, opacity: 0.25, dash: 0 };
export const DEFAULT_BACKGROUND = "#185A37";
export const DEFAULT_GRADIENT: GradientConfig = { type: "linear", colors: ["#185A37", "#07120C"], angle: 135, position: "center" };
export const DEFAULT_PATTERN: PatternConfig = { emoji: "✨", preset: "diagonal", size: 180, spacing: 180, opacity: 0.16 };
export const DEFAULT_VISIBLE_DAYS: Record<string, boolean> = { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false };

export type DeviceGridSettings = {
  x: number;
  y: number;
  sx: number; // Horizontal size (1-5)
  sy: number; // Vertical size (1-5)
};

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
  showCalendarTitle: boolean;
  setShowCalendarTitle: (val: boolean) => void;
  showCalendarSubtitle: boolean;
  setShowCalendarSubtitle: (val: boolean) => void;
  autoHideEmptyDays: boolean;
  setAutoHideEmptyDays: (val: boolean) => void;
  device: DeviceId;
  setDevice: (val: DeviceId) => void;
  wallpaperStyle: WallpaperStyle;
  setWallpaperStyle: (val: WallpaperStyle) => void;
  appTheme: AppTheme;
  setAppTheme: (val: AppTheme) => void;
  gridPosition: GridPosition;
  setGridPosition: (val: GridPosition) => void;

  // Per-device settings
  deviceSettings: Record<DeviceId, DeviceGridSettings>;
  setDeviceSettings: React.Dispatch<React.SetStateAction<Record<DeviceId, DeviceGridSettings>>>;

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
  setGeometric: React.Dispatch<React.SetStateAction<GeometricConfig>>;
  overlayKind: OverlayKind;
  setOverlayKind: (val: OverlayKind) => void;
  emojiOverlayEnabled: boolean;
  setEmojiOverlayEnabled: (val: boolean) => void;
  lineOverlayEnabled: boolean;
  setLineOverlayEnabled: (val: boolean) => void;
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
  exportProgress: ExportProgress | null;
  setExportProgress: (val: ExportProgress | null) => void;
  isParsing: boolean;
  setIsParsing: (val: boolean) => void;
  isMobileExpanded: boolean;
  setIsMobileExpanded: (val: boolean) => void;
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
  expandedCourses: Set<string>;
  setExpandedCourses: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedExportDevices: Set<DeviceId>;
  setSelectedExportDevices: React.Dispatch<React.SetStateAction<Set<DeviceId>>>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const DEFAULT_DEVICE_SETTINGS: Record<DeviceId, DeviceGridSettings> = {
  iphone:         { x: 0, y: 0, sx: 1, sy: 1 },
  ipad_portrait:  { x: 0, y: 0, sx: 3, sy: 3 },
  ipad_landscape: { x: 0, y: 0, sx: 3, sy: 3 },
  laptop:         { x: 0, y: 0, sx: 3, sy: 3 },
  macbook:        { x: 0, y: 0, sx: 3, sy: 3 },
  share:          { x: 0, y: 0, sx: 3, sy: 3 },
};

export function ScheduleProvider({ children }: { children: ReactNode }) {
  // --- State Initialization ---
  const [activeCoursePalette, setActiveCoursePalette] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [visibleDays, setVisibleDays] = useState(DEFAULT_VISIBLE_DAYS);
  const [showRoom, setShowRoom] = useState(true);
  const [showProfessor, setShowProfessor] = useState(false);
  const [showSection, setShowSection] = useState(true);
  const [showCourseTitle, setShowCourseTitle] = useState(false);
  const [showCalendarTitle, setShowCalendarTitle] = useState(true);
  const [showCalendarSubtitle, setShowCalendarSubtitle] = useState(true);
  const [autoHideEmptyDays, setAutoHideEmptyDays] = useState(true);
  const [device, setDevice] = useState<DeviceId>("iphone");
  const [wallpaperStyle, setWallpaperStyle] = useState<WallpaperStyle>("clean");
  const [appTheme, setAppTheme] = useState<AppTheme>("dark");
  const [gridPosition, setGridPosition] = useState<GridPosition>("center");

  const [deviceSettings, setDeviceSettings] = useState<Record<DeviceId, DeviceGridSettings>>(DEFAULT_DEVICE_SETTINGS);

  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>("solid");
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundTone, setBackgroundTone] = useState<CalendarTone>("dark");
  const [gradient, setGradient] = useState<GradientConfig>(DEFAULT_GRADIENT);
  const [pattern, setPattern] = useState<PatternConfig>(DEFAULT_PATTERN);
  const [geometric, setGeometric] = useState<GeometricConfig>(DEFAULT_GEOMETRIC);
  const [overlayKind, setOverlayKind] = useState<OverlayKind>("none");
  const [emojiOverlayEnabled, setEmojiOverlayEnabled] = useState(false);
  const [lineOverlayEnabled, setLineOverlayEnabled] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("start");
  const [desktopPanel, setDesktopPanel] = useState<SidebarPanel>("start");
  const [calendarTitle, setCalendarTitle] = useState("Name's Schedule");
  const [calendarSubtitle, setCalendarSubtitle] = useState("Term 3");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSource, setImportSource] = useState<ImportSource | "">("");
  const [saveNotice, setSaveNotice] = useState("");
  const [exportVariant, setExportVariant] = useState<ExportVariant>("full");
  const [calendarFont, setCalendarFont] = useState<CalendarFont>("geist");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [selectedExportDevices, setSelectedExportDevices] = useState<Set<DeviceId>>(new Set<DeviceId>(["iphone"]));

  const value = useMemo(() => ({
    activeCoursePalette, setActiveCoursePalette,
    rawText, setRawText,
    entries, setEntries,
    visibleDays, setVisibleDays,
    showRoom, setShowRoom,
    showProfessor, setShowProfessor,
    showSection, setShowSection,
    showCourseTitle, setShowCourseTitle,
    showCalendarTitle, setShowCalendarTitle,
    showCalendarSubtitle, setShowCalendarSubtitle,
    autoHideEmptyDays, setAutoHideEmptyDays,
    device, setDevice,
    wallpaperStyle, setWallpaperStyle,
    appTheme, setAppTheme,
    gridPosition, setGridPosition,
    deviceSettings, setDeviceSettings,
    backgroundKind, setBackgroundKind,
    background, setBackground,
    backgroundImage, setBackgroundImage,
    backgroundTone, setBackgroundTone,
    gradient, setGradient,
    pattern, setPattern,
    geometric, setGeometric,
    overlayKind, setOverlayKind,
    emojiOverlayEnabled, setEmojiOverlayEnabled,
    lineOverlayEnabled, setLineOverlayEnabled,
    mobileTab, setMobileTab,
    desktopPanel, setDesktopPanel,
    calendarTitle, setCalendarTitle,
    calendarSubtitle, setCalendarSubtitle,
    isExporting, setIsExporting,
    exportProgress, setExportProgress,
    isParsing, setIsParsing,
    isMobileExpanded, setIsMobileExpanded,
    importError, setImportError,
    importSource, setImportSource,
    saveNotice, setSaveNotice,
    exportVariant, setExportVariant,
    calendarFont, setCalendarFont,
    expandedCourses, setExpandedCourses,
    selectedExportDevices, setSelectedExportDevices
  }), [
    activeCoursePalette, rawText, entries, visibleDays, showRoom, showProfessor, showSection, showCourseTitle, showCalendarTitle, showCalendarSubtitle, autoHideEmptyDays, device, wallpaperStyle, appTheme, gridPosition, deviceSettings, backgroundKind, background, backgroundImage, backgroundTone, gradient, pattern, geometric, overlayKind, emojiOverlayEnabled, lineOverlayEnabled, mobileTab, desktopPanel, calendarTitle, calendarSubtitle, isExporting, exportProgress, isParsing, isMobileExpanded, importError, importSource, saveNotice, exportVariant, calendarFont, expandedCourses, selectedExportDevices
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
