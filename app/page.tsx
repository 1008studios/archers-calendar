"use client";

import { classNames, getTextColor, computeRowCells, formatTimeSlot, courseParts, getStartMinutes, toneFromRgb, toneFromHex, toneFromColors, getPaletteTextColor, buildGradientBackground, buildEmojiPatternBackground, buildGeometricBackground, normalizeHexColor, hexToRgb, estimateImageTone, courseKeyFromCode, courseKeyFromCourse, getExpandedCourseSet, formatMeetingDays, getSlotDurationMinutes, groupEntriesByCourse, rangeProgress, formatPixels } from "@/lib/utils";
import { CALENDAR_FONT_OPTIONS, CALENDAR_FONT_VALUES, getCalendarFontOption, type CalendarFont } from "@/lib/calendar-fonts";
import { toCanvas } from "html-to-image";
import JSZip from "jszip";
import dynamic from "next/dynamic";
import {
  AlignLeft,
  BookOpen,
  Bug,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Hash,
  Image as ImageIcon,
  ImagePlus,
  Laptop,
  Layers,
  Loader2,
  MapPin,
  Monitor,
  Moon,
  Move,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Trash2,
  UserRound,
  Wand2,
  FileInput,
  Link2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EmojiClickData, PickerProps } from "emoji-picker-react";
import { ChangeEvent, CSSProperties, ClipboardEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  parseScheduleImport,
  sanitizeScheduleEntries,
  type ImportSource
} from "@/lib/import-calendar";
import {
  DAY_ORDER,
  DayKey,
  normalizeDay,
  parseScheduleHtml,
  parseScheduleText,
  scheduleTableHtmlToText,
  ScheduleEntry
} from "@/lib/schedule-parser";

const EmojiPicker = dynamic<PickerProps>(
  () => import("emoji-picker-react").then((module) => module.default),
  { ssr: false }
);

type ImportCalendarResponse = {
  entries?: ScheduleEntry[];
  source?: ImportSource;
  message?: string;
};

type MobileTab = "start" | "design" | "export";
type SidebarPanel = "start" | "design" | "export";
type CalendarTone = "dark" | "light";
type WallpaperStyle = "clean" | "compact" | "bold" | "glass" | "glass_light" | "glass_dark";
type GridPosition = "center" | "left" | "right" | "top" | "bottom";
type ExportVariant = "full" | "transparent" | "background";
type AppTheme = "dark" | "light";
type BackgroundKind = "solid" | "image" | "gradient" | "pattern" | "geometric";
type OverlayKind = "none" | "pattern" | "geometric";
type GradientType = "linear" | "radial";
type PatternPreset = "grid" | "diagonal";
type GeometricKind = "dots" | "grid" | "lines" | "plus" | "blueprint";

type GradientConfig = {
  type: GradientType;
  colors: string[];
  angle: number;
  position: string;
  preset?: string;
};

type PatternConfig = {
  emoji: string;
  preset: PatternPreset;
  size: number;
  spacing: number;
  opacity: number;
};

type GeometricConfig = {
  kind: GeometricKind;
  color: string;
  size: number;
  spacing: number;
  opacity: number;
  dash: number;
};

const DEFAULT_GEOMETRIC: GeometricConfig = {
  kind: "dots",
  color: "#008c4d",
  size: 2.5,
  spacing: 32,
  opacity: 0.25,
  dash: 0
};

const GEOMETRIC_KIND_OPTIONS: Array<{ value: GeometricKind; label: string }> = [
  { value: "dots",      label: "Dots" },
  { value: "grid",      label: "Grid" },
  { value: "lines",     label: "Lines" },
  { value: "plus",      label: "Plus" },
  { value: "blueprint", label: "Blueprint" },
];

const GEOMETRIC_PRESETS: Array<{ name: string; config: Partial<GeometricConfig> }> = [
  { name: "Grid", config: { kind: "grid", size: 1, spacing: 32, opacity: 0.15, dash: 0 } },
  { name: "Dots", config: { kind: "dots", size: 2.5, spacing: 24, opacity: 0.2, dash: 0 } },
  { name: "Blueprint", config: { kind: "blueprint", size: 1.5, spacing: 64, opacity: 0.12, dash: 0 } },
  { name: "Minimal", config: { kind: "lines", size: 1, spacing: 48, opacity: 0.08, dash: 0 } },
  { name: "Dashed", config: { kind: "lines", size: 1.2, spacing: 16, opacity: 0.1, dash: 6 } },
];

type SavedScheduleState = {
  rawText: string;
  entries: ScheduleEntry[];
  visibleDays: Record<DayKey, boolean>;
  showRoom: boolean;
  showProfessor: boolean;
  showSection: boolean;
  showCourseTitle: boolean;
  showCalendarTitle?: boolean;
  showCalendarSubtitle?: boolean;
  autoHideEmptyDays: boolean;
  calendarTitle: string;
  calendarSubtitle: string;
  activeCoursePalette: string[];
  device: DeviceId;
  wallpaperStyle: WallpaperStyle;
  appTheme: AppTheme;
  gridPosition: GridPosition;
  deviceSettings?: Record<DeviceId, DeviceGridSettings>; // New per-device settings
  gridOffsetX: number; // Legacy, kept for migration
  gridOffsetY: number; // Legacy
  backgroundKind: BackgroundKind;
  overlayKind?: OverlayKind;
  emojiOverlayEnabled?: boolean;
  lineOverlayEnabled?: boolean;
  background: string;
  backgroundImage: string;
  backgroundTone: CalendarTone;
  gradient: GradientConfig;
  pattern: PatternConfig;
  geometric?: GeometricConfig;
  calendarSize: number; // Legacy
  exportVariant: ExportVariant;
  calendarFont: CalendarFont;
  workflowStep?: SidebarPanel;
};

type SavedScheduleSnapshot = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  state: SavedScheduleState;
  thumbnail?: string;
};

type SharedDesignState = {
  version: 1;
  backgroundKind: BackgroundKind;
  overlayKind: OverlayKind;
  emojiOverlayEnabled: boolean;
  lineOverlayEnabled: boolean;
  background: string;
  backgroundImage: string;
  backgroundTone: CalendarTone;
  gradient: GradientConfig;
  pattern: PatternConfig;
  geometric?: GeometricConfig;
  wallpaperStyle: WallpaperStyle;
  appTheme: AppTheme;
  gridPosition: GridPosition;
  gridOffsetX: number;
  gridOffsetY: number;
  calendarFont: CalendarFont;
  showCalendarTitle: boolean;
  showCalendarSubtitle: boolean;
  calendarSize: number;
  device: DeviceId;
  exportVariant: ExportVariant;
};

interface StyleConfig {
  name: string;
  gridOpacity: string;
  cellStyle: string;
  borderColor: string;
  headerFont: string;
  showLines: boolean;
  forceTheme?: CalendarTone;
}

const STYLE_PRESETS: Record<WallpaperStyle, StyleConfig> = {
  clean: {
    name: "Classic",
    headerFont: "font-sans",
    gridOpacity: "bg-black/[0.08]",
    cellStyle: "rounded-[4px] border border-black/10 shadow-none",
    borderColor: "border-white/[0.08]",
    showLines: true
  },
  glass_light: {
    name: "Light",
    headerFont: "font-sans",
    gridOpacity: "bg-white/[0.82]",
    cellStyle: "rounded-[4px] border border-black/[0.08] shadow-none",
    borderColor: "border-black/[0.08]",
    showLines: true,
    forceTheme: "light"
  },
  glass_dark: {
    name: "Dark",
    headerFont: "font-sans",
    gridOpacity: "bg-black/[0.36]",
    cellStyle: "rounded-[4px] border border-white/[0.14] shadow-none",
    borderColor: "border-white/[0.14]",
    showLines: true,
    forceTheme: "dark"
  },
  compact: {
    name: "Minimal",
    headerFont: "font-sans font-black",
    gridOpacity: "bg-transparent",
    cellStyle: "rounded-[3px] border border-transparent shadow-none",
    borderColor: "border-transparent",
    showLines: false
  },
  bold: {
    name: "Floating",
    headerFont: "font-sans font-black",
    gridOpacity: "bg-transparent",
    cellStyle: "rounded-[4px] border border-transparent shadow-[0_6px_16px_rgba(0,0,0,0.16)]",
    borderColor: "border-transparent",
    showLines: false
  },
  glass: {
    name: "Frosted",
    headerFont: "font-sans font-black",
    gridOpacity: "bg-transparent",
    cellStyle: "rounded-[6px] border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.18)]",
    borderColor: "border-transparent",
    showLines: true
  }
};

const STYLE_PRESET_DETAILS: Record<WallpaperStyle, string> = {
  clean: "Bordered grid with lines",
  glass_light: "Light mode classic",
  glass_dark: "Dark mode classic",
  compact: "Clean borderless look",
  bold: "Floating cards with depth",
  glass: "Frosted glass effect"
};

const SAMPLE_TEXT = `Schedule Week
Time Slot	Mon 04/05	Tue 05/05	Wed 06/05	Thu 07/05	Fri 08/05	Sat 09/05	Sun 10/05
12:45 PM - 02:15 PM	GEAGNO - AGNO FOOD STUDIES Room : V508 Teacher : Happy Eater Section : E37	GEGOKS - GOKONGWEI TAMBAY Room : - Teacher : Tambay Pro Section : E30		GEAGNO - AGNO FOOD STUDIES Room : - Teacher : Happy Eater Section : E37	GEGOKS - GOKONGWEI TAMBAY Room : M313 Teacher : Tambay Pro Section : E30
02:30 PM - 04:00 PM	GEBILLIARDS - ADVANCED BILLIARDS Room : V512 Teacher : Efren Bata Section : E41			GEBILLIARDS - ADVANCED BILLIARDS Room : V512 Teacher : Efren Bata Section : E41
06:00 PM - 09:00 PM			LBYUCH - UNIV MALL CHILLING Room : A705 Teacher : Chill Master Section : E20
07:30 AM - 10:30 AM					GEGREENCOURT - GREEN COURT SPORTS Room : V103 Teacher : Sports Guy Section : E22		`;

type DeviceId = "iphone" | "ipad_portrait" | "ipad_landscape" | "laptop" | "macbook" | "share";

const DEVICES: Record<DeviceId, { label: string; aspect: string; ratio: number; icon: LucideIcon; description: string }> = {
  iphone:         { label: "iPhone", aspect: "9 / 19.5",   ratio: 9 / 19.5,   icon: Smartphone,      description: "Portrait"         },
  ipad_portrait:  { label: "iPad Portrait", aspect: "3 / 4",      ratio: 3 / 4,      icon: Tablet,          description: "3:4"              },
  ipad_landscape: { label: "iPad Landscape", aspect: "4 / 3",     ratio: 4 / 3,      icon: Tablet,          description: "4:3"              },
  laptop:         { label: "Laptop 16:9",   aspect: "16 / 9",     ratio: 16 / 9,     icon: Laptop,          description: "Widescreen"       },
  macbook:        { label: "MacBook 16:10", aspect: "1440 / 900",  ratio: 1440 / 900, icon: Monitor,         description: "Display"          },
  share:          { label: "Square",   aspect: "1 / 1",      ratio: 1,          icon: ImageIcon,       description: "1:1"              }
};

// Fixed canvas pixel sizes — preview will be CSS-scaled to fit, export captures these exact dimensions
const CANVAS_SIZES: Record<DeviceId, { width: number; height: number }> = {
  iphone:         { width: 430,  height: 932  },
  ipad_portrait:  { width: 768,  height: 1024 },
  ipad_landscape: { width: 1024, height: 768  },
  laptop:         { width: 1440, height: 810  }, // 16:9
  macbook:        { width: 1440, height: 900  }, // 16:10
  share:          { width: 1080, height: 1080 }
};
const EXPORT_SCALE = 6; // High-res export (6× native) — increased from 4x for better readability in dense schedules.

const GRID_SIZE_MIN = 0.2;
const GRID_SIZE_MAX = 12;
const PAD_SCALE_MAP: Record<number, number> = { 1: 0.45, 2: 0.75, 3: 1.0, 4: 1.3, 5: 1.6 };

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function interpolateScale(map: Record<number, number>, value: number) {
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (value <= keys[0]) return map[keys[0]];
  if (value >= keys[keys.length - 1]) return map[keys[keys.length - 1]];
  const lower = keys.filter((key) => key <= value).pop()!;
  const upper = keys.filter((key) => key > value).shift()!;
  const t = (value - lower) / (upper - lower);
  return map[lower] + (map[upper] - map[lower]) * t;
}

function invertScale(map: Record<number, number>, targetScale: number) {
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const leftKey = keys[i];
    const rightKey = keys[i + 1];
    const leftScale = map[leftKey];
    const rightScale = map[rightKey];
    const minScale = Math.min(leftScale, rightScale);
    const maxScale = Math.max(leftScale, rightScale);

    if (targetScale >= minScale && targetScale <= maxScale) {
      const t = (targetScale - leftScale) / (rightScale - leftScale);
      return clampValue(leftKey + (rightKey - leftKey) * t, GRID_SIZE_MIN, GRID_SIZE_MAX);
    }
  }

  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];
  const firstDistance = Math.abs(targetScale - map[firstKey]);
  const lastDistance = Math.abs(targetScale - map[lastKey]);
  return firstDistance < lastDistance ? firstKey : lastKey;
}

function getFrameWidthMap(device: DeviceId): Record<number, number> {
  return device === "iphone"
    ? { 0.2: 1.08, 3: 1.0, 12: 0.1 }
    : { 0.2: 1.0, 3: 0.64, 12: 0.1 };
}

function getFrameHeightMap(device: DeviceId): Record<number, number> {
  if (device === "share") return { 0.2: 1, 12: 1 };
  return device === "iphone"
    ? { 0.2: 1.2, 3: 0.90, 12: 0.1 }
    : { 0.2: 1.1, 3: 0.84, 12: 0.1 };
}

function getFrameBounds(device: DeviceId) {
  const canvas = CANVAS_SIZES[device];
  const isSquare = device === "share";
  const margin = isSquare ? 0 : (device === "iphone" ? 0 : (device.startsWith("ipad") ? 58 : 84));
  return {
    maxWidth: Math.max(1, canvas.width - margin * 2),
    maxHeight: Math.max(1, canvas.height - margin * 2)
  };
}

function getFrameSize(device: DeviceId, sx: number, sy: number) {
  const canvas = CANVAS_SIZES[device];
  const isSquare = device === "share";
  const { maxWidth, maxHeight } = getFrameBounds(device);
  const widthScale = interpolateScale(getFrameWidthMap(device), sx);
  const heightScale = interpolateScale(getFrameHeightMap(device), sy);
  const rawWidth = Math.round(maxWidth * (isSquare ? 1 : widthScale));
  const width = device === "iphone" ? Math.min(maxWidth, rawWidth) : rawWidth;
  const height = Math.round(maxHeight * heightScale);

  return { width, height, canvas };
}

function getFrameLimits(device: DeviceId) {
  const { maxWidth, maxHeight } = getFrameBounds(device);
  const widthMap = getFrameWidthMap(device);
  const heightMap = getFrameHeightMap(device);
  const widthScales = Object.values(widthMap);
  const heightScales = Object.values(heightMap);
  return {
    minWidth: maxWidth * Math.min(...widthScales),
    maxWidth: maxWidth * Math.min(1, Math.max(...widthScales)),
    minHeight: maxHeight * Math.min(...heightScales),
    maxHeight: maxHeight * Math.max(...heightScales)
  };
}

function getBaseFramePad(device: DeviceId) {
  if (device === "laptop") return 64;
  if (device === "macbook") return 72;
  if (device === "share") return 0;
  if (device === "ipad_landscape" || device === "ipad_portrait") return 56;
  return 18;
}

function getFramePad(device: DeviceId, sx: number, densityFactor: number) {
  const isSquare = device === "share";
  return Math.round(
    getBaseFramePad(device) *
    interpolateScale(PAD_SCALE_MAP, sx) *
    (isSquare ? 1 : Math.max(0.4, densityFactor * 0.9))
  );
}

function getGridWidthForSize(device: DeviceId, sx: number, densityFactor: number) {
  const { width } = getFrameSize(device, sx, 3);
  return Math.max(1, width - getFramePad(device, sx, densityFactor) * 2);
}

function getGridWidthLimits(device: DeviceId, densityFactor: number) {
  const minWidth = getGridWidthForSize(device, GRID_SIZE_MAX, densityFactor);
  const maxWidth = getGridWidthForSize(device, GRID_SIZE_MIN, densityFactor);
  return { minWidth, maxWidth };
}

function settingFromGridWidth(device: DeviceId, gridWidth: number, densityFactor: number) {
  let low = GRID_SIZE_MIN;
  let high = GRID_SIZE_MAX;

  for (let i = 0; i < 28; i += 1) {
    const mid = (low + high) / 2;
    const width = getGridWidthForSize(device, mid, densityFactor);
    if (width > gridWidth) low = mid;
    else high = mid;
  }

  return clampValue((low + high) / 2, GRID_SIZE_MIN, GRID_SIZE_MAX);
}

function settingFromFrameHeight(device: DeviceId, height: number) {
  const { maxHeight } = getFrameBounds(device);
  return invertScale(getFrameHeightMap(device), height / maxHeight);
}

function getManipulationCursor(type: string) {
  if (type === "move") return "grabbing";
  const direction = type.replace("resize-", "");
  if (direction === "nw" || direction === "se") return "nwse-resize";
  if (direction === "ne" || direction === "sw") return "nesw-resize";
  if (direction === "n" || direction === "s") return "ns-resize";
  return "ew-resize";
}

const BLOCK_PALETTE_GROUPS = [
  {
    label: "Pink",
    colors: [
      { name: "Blush",      hex: "#FFB3C1" },
      { name: "Rose",       hex: "#FF85A1" },
      { name: "Strawberry", hex: "#FF6B8A" },
      { name: "Hot Pink",   hex: "#FF4D9E" },
      { name: "Fuchsia",    hex: "#E040FB" },
      { name: "Magenta",    hex: "#F472B6" },
      { name: "Bubblegum",  hex: "#FF9FD7" },
      { name: "Ribbon",     hex: "#FF7AB8" }
    ]
  },
  {
    label: "Warm",
    colors: [
      { name: "Coral",      hex: "#FF9080" },
      { name: "Red",        hex: "#EF5350" },
      { name: "Crimson",    hex: "#C62828" },
      { name: "Peach",      hex: "#FFCBA4" },
      { name: "Apricot",    hex: "#FFB36B" },
      { name: "Tangerine",  hex: "#FF8A3D" },
      { name: "Honey",      hex: "#FFDA8A" },
      { name: "Flame",      hex: "#FF6A3D" },
      { name: "Ruby",       hex: "#E0115F" },
      { name: "Maroon",     hex: "#800000" }
    ]
  },
  {
    label: "Green",
    colors: [
      { name: "Lime",       hex: "#B5F03B" },
      { name: "Dew",        hex: "#C8F0D8" },
      { name: "Matcha",     hex: "#B5D5A0" },
      { name: "Sage",       hex: "#A8C8A0" },
      { name: "Mint",       hex: "#A8EED5" },
      { name: "Teal",       hex: "#4DB6AC" },
      { name: "Jade",       hex: "#57C785" },
      { name: "Leaf",       hex: "#2FBF71" },
      { name: "Neon",       hex: "#39FF14" }
    ]
  },
  {
    label: "Blue",
    colors: [
      { name: "Aqua",       hex: "#7DE3F4" },
      { name: "Sky",        hex: "#A8D8F0" },
      { name: "Cobalt",     hex: "#5C82E8" },
      { name: "Periwinkle", hex: "#A0B8F0" },
      { name: "Slate",      hex: "#90A4B8" },
      { name: "Denim",      hex: "#4A6FA5" },
      { name: "Navy",       hex: "#385A8C" },
      { name: "Azure",      hex: "#38A3FF" },
      { name: "Indigo",     hex: "#4B0082" },
      { name: "Violet",     hex: "#8F00FF" }
    ]
  },
  {
    label: "Purple",
    colors: [
      { name: "Lavender",   hex: "#D4BFFF" },
      { name: "Iris",       hex: "#B8A0F0" },
      { name: "Lilac",      hex: "#E8C8F8" },
      { name: "Taro",       hex: "#C4B0E8" },
      { name: "Mochi",      hex: "#F0D8F8" },
      { name: "Violet",     hex: "#9B7AE5" },
      { name: "Grape",      hex: "#7B4FCB" },
      { name: "Amethyst",   hex: "#A855F7" },
      { name: "Orchid",     hex: "#DA70D6" },
      { name: "Plum",       hex: "#DDA0DD" }
    ]
  },
  {
    label: "Neutral",
    colors: [
      { name: "Cream",      hex: "#F5ECD8" },
      { name: "Cloud",      hex: "#EEF2F5" },
      { name: "Latte",      hex: "#D8C0A8" },
      { name: "Tan",        hex: "#C4A07A" },
      { name: "Stone",      hex: "#A8A29E" },
      { name: "Sienna",     hex: "#A0522D" },
      { name: "Charcoal",   hex: "#455A64" },
      { name: "Graphite",   hex: "#6B7280" }
    ]
  }
];

const BLOCK_PALETTES = BLOCK_PALETTE_GROUPS.flatMap((group) => group.colors);
const COURSE_COLOR_CHOICES = BLOCK_PALETTE_GROUPS.flatMap((group) =>
  group.colors.map((palette) => ({ ...palette, group: group.label }))
);

const COURSE_THEMES: Array<{ name: string; colors: string[] }> = [
  { name: "Animo",      colors: ["#90C878","#B5D5A0","#68B058","#D4EDC5","#5AB050","#A8D890","#3A9040","#C8E8B0","#00703C","#185A37","#8DD67A","#DFF5D4"] },
  { name: "Forest",     colors: ["#C8E6C9","#B2DFDB","#80CBC4","#4DB6AC","#26A69A","#009688","#00897B","#00796B","#2EAD6B","#57C785","#3D8B5F","#A7D7A8"] },
  { name: "Mint",       colors: ["#D9F99D","#BBF7D0","#A7F3D0","#99F6E4","#5EEAD4","#34D399","#86EFAC","#4ADE80","#22C55E","#10B981","#2DD4BF","#CCFBF1"] },
  { name: "Lagoon",     colors: ["#D1FAE5","#A7F3D0","#6EE7B7","#5EEAD4","#2DD4BF","#14B8A6","#0F766E","#06B6D4","#22D3EE","#0891B2","#155E75","#E0F7FA"] },
  { name: "Ocean",      colors: ["#A8D8F0","#85C1E9","#B3E5FC","#5DADE2","#81D4FA","#29B6F6","#B2EBF2","#4FC3F7","#38BDF8","#67E8F9","#7DD3FC","#2DD4BF"] },
  { name: "Sky",        colors: ["#E0F2FE","#BAE6FD","#7DD3FC","#38BDF8","#0EA5E9","#60A5FA","#93C5FD","#BFDBFE","#A5B4FC","#818CF8","#67E8F9","#CFFAFE"] },
  { name: "Lavender",   colors: ["#D4BFFF","#E8C8F8","#C4B0E8","#B8A8FF","#EAD5FF","#CDB8F8","#F0E0FF","#DDD0FF","#BFA6FF","#E6D6FF","#A98BFF","#F4E8FF"] },
  { name: "Blossom",    colors: ["#FFB3C1","#FF85A1","#FFD6E7","#F5A0B8","#FFCCE0","#FFC4D6","#FF9BB5","#FFDDE8","#F7A7C0","#FFCAD4","#EFA7B8","#FFE0EE"] },
  { name: "Candy",      colors: ["#FF6B9D","#FF8ED3","#C084FC","#F472B6","#E879F9","#FF70A0","#A78BFA","#FB7185","#FF5EC4","#D946EF","#EC4899","#F9A8D4"] },
  { name: "Berry",      colors: ["#C62828","#AD1457","#7B1FA2","#880E4F","#B71C1C","#8E24AA","#6A1B9A","#C2185B","#9F1239","#BE185D","#86198F","#581C87"] },
  { name: "Peach",      colors: ["#FFCBA4","#FFB899","#FFD4B0","#F5A888","#FFBFA8","#F0C0A0","#FFD8C0","#F5B898","#FF9F80","#FFE0CC","#EFA07A","#FFC09A"] },
  { name: "Sunset",     colors: ["#FFDAB9","#FFCC80","#FFB74D","#FFA726","#FF9800","#FB8C00","#F57C00","#EF6C00","#F97316","#FDBA74","#FF7A59","#E85D04"] },
  { name: "Citrus",     colors: ["#FACC15","#FB923C","#A3E635","#FCD34D","#86EFAC","#FDE68A","#4ADE80","#FCA5A5","#FDBA74","#BEF264","#FFE066","#FFB703"] },
  { name: "Earth",      colors: ["#D4A96A","#A07840","#C49A70","#8B6240","#B8825A","#D4B08A","#986040","#C4A07A","#A16207","#C08457","#8A5A44","#E0C097"] },
  { name: "Dusk",       colors: ["#94A3B8","#7B8FAD","#A8B4C0","#8EA3B4","#B8C5D0","#7B9BAE","#A0AEBC","#5A7A9A","#64748B","#8193A8","#A5B4C3","#475569"] },
  { name: "Monochrome", colors: ["#F5F5F5","#E0E0E0","#EEEEEE","#BDBDBD","#E0E0E0","#9E9E9E","#757575","#616161","#FAFAFA","#CCCCCC","#8A8A8A","#454545"] },
  { name: "Black",      colors: ["#000000","#111111","#1A1A1A","#222222","#0A0A0A","#141414","#1C1C1C","#262626","#050505","#181818","#2B2B2B","#333333"] },
  { name: "Neon",       colors: ["#00FF88","#00D4FF","#FF6B6B","#FFD700","#FF00CC","#7C3AFF","#00E5FF","#FF8C00","#39FF14","#FF2079","#F5FF00","#00FFC6"] },
  { name: "Aurora",     colors: ["#C084FC","#60A5FA","#34D399","#F472B6","#A78BFA","#22D3EE","#86EFAC","#F0ABFC","#818CF8","#2DD4BF","#E879F9","#7DD3FC"] },
  { name: "Sorbet",     colors: ["#FECACA","#FED7AA","#FEF3C7","#D9F99D","#BBF7D0","#BAE6FD","#DDD6FE","#FBCFE8","#FDBA74","#F9A8D4","#C4B5FD","#A7F3D0"] },
  { name: "Gelato",     colors: ["#FFE4E6","#FED7AA","#FEF9C3","#DCFCE7","#CCFBF1","#DBEAFE","#EDE9FE","#FAE8FF","#FBCFE8","#BFDBFE","#C7D2FE","#BBF7D0"] },
  { name: "Macaron",    colors: ["#FDE2E4","#FAD2E1","#E2ECE9","#BEE1E6","#D8E2DC","#CDEAC0","#FFF1BD","#FFD6A5","#CDB4DB","#BDE0FE","#A2D2FF","#FFC8DD"] },
  { name: "Retro",      colors: ["#F4A261","#E76F51","#2A9D8F","#E9C46A","#264653","#DDA15E","#BC6C25","#606C38","#283618","#A3B18A","#588157","#E5989B"] },
  { name: "Cafe",       colors: ["#F5E0C3","#E6CCB2","#DDB892","#B08968","#7F5539","#9C6644","#C2A383","#A98467","#6F4E37","#D6AD8B","#8B5E34","#FFF1D6"] },
  { name: "Jewel",      colors: ["#0F766E","#047857","#1D4ED8","#4338CA","#7E22CE","#BE185D","#B91C1C","#B45309","#065F46","#1E40AF","#6D28D9","#9D174D"] },
  { name: "Prism",      colors: ["#EF4444","#F97316","#FACC15","#84CC16","#22C55E","#14B8A6","#06B6D4","#3B82F6","#6366F1","#8B5CF6","#D946EF","#EC4899"] },
  { name: "Campus",     colors: ["#185A37","#00703C","#90C878","#F5F2E8","#C4A07A","#385A8C","#A8D8F0","#FFB36B","#C8E8B0","#2F7D52","#D4B08A","#455A64"] },
];

const BACKGROUND_CATEGORIES = [
  {
    label: "Dark",
    colors: [
      { name: "Ink",        value: "#07090A" },
      { name: "Coal",       value: "#121416" },
      { name: "Cinder",     value: "#1A1C1E" },
      { name: "Espresso",   value: "#180F0A" },
      { name: "Navy",       value: "#080F1F" },
      { name: "Midnight",   value: "#10101E" },
      { name: "Blackberry", value: "#180B28" },
      { name: "Thunder",    value: "#111C28" },
      { name: "Obsidian",   value: "#0D0D0F" },
      { name: "Onyx",       value: "#1C1A20" },
      { name: "Graphite",   value: "#1E2024" },
      { name: "Abyss",      value: "#050A14" },
      { name: "Pitch",      value: "#020204" },
      { name: "Carbon",     value: "#16181C" },
      { name: "Raven",      value: "#08070C" },
      { name: "Eclipse",    value: "#111018" },
      { name: "Deep Pine",  value: "#06150E" },
      { name: "Night Plum", value: "#14051F" }
    ]
  },
  {
    label: "Deep",
    colors: [
      { name: "Archer",   value: "#185A37" },
      { name: "Fern",     value: "#0C2010" },
      { name: "Emerald",  value: "#0A4025" },
      { name: "Matcha",   value: "#3D6B45" },
      { name: "Cobalt",   value: "#0D3D6E" },
      { name: "Seafoam",  value: "#133E3A" },
      { name: "Mocha",    value: "#2C1A10" },
      { name: "Merlot",   value: "#3D0F20" },
      { name: "Denim",    value: "#1A2D5A" },
      { name: "Plum",     value: "#2D1040" },
      { name: "Walnut",   value: "#3A2010" },
      { name: "Pine",     value: "#0F3020" },
      { name: "Moss",     value: "#244226" },
      { name: "Jade",     value: "#07543A" },
      { name: "Sapphire", value: "#0B2E59" },
      { name: "Aubergine", value: "#32113E" },
      { name: "Cabernet", value: "#4B1024" },
      { name: "Olive",    value: "#3B3F1D" }
    ]
  },
  {
    label: "Pastel",
    colors: [
      { name: "Rose",     value: "#FFD6DE" },
      { name: "Petal",    value: "#FFC0CB" },
      { name: "Peach",    value: "#FFD0A8" },
      { name: "Butter",   value: "#F9ECA0" },
      { name: "Mint",     value: "#B8EDD0" },
      { name: "Sky",      value: "#B0D4F0" },
      { name: "Lilac",    value: "#C8B8E0" },
      { name: "Lavender", value: "#E0DFF5" },
      { name: "Mauve",    value: "#E8C8D8" },
      { name: "Dew",      value: "#C8F0E0" },
      { name: "Periwinkle", value: "#C8D0F0" },
      { name: "Mango",    value: "#FFE0B0" },
      { name: "Sorbet",   value: "#FFD1DC" },
      { name: "Pistachio", value: "#D9F5C9" },
      { name: "Powder",   value: "#D6E8FF" },
      { name: "Taro",     value: "#DCC8F8" },
      { name: "Papaya",   value: "#FFD8BA" },
      { name: "Sea Salt", value: "#D8F3EA" }
    ]
  },
  {
    label: "Bright",
    colors: [
      { name: "Signal",    value: "#00A86B" },
      { name: "Electric",  value: "#CCFF00" },
      { name: "Lemon",     value: "#FFF04D" },
      { name: "Gold",      value: "#FFC300" },
      { name: "Orange",    value: "#FF7A1A" },
      { name: "Punch",     value: "#FF3D71" },
      { name: "Magenta",   value: "#D946EF" },
      { name: "Purple Pop", value: "#8B5CF6" },
      { name: "Blue Pop",  value: "#3B82F6" },
      { name: "Cyan Pop",  value: "#06B6D4" },
      { name: "Mint Pop",  value: "#2DD4BF" },
      { name: "Green Pop", value: "#22C55E" },
      { name: "Hot Coral", value: "#FF4E50" },
      { name: "Taffy",     value: "#FF5DA2" },
      { name: "Laser",     value: "#A3FF12" },
      { name: "Aqua Pop",  value: "#00F5D4" },
      { name: "Vivid Sky", value: "#00BBF9" },
      { name: "Violet Pop", value: "#9B5DE5" }
    ]
  }
];

const BACKGROUNDS = BACKGROUND_CATEGORIES.flatMap((c) => c.colors);
const DEFAULT_BACKGROUND = "#185A37"; // Archer green
const DEFAULT_GRADIENT: GradientConfig = {
  type: "linear",
  colors: ["#185A37", "#07120C"],
  angle: 135,
  position: "center"
};
const DEFAULT_PATTERN: PatternConfig = {
  emoji: "✨",
  preset: "diagonal",
  size: 180,
  spacing: 180,
  opacity: 0.16
};

const GRADIENT_PRESETS: Array<{ name: string; gradient: GradientConfig }> = [
  { name: "Animo", gradient: { type: "linear", colors: ["#185A37", "#07120C"], angle: 135, position: "center", preset: "Animo" } },
  { name: "Fresh", gradient: { type: "linear", colors: ["#E9F8EE", "#77B884"], angle: 120, position: "center", preset: "Fresh" } },
  { name: "Night", gradient: { type: "radial", colors: ["#254B36", "#050806"], angle: 0, position: "center", preset: "Night" } },
  { name: "Sunrise", gradient: { type: "linear", colors: ["#FFE8A3", "#FF8FA3"], angle: 145, position: "center", preset: "Sunrise" } },
  { name: "Ocean", gradient: { type: "radial", colors: ["#005AA7", "#FFFDE4"], angle: 0, position: "center", preset: "Ocean" } },
  { name: "Sunset", gradient: { type: "radial", colors: ["#FF512F", "#DD2476"], angle: 0, position: "top", preset: "Sunset" } },
  { name: "Cyber", gradient: { type: "radial", colors: ["#21D4FD", "#B721FF"], angle: 0, position: "center", preset: "Cyber" } },
  { name: "Forest", gradient: { type: "radial", colors: ["#134E5E", "#71B280"], angle: 0, position: "bottom", preset: "Forest" } },
  { name: "Mint", gradient: { type: "linear", colors: ["#D9F99D", "#14B8A6"], angle: 135, position: "center", preset: "Mint" } },
  { name: "Lagoon", gradient: { type: "radial", colors: ["#CCFBF1", "#0F766E"], angle: 0, position: "center", preset: "Lagoon" } },
  { name: "Sky", gradient: { type: "linear", colors: ["#E0F2FE", "#2563EB"], angle: 145, position: "center", preset: "Sky" } },
  { name: "Lavender", gradient: { type: "linear", colors: ["#F5D0FE", "#8B5CF6"], angle: 135, position: "center", preset: "Lavender" } },
  { name: "Peach", gradient: { type: "linear", colors: ["#FFE0B0", "#FF7A59"], angle: 130, position: "center", preset: "Peach" } },
  { name: "Citrus", gradient: { type: "linear", colors: ["#FFF04D", "#22C55E"], angle: 120, position: "center", preset: "Citrus" } },
  { name: "Blossom", gradient: { type: "radial", colors: ["#FFD6DE", "#F472B6"], angle: 0, position: "top", preset: "Blossom" } },
  { name: "Berry", gradient: { type: "linear", colors: ["#C2185B", "#581C87"], angle: 145, position: "center", preset: "Berry" } },
  { name: "Aurora", gradient: { type: "radial", colors: ["#34D399", "#7C3AED"], angle: 0, position: "center", preset: "Aurora" } },
  { name: "Prism", gradient: { type: "linear", colors: ["#EF4444", "#3B82F6"], angle: 115, position: "center", preset: "Prism" } },
  { name: "Dusk", gradient: { type: "linear", colors: ["#475569", "#C084FC"], angle: 135, position: "center", preset: "Dusk" } },
  { name: "Midnight", gradient: { type: "radial", colors: ["#1D4ED8", "#020204"], angle: 0, position: "bottom", preset: "Midnight" } },
  { name: "Ember", gradient: { type: "radial", colors: ["#FF512F", "#3C0A10"], angle: 0, position: "top", preset: "Ember" } },
  { name: "Cafe", gradient: { type: "linear", colors: ["#F5E0C3", "#7F5539"], angle: 140, position: "center", preset: "Cafe" } },
  { name: "Animo Light", gradient: { type: "linear", colors: ["#D4EDC5", "#00703C"], angle: 135, position: "center", preset: "Animo Light" } },
  { name: "Animo Dark", gradient: { type: "radial", colors: ["#008C4D", "#06150E"], angle: 0, position: "center", preset: "Animo Dark" } },
  { name: "Neon", gradient: { type: "linear", colors: ["#00FF88", "#FF00CC"], angle: 125, position: "center", preset: "Neon" } },
  { name: "Monochrome", gradient: { type: "linear", colors: ["#F5F5F5", "#454545"], angle: 135, position: "center", preset: "Monochrome" } },
  { name: "Black", gradient: { type: "radial", colors: ["#333333", "#000000"], angle: 0, position: "center", preset: "Black" } }
];

const AUTO_BACKGROUND_EMOJIS = ["✨", "💚", "🌿", "🏹", "📚", "⭐", "🎧", "🪩", "☁️", "🌸"];
const AUTO_LINE_PRESETS: GeometricConfig[] = [
  { kind: "dots", color: "#FFFFFF", size: 2, spacing: 28, opacity: 0.18, dash: 0 },
  { kind: "grid", color: "#A7F3D0", size: 1, spacing: 38, opacity: 0.14, dash: 0 },
  { kind: "lines", color: "#FFFFFF", size: 1.2, spacing: 34, opacity: 0.12, dash: 8 },
  { kind: "plus", color: "#008C4D", size: 1.6, spacing: 44, opacity: 0.2, dash: 0 },
  { kind: "blueprint", color: "#67E8F9", size: 1, spacing: 62, opacity: 0.14, dash: 0 }
];

const PATTERN_PRESETS: Array<{ value: PatternPreset; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "diagonal", label: "Diagonal" }
];

const QUICK_EMOJI_PICKS = ["✨", "🏹", "💚", "🌿", "🌸", "💗", "🔥", "⚡", "📚", "💻", "☕", "🎧", "🎓", "📝", "⭐", "🪩"];
const EMOJI_PICKER_DARK_STYLE = {
  "--epr-bg-color": "#0B100D",
  "--epr-category-label-bg-color": "#0B100D",
  "--epr-text-color": "rgba(255,255,255,0.78)",
  "--epr-search-input-bg-color": "rgba(255,255,255,0.06)",
  "--epr-search-input-text-color": "#ffffff",
  "--epr-picker-border-color": "rgba(255,255,255,0.08)",
  "--epr-hover-bg-color": "rgba(255,255,255,0.08)",
  "--epr-highlight-color": "#008c4d",
  "--epr-border-radius": "10px"
} as CSSProperties;

const EMOJI_PICKER_LIGHT_STYLE = {
  "--epr-bg-color": "#ffffff",
  "--epr-category-label-bg-color": "#ffffff",
  "--epr-text-color": "rgba(11,23,16,0.78)",
  "--epr-search-input-bg-color": "rgba(8,28,16,0.05)",
  "--epr-search-input-text-color": "#0b1710",
  "--epr-picker-border-color": "rgba(8,28,16,0.12)",
  "--epr-hover-bg-color": "rgba(8,28,16,0.06)",
  "--epr-highlight-color": "#008c4d",
  "--epr-border-radius": "10px"
} as CSSProperties;

const MOBILE_TABS: Array<{ id: MobileTab; label: string; icon: LucideIcon }> = [
  { id: "start",   label: "Courses", icon: CalendarDays },
  { id: "design",  label: "Design",  icon: Palette },
  { id: "export",  label: "Export",  icon: Download },
];
const SIDEBAR_PANELS: Array<{ id: SidebarPanel; label: string; icon: LucideIcon }> = [
  { id: "start",    label: "Courses", icon: CalendarDays },
  { id: "design",   label: "Design",  icon: Palette },
];

const CALENDAR_SIZE_LABELS: Record<number, string> = { 1: "XL", 2: "L", 3: "M", 4: "S", 5: "XS" };
const CALENDAR_SIZE_OPTIONS = [
  { value: 5, label: "XS" },
  { value: 4, label: "S" },
  { value: 3, label: "M" },
  { value: 2, label: "L" },
  { value: 1, label: "XL" },
];

const EXPORT_VARIANT_OPTIONS: Array<{ value: ExportVariant; label: string; description: string; icon: LucideIcon }> = [
  { value: "full", label: "Wallpaper", description: "Background and schedule", icon: ImageIcon },
  { value: "transparent", label: "Schedule", description: "Schedule only PNG", icon: Layers },
  { value: "background", label: "Backdrop", description: "Background only", icon: ImagePlus }
];

const COMMON_EXPORT_DEVICES: DeviceId[] = ["iphone", "ipad_portrait", "ipad_landscape", "laptop", "macbook", "share"];
const EXPORT_DEVICE_LABELS: Record<DeviceId, string> = {
  iphone: "iPhone",
  ipad_portrait: "iPad Portrait",
  ipad_landscape: "iPad Landscape",
  laptop: "Laptop 16:9",
  macbook: "MacBook 16:10",
  share: "Square"
};
const EXPORT_DEVICE_SLUGS: Record<DeviceId, string> = {
  iphone: "iphone",
  ipad_portrait: "ipad-portrait",
  ipad_landscape: "ipad-landscape",
  laptop: "laptop",
  macbook: "macbook",
  share: "square"
};
const DEVICE_VALUES = new Set<DeviceId>(Object.keys(DEVICES) as DeviceId[]);
const WORKFLOW_STEPS = new Set<SidebarPanel>(["start", "design", "export"]);
const ACTIVE_CREATION_KEY = "archers_calendar_active_creation_v1";
const LEGACY_LAST_SCHEDULE_KEY = "archers_calendar_last_schedule_v2";
const LEGACY_SCHEDULE_COPIES_KEY = "archers_calendar_schedule_copies_v1";
const CREATION_DB_NAME = "archers_calendar";
const CREATION_STORE_NAME = "creations";
const CREATION_DB_VERSION = 1;
const DESIGN_SHARE_PREFIX = "archers-design-v1.";
const DESIGN_SHARE_QUERY_PARAM = "design";
const DESIGN_SHARE_QUERY_ALIASES = [DESIGN_SHARE_QUERY_PARAM, "code", "d"];

const DAY_NAMES_FULL: Record<DayKey, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday"
};

const DEFAULT_VISIBLE_DAYS: Record<DayKey, boolean> = {
  Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false
};
// Sunday is never shown — DLSU schedules don't use it

type AnalyticsProps = Record<string, string | number | boolean | undefined>;

function trackAppEvent(event: string, props: AnalyticsProps = {}) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({ event, props });
  const url = "/api/analytics";

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {
    // Fall back to fetch below.
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}

// Canonical day pairs — courses that share the same code across these pairs are treated as one subject
const DAY_PAIRS: DayKey[][] = [["Mon", "Thu"], ["Tue", "Fri"], ["Wed", "Sat"]];

function normalizeCalendarFont(value: unknown): CalendarFont {
  if (value === "bangers") return "archivoBlack";
  return typeof value === "string" && CALENDAR_FONT_VALUES.has(value as CalendarFont) ? (value as CalendarFont) : "geist";
}

function normalizeDevice(value: unknown): DeviceId {
  return typeof value === "string" && DEVICE_VALUES.has(value as DeviceId) ? (value as DeviceId) : "laptop";
}

function normalizeWallpaperStyle(value: unknown): WallpaperStyle {
  if (value === "clean" || value === "minimal" || value === "soft") return "clean";
  if (value === "compact" || value === "retro") return "compact";
  if (value === "bold" || value === "swiss") return "bold";
  if (value === "glass") return "glass";
  return "clean";
}

function normalizeGridPosition(value: unknown): GridPosition {
  return value === "left" || value === "right" || value === "top" || value === "bottom" || value === "center" ? value : "center";
}

function normalizeGridOffset(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(-30, Math.min(30, Math.round(value)))
    : 0;
}

function normalizeExportVariant(value: unknown): ExportVariant {
  return value === "transparent" || value === "background" || value === "full" ? value : "full";
}

function normalizeCalendarSize(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(5, Math.round(value)))
    : 3;
}

function normalizeWorkflowStep(value: unknown): SidebarPanel {
  if (typeof value === "string" && WORKFLOW_STEPS.has(value as SidebarPanel)) return value as SidebarPanel;
  if (value === "input" || value === "schedule" || value === "classes" || value === "courses") return "start";
  if (value === "style") return "design";
  return "start";
}

function normalizeAppTheme(value: unknown): AppTheme {
  return value === "light" ? "light" : "dark";
}

function normalizeGeometricConfig(value: unknown): GeometricConfig {
  const record = value && typeof value === "object" ? value as Partial<GeometricConfig> : {};
  const kind = record.kind === "dots" || record.kind === "grid" || record.kind === "lines" || record.kind === "plus" || record.kind === "blueprint"
    ? record.kind
    : "dots";

  return {
    kind,
    color: typeof record.color === "string" && /^#[0-9A-F]{6}$/i.test(record.color) ? record.color : DEFAULT_GEOMETRIC.color,
    size: typeof record.size === "number" ? Math.max(0.5, Math.min(24, record.size)) : DEFAULT_GEOMETRIC.size,
    spacing: typeof record.spacing === "number" ? Math.max(8, Math.min(128, record.spacing)) : DEFAULT_GEOMETRIC.spacing,
    opacity: typeof record.opacity === "number" ? Math.max(0.01, Math.min(1.0, record.opacity)) : DEFAULT_GEOMETRIC.opacity,
    dash: typeof record.dash === "number" ? Math.max(0, Math.min(64, record.dash)) : DEFAULT_GEOMETRIC.dash
  };
}

function normalizeBackgroundKind(value: unknown): BackgroundKind {
  return value === "image" || value === "gradient" ? value : "solid";
}

function normalizeOverlayKind(value: unknown): OverlayKind {
  return value === "pattern" || value === "geometric" ? value : "none";
}

function migrateBackgroundKind(value: unknown): { base: BackgroundKind; overlay: OverlayKind } {
  if (value === "pattern") return { base: "solid", overlay: "pattern" };
  if (value === "geometric") return { base: "solid", overlay: "geometric" };
  return { base: normalizeBackgroundKind(value), overlay: "none" };
}

function normalizeGradientConfig(value: unknown): GradientConfig {
  const record = value && typeof value === "object" ? value as Partial<GradientConfig> : {};
  const colors = Array.isArray(record.colors) && record.colors.length >= 2
    ? record.colors.filter((color): color is string => typeof color === "string" && /^#[0-9A-F]{6}$/i.test(color)).slice(0, 3)
    : DEFAULT_GRADIENT.colors;

  return {
    type: record.type === "radial" ? "radial" : "linear",
    colors: colors.length >= 2 ? colors : DEFAULT_GRADIENT.colors,
    angle: typeof record.angle === "number" ? Math.max(0, Math.min(360, record.angle)) : DEFAULT_GRADIENT.angle,
    position: typeof record.position === "string" && record.position.trim() ? record.position : DEFAULT_GRADIENT.position,
    preset: typeof record.preset === "string" ? record.preset : undefined
  };
}

function normalizePatternConfig(value: unknown): PatternConfig {
  const record = value && typeof value === "object" ? value as Partial<PatternConfig> : {};
  const preset = record.preset === "diagonal"
    ? record.preset
    : "grid";

  return {
    emoji: typeof record.emoji === "string" && record.emoji.trim() ? Array.from(record.emoji.trim())[0] ?? DEFAULT_PATTERN.emoji : DEFAULT_PATTERN.emoji,
    preset,
    size: typeof record.size === "number" ? Math.max(12, Math.min(240, record.size)) : DEFAULT_PATTERN.size,
    spacing: typeof record.spacing === "number" ? Math.max(36, Math.min(360, record.spacing)) : DEFAULT_PATTERN.spacing,
    opacity: typeof record.opacity === "number" ? Math.max(0.04, Math.min(1.0, record.opacity)) : DEFAULT_PATTERN.opacity
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSavedTimestamp(value: unknown, fallback = Date.now()) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeSavedVisibleDays(value: unknown): Record<DayKey, boolean> {
  const next = { ...DEFAULT_VISIBLE_DAYS };
  if (!isRecord(value)) return next;
  DAY_ORDER.forEach((day) => {
    if (typeof value[day] === "boolean") next[day] = value[day];
  });
  return next;
}

function normalizeSavedPalette(value: unknown) {
  const colors = Array.isArray(value)
    ? value
        .filter((color): color is string => typeof color === "string" && /^#[0-9A-F]{6}$/i.test(color))
        .map((color) => color.toUpperCase())
        .slice(0, 24)
    : [];
  return colors.length ? colors : BLOCK_PALETTES.map((palette) => palette.hex);
}

function normalizeDeviceSettings(value: unknown, legacyX: number, legacyY: number, legacySize: number): Record<DeviceId, DeviceGridSettings> {
  const base = isRecord(value) ? value : {};
  const settings: any = {};
  (Object.keys(DEVICES) as DeviceId[]).forEach(id => {
    const s = isRecord(base[id]) ? base[id] : {};
    const legacyS = typeof s.size === "number" ? s.size : legacySize;
    settings[id] = {
      x: typeof s.x === "number" ? s.x : legacyX,
      y: typeof s.y === "number" ? s.y : legacyY,
      sx: typeof s.sx === "number" ? s.sx : legacyS,
      sy: typeof s.sy === "number" ? s.sy : legacyS
    };
  });
  return settings;
}

function normalizeSavedScheduleState(value: unknown): SavedScheduleState {
  const record = isRecord(value) ? value : {};
  const backgroundMigration = migrateBackgroundKind(record.backgroundKind);
  const backgroundKind = backgroundMigration.base;
  const rawBackground = typeof record.background === "string" && record.background.trim()
    ? record.background.trim()
    : DEFAULT_BACKGROUND;

  const legacyX = normalizeGridOffset(record.gridOffsetX);
  const legacyY = normalizeGridOffset(record.gridOffsetY);
  const legacySize = normalizeCalendarSize(record.calendarSize);
  const migratedOverlayKind = normalizeOverlayKind(record.overlayKind ?? backgroundMigration.overlay);
  const emojiOverlayEnabled = typeof record.emojiOverlayEnabled === "boolean"
    ? record.emojiOverlayEnabled
    : migratedOverlayKind === "pattern";
  const lineOverlayEnabled = typeof record.lineOverlayEnabled === "boolean"
    ? record.lineOverlayEnabled
    : migratedOverlayKind === "geometric";

  return {
    rawText: typeof record.rawText === "string" ? record.rawText : "",
    entries: sanitizeScheduleEntries(record.entries),
    visibleDays: normalizeSavedVisibleDays(record.visibleDays),
    showRoom: typeof record.showRoom === "boolean" ? record.showRoom : true,
    showProfessor: typeof record.showProfessor === "boolean" ? record.showProfessor : false,
    showSection: typeof record.showSection === "boolean" ? record.showSection : true,
    showCourseTitle: typeof record.showCourseTitle === "boolean" ? record.showCourseTitle : false,
    showCalendarTitle: typeof record.showCalendarTitle === "boolean" ? record.showCalendarTitle : true,
    showCalendarSubtitle: typeof record.showCalendarSubtitle === "boolean" ? record.showCalendarSubtitle : true,
    autoHideEmptyDays: typeof record.autoHideEmptyDays === "boolean" ? record.autoHideEmptyDays : true,
    calendarTitle: typeof record.calendarTitle === "string" && record.calendarTitle.trim() ? record.calendarTitle.trim() : "Name's Schedule",
    calendarSubtitle: typeof record.calendarSubtitle === "string" ? record.calendarSubtitle : "Term 3",
    activeCoursePalette: normalizeSavedPalette(record.activeCoursePalette),
    device: normalizeDevice(record.device),
    wallpaperStyle: normalizeWallpaperStyle(record.wallpaperStyle),
    appTheme: normalizeAppTheme(record.appTheme),
    gridPosition: normalizeGridPosition(record.gridPosition),
    deviceSettings: normalizeDeviceSettings(record.deviceSettings, legacyX, legacyY, legacySize),
    gridOffsetX: legacyX,
    gridOffsetY: legacyY,
    backgroundKind,
    overlayKind: migratedOverlayKind,
    emojiOverlayEnabled,
    lineOverlayEnabled,
    background: rawBackground,
    backgroundImage: typeof record.backgroundImage === "string" ? record.backgroundImage : "",
    backgroundTone: record.backgroundTone === "light" ? "light" : "dark",
    gradient: normalizeGradientConfig(record.gradient),
    pattern: normalizePatternConfig(record.pattern),
    geometric: normalizeGeometricConfig(record.geometric),
    calendarSize: legacySize,
    exportVariant: normalizeExportVariant(record.exportVariant),
    calendarFont: normalizeCalendarFont(record.calendarFont),
    workflowStep: normalizeWorkflowStep(record.workflowStep)
  };
}

function normalizeSavedScheduleSnapshot(value: unknown): SavedScheduleSnapshot | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  if (!id) return null;

  const updatedAt = normalizeSavedTimestamp(value.updatedAt, now);
  const createdAt = normalizeSavedTimestamp(value.createdAt, updatedAt);
  const state = normalizeSavedScheduleState(value.state);
  const fallbackName = state.calendarTitle || "Untitled Schedule";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : fallbackName;
  const rawState = isRecord(value.state) ? value.state : {};
  const hasStateTitle = typeof rawState.calendarTitle === "string" && rawState.calendarTitle.trim().length > 0;

  return {
    id,
    name,
    createdAt,
    updatedAt,
    state: {
      ...state,
      calendarTitle: hasStateTitle ? state.calendarTitle : name
    },
    thumbnail: typeof value.thumbnail === "string" ? value.thumbnail : undefined
  };
}

function formatSavedScheduleDate(timestamp: number) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Just now";

  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === today) return `Today ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getSavedScheduleSummary(snapshot: SavedScheduleSnapshot) {
  const entries = sanitizeScheduleEntries(snapshot.state.entries);
  const dayCount = new Set(entries.map((entry) => entry.day)).size;
  const classLabel = `${entries.length} ${entries.length === 1 ? "class" : "classes"}`;
  const dayLabel = dayCount ? `${dayCount} ${dayCount === 1 ? "day" : "days"}` : "No days";
  return `${classLabel} · ${dayLabel} · ${formatSavedScheduleDate(snapshot.updatedAt)}`;
}

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkBinary = "";
    for (let j = 0; j < chunk.length; j++) {
      chunkBinary += String.fromCharCode(chunk[j]);
    }
    binary += chunkBinary;
  }
  return binary;
}

function binaryToBytes(binary: string) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const DESIGN_SHARE_PREFIX_V2 = "ad2."; // compressed design codes
const DESIGN_SHARE_PREFIX_V3 = "ac3."; // ultra-short query string format

// Key shortening map for smaller design codes
const KEY_SHORT: Record<string, string> = {
  backgroundKind: "bk", overlayKind: "ok", emojiOverlayEnabled: "eo", lineOverlayEnabled: "lo", background: "bg", backgroundImage: "bi", backgroundTone: "bt",
  wallpaperStyle: "ws", appTheme: "at", calendarThemeMode: "ct", gridPosition: "gp", gridOffsetX: "gx", gridOffsetY: "gy",
  calendarFont: "cf", showCalendarTitle: "st", showCalendarSubtitle: "ss", calendarSize: "cs", device: "dv", exportVariant: "ev",
  gradient: "gr", pattern: "pa", geometric: "ge", version: "v",
  type: "t", colors: "c", angle: "a", position: "p", preset: "pr",
  emoji: "em", size: "sz", spacing: "sp", opacity: "op", kind: "k", color: "co"
};
const KEY_LONG: Record<string, string> = Object.fromEntries(Object.entries(KEY_SHORT).map(([k, v]) => [v, k]));

const DEFAULT_STATE: Partial<SharedDesignState> = {
  backgroundKind: "solid",
  overlayKind: "none",
  emojiOverlayEnabled: false,
  lineOverlayEnabled: false,
  background: "#0B100D",
  backgroundImage: "",
  backgroundTone: "dark",
  gradient: DEFAULT_GRADIENT,
  pattern: DEFAULT_PATTERN,
  geometric: DEFAULT_GEOMETRIC,
  wallpaperStyle: "clean",
  appTheme: "dark",
  gridPosition: "center",
  calendarFont: "geist",
  showCalendarTitle: true,
  showCalendarSubtitle: true,
  };
function getDiff(base: any, current: any) {
  const diff: any = {};
  for (const key in current) {
    if (key === 'device' || key === 'exportVariant' || key === 'version' || key === 'backgroundImage') continue;
    if (typeof current[key] === 'object' && typeof base[key] === 'object' && current[key] && base[key]) {
      if (Array.isArray(current[key])) {
        if (JSON.stringify(current[key]) !== JSON.stringify(base[key])) {
          diff[key] = current[key];
        }
      } else {
        const nestedDiff = getDiff(base[key], current[key]);
        if (Object.keys(nestedDiff).length > 0) diff[key] = nestedDiff;
      }
    } else if (current[key] !== base[key]) {
      diff[key] = current[key];
    }
  }
  return diff;
}

function flattenDiff(obj: any, prefix = '') {
  let res: any = {};
  for (const k in obj) {
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      Object.assign(res, flattenDiff(obj[k], prefix + k + '.'));
    } else {
      res[prefix + k] = obj[k];
    }
  }
  return res;
}

function unflattenDiff(flat: any) {
  const res: any = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let curr = res;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = v;
  }
  return res;
}

function shortenKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(shortenKeys);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[KEY_SHORT[k] ?? k] = shortenKeys(v);
    return out;
  }
  return obj;
}

function expandKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(expandKeys);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[KEY_LONG[k] ?? k] = expandKeys(v);
    return out;
  }
  return obj;
}

async function compressBytes(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return result;
}

async function decompressBytes(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return result;
}

async function encodeDesignCodeAsync(state: SharedDesignState) {
  const diff = getDiff(DEFAULT_STATE, state);
  const short = shortenKeys(diff);
  const flat = flattenDiff(short);
  const parts = [];
  for (const [k, v] of Object.entries(flat)) {
    let val = v;
    if (Array.isArray(v)) {
      val = v.map(x => String(x).replace('#', '')).join('-');
    } else if (typeof v === 'string') {
      val = v.replace('#', '');
    }
    parts.push(`${k}~${val}`);
  }
  return parts.length ? `${DESIGN_SHARE_PREFIX_V3}${parts.join('_')}` : `${DESIGN_SHARE_PREFIX_V3}default`;
}

// Synchronous fallback (old format)
function encodeDesignCode(state: SharedDesignState) {
  const shortened = shortenKeys(state);
  const bytes = new TextEncoder().encode(JSON.stringify(shortened));
  const base64 = btoa(bytesToBinary(bytes));
  return `${DESIGN_SHARE_PREFIX}${base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

async function decodeDesignCodeAsync(code: string): Promise<Record<string, unknown>> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Missing design code.");

  // Raw JSON
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) throw new Error("Invalid design code.");
    const raw = isRecord(parsed.design) ? parsed.design : parsed;
    return expandKeys(raw) as Record<string, unknown>;
  }

  // Ultra-short v3 format
  if (trimmed.startsWith(DESIGN_SHARE_PREFIX_V3)) {
    if (trimmed === `${DESIGN_SHARE_PREFIX_V3}default`) return DEFAULT_STATE as Record<string, unknown>;
    const str = trimmed.slice(DESIGN_SHARE_PREFIX_V3.length);
    const parts = str.split('_');
    const flat: any = {};
    for (const p of parts) {
      const [k, v] = p.split('~');
      if (!k || v === undefined) continue;
      let val: any = v;
      if (v === "true" || v === "false") {
        val = v === "true";
      } else if (/^-?\d+(?:\.\d+)?$/.test(v) && !/^\d{6}$/.test(v)) {
        val = Number(v);
      } else if (v.includes('-')) {
        val = v.split('-').map(x => /^[0-9A-Fa-f]{6}$/.test(x) ? '#' + x : x);
      } else if (/^[0-9A-Fa-f]{6}$/.test(v)) {
        val = '#' + v;
      }
      flat[k] = val;
    }
    const unflat = unflattenDiff(flat);
    const expanded = expandKeys(unflat);

    const merge = (base: any, target: any) => {
      const res = { ...base };
      for (const key in target) {
        if (typeof target[key] === 'object' && !Array.isArray(target[key]) && target[key] !== null) {
          res[key] = merge(base[key] || {}, target[key]);
        } else {
          res[key] = target[key];
        }
      }
      return res;
    };
    return merge(DEFAULT_STATE, expanded) as Record<string, unknown>;
  }

  // Compressed v2 format
  if (trimmed.startsWith(DESIGN_SHARE_PREFIX_V2)) {
    const encoded = trimmed.slice(DESIGN_SHARE_PREFIX_V2.length);
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const compressed = binaryToBytes(atob(padded));
    const decompressed = await decompressBytes(compressed);
    const parsed = JSON.parse(new TextDecoder().decode(decompressed));
    if (!isRecord(parsed)) throw new Error("Invalid design code.");
    return expandKeys(parsed) as Record<string, unknown>;
  }

  // Legacy v1 format (uncompressed, no key shortening or with shortening)
  const encoded = trimmed.startsWith(DESIGN_SHARE_PREFIX)
    ? trimmed.slice(DESIGN_SHARE_PREFIX.length)
    : trimmed;
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(binaryToBytes(atob(padded))));
  } catch {
    parsed = JSON.parse(atob(padded));
  }

  if (!isRecord(parsed)) throw new Error("Invalid design code.");
  const raw = isRecord(parsed.design) ? parsed.design : parsed;
  return expandKeys(raw) as Record<string, unknown>;
}

function decodeDesignCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Missing design code.");

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) throw new Error("Invalid design code.");
    const raw = isRecord(parsed.design) ? parsed.design : parsed;
    return expandKeys(raw) as Record<string, unknown>;
  }

  const encoded = trimmed.startsWith(DESIGN_SHARE_PREFIX)
    ? trimmed.slice(DESIGN_SHARE_PREFIX.length)
    : trimmed;
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(binaryToBytes(atob(padded))));
  } catch {
    parsed = JSON.parse(atob(padded));
  }

  if (!isRecord(parsed)) throw new Error("Invalid design code.");
  const raw = isRecord(parsed.design) ? parsed.design : parsed;
  return expandKeys(raw) as Record<string, unknown>;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the selection-based fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  Object.assign(textarea.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    opacity: "0"
  });
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function getDesignCodeFromSearchParams(params: URLSearchParams) {
  for (const param of DESIGN_SHARE_QUERY_ALIASES) {
    const value = params.get(param);
    if (value?.trim()) return value.trim();
  }
  return "";
}

function buildShareUrl(param: "p" | "pin" | typeof DESIGN_SHARE_QUERY_PARAM, value: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(param, value);
  return url.toString();
}

function parseDesignShareInput(input: string) {
  const value = input.trim();
  if (!value) return { code: "", pin: "" };

  if (/^(https?:\/\/|\/|\?)/i.test(value)) {
    try {
      const url = new URL(value, window.location.origin);
      const code = getDesignCodeFromSearchParams(url.searchParams);
      const pin = (url.searchParams.get("p") || url.searchParams.get("pin") || "").trim();
      return {
        code,
        pin: /^\d{4,8}$/.test(pin) ? pin : ""
      };
    } catch {
      return { code: value, pin: "" };
    }
  }

  return /^\d{4,8}$/.test(value)
    ? { code: "", pin: value }
    : { code: value, pin: "" };
}

function colorEntriesByCourse(parsed: ScheduleEntry[], colors: string[]): ScheduleEntry[] {
  const courseColors = new Map<string, string>();
  let colorIdx = 0;
  return parsed.map((entry) => {
    const code = entry.course.split(/\s+-\s+/)[0].trim().toUpperCase();
    if (!courseColors.has(code)) {
      courseColors.set(code, colors[colorIdx % colors.length]);
      colorIdx++;
    }
    return { ...entry, color: courseColors.get(code)! };
  });
}

function autoColorByCourse(parsed: ScheduleEntry[], palette?: string[]): ScheduleEntry[] {
  const p = palette || BLOCK_PALETTES.map((palette) => palette.hex);
  return parsed.map((entry) => {
    const code = courseKeyFromCourse(entry.course);
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = p[Math.abs(hash) % p.length];
    return { ...entry, color };
  });
}

function openCreationsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CREATION_DB_NAME, CREATION_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CREATION_STORE_NAME)) {
        const store = db.createObjectStore(CREATION_STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCreationsFromDb(): Promise<SavedScheduleSnapshot[]> {
  const db = await openCreationsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CREATION_STORE_NAME, "readonly");
    const request = tx.objectStore(CREATION_STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = Array.isArray(request.result) ? request.result : [];
      const normalized = records
        .map(normalizeSavedScheduleSnapshot)
        .filter((snapshot): snapshot is SavedScheduleSnapshot => Boolean(snapshot));
      resolve(normalized.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveCreationToDb(snapshot: SavedScheduleSnapshot): Promise<SavedScheduleSnapshot> {
  const normalized = normalizeSavedScheduleSnapshot(snapshot);
  if (!normalized) throw new Error("Invalid saved schedule.");

  const db = await openCreationsDb();
  return new Promise<SavedScheduleSnapshot>((resolve, reject) => {
    const tx = db.transaction(CREATION_STORE_NAME, "readwrite");
    tx.objectStore(CREATION_STORE_NAME).put(normalized);
    tx.oncomplete = () => {
      db.close();
      resolve(normalized);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function deleteCreationFromDb(id: string) {
  const db = await openCreationsDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CREATION_STORE_NAME, "readwrite");
    tx.objectStore(CREATION_STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

import PreviewCanvas from "@/components/PreviewCanvas";
import MobileControls from "@/components/MobileControls";
import ExportOverlay from "@/components/ExportOverlay";
import { ScheduleProvider, useSchedule, DeviceGridSettings, DEFAULT_DEVICE_SETTINGS } from "@/lib/ScheduleContext";

export default function Home() {
  return (
    <ScheduleProvider>
      <MainApp />
    </ScheduleProvider>
  );
}

function MainApp() {
  const ANIMO_PALETTE = COURSE_THEMES.find(t => t.name === "Animo")?.colors || BLOCK_PALETTES.map(p => p.hex);

  // Shared state via context (consumed by PreviewCanvas and MobileControls)
  const {
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
    selectedExportDevices, setSelectedExportDevices,
  } = useSchedule();

  // Local-only state (not needed by child components)
  const [designCode, setDesignCode] = useState("");
  const [livePinCode, setLivePinCode] = useState("");
  const [liveShareUrl, setLiveShareUrl] = useState("");
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [designShareNotice, setDesignShareNotice] = useState("");
  const [editingSavedId, setEditingSavedId] = useState("");
  const [editingSavedName, setEditingSavedName] = useState("");
  const [pendingDeleteSaved, setPendingDeleteSaved] = useState<SavedScheduleSnapshot | null>(null);
  const [isDeletingSaved, setIsDeletingSaved] = useState(false);
  const [savedCopies, setSavedCopies] = useState<SavedScheduleSnapshot[]>([]);
  const [hasLoadedLocalSchedule, setHasLoadedLocalSchedule] = useState(false);
  const [activeCreationId, setActiveCreationId] = useState("");
  const [activeCreationCreatedAt, setActiveCreationCreatedAt] = useState(() => Date.now());
  const [openDaysDropdown, setOpenDaysDropdown] = useState(false);
  const [openSlotDropdownId, setOpenSlotDropdownId] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [showDesignApplyConfirm, setShowDesignApplyConfirm] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [backgroundSubTab, setBackgroundSubTab] = useState<"base" | "emoji" | "lines">("base");

  // Direct Grid Manipulation State
  type ManipulationType = "move" | "resize-n" | "resize-s" | "resize-e" | "resize-w" | "resize-ne" | "resize-nw" | "resize-se" | "resize-sw";
  type ManipulationDragStart = {
    x: number;
    y: number;
    ox: number;
    oy: number;
    osx: number;
    osy: number;
    frameWidth: number;
    frameHeight: number;
    gridWidth: number;
    gridHeight: number;
  };
  const [manipulation, setManipulation] = useState<{ type: ManipulationType } | null>(null);
  const dragStartRef = useRef<ManipulationDragStart>({ x: 0, y: 0, ox: 0, oy: 0, osx: 3, osy: 3, frameWidth: 0, frameHeight: 0, gridWidth: 0, gridHeight: 0 });
  const [showManipulationHint, setShowManipulationHint] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());
  const trackedSettingsRef = useRef({ device: "", font: "", background: "", courseTheme: "" });

  useEffect(() => {
    if (!isExporting) setSelectedExportDevices(new Set([device]));
  }, [device, isExporting, setSelectedExportDevices]);

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("archers_manipulation_hud_v2")) {
      const timer = window.setTimeout(() => setShowManipulationHint(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const desktopImportTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalCreations() {
      try {
        let creations = await readCreationsFromDb();
        if (!creations.length) {
          creations = await migrateLegacyCreationsToDb();
        }

        if (cancelled) return;

        setSavedCopies(creations);
        const activeId = localStorage.getItem(ACTIVE_CREATION_KEY);
        const active = creations.find((creation) => creation.id === activeId) ?? creations[0];

        if (active?.state) {
          setActiveCreationId(active.id);
          setActiveCreationCreatedAt(active.createdAt || active.updatedAt || Date.now());
          applySavedScheduleState(active.state);
          setSaveNotice(`Loaded ${active.name}.`);
        } else {
          // No saved data — show sample schedule for new users
          const sampleEntries = autoColorByCourse(parseScheduleText(SAMPLE_TEXT), ANIMO_PALETTE);
          setEntries(sampleEntries);
          setExpandedCourses(getExpandedCourseSet(sampleEntries));
          setActiveCoursePalette(ANIMO_PALETTE);
        }
      } catch {
        if (!cancelled) {
          setSaveNotice("Local saves could not be loaded.");
        }
      } finally {
        if (!cancelled) setHasLoadedLocalSchedule(true);
      }
    }

    void loadLocalCreations();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load design from ?pin= URL param (runs after local state is ready)
  useEffect(() => {
    if (!hasLoadedLocalSchedule) return;
    const params = new URLSearchParams(window.location.search);
    const sharedCode = getDesignCodeFromSearchParams(params);
    const pin = params.get("p") || params.get("pin");

    if (sharedCode) {
      window.history.replaceState({}, "", window.location.pathname);
      decodeDesignCodeAsync(sharedCode)
        .then((decoded) => {
          applySharedDesignState(decoded);
          window.setTimeout(() => {
            setLivePinCode("");
            setLiveShareUrl("");
          }, 0);
          setDesktopPanel("export");
          setMobileTab("export");
          setDesignShareNotice("Design loaded.");
        })
        .catch(() => setDesignShareNotice("That link doesn't work."));
      return;
    }

    if (!pin || !/^\d{4,8}$/.test(pin)) return;
    window.history.replaceState({}, "", window.location.pathname);
    fetch(`/api/design/get?id=${pin}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "PIN not found");
        return data;
      })
      .then(async (data) => {
        if (!data.code) return;
        const decoded = await decodeDesignCodeAsync(data.code);
        applySharedDesignState(decoded);
        window.setTimeout(() => {
          setLivePinCode(pin);
          setLiveShareUrl(buildShareUrl("p", pin));
        }, 0);
        setDesktopPanel("export");
        setMobileTab("export");
        setDesignShareNotice("Design loaded.");
      })
      .catch(() => setDesignShareNotice("That PIN is invalid or expired."));
  }, [hasLoadedLocalSchedule]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasLoadedLocalSchedule) return;

    const timer = window.setTimeout(() => {
      const now = Date.now();
      const id = activeCreationId || makeClientId("creation");
      const createdAt = activeCreationId ? activeCreationCreatedAt : now;
      const snapshot: SavedScheduleSnapshot = {
        id,
        name: calendarTitle || "Untitled Schedule",
        createdAt,
        updatedAt: now,
        state: buildSavedScheduleState()
      };

      if (!activeCreationId) {
        setActiveCreationId(id);
        setActiveCreationCreatedAt(createdAt);
      }

      localStorage.setItem(ACTIVE_CREATION_KEY, id);
      void saveCreationToDb(snapshot)
        .then((savedSnapshot) => {
          setSavedCopies((current) => {
            const next = [savedSnapshot, ...current.filter((creation) => creation.id !== savedSnapshot.id)];
            return next.sort((a, b) => b.createdAt - a.createdAt);
          });
        })
        .catch(() => setSaveNotice("Local save failed."));
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasLoadedLocalSchedule,
    activeCreationId,
    activeCreationCreatedAt,
    rawText,
    entries,
    visibleDays,
    showRoom,
    showProfessor,
    showSection,
    showCourseTitle,
    showCalendarTitle,
    showCalendarSubtitle,
    autoHideEmptyDays,
    calendarTitle,
    calendarSubtitle,
    activeCoursePalette,
    device,
    wallpaperStyle,
    appTheme,
    gridPosition,
    deviceSettings,
    backgroundKind,
    background,
    backgroundImage,
    backgroundTone,
    gradient,
    pattern,
    geometric,
    emojiOverlayEnabled,
    lineOverlayEnabled,
    exportVariant,
    calendarFont,
    desktopPanel
  ]);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  useEffect(() => {
    if (!designShareNotice) return;
    const timer = window.setTimeout(() => setDesignShareNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [designShareNotice]);

  useEffect(() => {
    if (!hasLoadedLocalSchedule) return;

    trackAppEvent("app_open", {
      device,
      font: calendarFont,
      backgroundKind,
      backgroundTone,
      appTheme
    });

    const sendDuration = () => {
      const seconds = Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000));
      trackAppEvent("session_duration", { seconds });
    };

    window.addEventListener("pagehide", sendDuration);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendDuration();
    }, { once: true });

    return () => {
      window.removeEventListener("pagehide", sendDuration);
    };
  }, [hasLoadedLocalSchedule]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasLoadedLocalSchedule) return;

    const backgroundKey = [
      backgroundKind,
      backgroundTone,
      backgroundKind === "gradient" ? `${gradient.type}:${gradient.preset || gradient.colors.join("/")}` : "",
      backgroundKind === "solid" ? background : "",
      emojiOverlayEnabled ? `emoji:${pattern.emoji}:${pattern.preset}` : "",
      lineOverlayEnabled ? `line:${geometric.kind}` : ""
    ].join("|");
    const courseTheme = COURSE_THEMES.find((theme) => JSON.stringify(theme.colors) === JSON.stringify(activeCoursePalette))?.name || "Custom";

    if (trackedSettingsRef.current.device && trackedSettingsRef.current.device !== device) {
      trackAppEvent("device_selected", { device });
    }
    if (trackedSettingsRef.current.font && trackedSettingsRef.current.font !== calendarFont) {
      trackAppEvent("font_selected", { font: calendarFont });
    }
    if (trackedSettingsRef.current.background && trackedSettingsRef.current.background !== backgroundKey) {
      trackAppEvent("background_selected", {
        backgroundKind,
        backgroundTone,
        gradientPreset: gradient.preset || "",
        lineKind: lineOverlayEnabled ? geometric.kind : "",
        emoji: emojiOverlayEnabled ? pattern.emoji : ""
      });
    }
    if (trackedSettingsRef.current.courseTheme && trackedSettingsRef.current.courseTheme !== courseTheme) {
      trackAppEvent("course_theme_selected", { courseTheme });
    }

    trackedSettingsRef.current = {
      device,
      font: calendarFont,
      background: backgroundKey,
      courseTheme
    };
  }, [
    hasLoadedLocalSchedule,
    device,
    calendarFont,
    backgroundKind,
    backgroundTone,
    background,
    gradient,
    geometric,
    pattern,
    emojiOverlayEnabled,
    lineOverlayEnabled,
    activeCoursePalette
  ]);

  const activeDevice = DEVICES[device];
  const activeStyle = STYLE_PRESETS[wallpaperStyle];
  const headerStyleClass = activeStyle.headerFont.replace(/\bfont-(?:sans|serif|mono)\b/g, "").trim();
  const canvasSize = CANVAS_SIZES[device];
  const isDarkBg = backgroundTone === "dark";
  const automaticCalendarTone: CalendarTone = isDarkBg ? "dark" : "light";
  const resolvedCalendarTone: CalendarTone = activeStyle.forceTheme || automaticCalendarTone;
  const logoSrc = backgroundTone === "dark" ? "/logos/logo-mini-white.png" : "/logos/logo-mini-black.png";

  // Recompute preview scale whenever container resizes or device changes
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const compute = () => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const { width: fw, height: fh } = CANVAS_SIZES[device];
      const styles = window.getComputedStyle(container);
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(0, rect.width - horizontalPadding);
      const availableHeight = Math.max(0, rect.height - verticalPadding);
      const gap = rect.width < 900 || rect.height < 640 ? 12 : 32;
      const scale = Math.min((availableWidth - gap) / fw, (availableHeight - gap) / fh);
      
      // Apply a reduction factor for specific mobile devices to make them fit more comfortably
      const reductionFactor = (device === "iphone" || device === "ipad_portrait" || device === "share") ? 0.75 : 1.0;
      setPreviewScale(Math.max(0.045, scale * reductionFactor));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [device]);

  const visibleDayList = useMemo(() => {
    const baseList = DAY_ORDER.filter((d) => visibleDays[d]);
    if (!autoHideEmptyDays) return baseList;
    return baseList.filter(day =>
      entries.some(e => (normalizeDay(e.day) || e.day) === day)
    );
  }, [visibleDays, autoHideEmptyDays, entries]);

  const visibleEntries = useMemo(
    () => entries
      .map((e) => ({ ...e, day: normalizeDay(e.day) || e.day }))
      .filter((e) => visibleDayList.includes(e.day as DayKey)),
    [entries, visibleDayList]
  );
  const animoCourseColorSet = new Set(ANIMO_PALETTE.map(normalizeHexColor));
  const shouldUseUniformAnimoText = visibleEntries.length > 0 && visibleEntries.every((entry) =>
    animoCourseColorSet.has(normalizeHexColor(entry.color))
  );
  const uniformCourseTextColor = shouldUseUniformAnimoText ? getPaletteTextColor(ANIMO_PALETTE) : undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLivePinCode("");
    setLiveShareUrl("");
  }, [
    backgroundKind, overlayKind, background, backgroundImage, backgroundTone,
    gradient, pattern, geometric, emojiOverlayEnabled, lineOverlayEnabled, wallpaperStyle, appTheme,
    gridPosition, deviceSettings, calendarFont,
    device, exportVariant
  ]);

  const timeSlots = useMemo(() => {
    const slots = Array.from(new Set(visibleEntries.map((e) => e.timeSlot).filter(Boolean)));
    return slots.sort((a, b) => getStartMinutes(a) - getStartMinutes(b));
  }, [visibleEntries]);

  const manipulationDensityFactor = useMemo(() => {
    const slotImpact = Math.max(0, timeSlots.length - 5) * 0.052;
    const entryImpact = Math.max(0, visibleEntries.length - 8) * 0.026;
    return Math.max(0.34, Math.min(1.0, 1.0 - slotImpact - entryImpact));
  }, [timeSlots.length, visibleEntries.length]);

  const entriesByCell = useMemo(() => {
    return visibleEntries.reduce<Record<string, ScheduleEntry[]>>((groups, entry) => {
      const key = `${entry.day}|${entry.timeSlot}`;
      groups[key] = [...(groups[key] ?? []), entry];
      return groups;
    }, {});
  }, [visibleEntries]);

  const slotDurations = useMemo(() => timeSlots.map(getSlotDurationMinutes), [timeSlots]);
  const minDuration = useMemo(() => slotDurations.length ? Math.min(...slotDurations) : 90, [slotDurations]);
  // Each time slot gets two rows: auto (time banner) + proportional (cells)
  const slotRowTemplate = useMemo(
    () => slotDurations.length
      ? slotDurations.map((d) => `auto minmax(0, ${(d / minDuration).toFixed(2)}fr)`).join(" ")
      : "auto minmax(0, 1fr)",
    [slotDurations, minDuration]
  );

  const backgroundCssImage =
    backgroundKind === "image" && backgroundImage
      ? `url(${backgroundImage})`
      : backgroundKind === "gradient"
      ? buildGradientBackground(gradient)
      : undefined;
  const previewStyle = {
    backgroundColor: backgroundKind === "gradient" ? gradient.colors[0] : background,
    backgroundImage: backgroundCssImage,
    backgroundSize: backgroundKind === "image" ? "cover" : undefined,
    backgroundPosition: backgroundKind === "gradient" ? gradient.position : "center",
  } as CSSProperties;
  const isTransparentExport = exportVariant === "transparent";
  const isBackgroundOnlyExport = exportVariant === "background";
  const exportPreviewStyle = {
    ...previewStyle,
    backgroundColor: isTransparentExport ? "transparent" : previewStyle.backgroundColor,
    backgroundImage: isTransparentExport ? undefined : previewStyle.backgroundImage
  } as CSSProperties;

  const isCalendarLight = resolvedCalendarTone === "light";
  const isBorderlessStyle = wallpaperStyle !== "clean";
  const forcedGridBg = isCalendarLight
    ? "bg-white/[0.82]"
    : "bg-black/[0.36]";
  const themeBorder = isCalendarLight ? "border-black/[0.08]" : "border-white/[0.14]";
  const gridBg        = isBorderlessStyle ? activeStyle.gridOpacity : activeStyle.gridOpacity;
  const gridBorder    = isBorderlessStyle ? "border-transparent" : activeStyle.borderColor;
  const headerCellBg  = isBorderlessStyle ? "bg-transparent" : (isCalendarLight ? "bg-black/[0.05]" : "bg-white/[0.08]");
  const headerBorder  = isBorderlessStyle ? "border-transparent" : gridBorder;
  const headerText    = isCalendarLight ? "text-black/80" : "text-white";
  const timeRowStyle  = isBorderlessStyle ? "" : "border-b";
  const timeTextStyle = isCalendarLight ? "text-black/60" : isBorderlessStyle ? "text-white/60" : "text-white/70";
  const timeRuleStyle = isCalendarLight ? "bg-black/[0.14]" : isBorderlessStyle ? "bg-white/[0.14]" : "bg-white/[0.10]";
  const titleText    = isDarkBg ? "text-white" : "text-black/90";
  const subtitleText = isDarkBg ? "text-white/60" : "text-black/60";
  const cellBorder   = isBorderlessStyle ? "border-transparent" : gridBorder;
  const activeExportVariant = EXPORT_VARIANT_OPTIONS.find((option) => option.value === exportVariant) ?? EXPORT_VARIANT_OPTIONS[0];
  const currentExportPixels = {
    width: canvasSize.width * EXPORT_SCALE,
    height: canvasSize.height * EXPORT_SCALE
  };
  const selectedExportCount = selectedExportDevices.size;
  const selectedExportLabel = selectedExportCount === COMMON_EXPORT_DEVICES.length
    ? "All formats selected"
    : selectedExportCount === 1
    ? EXPORT_DEVICE_LABELS[Array.from(selectedExportDevices)[0]]
    : `${selectedExportCount} formats selected`;
  const ActiveExportIcon = activeExportVariant.icon;
  const ActiveDeviceIcon = activeDevice.icon;

  const gridPositionClasses = {
    center: "justify-center items-center",
    left:   "justify-start items-center",
    right:  "justify-end items-center",
    top:    "justify-center items-start",
    bottom: "justify-center items-end"
  }[gridPosition];

  // Fixed font/layout sizes matched to each device's fixed canvas pixel dimensions
  // cellPad = outer wrapper padding, blockPad = inner course block padding, titleMb = margin below title
  const szBase = device === "laptop"
    ? { pad: 96,  subtitle: 15, title: 44, dayHeader: 13,   courseCode: 13.5, courseTitle: 11,   meta: 10.5, cellPad: 6, blockPad: 6, titleMb: 20, gap: 4, mt: 2, timePx: 12, timePy: 8, dayPy: 12 }
    : device === "macbook"
    ? { pad: 104, subtitle: 16, title: 46, dayHeader: 13.5, courseCode: 14,   courseTitle: 11.5, meta: 11,   cellPad: 6, blockPad: 8, titleMb: 24, gap: 4, mt: 2, timePx: 12, timePy: 8, dayPy: 12 }
    : device === "share"
    ? { pad: 0,   subtitle: 18, title: 64, dayHeader: 18,   courseCode: 18,   courseTitle: 15,   meta: 15,   cellPad: 8, blockPad: 10, titleMb: 0, gap: 6, mt: 3, timePx: 16, timePy: 12, dayPy: 16 }
    : device === "ipad_landscape"
    ? { pad: 80,  subtitle: 14, title: 40, dayHeader: 13,   courseCode: 13,   courseTitle: 11,   meta: 10.5, cellPad: 4, blockPad: 6, titleMb: 16, gap: 4, mt: 2, timePx: 8, timePy: 6, dayPy: 8 }
    : device === "ipad_portrait"
    ? { pad: 72,  subtitle: 13, title: 36, dayHeader: 12,   courseCode: 12,   courseTitle: 10,   meta: 10,   cellPad: 4, blockPad: 6, titleMb: 16, gap: 4, mt: 2, timePx: 8, timePy: 6, dayPy: 8 }
    : /* iphone */
      { pad: 20,  subtitle: 7, title: 17, dayHeader: 7, courseCode: 6.25, courseTitle: 6, meta: 5.5, cellPad: 2, blockPad: 2, titleMb: 5, gap: 2, mt: 0, timePx: 5, timePy: 2, dayPy: 3 };

  // calendarSize 1=largest(less pad/bigger text) … 5=smallest(more pad/smaller text); share always 0 pad
  const PAD_SCALE:  Record<number, number> = { 1: 0.4, 2: 0.7, 3: 1.0, 4: 1.4, 5: 1.8 };
  const FONT_SCALE: Record<number, number> = { 1: 1.3, 2: 1.12, 3: 1.0, 4: 0.9, 5: 0.82 };

  const lerpScale = (map: Record<number, number>, val: number) => {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (val <= keys[0]) return map[keys[0]];
    if (val >= keys[keys.length - 1]) return map[keys[keys.length - 1]];
    const lower = keys.filter(k => k <= val).pop()!;
    const upper = keys.filter(k => k > val).shift()!;
    const t = (val - lower) / (upper - lower);
    return map[lower] + (map[upper] - map[lower]) * t;
  };

  const MIN_FONT_PX = device === "iphone" ? 5 : 0;
  const current = deviceSettings[device] || { x: 0, y: 0, sx: 3, sy: 3 };
  const fs = device === "share" ? 1 : lerpScale(FONT_SCALE, current.sx);
  // Round to whole pixels — fractional values cause spacing glitches in image exports
  const scalePx  = (val: number) => `${Math.round(Math.max(MIN_FONT_PX, val * fs))}px`;
  const scalePad = (val: number) => `${Math.round(val * fs)}px`; // no font minimum — for spacing/padding only
  const sz = {
    pad:        device === "share" ? "0px" : `${Math.round(szBase.pad * lerpScale(PAD_SCALE, current.sx))}px`,
    subtitle:   scalePx(szBase.subtitle),
    title:      scalePx(szBase.title),
    dayHeader:  scalePx(szBase.dayHeader),
    courseCode: scalePx(szBase.courseCode),
    courseTitle: scalePx(szBase.courseTitle),
    meta:       scalePx(szBase.meta),
    cellPad:    scalePad(szBase.cellPad),
    blockPad:   scalePad(szBase.blockPad),
    titleMb:    scalePad(szBase.titleMb),
    gap:        scalePad(szBase.gap),
    mt:         scalePad(szBase.mt),
    timePx:     scalePad(szBase.timePx),
    timePy:     scalePad(szBase.timePy),
    dayPy:      scalePad(szBase.dayPy)
  };
  const canvasRadius =
    device === "share" ? "0px" :
    device === "iphone"   ? "1rem" :
    device.startsWith("ipad") ? "0.75rem" : "0.5rem";

  function makeClientId(prefix = "schedule") {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function cloneEntriesForClient(source: ScheduleEntry[]) {
    return source.map((entry) => ({ ...entry, id: makeClientId("entry") }));
  }

  function buildSavedScheduleState(): SavedScheduleState {
    const current = deviceSettings[device] || { x: 0, y: 0, sx: 3, sy: 3 };
    return {
      rawText,
      entries,
      visibleDays,
      showRoom,
      showProfessor,
      showSection,
      showCourseTitle,
      showCalendarTitle,
      showCalendarSubtitle,
      autoHideEmptyDays,
      calendarTitle,
      calendarSubtitle,
      activeCoursePalette,
      device,
      wallpaperStyle,
      appTheme,
      gridPosition,
      deviceSettings,
      gridOffsetX: current.x,
      gridOffsetY: current.y,
      backgroundKind,
      overlayKind,
      emojiOverlayEnabled,
      lineOverlayEnabled,
      background,
      backgroundImage,
      backgroundTone,
      gradient,
      pattern,
      geometric,
      calendarSize: Math.round((current.sx + current.sy) / 2),
      exportVariant,
      calendarFont,
      workflowStep: desktopPanel
    };
  }

  function buildSharedDesignState(): SharedDesignState {
    const current = deviceSettings[device] || { x: 0, y: 0, sx: 3, sy: 3 };
    return {
      version: 1,
      backgroundKind,
      overlayKind,
      emojiOverlayEnabled,
      lineOverlayEnabled,
      background,
      backgroundImage,
      backgroundTone,
      gradient,
      pattern,
      geometric,
      wallpaperStyle,
      appTheme,
      gridPosition,
      gridOffsetX: current.x,
      gridOffsetY: current.y,
      calendarFont,
      showCalendarTitle,
      showCalendarSubtitle,
      calendarSize: Math.round((current.sx + current.sy) / 2),
      device,
      exportVariant
    };
  }

  function applySharedDesignState(state: Record<string, unknown>) {
    const hasBackgroundKind = "backgroundKind" in state;
    const hasBackground = "background" in state;
    const hasGradient = "gradient" in state;
    const nextGradient = hasGradient ? normalizeGradientConfig(state.gradient) : gradient;
    const migrated = hasBackgroundKind ? migrateBackgroundKind(state.backgroundKind) : { base: backgroundKind, overlay: overlayKind };
    const nextBackgroundKind = migrated.base;
    const nextOverlayKind = "overlayKind" in state ? normalizeOverlayKind(state.overlayKind) : migrated.overlay;
    const nextDevice = "device" in state ? normalizeDevice(state.device) : device;
    const nextEmojiOverlayEnabled = typeof state.emojiOverlayEnabled === "boolean"
      ? state.emojiOverlayEnabled
      : nextOverlayKind === "pattern";
    const nextLineOverlayEnabled = typeof state.lineOverlayEnabled === "boolean"
      ? state.lineOverlayEnabled
      : nextOverlayKind === "geometric";
    const nextBackground = hasBackground && typeof state.background === "string" && /^#[0-9A-F]{6}$/i.test(state.background)
      ? state.background
      : background;

    if (hasBackgroundKind) setBackgroundKind(nextBackgroundKind);
    setOverlayKind(nextOverlayKind);
    setEmojiOverlayEnabled(nextEmojiOverlayEnabled);
    setLineOverlayEnabled(nextLineOverlayEnabled);
    if (hasBackground) setBackground(nextBackground);
    if ("backgroundImage" in state) setBackgroundImage(typeof state.backgroundImage === "string" ? state.backgroundImage : "");
    if (hasGradient) setGradient(nextGradient);
    if ("pattern" in state) setPattern(normalizePatternConfig(state.pattern));
    if ("geometric" in state) setGeometric(normalizeGeometricConfig(state.geometric));
    if ("wallpaperStyle" in state) setWallpaperStyle(normalizeWallpaperStyle(state.wallpaperStyle));
    if ("appTheme" in state) setAppTheme(normalizeAppTheme(state.appTheme));
    if ("gridPosition" in state) setGridPosition(normalizeGridPosition(state.gridPosition));

    const nextX = normalizeGridOffset(state.gridOffsetX);
    const nextY = normalizeGridOffset(state.gridOffsetY);
    const nextSize = normalizeCalendarSize(state.calendarSize);

    setDeviceSettings(prev => ({
      ...prev,
      [nextDevice]: { x: nextX, y: nextY, sx: nextSize, sy: nextSize }
    }));

    if ("calendarFont" in state) setCalendarFont(normalizeCalendarFont(state.calendarFont));
    if ("showCalendarTitle" in state) setShowCalendarTitle(typeof state.showCalendarTitle === "boolean" ? state.showCalendarTitle : true);
    if ("showCalendarSubtitle" in state) setShowCalendarSubtitle(typeof state.showCalendarSubtitle === "boolean" ? state.showCalendarSubtitle : true);
    if ("device" in state) setDevice(nextDevice);
    if ("exportVariant" in state) setExportVariant(normalizeExportVariant(state.exportVariant));

    if (state.backgroundTone === "light" || state.backgroundTone === "dark") {
      setBackgroundTone(state.backgroundTone);
    } else if (hasBackgroundKind || hasBackground || hasGradient) {
      setBackgroundTone(nextBackgroundKind === "gradient" ? toneFromColors(nextGradient.colors) : toneFromHex(nextBackground));
    }
  }

  function applySavedScheduleState(state: Partial<SavedScheduleState>, cloneIds = false) {
    const restoredEntries = sanitizeScheduleEntries(state.entries ?? []);
    const nextEntries = cloneIds ? cloneEntriesForClient(restoredEntries) : restoredEntries;
    const palette = Array.isArray(state.activeCoursePalette) && state.activeCoursePalette.length
      ? state.activeCoursePalette
      : ANIMO_PALETTE;
    const nextGradient = normalizeGradientConfig(state.gradient);
    const nextPattern = normalizePatternConfig(state.pattern);
    const rawBgKind = state.backgroundKind ?? (state.backgroundImage ? "image" : "solid");
    const migrated = migrateBackgroundKind(rawBgKind);
    const nextBackgroundKind = migrated.base;
    const nextOverlayKind = state.overlayKind ? normalizeOverlayKind(state.overlayKind) : migrated.overlay;
    const nextEmojiOverlayEnabled = typeof state.emojiOverlayEnabled === "boolean"
      ? state.emojiOverlayEnabled
      : nextOverlayKind === "pattern";
    const nextLineOverlayEnabled = typeof state.lineOverlayEnabled === "boolean"
      ? state.lineOverlayEnabled
      : nextOverlayKind === "geometric";
    const nextBackground = typeof state.background === "string" && /^#[0-9A-F]{6}$/i.test(state.background)
      ? state.background
      : DEFAULT_BACKGROUND;
    const nextBackgroundTone = state.backgroundTone === "light" || state.backgroundTone === "dark"
      ? state.backgroundTone
      : nextBackgroundKind === "gradient"
      ? toneFromColors(nextGradient.colors)
      : toneFromHex(nextBackground);

    setRawText(state.rawText ?? "");
    setEntries(nextEntries);
    setExpandedCourses(nextEntries.length ? getExpandedCourseSet(nextEntries) : new Set());
    setVisibleDays(state.visibleDays ?? DEFAULT_VISIBLE_DAYS);
    setShowRoom(state.showRoom ?? true);
    setShowProfessor(state.showProfessor ?? false);
    setShowSection(state.showSection ?? true);
    setShowCourseTitle(state.showCourseTitle ?? false);
    setShowCalendarTitle(state.showCalendarTitle ?? true);
    setShowCalendarSubtitle(state.showCalendarSubtitle ?? true);
    setAutoHideEmptyDays(state.autoHideEmptyDays ?? true);
    setCalendarTitle(state.calendarTitle ?? "Name's Schedule");
    setCalendarSubtitle(state.calendarSubtitle ?? "Term 3");
    setActiveCoursePalette(palette);
    setDevice(state.device ?? "laptop");
    setWallpaperStyle(normalizeWallpaperStyle(state.wallpaperStyle));
    setAppTheme(normalizeAppTheme(state.appTheme));
    setGridPosition(state.gridPosition ?? "center");

    const legacyX = normalizeGridOffset(state.gridOffsetX);
    const legacyY = normalizeGridOffset(state.gridOffsetY);
    const legacySize = normalizeCalendarSize(state.calendarSize);
    setDeviceSettings(state.deviceSettings ?? normalizeDeviceSettings({}, legacyX, legacyY, legacySize));

    setBackgroundKind(nextBackgroundKind);
    setOverlayKind(nextOverlayKind);
    setEmojiOverlayEnabled(nextEmojiOverlayEnabled);
    setLineOverlayEnabled(nextLineOverlayEnabled);
    setBackground(nextBackground);
    setBackgroundImage(state.backgroundImage ?? "");
    setBackgroundTone(nextBackgroundTone);
    setGradient(nextGradient);
    setPattern(nextPattern);
    if ("geometric" in state) setGeometric(normalizeGeometricConfig(state.geometric));
    setExportVariant(state.exportVariant ?? "full");
    setCalendarFont(normalizeCalendarFont(state.calendarFont));
    {
      const workflowStep = normalizeWorkflowStep(state.workflowStep);
      setMobileTab(workflowStep);
      setDesktopPanel(workflowStep);
    }
    setImportError("");
    setImportSource("");
  }

  function readLegacyLastScheduleSnapshot(): SavedScheduleSnapshot | null {
    try {
      const raw = localStorage.getItem(LEGACY_LAST_SCHEDULE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SavedScheduleSnapshot>;
      return parsed.state ? {
        id: "legacy-last",
        name: parsed.name || "Last Schedule",
        createdAt: parsed.updatedAt || Date.now(),
        updatedAt: parsed.updatedAt || Date.now(),
        state: parsed.state
      } as SavedScheduleSnapshot : null;
    } catch {
      return null;
    }
  }

  function readLegacySavedCopies() {
    try {
      const raw = localStorage.getItem(LEGACY_SCHEDULE_COPIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? (parsed as Array<Partial<SavedScheduleSnapshot>>)
            .filter((snapshot) => snapshot.state)
            .map((snapshot, index) => ({
              id: snapshot.id || makeClientId(`legacy-copy-${index}`),
              name: snapshot.name || "Saved Schedule",
              createdAt: snapshot.createdAt || snapshot.updatedAt || Date.now(),
              updatedAt: snapshot.updatedAt || Date.now(),
              state: snapshot.state as SavedScheduleState
            }))
        : [];
    } catch {
      return [];
    }
  }

  async function migrateLegacyCreationsToDb() {
    const legacyLast = readLegacyLastScheduleSnapshot();
    const legacyCopies = readLegacySavedCopies();
    const migrated = [legacyLast, ...legacyCopies]
      .map(normalizeSavedScheduleSnapshot)
      .filter((snapshot): snapshot is SavedScheduleSnapshot => Boolean(snapshot));

    for (const snapshot of migrated) {
      await saveCreationToDb(snapshot);
    }

    return migrated.sort((a, b) => b.createdAt - a.createdAt);
  }

  function applyCoursePalette(colors: string[]) {
    setEntries((current) => colorEntriesByCourse(current, colors));
  }

  function handleSolidBackgroundChange(value: string) {
    setBackgroundKind("solid");
    setBackground(value);
    setBackgroundImage("");
    setBackgroundTone(toneFromHex(value));
  }

  function applyGradientPreset(nextGradient: GradientConfig) {
    const normalized = normalizeGradientConfig(nextGradient);
    setBackgroundKind("gradient");
    setGradient(normalized);
    setBackground(normalized.colors[0]);
    setBackgroundImage("");
    setBackgroundTone(toneFromColors(normalized.colors));
  }

  function updateGradient(next: Partial<GradientConfig>) {
    const updated = normalizeGradientConfig({ ...gradient, ...next, preset: undefined });
    applyGradientPreset(updated);
  }

  function updateGradientColor(index: number, color: string) {
    const colors = [...gradient.colors];
    colors[index] = color;
    updateGradient({ colors });
  }

  function selectDevice(nextDevice: DeviceId) {
    setDevice(nextDevice);
    setSelectedExportDevices(new Set([nextDevice]));
    trackAppEvent("device_selected", { device: nextDevice });
  }

  function getCourseThemeByName(name: string) {
    return COURSE_THEMES.find((theme) => theme.name === name) ?? COURSE_THEMES[0];
  }

  function getBackgroundAwareCourseThemeForTone(tone: CalendarTone) {
    if (tone === "dark") {
      const choices = ["Gelato", "Macaron", "Sorbet", "Pastel", "Blossom"];
      return getCourseThemeByName(choices[Math.floor(Math.random() * choices.length)]);
    }

    const choices = ["Jewel", "Campus", "Forest", "Berry", "Dusk"];
    return getCourseThemeByName(choices[Math.floor(Math.random() * choices.length)]);
  }

  function getBackgroundAwareCourseTheme() {
    const tone = backgroundKind === "gradient"
      ? toneFromColors(gradient.colors)
      : backgroundKind === "image"
      ? backgroundTone
      : toneFromHex(background);

    return getBackgroundAwareCourseThemeForTone(tone);
  }

  function autoColorCoursesForBackground() {
    const theme = getBackgroundAwareCourseTheme();
    setActiveCoursePalette(theme.colors);
    setEntries((current) => autoColorByCourse(current, theme.colors));
    trackAppEvent("auto_course_colors", {
      courseTheme: theme.name,
      backgroundKind,
      backgroundTone
    });
  }

  function applyAutoBackground() {
    const mode = (["gradient", "lines", "emoji"] as const)[Math.floor(Math.random() * 3)];
    const preset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
    const nextGradient = normalizeGradientConfig({
      ...preset.gradient,
      angle: preset.gradient.type === "linear" ? Math.floor(95 + Math.random() * 90) : preset.gradient.angle
    });
    const nextTone = toneFromColors(nextGradient.colors);

    setBackgroundKind("gradient");
    setGradient(nextGradient);
    setBackground(nextGradient.colors[0]);
    setBackgroundImage("");
    setBackgroundTone(nextTone);

    if (mode === "lines") {
      const nextLine = AUTO_LINE_PRESETS[Math.floor(Math.random() * AUTO_LINE_PRESETS.length)];
      setLineOverlayEnabled(true);
      setEmojiOverlayEnabled(false);
      setGeometric(nextLine);
      setBackgroundSubTab("lines");
    } else if (mode === "emoji") {
      const nextEmoji = AUTO_BACKGROUND_EMOJIS[Math.floor(Math.random() * AUTO_BACKGROUND_EMOJIS.length)];
      setEmojiOverlayEnabled(true);
      setLineOverlayEnabled(false);
      setPattern((current) => ({
        ...current,
        emoji: nextEmoji,
        preset: Math.random() > 0.45 ? "diagonal" : "grid",
        size: 120 + Math.floor(Math.random() * 82),
        spacing: 120 + Math.floor(Math.random() * 86),
        opacity: 0.1 + Math.random() * 0.12
      }));
      setBackgroundSubTab("emoji");
    } else {
      setEmojiOverlayEnabled(false);
      setLineOverlayEnabled(false);
      setBackgroundSubTab("base");
    }

    const courseTheme = getBackgroundAwareCourseThemeForTone(nextTone);
    setActiveCoursePalette(courseTheme.colors);
    setEntries((current) => autoColorByCourse(current, courseTheme.colors));

    trackAppEvent("auto_background", {
      mode,
      gradientPreset: preset.name,
      backgroundTone: nextTone,
      courseTheme: courseTheme.name
    });
  }

  function applyPatternPreset(preset: PatternPreset) {
    setPattern((current) => ({ ...current, preset }));
  }

  function updatePattern(next: Partial<PatternConfig>) {
    const updated = normalizePatternConfig({ ...pattern, ...next });
    setPattern(updated);
    if (next.emoji !== undefined && !emojiOverlayEnabled) {
      setEmojiOverlayEnabled(true);
    }
  }

  function applyParsedEntries(parsed: ScheduleEntry[]) {
    setEntries(parsed.length ? autoColorByCourse(parsed, activeCoursePalette) : []);
    setExpandedCourses(parsed.length ? getExpandedCourseSet(parsed) : new Set());
    setVisibleDays((current) => {
      const next = { ...current };
      parsed.forEach((entry) => { const d = normalizeDay(entry.day); if (d) next[d] = true; });
      return next;
    });
    if (parsed.length) {
      setMobileTab("start");
      setDesktopPanel("start");
    } else {
      setMobileTab("start");
      setDesktopPanel("start");
    }
  }

  function handleRawTextChange(value: string) {
    setRawText(value);
    if (importError) setImportError("");
    if (importSource) setImportSource("");
  }

  function loadLastSchedule() {
    const latest = savedCopies[0];
    if (!latest?.state) {
      setSaveNotice("No saved schedule yet.");
      return;
    }

    loadSavedCopy(latest);
  }

  async function duplicateSchedule() {
    const now = Date.now();
    const title = `${calendarTitle || "Untitled Schedule"} Copy`;
    const snapshot: SavedScheduleSnapshot = {
      id: makeClientId("copy"),
      name: title,
      createdAt: now,
      updatedAt: now,
      state: {
        ...buildSavedScheduleState(),
        entries: cloneEntriesForClient(entries),
        calendarTitle: title,
        workflowStep: "start"
      }
    };

    try {
      const savedSnapshot = await saveCreationToDb(snapshot);
      setSavedCopies((current) => [savedSnapshot, ...current.filter((creation) => creation.id !== savedSnapshot.id)]);
      setSaveNotice("Duplicated locally.");
    } catch {
      setSaveNotice("Duplicate could not be saved.");
    }
  }

  function loadSavedCopy(snapshot: SavedScheduleSnapshot) {
    setActiveCreationId(snapshot.id);
    setActiveCreationCreatedAt(snapshot.createdAt || snapshot.updatedAt || Date.now());
    localStorage.setItem(ACTIVE_CREATION_KEY, snapshot.id);
    applySavedScheduleState(snapshot.state, true);
    setCalendarTitle(snapshot.state.calendarTitle || snapshot.name);
    setSaveNotice(`Loaded ${snapshot.name}.`);
  }

  function startEditingSavedCopy(snapshot: SavedScheduleSnapshot) {
    setEditingSavedId(snapshot.id);
    setEditingSavedName(snapshot.name || "Untitled Schedule");
  }

  async function renameSavedCopy(snapshot: SavedScheduleSnapshot, nextName: string) {
    const name = nextName.trim() || "Untitled Schedule";
    const now = Date.now();
    setEditingSavedId("");
    setEditingSavedName("");

    if (name === snapshot.name) return;

    const updated: SavedScheduleSnapshot = {
      ...snapshot,
      name,
      updatedAt: now,
      state: {
        ...snapshot.state,
        calendarTitle: name
      }
    };

    try {
      const savedSnapshot = await saveCreationToDb(updated);
      setSavedCopies((current) =>
        current.map((saved) => saved.id === snapshot.id ? savedSnapshot : saved)
          .sort((a, b) => b.createdAt - a.createdAt)
      );
      if (activeCreationId === snapshot.id) {
        setCalendarTitle(name);
      }
      setSaveNotice("Renamed saved schedule.");
    } catch {
      setSaveNotice("Saved name could not be updated.");
    }
  }

  function requestDeleteSavedCopy(snapshot: SavedScheduleSnapshot) {
    setPendingDeleteSaved(snapshot);
  }

  async function confirmDeleteSavedCopy() {
    if (!pendingDeleteSaved) return;

    const snapshot = pendingDeleteSaved;
    const remaining = savedCopies.filter((saved) => saved.id !== snapshot.id);
    setIsDeletingSaved(true);

    try {
      await deleteCreationFromDb(snapshot.id);
      setSavedCopies(remaining);
      if (editingSavedId === snapshot.id) {
        setEditingSavedId("");
        setEditingSavedName("");
      }
      setPendingDeleteSaved(null);

      if (activeCreationId === snapshot.id) {
        setActiveCreationId("");
        localStorage.removeItem(ACTIVE_CREATION_KEY);
        const nextActive = remaining[0];
        if (nextActive) {
          loadSavedCopy(nextActive);
        } else {
          resetSchedule();
        }
      }

      setSaveNotice(`Deleted ${snapshot.name || "saved schedule"}.`);
    } catch {
      setSaveNotice("Could not delete schedule.");
    } finally {
      setIsDeletingSaved(false);
    }
  }

  // --- Direct Grid Manipulation Handlers ---
  const handleManipulationStart = (type: ManipulationType, e: React.MouseEvent) => {
    if (device === "share" || (typeof window !== "undefined" && window.innerWidth < 1024)) return;

    e.preventDefault();
    e.stopPropagation();

    const current = deviceSettings[device] || { x: 0, y: 0, sx: 3, sy: 3 };
    const startFrame = getFrameSize(device, current.sx, current.sy);
    const gridElement = (e.currentTarget as HTMLElement).closest('[data-calendar-grid="true"]');
    const gridRect = gridElement?.getBoundingClientRect();
    setManipulation({ type });
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: current.x,
      oy: current.y,
      osx: current.sx,
      osy: current.sy,
      frameWidth: startFrame.width,
      frameHeight: startFrame.height,
      gridWidth: gridRect ? gridRect.width / Math.max(previewScale, 0.001) : startFrame.width,
      gridHeight: gridRect ? gridRect.height / Math.max(previewScale, 0.001) : startFrame.height
    };

    document.body.style.cursor = getManipulationCursor(type);
  };

  const manipulationRafRef = useRef<number | null>(null);

  const handleManipulationMove = useCallback((e: React.MouseEvent) => {
    if (!manipulation) return;
    if (manipulationRafRef.current) cancelAnimationFrame(manipulationRafRef.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    manipulationRafRef.current = requestAnimationFrame(() => {
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      const activeCanvas = CANVAS_SIZES[device];
      const { type } = manipulation;

      setDeviceSettings((prev) => {
        const current = prev[device] || { x: 0, y: 0, sx: 3, sy: 3 };
        const next = { ...current };

        if (type === "move") {
          const pxToX = (dx / (activeCanvas.width * previewScale)) * 100;
          const pxToY = (dy / (activeCanvas.height * previewScale)) * 100;

          let nx = dragStartRef.current.ox + pxToX;
          let ny = dragStartRef.current.oy + pxToY;

          // Snapping logic: snap to center (0,0) within threshold
          const snapThreshold = 2.0;
          if (Math.abs(nx) < snapThreshold) nx = 0;
          if (Math.abs(ny) < snapThreshold) ny = 0;

          next.x = Math.max(-80, Math.min(80, nx));
          next.y = Math.max(-80, Math.min(80, ny));
        } else {
          const canvasDx = dx / Math.max(previewScale, 0.001);
          const canvasDy = dy / Math.max(previewScale, 0.001);
          const resizeDirection = type.replace("resize-", "");
          const hasEast = resizeDirection.includes("e");
          const hasWest = resizeDirection.includes("w");
          const hasNorth = resizeDirection.includes("n");
          const hasSouth = resizeDirection.includes("s");
          const limits = getFrameLimits(device);
          const gridWidthLimits = getGridWidthLimits(device, manipulationDensityFactor);
          const horizontalAnchor = gridPosition === "left" ? "start" : gridPosition === "right" ? "end" : "center";
          const verticalAnchor = gridPosition === "top" ? "start" : gridPosition === "bottom" ? "end" : "center";

          if (hasEast || hasWest) {
            const requestedGridWidth = dragStartRef.current.gridWidth + (hasEast ? canvasDx : -canvasDx);
            const targetGridWidth = clampValue(requestedGridWidth, gridWidthLimits.minWidth, gridWidthLimits.maxWidth);
            const gridWidthDelta = targetGridWidth - dragStartRef.current.gridWidth;
            const edgeDx = hasEast ? gridWidthDelta : -gridWidthDelta;
            const anchorOffsetPx =
              horizontalAnchor === "center" ? edgeDx / 2 :
              horizontalAnchor === "start" ? (hasWest ? edgeDx : 0) :
              hasEast ? edgeDx : 0;

            next.sx = settingFromGridWidth(device, targetGridWidth, manipulationDensityFactor);
            next.x = clampValue(dragStartRef.current.ox + (anchorOffsetPx / activeCanvas.width) * 100, -80, 80);
          }

          if (hasNorth || hasSouth) {
            const requestedHeight = dragStartRef.current.frameHeight + (hasSouth ? canvasDy : -canvasDy);
            const targetHeight = clampValue(requestedHeight, limits.minHeight, limits.maxHeight);
            const heightDelta = targetHeight - dragStartRef.current.frameHeight;
            const edgeDy = hasSouth ? heightDelta : -heightDelta;
            const anchorOffsetPx =
              verticalAnchor === "center" ? edgeDy / 2 :
              verticalAnchor === "start" ? (hasNorth ? edgeDy : 0) :
              hasSouth ? edgeDy : 0;

            next.sy = settingFromFrameHeight(device, targetHeight);
            next.y = clampValue(dragStartRef.current.oy + (anchorOffsetPx / activeCanvas.height) * 100, -80, 80);
          }
        }

        return { ...prev, [device]: next };
      });
    });
  }, [manipulation, device, previewScale, manipulationDensityFactor, gridPosition, setDeviceSettings]);

  const handleManipulationEnd = () => {
    if (!manipulation) return;
    if (manipulationRafRef.current) cancelAnimationFrame(manipulationRafRef.current);
    setManipulation(null);
    document.body.style.cursor = "";

    setShowManipulationHint(false);
    sessionStorage.setItem("archers_manipulation_hud_v2", "true");
  };
  async function duplicateSavedCopy(snapshot: SavedScheduleSnapshot) {
    const now = Date.now();
    const newId = makeClientId("creation");
    const newSnapshot: SavedScheduleSnapshot = {
      ...snapshot,
      id: newId,
      name: `${snapshot.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      state: {
        ...snapshot.state,
        entries: cloneEntriesForClient(snapshot.state.entries),
        calendarTitle: `${snapshot.name} (Copy)`,
        workflowStep: "start"
      }
    };
    try {
      const savedSnapshot = await saveCreationToDb(newSnapshot);
      setSavedCopies((current) => [savedSnapshot, ...current].sort((a, b) => b.createdAt - a.createdAt));
      setSaveNotice("Schedule duplicated.");
    } catch {
      setSaveNotice("Could not duplicate schedule.");
    }
  }
  function resetSchedule() {
    setActiveCreationId("");
    setActiveCreationCreatedAt(Date.now());
    localStorage.removeItem(ACTIVE_CREATION_KEY);

    setRawText("");
    setEntries([]);
    setExpandedCourses(new Set());
    setCalendarTitle("Name's Schedule");
    setCalendarSubtitle("Term 3");
    setVisibleDays(DEFAULT_VISIBLE_DAYS);
    setDeviceSettings(DEFAULT_DEVICE_SETTINGS);
    setImportError("");
    setImportSource("");
    setSaveNotice("Created new schedule.");
    setMobileTab("start");
    setDesktopPanel("start");
  }

  async function handleParse() {
    setIsParsing(true);
    setImportError("");
    setImportSource("");
    setParsingProgress(0);

    const progressInterval = setInterval(() => {
      setParsingProgress((prev) => {
        if (prev >= 99.7) return prev;

        let increment = 0;
        if (prev < 70) {
          // Fast initial progress
          increment = Math.random() * 2.5 + 1.5;
        } else if (prev < 90) {
          // Slow down starting at 70%
          increment = Math.random() * 0.2 + 0.05;
        } else if (prev < 98) {
          // Very slow crawl
          increment = Math.random() * 0.02 + 0.005;
        } else {
          // Micro-crawl near the limit
          increment = 0.001;
        }

        return Math.min(99.72, prev + increment);
      });
    }, 100);

    const localImport = parseScheduleImport(rawText);

    try {
      await new Promise(r => setTimeout(r, 300));

      if (localImport.entries.length && !localImport.shouldUseAi) {
        applyParsedEntries(localImport.entries);
        setImportSource("local");
        trackAppEvent("parse_success", { source: "local", entries: localImport.entries.length });
        return;
      }

      if (!localImport.scheduleLike) {
        setImportError(localImport.message ?? "No schedule details found in the pasted text.");
        trackAppEvent("parse_failed", { reason: "not_schedule_like" });
        return;
      }

      const response = await fetch("/api/import-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText })
      });
      const result = (await response.json().catch(() => ({}))) as ImportCalendarResponse;

      if (!response.ok) {
        throw new Error(result.message ?? "Import failed.");
      }

      const parsed = sanitizeScheduleEntries(result.entries ?? []);
      if (parsed.length) {
        setParsingProgress(100);
        applyParsedEntries(parsed);
        setImportSource(result.source ?? "local");
        if (result.message) setImportError(result.message);
        trackAppEvent("parse_success", { source: result.source ?? "local", entries: parsed.length });
        return;
      }

      setImportError(result.message ?? "No classes were found in the pasted schedule.");
      trackAppEvent("parse_failed", { reason: "empty_result" });
    } catch (error) {
      if (localImport.entries.length) {
        applyParsedEntries(localImport.entries);
        setImportSource("local");
        setImportError("Compatibility Layer was unavailable, so the local import was used.");
        trackAppEvent("parse_success", { source: "local_fallback", entries: localImport.entries.length });
        return;
      }

      setImportError(error instanceof Error ? error.message : "Import failed.");
      trackAppEvent("parse_failed", { reason: "request_failed" });
    } finally {
      clearInterval(progressInterval);
      setIsParsing(false);
    }
  }
  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const tableText = html ? scheduleTableHtmlToText(html) : "";
    const fallbackText = tableText || text;
    const parsedFromTable = html ? parseScheduleHtml(html) : [];
    const parsedFromText = !parsedFromTable.length && fallbackText ? parseScheduleText(fallbackText) : [];
    if (!parsedFromTable.length && !parsedFromText.length && !tableText) return;

    event.preventDefault();
    handleRawTextChange(fallbackText);

    const parsed = parsedFromTable.length ? parsedFromTable : parsedFromText;
    if (parsed.length) {
      applyParsedEntries(parsed);
      setImportSource("local");
      trackAppEvent("parse_success", { source: "paste", entries: parsed.length });
    }
  }

  function updateEntry(id: string, field: keyof ScheduleEntry, value: string) {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  function addEntry() {
    const nextNum = (groupedCourses.filter(c => c.code.toLowerCase().includes("new class")).length) + 1;
    const code = `New Class ${nextNum}`;

    // Find a non-overlapping slot
    const candidateSlots = [
      "07:30 AM - 09:00 AM",
      "09:15 AM - 10:45 AM",
      "11:00 AM - 12:30 PM",
      "12:45 PM - 02:15 PM",
      "02:30 PM - 04:00 PM",
      "04:15 PM - 05:45 PM",
      "06:00 PM - 07:30 PM"
    ];

    const dayPairs: DayKey[][] = [["Mon", "Thu"], ["Tue", "Fri"], ["Wed", "Sat"]];

    let selectedSlot = candidateSlots[0];
    let selectedDays: DayKey[] = ["Mon", "Thu"];
    let found = false;

    // Helper to check overlap
    const isOverlapping = (days: DayKey[], slot: string) => {
      const parts = slot.split(" - ");
      const start = getStartMinutes(parts[0]);
      const end = getStartMinutes(parts[1]);

      return entries.some(e => {
        if (!days.includes(e.day as DayKey)) return false;
        const eParts = e.timeSlot.split(" - ");
        const eStart = getStartMinutes(eParts[0]);
        const eEnd = getStartMinutes(eParts[1]);
        return (start < eEnd && end > eStart);
      });
    };

    for (const slot of candidateSlots) {
      for (const pair of dayPairs) {
        if (!isOverlapping(pair, slot)) {
          selectedSlot = slot;
          selectedDays = pair;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // If still not found, try single days
    if (!found) {
      for (const slot of candidateSlots) {
        for (const day of DAY_ORDER) {
          if (day === "Sun" && !visibleDays.Sun) continue;
          if (!isOverlapping([day], slot)) {
            selectedSlot = slot;
            selectedDays = [day];
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    const createdAt = Date.now();
    const newCourseKey = courseKeyFromCode(code);

    setEntries((current) => {
      const newEntries = selectedDays.map((day) => ({
        id: crypto.randomUUID(),
        timeSlot: selectedSlot,
        day,
        course: code,
        room: "",
        teacher: "",
        section: "",
        color: BLOCK_PALETTES[Math.floor(Math.random() * BLOCK_PALETTES.length)].hex,
        createdAt
      }));
      return [...newEntries, ...current];
    });

    setJustAddedId(newCourseKey);
    setTimeout(() => setJustAddedId(null), 2400);

    setExpandedCourses((current) => new Set(current).add(newCourseKey));
    setMobileTab("start");
    setDesktopPanel("start");
  }

  function toggleDay(day: DayKey) {
    setVisibleDays((current) => ({ ...current, [day]: !current[day] }));
  }

  function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 2048;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = (height / width) * MAX_DIM; width = MAX_DIM; }
          else { width = (width / height) * MAX_DIM; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        setBackgroundKind("image");
        const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
        setBackgroundImage(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
        void estimateImageTone(canvas).then(setBackgroundTone);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function openBackgroundUpload(source: HTMLElement) {
    const panel = source.closest('[data-controls-panel="true"]');
    const input = (panel?.querySelector('[data-background-image-upload="true"]') ??
      document.querySelector('[data-background-image-upload="true"]')) as HTMLInputElement | null;
    input?.click();
  }

  async function waitForExportFrame() {
    await document.fonts?.ready.catch(() => undefined);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  async function waitForCanvasSize(size: { width: number; height: number }) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await waitForExportFrame();
      const current = canvasRef.current;
      if (current?.offsetWidth === size.width && current?.offsetHeight === size.height) return;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  async function captureExportCanvas(target: HTMLElement, size: { width: number; height: number }, scale: number = 4) {
    // Create an invisible anchor container to prevent horizontal overflow on mobile
    const anchor = document.createElement("div");
    Object.assign(anchor.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "0",
      height: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "-9999",
      opacity: "0"
    });

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      width: `${size.width}px`,
      height: `${size.height}px`,
      overflow: "hidden"
    });

    const clone = target.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-export-hidden='true']").forEach((node) => node.remove());

    Object.assign(clone.style, {
      width: `${size.width}px`,
      height: `${size.height}px`,
      transform: "none",
    });

    wrapper.appendChild(clone);
    anchor.appendChild(wrapper);
    document.body.appendChild(anchor);

    try {
      await waitForCanvasSize(size);
      return await toCanvas(clone, {
        cacheBust: true,
        pixelRatio: scale,
        skipAutoScale: true,
        width: size.width,
        height: size.height,
        style: {
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: "none"
        }
      });
    } finally {
      anchor.remove();
    }
  }

  function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG export failed."));
      }, "image/png");
    });
  }

  function getExportVariantSuffix() {
    return exportVariant === "full" ? "" : `-${exportVariant}`;
  }

  function makeExportFilename(deviceId: string, suffix: string = "") {
    const base = calendarTitle
      ? calendarTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : "archers-calendar";
    const deviceSlug = DEVICE_VALUES.has(deviceId as DeviceId) ? EXPORT_DEVICE_SLUGS[deviceId as DeviceId] : deviceId;
    return `${base}-${deviceSlug}${suffix}.png`;
  }

  function shouldUseNativeSaveSheet() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isTouchMac = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    return (
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse)").matches ||
      /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
      isTouchMac
    );
  }

  function isNativeShareCancel(error: unknown) {
    return error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError");
  }

  async function shareCanvasNatively(blob: Blob, filename: string) {
    if (!shouldUseNativeSaveSheet() || typeof File === "undefined" || !navigator.share) return false;

    const file = new File([blob], filename, { type: "image/png" });
    const shareData: ShareData = {
      files: [file],
      title: "My Schedule",
      text: "My class schedule for this term."
    };

    if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;

    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if (isNativeShareCancel(error)) return true;
      console.error("Native save failed", error);
      return false;
    }
  }

  async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    const blob = await canvasToPngBlob(canvas);

    if (await shareCanvasNatively(blob, filename)) return "native";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.type = "image/png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "download";
  }

  async function triggerShare() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText("#archerscalendar");
      }
      if (navigator.share) {
        await navigator.share({
          title: 'Archers Calendar Generator',
          text: 'Generated my DLSU schedule wallpaper! #archerscalendar',
          url: 'https://archers-calendar.vercel.app',
        });
      }
    } catch (e) {
      // User cancelled share or it failed silently. No worries.
    }
  }

  async function handleExport() {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setExportProgress({ label: `Preparing ${EXPORT_DEVICE_LABELS[device]}`, current: 0, total: 1 });
    try {
      await waitForExportFrame();
      const exportedCanvas = await captureExportCanvas(canvasRef.current, canvasSize, EXPORT_SCALE);
      setExportProgress({ label: `Saving ${EXPORT_DEVICE_LABELS[device]}`, current: 1, total: 1 });
      const delivery = await downloadCanvas(exportedCanvas, makeExportFilename(device, getExportVariantSuffix()));
      trackAppEvent("export_completed", { device, exportVariant, count: 1, delivery });
      if (delivery !== "native" && !shouldUseNativeSaveSheet()) setTimeout(triggerShare, 500);
    } finally {
      setIsExporting(false);
      window.setTimeout(() => setExportProgress(null), 650);
    }
  }

  async function exportDevices(deviceIds: DeviceId[]) {
    if (deviceIds.length === 0) return;
    setIsExporting(true);
    setExportProgress({ label: "Preparing export", current: 0, total: deviceIds.length });
    const originalDevice = device;

    try {
      if (deviceIds.length === 1) {
        const deviceId = deviceIds[0];
        setExportProgress({ label: `Preparing ${EXPORT_DEVICE_LABELS[deviceId]}`, current: 0, total: 1 });
        setDevice(deviceId);
        await waitForCanvasSize(CANVAS_SIZES[deviceId]);
        if (canvasRef.current) {
          const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId], EXPORT_SCALE);
          setExportProgress({ label: `Saving ${EXPORT_DEVICE_LABELS[deviceId]}`, current: 1, total: 1 });
          const delivery = await downloadCanvas(exported, makeExportFilename(deviceId, getExportVariantSuffix()));
          trackAppEvent("export_completed", { device: deviceId, exportVariant, count: 1, delivery });
          if (delivery !== "native" && !shouldUseNativeSaveSheet()) setTimeout(triggerShare, 500);
        }
      } else {
        const zip = new JSZip();
        const folder = zip.folder("archers-calendar");

        for (let index = 0; index < deviceIds.length; index += 1) {
          const deviceId = deviceIds[index];
          setExportProgress({ label: `Rendering ${EXPORT_DEVICE_LABELS[deviceId]}`, current: index, total: deviceIds.length });
          setDevice(deviceId);
          await waitForCanvasSize(CANVAS_SIZES[deviceId]);
          if (!canvasRef.current) continue;

          const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId], EXPORT_SCALE);
          const pngBlob = await canvasToPngBlob(exported);
          folder?.file(makeExportFilename(deviceId, getExportVariantSuffix()), pngBlob);
          setExportProgress({ label: `Added ${EXPORT_DEVICE_LABELS[deviceId]}`, current: index + 1, total: deviceIds.length });
        }

        setExportProgress({ label: "Building ZIP", current: deviceIds.length, total: deviceIds.length });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = "archers-calendar.zip";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
        trackAppEvent("export_completed", { device: "multi", exportVariant, count: deviceIds.length, delivery: "zip" });
      }
      if (deviceIds.length > 1) setTimeout(triggerShare, 500);
    } finally {
      setDevice(originalDevice);
      setIsExporting(false);
      window.setTimeout(() => setExportProgress(null), 650);
    }
  }

  async function handleExportSelected() {
    await exportDevices(Array.from(selectedExportDevices));
  }

  async function handleExportAllCommon() {
    await exportDevices(COMMON_EXPORT_DEVICES);
  }

  const handleGeneratePinCode = async () => {
    setIsGeneratingPin(true);
    setDesignShareNotice("");
    try {
      const code = await encodeDesignCodeAsync(buildSharedDesignState());
      const res = await fetch("/api/design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not generate short link.");
      }

      const pin = String(data.id ?? "");
      if (!/^\d{4,8}$/.test(pin)) {
        throw new Error(data.error || "Short links are unavailable right now.");
      }

      const shareUrl = buildShareUrl("p", pin);
      setLivePinCode(pin);
      setLiveShareUrl(shareUrl);
      await copyTextToClipboard(shareUrl);
      setDesignShareNotice("Link copied.");
      setTimeout(() => setDesignShareNotice(""), 5000);
    } catch (err: any) {
      setDesignShareNotice(err.message || "Couldn't create link.");
    } finally {
      setIsGeneratingPin(false);
    }
  };

  async function handleApplyDesignCode() {
    if (!designCode.trim()) {
      setDesignShareNotice("Enter a PIN or link first.");
      return;
    }

    const parsedInput = parseDesignShareInput(designCode);
    let codeToDecode = parsedInput.code;

    // Fetch actual code if it's a numeric PIN or a URL containing one.
    if (parsedInput.pin) {
      setDesignShareNotice("Loading design...");
      try {
        const res = await fetch(`/api/design/get?id=${parsedInput.pin}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "PIN not found");
        }
        const data = await res.json();
        codeToDecode = data.code;
        window.setTimeout(() => {
          setLivePinCode(parsedInput.pin);
          setLiveShareUrl(buildShareUrl("p", parsedInput.pin));
        }, 0);
      } catch (err: any) {
        setDesignShareNotice(err.message || "Invalid or expired PIN");
        return;
      }
    }

    if (!codeToDecode) {
      setDesignShareNotice("Enter a PIN or link first.");
      return;
    }

    try {
      const decoded = await decodeDesignCodeAsync(codeToDecode);
      applySharedDesignState(decoded);
      if (!parsedInput.pin) {
        window.setTimeout(() => {
          setLivePinCode("");
          setLiveShareUrl("");
        }, 0);
      }
      setDesignShareNotice("Design loaded.");
    } catch {
      setDesignShareNotice("That PIN or link doesn't work.");
    }
  }

  // Grouped courses for simplified sidebar (Mon+Thu, Tue+Fri, Wed+Sat treated as one)
  const groupedCourses = useMemo(() => {
    return groupEntriesByCourse(entries).sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return getStartMinutes(a.slots[0]?.timeSlot ?? "") - getStartMinutes(b.slots[0]?.timeSlot ?? "");
    });
  }, [entries]);

  function updateCourseColor(code: string, color: string) {
    setEntries((current) =>
      current.map((e) =>
        courseKeyFromCourse(e.course) === courseKeyFromCode(code) ? { ...e, color } : e
      )
    );
  }

  function applyColorTheme(colors: string[], name = "Custom") {
    setActiveCoursePalette(colors);
    applyCoursePalette(colors);
    trackAppEvent("course_theme_selected", { courseTheme: name });
  }

  function updateCourseCode(oldCode: string, newCode: string) {
    setEntries((current) =>
      current.map((e) => {
        if (courseKeyFromCourse(e.course) !== courseKeyFromCode(oldCode)) return e;
        const { title } = courseParts(e.course);
        return { ...e, course: title ? `${newCode} - ${title}` : newCode };
      })
    );
    setExpandedCourses((s) => {
      const next = new Set(s);
      next.delete(courseKeyFromCode(oldCode));
      next.add(courseKeyFromCode(newCode));
      return next;
    });
  }

  function updateCourseTitle(code: string, newTitle: string) {
    setEntries((current) =>
      current.map((e) => {
        if (courseKeyFromCourse(e.course) !== courseKeyFromCode(code)) return e;
        const { code: c } = courseParts(e.course);
        return { ...e, course: newTitle ? `${c} - ${newTitle}` : c };
      })
    );
  }

  function updateCourseMeta(code: string, field: "room" | "teacher" | "section", value: string) {
    setEntries((current) =>
      current.map((e) =>
        courseKeyFromCourse(e.course) === courseKeyFromCode(code) ? { ...e, [field]: value } : e
      )
    );
  }

  function updateCourseSlot(code: string, oldTimeSlot: string, oldDays: DayKey[], newTimeSlot: string, newDaysString: string) {
    const newDays = newDaysString.split(/[\/,]|\s+/).map(normalizeDay).filter(Boolean) as DayKey[];
    if (!newDays.length || !newTimeSlot.trim()) return;

    setEntries((current) => {
      const codeKey = courseKeyFromCode(code);

      const otherEntries = current.filter(
        (e) => !(courseKeyFromCourse(e.course) === codeKey && e.timeSlot === oldTimeSlot && oldDays.includes(e.day as DayKey))
      );

      const existingEntry = current.find(
        (e) => courseKeyFromCourse(e.course) === codeKey && e.timeSlot === oldTimeSlot && oldDays.includes(e.day as DayKey)
      );

      if (!existingEntry) return current;

      const newEntries = newDays.map((day) => ({
        ...existingEntry,
        id: crypto.randomUUID(),
        timeSlot: newTimeSlot.trim(),
        day
      }));

      return [...otherEntries, ...newEntries];
    });
  }

  function removeCourse(code: string) {
    setEntries((current) =>
      current.filter((e) => courseKeyFromCourse(e.course) !== courseKeyFromCode(code))
    );
    setExpandedCourses((current) => {
      const next = new Set(current);
      next.delete(courseKeyFromCode(code));
      return next;
    });
  }

  function toggleCourseExpand(code: string) {
    setExpandedCourses((s) => {
      const next = new Set(s);
      const key = courseKeyFromCode(code);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderExportDropdown() {
    if (!showExportPopup) return null;
    const progressTotal = Math.max(exportProgress?.total ?? 1, 1);
    const progressCurrent = Math.min(exportProgress?.current ?? 0, progressTotal);
    const progressPercent = Math.max(6, Math.min(100, Math.round((progressCurrent / progressTotal) * 100)));

    return (
      <>
        <button
          type="button"
          data-export-hidden="true"
          className="fixed inset-0 z-[190] cursor-default"
          aria-label="Close save menu"
          onClick={() => { if (!isExporting) setShowExportPopup(false); }}
        />
        <div
          data-export-hidden="true"
          className="liquid-glass-strong animate-popover-in absolute right-0 top-full z-[210] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/[0.12] shadow-2xl shadow-black/45"
        >
          <div className="border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-white">Save</h3>
              <p className="text-[10px] font-bold text-white/35">{selectedExportLabel}</p>
            </div>
            {isExporting && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] font-bold text-white/45">
                  <span>{exportProgress?.label || "Saving"}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-dlsu-vivid transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[min(70dvh,31rem)] space-y-4 overflow-y-auto p-4 scrollbar-thin">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/40">Type</p>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                {EXPORT_VARIANT_OPTIONS.map(({ value, label, icon: VariantIcon }) => (
                  <button
                    key={value}
                    type="button"
                    className={classNames(
                      "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-1.5 text-[10px] font-black transition-all active:scale-95",
                      exportVariant === value
                        ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                        : "text-white/55 hover:bg-white/[0.07] hover:text-white"
                    )}
                    onClick={() => setExportVariant(value)}
                  >
                    <VariantIcon size={13} />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-white/40">Sizes</p>
                <button
                  type="button"
                  className="text-[10px] font-bold text-white/45 transition hover:text-white"
                  onClick={() => setSelectedExportDevices(
                    (prev) => prev.size === COMMON_EXPORT_DEVICES.length ? new Set() : new Set(COMMON_EXPORT_DEVICES)
                  )}
                >
                  {selectedExportDevices.size === COMMON_EXPORT_DEVICES.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {COMMON_EXPORT_DEVICES.map((deviceId) => {
                  const DeviceIcon = DEVICES[deviceId].icon;
                  const checked = selectedExportDevices.has(deviceId);
                  return (
                    <label
                      key={deviceId}
                      className={classNames(
                        "relative flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-left transition active:scale-[0.98]",
                        checked
                          ? "border-dlsu-vivid/60 bg-dlsu-vivid/[0.12] text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75"
                      )}
                    >
                      <DeviceIcon size={14} className={checked ? "text-dlsu-vivid" : "text-white/35"} />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight">{EXPORT_DEVICE_LABELS[deviceId]}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedExportDevices);
                          if (e.target.checked) next.add(deviceId); else next.delete(deviceId);
                          setSelectedExportDevices(next);
                        }}
                        className="sr-only"
                      />
                      {checked && <Check size={12} className="shrink-0 text-dlsu-vivid" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="archers-save-footer sticky bottom-0 flex gap-2 border-t border-white/[0.07] bg-[#0B100D]/88 p-3 backdrop-blur-xl">
            <button
              type="button"
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-45"
              onClick={() => setShowExportPopup(false)}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dlsu-vivid py-2.5 text-sm font-black text-white transition hover:bg-dlsu active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isExporting}
              onClick={() => {
                setShowExportPopup(false);
                if (selectedExportDevices.size > 0) void handleExportSelected();
                else void handleExport();
              }}
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {selectedExportDevices.size > 0 ? `Save ${selectedExportDevices.size}` : "Save"}
            </button>
          </div>
        </div>
      </>
    );
  }

  const sidebarPanelTabs = (
    <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5 xl:px-4">
      <div className="liquid-glass grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] p-1">
        {SIDEBAR_PANELS.map(({ id, label, icon: TabIcon }) => {
          const active = desktopPanel === id;
          return (
            <button
              key={id}
              className={classNames(
                "flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition-all duration-200",
                active
                  ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
              )}
              type="button"
              onClick={() => {
                setDesktopPanel(id);
                setMobileTab(id);
              }}
            >
              <TabIcon size={14} strokeWidth={active ? 2.6 : 2.2} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  function renderSavedScheduleActions() {
    return (
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={resetSchedule}
          className="group/new flex w-full items-center gap-2.5 rounded-lg border border-dashed border-white/[0.16] bg-white/[0.018] px-3 py-2.5 text-left transition-all hover:border-dlsu-vivid/45 hover:bg-dlsu-vivid/[0.05]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-white/40 transition-colors group-hover/new:border-dlsu-vivid/35 group-hover/new:bg-dlsu-vivid/15 group-hover/new:text-dlsu-vivid">
            <Plus size={15} strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white/70 transition-colors group-hover/new:text-white">New schedule</p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-white/25 transition-colors group-hover/new:text-white/40">Start with a fresh canvas</p>
          </div>
        </button>

        <div className="space-y-1.5">
          {savedCopies.length > 0 ? (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {savedCopies.map((snapshot) => {
                const isEditing = editingSavedId === snapshot.id;
                const isActive = activeCreationId === snapshot.id;
                const summary = getSavedScheduleSummary(snapshot);

                return (
                  <div
                    key={snapshot.id}
                    className={classNames(
                      "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2.5 transition-all duration-200",
                      isActive
                        ? "border-dlsu-vivid/50 bg-dlsu-vivid/[0.10] shadow-sm shadow-dlsu-vivid/10"
                        : "border-white/[0.075] bg-white/[0.018] hover:border-white/[0.16] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={classNames(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                          isActive
                            ? "border-dlsu-vivid/30 bg-dlsu-vivid/15 text-dlsu-vivid"
                            : "border-white/[0.08] bg-white/[0.04] text-white/35 group-hover:text-white/60"
                        )}
                      >
                        <CalendarDays size={14} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="h-7 w-full rounded-md border border-dlsu-vivid/50 bg-black/40 px-2 text-xs font-bold text-white outline-none ring-2 ring-dlsu-vivid/20"
                            value={editingSavedName}
                            onChange={(event) => setEditingSavedName(event.target.value)}
                            onBlur={(event) => void renameSavedCopy(snapshot, event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                              if (event.key === "Escape") { setEditingSavedId(""); setEditingSavedName(""); }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="block max-w-full text-left"
                            onClick={() => {
                              if (isActive) {
                                setMobileTab("start");
                                setDesktopPanel("start");
                              } else {
                                loadSavedCopy(snapshot);
                              }
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className={classNames(
                                "truncate text-xs font-black tracking-tight transition-colors",
                                isActive ? "text-white" : "text-white/75 group-hover:text-white"
                              )}>
                                {snapshot.name}
                              </span>
                              {isActive && (
                                <span className="shrink-0 rounded-full bg-dlsu-vivid px-1.5 py-0.5 text-[8px] font-black uppercase leading-none text-white">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[10px] font-bold text-white/35">
                              {summary}
                            </p>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {!isActive && (
                        <button
                          type="button"
                          className="flex h-7 items-center gap-1.5 rounded-md bg-white/[0.055] px-2 text-[9px] font-black uppercase text-white/50 transition hover:bg-dlsu-vivid/85 hover:text-white"
                          onClick={() => loadSavedCopy(snapshot)}
                          title="Load project"
                        >
                          <Eye size={11} strokeWidth={2.6} />
                          Load
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.045] text-white/40 transition hover:bg-white/[0.12] hover:text-white"
                        onClick={() => startEditingSavedCopy(snapshot)}
                        title="Rename"
                      >
                        <Pencil size={11} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.045] text-white/40 transition hover:bg-white/[0.12] hover:text-white"
                        onClick={() => void duplicateSavedCopy(snapshot)}
                        title="Duplicate"
                      >
                        <Copy size={11} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/[0.08] text-red-300/45 transition hover:bg-red-500/20 hover:text-red-300"
                        onClick={() => requestDeleteSavedCopy(snapshot)}
                        title="Delete"
                        aria-label={`Delete ${snapshot.name || "saved schedule"}`}
                      >
                        <Trash2 size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/[0.08] bg-black/[0.10] px-3 py-2 text-xs font-semibold text-white/[0.42]">
              No stored schedules yet. Import or edit once and it will save here.
            </p>
          )}

          {saveNotice && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium leading-5 text-white/55">
              {saveNotice}
            </p>
          )}
        </div>
      </div>
    );
  }
  function renderCourseColorThemes() {
    return (
      <ControlGroup
        title="Course Colors"
        action={
          <button
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[10px] font-black text-white/70 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            type="button"
            title="Auto-color courses"
            aria-label="Auto-color courses"
            onClick={autoColorCoursesForBackground}
          >
            <Wand2 size={14} strokeWidth={2.5} />
            Auto
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-2 xl:grid-cols-3">
          {COURSE_THEMES.map((theme) => {
            const isActive = JSON.stringify(theme.colors) === JSON.stringify(activeCoursePalette);
            return (
              <button
                key={theme.name}
                type="button"
                className={classNames(
                  "group overflow-hidden rounded-lg border bg-white/[0.025] text-left transition-all active:scale-[0.97]",
                  isActive
                    ? "border-dlsu-vivid/70 shadow-sm shadow-dlsu-vivid/20"
                    : "border-white/[0.12] hover:border-white/25 hover:bg-white/[0.055]"
                )}
                onClick={() => applyColorTheme(theme.colors, theme.name)}
              >
                <div className="flex h-2.5 overflow-hidden">
                  {theme.colors.map((color, index) => (
                    <span key={index} className="h-full flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
                  <p className={classNames(
                    "truncate text-[10px] font-black uppercase transition-colors",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                  )}>
                    {theme.name}
                  </p>
                  {isActive && <Check size={12} className="text-dlsu-vivid" />}
                </div>
              </button>
            );
          })}
        </div>
      </ControlGroup>
    );
  }

  function renderScheduleDetails() {
    const activeDays = (Object.keys(visibleDays) as DayKey[]).filter(d => visibleDays[d]);
    const label = activeDays.length === 6 && !visibleDays.Sun
      ? "Mon – Sat"
      : activeDays.length === 0 ? "Select Days" : activeDays.join(", ");

    return (
      <>
        <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
          <Field label="Name" value={calendarTitle} onChange={setCalendarTitle} placeholder="e.g. Richard" />
          <Field label="Term" value={calendarSubtitle} onChange={setCalendarSubtitle} placeholder="e.g. Term 3" />
        </div>
        <div>
          <SectionLabel className="mb-1.5">Header</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <Toggle compact checked={showCalendarTitle} icon={UserRound} label="Name" onChange={() => setShowCalendarTitle(!showCalendarTitle)} />
            <Toggle compact checked={showCalendarSubtitle} icon={Hash} label="Term" onChange={() => setShowCalendarSubtitle(!showCalendarSubtitle)} />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <SectionLabel className="mb-1.5">Visible Days</SectionLabel>
            <div className="grid grid-cols-1 gap-1.5 min-[340px]:grid-cols-2">
              <div className="relative">
                <button
                  onClick={() => setOpenDaysDropdown(!openDaysDropdown)}
                  className="group flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/[0.12] bg-white/[0.035] px-2.5 text-[11px] font-bold text-white shadow-sm outline-none transition-all hover:border-white/25 hover:bg-white/[0.055] focus:border-dlsu-vivid"
                >
                  <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <CalendarDays size={14} className="shrink-0 text-white/50 transition-colors group-hover:text-white/75" />
                    <span className="truncate">{label}</span>
                  </span>
                  <ChevronDown size={14} className={classNames("shrink-0 opacity-45 transition-transform", openDaysDropdown ? "rotate-180" : "")} />
                </button>
                {openDaysDropdown && (
                  <div className="liquid-glass-strong absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/10 p-1 shadow-2xl">                    {DAY_ORDER.filter((d) => d !== "Sun").map((day) => (
                      <label key={day} className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition hover:bg-white/[0.05]">
                        <span className="text-xs font-bold text-white/80">{DAY_NAMES_FULL[day]}</span>
                        <input
                          type="checkbox"
                          checked={visibleDays[day]}
                          onChange={() => toggleDay(day)}
                          className="h-4 w-4 rounded border-white/20 bg-black/50 text-dlsu-vivid accent-dlsu-vivid focus:ring-0 focus:ring-offset-0"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <Toggle compact checked={autoHideEmptyDays} icon={CalendarDays} label="Auto-hide" onChange={() => setAutoHideEmptyDays(!autoHideEmptyDays)} />
            </div>
          </div>
          <div>
            <SectionLabel className="mb-1.5">Cell Details</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <Toggle compact checked={showCourseTitle} icon={AlignLeft}  label="Title" onChange={() => setShowCourseTitle(!showCourseTitle)} />
              <Toggle compact checked={showRoom}        icon={MapPin}     label="Room"         onChange={() => setShowRoom(!showRoom)} />
              <Toggle compact checked={showProfessor}   icon={UserRound}  label="Teacher"      onChange={() => setShowProfessor(!showProfessor)} />
              <Toggle compact checked={showSection}     icon={Eye}        label="Section"      onChange={() => setShowSection(!showSection)} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Controls (sidebar on desktop, panels on mobile) ──────────────────────
  const controls = (
    <div data-controls-panel="true" className="flex flex-col gap-4 px-3 pb-12 pt-3 md:px-4 md:pb-10 xl:px-4">      {/* ── Paste Schedule ─────────────────────── */}
      <section
        className={classNames(
          "space-y-4",
          mobileTab === "start" ? "block" : "hidden",
          desktopPanel === "start" ? "md:block" : "md:hidden"
        )}
      >
        <ControlGroup
          title="Import"
          action={
            <button
              className="flex min-h-9 items-center gap-2 rounded-lg bg-dlsu-vivid px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-dlsu active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              type="button"
              onClick={handleParse}
              disabled={isParsing}
            >
              {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} strokeWidth={2.5} />}
              {isParsing ? "Analyzing..." : "Generate"}
            </button>
          }
        >
          <textarea
            ref={desktopImportTextAreaRef}
            className="min-h-44 w-full resize-none rounded-lg border border-white/10 bg-[#0B100D] p-3 text-sm leading-5 text-white outline-none transition placeholder:text-white/30 focus:border-dlsu-vivid md:min-h-48"
            value={rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={`Paste your ArchersHub table or messy schedule text here.\n\n12:45 PM - 02:15 PM   GEAGNO - AGNO FOOD STUDIES\n02:30 PM - 04:00 PM   GEBILLIARDS - ADVANCED BILLIARDS`}
          />
          {importError && (
            <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-medium leading-5 text-amber-100">
              {importError}
            </p>
          )}
          {!importError && importSource === "ai" && (
            <p className="rounded-lg border border-dlsu-vivid/25 bg-dlsu-vivid/10 px-3 py-2 text-xs font-medium leading-5 text-white/70">
              Imported with Compatibility Layer.
            </p>
          )}
          {isParsing && (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-dlsu-vivid">
                <span>Analyzing Format</span>
                <span>{parsingProgress.toFixed(2)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 shadow-inner">
                <div
                  className="h-full bg-dlsu-vivid transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,140,77,0.4)]"
                  style={{ width: `${parsingProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-white/30 animate-pulse">Running Compatibility Layer...</p>
            </div>
          )}
          {!importError && importSource === "local" && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium leading-5 text-white/55">
              Imported locally.
            </p>
          )}
        </ControlGroup>

        <ControlGroup
          title="Stored Collection"
        >
          {renderSavedScheduleActions()}
        </ControlGroup>

        <ControlGroup title="Schedule">
          {renderScheduleDetails()}
        </ControlGroup>
      </section>

      {/* ── Courses (grouped, editable) ── */}
      <section
        className={classNames(
          "flex-col gap-4",
          mobileTab === "start" ? "flex" : "hidden",
          desktopPanel === "start" ? "md:flex" : "md:hidden"
        )}
      >
        <div>
        <ControlGroup
          title="Classes"
          action={
            <button
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-black text-[#08110C] transition-all hover:bg-white/90 active:scale-95"
              type="button"
              onClick={addEntry}
            >
              <Plus size={13} strokeWidth={2.8} />
              Add
            </button>
          }
        >
        {groupedCourses.length ? (
          <div className="space-y-1">
            {groupedCourses.map((course) => {
              const courseKey = courseKeyFromCode(course.code);
              const isExpanded = expandedCourses.has(courseKey);
              const isJustAdded = justAddedId === courseKey;
              const displayCode = course.code || "Untitled";
              const normalizedCourseColor = normalizeHexColor(course.color);
              const selectedPaletteColor = BLOCK_PALETTES.find(
                (palette) => normalizeHexColor(palette.hex) === normalizedCourseColor
              );
              const selectedColorLabel = selectedPaletteColor?.name ?? "Custom";

              return (
                <div
                  id={`course-editor-${courseKey}`}
                  key={course.id}
                  className={classNames(
                    "liquid-glass rounded-lg border transition-all duration-200",
                    isExpanded ? "overflow-visible" : "overflow-hidden",
                    isExpanded ? "border-white/[0.18] bg-white/[0.045] shadow-sm shadow-black/20" : "border-white/[0.08] bg-white/[0.025] hover:border-white/[0.16] hover:bg-white/[0.045]",
                    isJustAdded ? "animate-added-row ring-1 ring-dlsu-vivid/40" : ""
                  )}
                >
                  <div className="flex items-center gap-1 border-white/[0.06] p-1">
                    <button
                      type="button"
                      className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors duration-150 hover:bg-white/[0.045]"
                      onClick={() => toggleCourseExpand(course.code)}
                    >
                      <div className="relative shrink-0">
                        <span
                          className="block h-7 w-1.5 rounded-full border border-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
                          style={{ backgroundColor: course.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-[12px] font-black leading-tight text-white">{displayCode}</p>
                          {course.emoji && (
                            <span className="shrink-0 text-[12px] leading-none" aria-hidden="true">
                              {course.emoji}
                            </span>
                          )}
                        </div>
                        {course.title && (
                          <p className="mt-0.5 line-clamp-1 text-[9.5px] font-semibold leading-snug text-white/45">{course.title}</p>
                        )}
                      </div>
                      <ChevronDown
                        size={15}
                        className={classNames(
                          "shrink-0 text-white/35 transition-all duration-200 group-hover:text-white/[0.65]",
                          isExpanded ? "rotate-180 text-white/60" : ""
                        )}
                      />
                    </button>
                    <button
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-white/35 transition-all duration-150 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300 active:scale-90"
                      type="button"
                      aria-label="Remove course"
                      onClick={() => removeCourse(course.code)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-1.5 border-t border-white/[0.06] p-1.5">
                      <div className="rounded-lg border border-white/[0.07] bg-black/[0.10] p-1.5">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Schedule</p>
                          <p className="truncate text-[10px] font-bold text-white/[0.28]">{course.slots.length} {course.slots.length === 1 ? "meeting" : "meetings"}</p>
                        </div>
                        <div className="space-y-1">
                        {course.slots.map((slot) => {
                          const slotId = `${course.code}-${slot.timeSlot}-${slot.days.join("")}`;
                          const isDropdownOpen = openSlotDropdownId === slotId;

	                          return (
	                            <div
	                              key={slotId}
	                              className="grid grid-cols-1 gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1.5"
	                            >
                              <div className="space-y-1">
                                <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.38]">Days</span>
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenSlotDropdownId(isDropdownOpen ? null : slotId)}
                                    className="flex min-h-9 w-full items-center justify-between rounded-lg border border-white/[0.11] bg-white/[0.04] px-2.5 text-xs font-medium text-white outline-none transition hover:border-white/[0.22] hover:bg-white/[0.06]"
                                  >
                                    <span className="truncate">{formatMeetingDays(slot.days)}</span>
                                    <ChevronDown size={12} className={classNames("opacity-40 transition-transform", isDropdownOpen ? "rotate-180" : "")} />
                                  </button>
                                  {isDropdownOpen && (
                                    <div className="liquid-glass-strong absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-white/10 p-1 shadow-2xl">
                                      {DAY_ORDER.filter((d) => d !== "Sun").map((day) => (
                                        <label key={day} className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-white/[0.05]">
                                          <span className="text-[11px] font-bold text-white/80">{DAY_NAMES_FULL[day]}</span>
                                          <input
                                            type="checkbox"
                                            checked={slot.days.includes(day)}
                                            onChange={() => {
                                              const nextDays = slot.days.includes(day)
                                                ? slot.days.filter(d => d !== day)
                                                : [...slot.days, day];
                                              if (nextDays.length) {
                                                updateCourseSlot(course.code, slot.timeSlot, slot.days, slot.timeSlot, formatMeetingDays(nextDays));
                                              }
                                            }}
                                            className="h-3.5 w-3.5 rounded border-white/20 bg-black/50 text-dlsu-vivid accent-dlsu-vivid focus:ring-0 focus:ring-offset-0"
                                          />
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <TimeField
                                value={slot.timeSlot}
                                onBlur={(v) => updateCourseSlot(course.code, slot.timeSlot, slot.days, v, formatMeetingDays(slot.days))}
                              />
                            </div>
                          );
                        })}
                        </div>
                      </div>

	                      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/[0.07] bg-black/[0.10] p-1.5 xl:grid-cols-3">
	                        <p className="col-span-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35 xl:col-span-3">Details</p>
	                        <CourseField
	                          label="Code"
	                          value={course.code}
                          onBlur={(v) => updateCourseCode(course.code, v)}
                        />
                        <CourseField
                          label="Room"
	                          value={course.slots[0]?.room ?? ""}
	                          onBlur={(v) => updateCourseMeta(course.code, "room", v)}
	                        />
	                        <CourseField
	                          label="Section"
	                          value={course.slots[0]?.section ?? ""}
	                          onBlur={(v) => updateCourseMeta(course.code, "section", v)}
	                        />
	                        <CourseField
	                          className="col-span-2"
	                          label="Title"
	                          value={course.title}
	                          onBlur={(v) => updateCourseTitle(course.code, v)}
                        />
                        <CourseField
                          label="Teacher"
	                          value={course.slots[0]?.teacher ?? ""}
	                          onBlur={(v) => updateCourseMeta(course.code, "teacher", v)}
	                        />
	                      </div>

                      <div className="space-y-1.5 rounded-lg border border-white/[0.07] bg-black/[0.10] p-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Appearance</p>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/[0.38]">Color</p>
                          <label
                            className={classNames(
                              "relative grid min-h-10 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 text-left transition active:scale-[0.98]",
                              selectedPaletteColor
                                ? "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                : "border-dlsu-vivid/75 bg-dlsu-vivid/15 text-white shadow-sm shadow-dlsu-vivid/10 ring-1 ring-dlsu-vivid/20 hover:border-dlsu-vivid hover:bg-dlsu-vivid/20"
                            )}
                            title="Custom color"
                          >
                            <Palette size={12} className="shrink-0 opacity-45" />
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-black">{selectedPaletteColor ? selectedColorLabel : "Custom"}</span>
                              <span className="block font-mono text-[9px] font-bold uppercase leading-none text-white/40">{normalizedCourseColor}</span>
                            </span>
                            <span
                              className="h-5 w-5 shrink-0 rounded-full border border-black/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_0_0_2px_rgba(255,255,255,0.08)]"
                              style={{ backgroundColor: course.color }}
                            />
                            <input
                              type="color"
                              className="absolute inset-0 cursor-pointer opacity-0"
                              value={course.color}
                              onChange={(e) => updateCourseColor(course.code, e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.025] p-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/[0.38]">Preset colors</p>
                              <p className="mt-0.5 truncate font-mono text-[9px] font-bold uppercase text-white/[0.32]">{selectedColorLabel} · {normalizedCourseColor}</p>
                            </div>
                            <span
                              className="h-6 w-6 shrink-0 rounded-full border border-black/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_0_0_3px_rgba(255,255,255,0.08)]"
                              style={{ backgroundColor: course.color }}
                            />
                          </div>

	                          <div className="max-h-24 overflow-y-auto pr-1 scrollbar-thin">
	                            <div className="grid grid-cols-8 gap-1.5 xl:grid-cols-10">
                              {COURSE_COLOR_CHOICES.map((palette) => {
                                const isSelected = normalizedCourseColor === normalizeHexColor(palette.hex);
                                return (
                                  <button
                                    key={`${palette.group}-${palette.name}`}
                                    className={classNames(
                                      "grid h-6 min-w-0 place-items-center rounded-md border transition hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:scale-95",
                                      isSelected
                                        ? "border-white/90 ring-2 ring-dlsu-vivid ring-offset-1 ring-offset-[#0E1210]"
                                        : "border-white/[0.12] hover:border-white/45"
                                    )}
                                    type="button"
                                    aria-label={`Set ${palette.name}`}
                                    title={`${palette.group}: ${palette.name}`}
                                    style={{ backgroundColor: palette.hex, color: getTextColor(palette.hex) }}
                                    onClick={() => updateCourseColor(course.code, palette.hex)}
                                  >
                                    {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#0E1210] p-4 text-sm text-white/50">
            <div className="mb-2 grid h-9 w-9 place-items-center rounded-md bg-white/[0.05] text-white/40">
              <BookOpen size={16} />
            </div>
            No courses yet. Start manually or import a schedule first.
          </div>
        )}
        </ControlGroup>
        </div>
      </section>

      {/* ── Design ─────────────────────────────── */}
      <section
        className={classNames(
          "flex-col gap-5",
          mobileTab === "design" ? "flex" : "hidden",
          desktopPanel === "design" ? "md:flex" : "md:hidden"
        )}
      >

        <div className="order-1">
          <ControlGroup title="Share Design Template">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <div className="relative min-w-0">
                <Link2 size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  className="min-h-10 w-full rounded-lg border border-white/[0.14] bg-white/[0.055] pl-8 pr-3 font-mono text-xs text-white/85 outline-none transition placeholder:text-white/35 hover:border-white/25 hover:bg-white/[0.075] focus:border-dlsu-vivid"
                  value={designCode}
                  onChange={(event) => setDesignCode(event.target.value)}
                  placeholder="PIN or link"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.07] px-3 text-xs font-bold text-white/80 transition hover:border-white/30 hover:bg-white/[0.10] hover:text-white disabled:opacity-40"
                onClick={() => setShowDesignApplyConfirm(true)}
                disabled={!designCode.trim()}
              >
                <FileInput size={14} />
                Load
              </button>
            </div>

            {!liveShareUrl ? (
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dlsu-vivid/40 bg-dlsu-vivid/15 text-xs font-bold text-white/90 shadow-sm shadow-dlsu-vivid/10 transition hover:border-dlsu-vivid/70 hover:bg-dlsu-vivid/25 hover:text-white disabled:opacity-50"
                onClick={handleGeneratePinCode}
                disabled={isGeneratingPin}
              >
                {isGeneratingPin ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {isGeneratingPin ? "Creating..." : "Create link"}
              </button>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/[0.16]">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-dlsu-vivid/15 text-dlsu-vivid">
                    <Hash size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/28">PIN</div>
                    <div className="truncate font-mono text-2xl font-black tracking-[0.14em] text-white">
                      {livePinCode}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.08] text-white/70 transition hover:bg-white/[0.14] hover:text-white"
                      onClick={() => { void copyTextToClipboard(livePinCode); setDesignShareNotice("PIN copied."); }}
                      aria-label="Copy PIN"
                      title="Copy PIN"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-white/45 transition hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
                      onClick={handleGeneratePinCode}
                      disabled={isGeneratingPin}
                      aria-label="Regenerate PIN"
                      title="Regenerate PIN"
                    >
                      {isGeneratingPin ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-white/[0.06] px-3 py-2">
                  <div className="min-w-0 font-mono text-[10px] font-bold text-white/35">
                    <span className="text-white/20">/?p=</span>{livePinCode}
                  </div>
                  <button
                    type="button"
                    className="flex h-7 items-center gap-1.5 rounded-md bg-dlsu-vivid/85 px-2.5 text-[10px] font-bold text-white transition hover:bg-dlsu-vivid"
                    onClick={() => { void copyTextToClipboard(liveShareUrl); setDesignShareNotice("Link copied."); }}
                  >
                    <Link2 size={11} />
                    Copy Link
                  </button>
                </div>
                <div className="border-t border-white/[0.04] px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-white/24">
                  Valid for 30 days
                </div>
              </div>
            )}

            {designShareNotice && (
              <p className="rounded-md border border-dlsu-vivid/20 bg-dlsu-vivid/10 px-3 py-2 text-center text-[10px] font-bold text-white/70">
                {designShareNotice}
              </p>
            )}
          </ControlGroup>
        </div>

        {/* Style */}
        <div className="order-4">
          <ControlGroup title="Style">
            {(() => {
              const hints: Record<WallpaperStyle, string> = {
                clean:       "Subtle borders",
                glass_light: "Light mode",
                glass_dark:  "Dark mode",
                compact:     "Flat & minimal",
                bold:        "Soft shadows",
                glass:       "Frosted look",
              };
              return (
	                <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                  {(Object.keys(STYLE_PRESETS) as WallpaperStyle[]).map((style) => {
                    const active = wallpaperStyle === style;
                    const label = STYLE_PRESETS[style].name;
                    return (
                      <button
                        key={style}
                        type="button"
                        aria-pressed={active}
                        title={`${label}: ${hints[style]}`}
                        className={classNames(
                          "group relative flex min-h-11 items-center gap-3 rounded-lg border px-3 py-1.5 text-left transition-all duration-150 active:scale-[0.98]",
                          active
                            ? "border-dlsu-vivid/80 bg-[#102017] text-white shadow-sm shadow-dlsu-vivid/20"
                            : "border-white/15 bg-white/[0.035] text-white/72 hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
                        )}
                        onClick={() => setWallpaperStyle(style)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-black">{label}</span>
                          <span className={classNames("block truncate text-[9px] font-semibold leading-tight", active ? "text-white/[0.48]" : "text-white/[0.34] group-hover:text-white/[0.45]")}>
                            {hints[style]}
                          </span>
                        </span>
                        {active && <Check size={12} className="shrink-0 text-dlsu-vivid" />}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            <SectionLabel className="pt-1">Font</SectionLabel>
            <CalendarFontDropdown
                value={calendarFont}
                onChange={setCalendarFont}
              />
          </ControlGroup>
        </div>

        <div className="order-5">
          {renderCourseColorThemes()}
        </div>

        <div className="order-2 lg:hidden">
          <ControlGroup title="Layout">
            <div className="lg:hidden">
              <SectionLabel>Size</SectionLabel>
              <div className="grid grid-cols-5 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                {CALENDAR_SIZE_OPTIONS.map(({ value, label }) => {
                  const currentS = deviceSettings[device] || { x:0, y:0, sx:3, sy:3 };
                  const active = Math.round((currentS.sx + currentS.sy) / 2) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={classNames(
                        "rounded-md py-2 text-[11px] font-bold transition-all",
                        active
                          ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                          : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                      )}
                      onClick={() => {
                        setDeviceSettings(prev => ({
                          ...prev,
                          [device]: { ...prev[device], sx: value, sy: value }
                        }));
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="lg:hidden">
              <SectionLabel className="pt-1">Position</SectionLabel>
              <div className="grid grid-cols-5 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                {(["left", "center", "right", "top", "bottom"] as GridPosition[]).map((pos) => (
                  <button
                    key={pos}
                    className={classNames(
                      "rounded-md py-2 text-[10px] font-bold capitalize transition-all",
                      gridPosition === pos
                        ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                        : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                    )}
                    type="button"
                    onClick={() => {
                      setGridPosition(pos);
                      setDeviceSettings(prev => ({
                        ...prev,
                        [device]: { ...prev[device], x: 0, y: 0 }
                      }));
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <label className="block">
                  <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                    <span>X</span>
                    <span>{(deviceSettings[device]?.x || 0) === 0 ? "0" : (deviceSettings[device]?.x || 0) > 0 ? `+${(deviceSettings[device]?.x || 0)}` : (deviceSettings[device]?.x || 0)}</span>
                  </span>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={deviceSettings[device]?.x || 0}
                    onChange={(e) => {
                      const val = normalizeGridOffset(Number(e.target.value));
                      setDeviceSettings(prev => ({ ...prev, [device]: { ...prev[device], x: val } }));
                    }}
                    className="archers-range w-full"
                    style={{ "--range-progress": rangeProgress(deviceSettings[device]?.x || 0, -30, 30) } as CSSProperties}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                    <span>Y</span>
                    <span>{(deviceSettings[device]?.y || 0) === 0 ? "0" : (deviceSettings[device]?.y || 0) > 0 ? `+${(deviceSettings[device]?.y || 0)}` : (deviceSettings[device]?.y || 0)}</span>
                  </span>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={deviceSettings[device]?.y || 0}
                    onChange={(e) => {
                      const val = normalizeGridOffset(Number(e.target.value));
                      setDeviceSettings(prev => ({ ...prev, [device]: { ...prev[device], y: val } }));
                    }}
                    className="archers-range w-full"
                    style={{ "--range-progress": rangeProgress(deviceSettings[device]?.y || 0, -30, 30) } as CSSProperties}
                  />
                </label>
              </div>
            </div>
          </ControlGroup>
        </div>

        {/* Background */}
        <div className="order-6">
          <ControlGroup
            title="Background"
            action={
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[10px] font-black text-white/70 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                onClick={applyAutoBackground}
              >
                <Wand2 size={13} strokeWidth={2.5} />
                Auto
              </button>
            }
          >
            {/* ── Sub-tabs for Background customization ── */}
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
              {([
                { id: "base",  label: "Base",  icon: Palette },
                { id: "emoji", label: "Emoji", icon: Sparkles },
                { id: "lines", label: "Lines", icon: Layers    },
              ] as { id: "base" | "emoji" | "lines"; label: string; icon: LucideIcon }[]).map(({ id, label, icon: TabIcon }) => (
                <button
                  key={id}
                  type="button"
                  className={classNames(
                    "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-black transition-all",
                    backgroundSubTab === id
                      ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                      : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                  )}
                  onClick={() => setBackgroundSubTab(id)}
                >
                  <TabIcon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Base background view ── */}
            {backgroundSubTab === "base" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                  {([
                    { kind: "solid",    label: "Color",    icon: Palette  },
                    { kind: "gradient", label: "Gradient", icon: Sparkles },
                    { kind: "image",    label: "Photo",    icon: ImageIcon },
                  ] as { kind: BackgroundKind; label: string; icon: LucideIcon }[]).map(({ kind, label, icon: KindIcon }) => (
                    <button
                      key={kind}
                      type="button"
                      className={classNames(
                        "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition-all",
                        backgroundKind === kind
                          ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                          : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                      )}
                      onClick={(event) => {
                        if (kind === "solid") handleSolidBackgroundChange(background);
                        else if (kind === "gradient") applyGradientPreset(gradient);
                        else {
                          if (!backgroundImage) {
                            openBackgroundUpload(event.currentTarget);
                          } else {
                            setBackgroundKind("image");
                          }
                        }
                      }}
                    >
                      <KindIcon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
                <input data-background-image-upload="true" className="sr-only" type="file" accept="image/*" onChange={handleBackgroundUpload} />

                {backgroundKind === "solid" && (
                  <div className="space-y-3">
                    <label className="relative flex min-h-11 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-white/15 bg-white/[0.055] px-3 transition hover:border-white/30 hover:bg-white/[0.08]">
                      <div className="h-6 w-6 shrink-0 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: background.startsWith("#") ? background : DEFAULT_BACKGROUND }} />
                      <span className="flex-1 font-mono text-xs text-white/60">{background.startsWith("#") ? background.toUpperCase() : DEFAULT_BACKGROUND}</span>
                      <span className="text-[10px] font-bold text-white/55">Change</span>
                      <input className="absolute inset-0 cursor-pointer opacity-0" type="color" value={background.startsWith("#") ? background : DEFAULT_BACKGROUND} onChange={(e) => handleSolidBackgroundChange(e.target.value)} />
                    </label>
                    <div className="space-y-2.5">
                      {BACKGROUND_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                          <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-white/25">{cat.label}</p>
                          <div className="grid grid-cols-6 gap-1.5 xl:grid-cols-8">
                            {cat.colors.slice(0, -2).map((preset) => (
                              <button
                                key={`${preset.name}-${preset.value}`}
                                type="button"
                                title={preset.name}
                                aria-label={preset.name}
                                className={classNames(
                                  "grid h-8 place-items-center rounded-md border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10),0_1px_6px_rgba(0,0,0,0.22)] transition-all hover:scale-105 hover:border-white/35 active:scale-95",
                                  backgroundKind === "solid" && background === preset.value
                                    ? "ring-2 ring-white ring-offset-1 ring-offset-[#090D0B] border-transparent"
                                    : ""
                                )}
                                style={{ backgroundColor: preset.value, color: getTextColor(preset.value) }}
                                onClick={() => handleSolidBackgroundChange(preset.value)}
                              >
                                {backgroundKind === "solid" && background === preset.value ? <Check size={12} /> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {backgroundKind === "gradient" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                      {(["linear", "radial"] as GradientType[]).map((type) => (
                        <button key={type} type="button"
                          className={classNames("rounded-md py-2 text-[10px] font-bold capitalize transition-all",
                            gradient.type === type ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20" : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                          )}
                          onClick={() => updateGradient({ type })}
                        >{type}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {gradient.colors.slice(0, 2).map((color, index) => (
                        <label key={index} className="relative flex min-h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-white/15 bg-white/[0.055] px-3 transition hover:border-white/30 hover:bg-white/[0.08]">
                          <div className="h-5 w-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }} />
                          <span className="flex-1 font-mono text-[10px] uppercase text-white/60">{color}</span>
                          <input className="absolute inset-0 cursor-pointer opacity-0" type="color" value={color} onChange={(e) => updateGradientColor(index, e.target.value)} />
                        </label>
                      ))}
                    </div>
                    {gradient.type === "linear" && (
                      <label className="block">
                        <span className="mb-1 flex justify-between text-[10px] font-bold text-white/40">
                          <span>Angle</span><span>{gradient.angle}°</span>
                        </span>
                        <input type="range" min="0" max="360" value={gradient.angle} onChange={(e) => updateGradient({ angle: Number(e.target.value) })} className="w-full accent-dlsu-vivid" />
                      </label>
                    )}
                    <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                      {GRADIENT_PRESETS.map((preset) => (
                        <button key={preset.name} type="button"
                          className="min-h-9 rounded-lg border border-white/15 px-2 text-[10px] font-black text-white shadow-[inset_0_0_0_999px_rgba(0,0,0,0.16)] transition hover:border-white/35 active:scale-95"
                          style={{ backgroundImage: buildGradientBackground(preset.gradient) }}
                          onClick={() => applyGradientPreset(preset.gradient)}
                        >{preset.name}</button>
                      ))}
                    </div>
                  </div>
                )}

                {backgroundKind === "image" && (
                  <div className="space-y-3">
                    {backgroundImage ? (
                      <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        <img src={backgroundImage} alt="Background preview" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => openBackgroundUpload(event.currentTarget)}
                            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black text-black shadow-xl transition-all hover:bg-white/90 active:scale-95"
                          >
                            <ImagePlus size={14} />
                            Replace Photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => openBackgroundUpload(event.currentTarget)}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-dlsu-vivid", "bg-dlsu-vivid/5"); }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-dlsu-vivid", "bg-dlsu-vivid/5"); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-dlsu-vivid", "bg-dlsu-vivid/5");
                          const file = e.dataTransfer.files[0];
                          if (file && file.type.startsWith("image/")) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                              const result = re.target?.result as string;
                              setBackgroundImage(result);
                              setBackgroundKind("image");
                              void estimateImageTone(result).then(setBackgroundTone);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.035] text-white/45 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                      >
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/30 transition-colors group-hover:bg-white/10">
                          <ImagePlus size={22} strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black uppercase tracking-wider">Drag & Drop Photo</p>
                          <p className="mt-1 text-[10px] font-medium text-white/25">or click to browse files</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Emoji Overlay view ── */}
            {backgroundSubTab === "emoji" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Emoji Overlay</SectionLabel>
                  <PillSwitch checked={emojiOverlayEnabled} icon={Sparkles} label={emojiOverlayEnabled ? "On" : "Off"} onChange={() => setEmojiOverlayEnabled(!emojiOverlayEnabled)} />
                </div>

                <div className={classNames("liquid-glass space-y-3 rounded-xl border p-3 transition-all duration-200", emojiOverlayEnabled ? "border-dlsu-vivid/30 bg-dlsu-vivid/[0.055]" : "border-white/[0.08] bg-white/[0.025] opacity-80")}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setEmojiOverlayEnabled(true)}
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dlsu-vivid/50 bg-dlsu-vivid/15 text-3xl shadow-inner transition active:scale-95"
                      aria-label="Enable emoji overlay"
                    >
                      {pattern.emoji}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/45">Pattern Layout</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PATTERN_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            className={classNames(
                              "min-h-8 rounded-lg border px-2 text-[10px] font-bold transition active:scale-95",
                              pattern.preset === preset.value
                                ? "border-dlsu-vivid bg-dlsu-vivid text-white"
                                : "border-white/15 bg-white/[0.055] text-white/65 hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
                            )}
                            onClick={() => { setEmojiOverlayEnabled(true); applyPatternPreset(preset.value); }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 xl:grid-cols-8">
                    {QUICK_EMOJI_PICKS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={classNames(
                          "grid h-10 min-w-0 place-items-center rounded-lg border text-xl transition hover:border-white/25 hover:bg-white/[0.07] active:scale-95",
                          pattern.emoji === emoji
                            ? "border-dlsu-vivid bg-dlsu-vivid/20 shadow-sm shadow-dlsu-vivid/20"
                            : "border-white/15 bg-white/[0.055] hover:border-white/30 hover:bg-white/[0.08]"
                        )}
                        onClick={() => updatePattern({ emoji })}
                        aria-label={`Use ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {emojiOverlayEnabled && (
                    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0B100D]">
                      <EmojiPicker
                        width="100%"
                        height={280}
                        theme={(appTheme === "light" ? "light" : "dark") as PickerProps["theme"]}
                        emojiStyle={"native" as PickerProps["emojiStyle"]}
                        lazyLoadEmojis
                        skinTonesDisabled
                        autoFocusSearch={false}
                        searchPlaceholder="Search emoji"
                        previewConfig={{ showPreview: false }}
                        className="archers-emoji-picker"
                        style={appTheme === "light" ? EMOJI_PICKER_LIGHT_STYLE : EMOJI_PICKER_DARK_STYLE}
                        onEmojiClick={(emojiData: EmojiClickData) => updatePattern({ emoji: emojiData.emoji })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Size</span><span>{pattern.size}px</span></span>
                      <input type="range" min="12" max="240" value={pattern.size} onChange={(e) => updatePattern({ size: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.size, 12, 240) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Spacing</span><span>{pattern.spacing}px</span></span>
                      <input type="range" min="36" max="360" value={pattern.spacing} onChange={(e) => updatePattern({ spacing: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.spacing, 36, 360) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Opacity</span><span>{Math.round(pattern.opacity * 100)}%</span></span>
                      <input type="range" min="0.04" max="1" step="0.01" value={pattern.opacity} onChange={(e) => updatePattern({ opacity: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.opacity, 0.04, 1) } as CSSProperties} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── Lines Overlay view ── */}
            {backgroundSubTab === "lines" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Lines Overlay</SectionLabel>
                  <PillSwitch checked={lineOverlayEnabled} icon={Layers} label={lineOverlayEnabled ? "On" : "Off"} onChange={() => setLineOverlayEnabled(!lineOverlayEnabled)} />
                </div>

                <div className={classNames("liquid-glass space-y-3 rounded-xl border p-3 transition-all duration-200", lineOverlayEnabled ? "border-dlsu-vivid/30 bg-dlsu-vivid/[0.055]" : "border-white/[0.08] bg-white/[0.025] opacity-80")}>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Presets</p>
                    <div className="grid grid-cols-3 gap-1 xl:grid-cols-5">
                      {GEOMETRIC_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 py-1.5 text-[10px] font-bold text-white/60 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                          onClick={() => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, ...preset.config })); }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="grid flex-1 grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1 xl:grid-cols-5">
                      {GEOMETRIC_KIND_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button"
                          className={classNames("rounded-md py-1.5 text-[10px] font-bold transition-all",
                            geometric.kind === opt.value ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20" : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                          )}
                          onClick={() => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, kind: opt.value })); }}
                        >{opt.label}</button>
                      ))}
                    </div>
                    <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/[0.07] transition hover:border-white/35">
                      <input type="color" value={geometric.color} onChange={(e) => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, color: e.target.value })); }} className="absolute inset-0 cursor-pointer opacity-0" />
                      <div className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: geometric.color }} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Thickness</span><span>{geometric.size < 5 ? "Thin" : geometric.size > 12 ? "Thick" : "Medium"}</span></span>
                      <input type="range" min="1" max="20" step="1" value={geometric.size} onChange={(e) => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, size: Number(e.target.value) })); }} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.size, 1, 20) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Density</span><span>{geometric.spacing < 30 ? "Dense" : geometric.spacing > 80 ? "Spaced" : "Normal"}</span></span>
                      <input type="range" min="16" max="128" step="4" value={geometric.spacing} onChange={(e) => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, spacing: Number(e.target.value) })); }} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.spacing, 16, 128) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Opacity</span><span>{Math.round(geometric.opacity * 100)}%</span></span>
                      <input type="range" min="0.05" max="1" step="0.05" value={geometric.opacity} onChange={(e) => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, opacity: Number(e.target.value) })); }} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.opacity, 0.05, 1) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40"><span>Broken</span><span>{geometric.dash > 0 ? `${geometric.dash}px` : "Solid"}</span></span>
                      <input type="range" min="0" max="32" step="1" value={geometric.dash} onChange={(e) => { setLineOverlayEnabled(true); setGeometric(prev => ({ ...prev, dash: Number(e.target.value) })); }} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.dash, 0, 32) } as CSSProperties} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </ControlGroup>
        </div>      </section>

      {/* ── Export ─────────────────────────────── */}
      <section
        className={classNames(
          "space-y-3",
          mobileTab === "export" ? "block" : "hidden",
          desktopPanel === "export" ? "md:block" : "md:hidden"
        )}
      >
        <SectionLabel>Export Format</SectionLabel>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5 shadow-inner">
          {EXPORT_VARIANT_OPTIONS.map(({ value, label, description, icon: VariantIcon }) => (
            <button
              key={value}
              type="button"
              title={description}
              className={classNames(
                "flex flex-col items-center justify-center gap-1 rounded-md py-1.5 transition-all active:scale-95",
                exportVariant === value
                  ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white/80"
              )}
              onClick={() => setExportVariant(value)}
            >
              <VariantIcon size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-dlsu-vivid px-4 text-white shadow-lg shadow-dlsu-vivid/25 transition-all duration-200 hover:bg-dlsu active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              void handleExport();
            } else {
              setShowExportPopup(true);
            }
          }}
          disabled={isExporting}
        >
          {isExporting
            ? <Loader2 size={18} className="animate-spin" />
            : <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />}
          <span className="text-sm font-black">{isExporting ? "Saving..." : "Save to Photos"}</span>
        </button>

        <a
          href="https://instagram.com/richarduaje"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-[11px] font-black text-white/50 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          onClick={() => trackAppEvent("bug_report_click", { target: "instagram" })}
        >
          <Bug size={13} strokeWidth={2.5} />
          Report Bugs @richarduaje
        </a>
        </section>

    </div>
  );

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <main data-app-theme={appTheme} className="archers-app h-[100dvh] w-full overflow-hidden bg-[#080B09] text-white overscroll-none">
      <ExportOverlay />

      {pendingDeleteSaved && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={(event) => {
            if (!isDeletingSaved && event.target === event.currentTarget) {
              setPendingDeleteSaved(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0E1410] p-5 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-300">
                <Trash2 size={17} strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-white">Delete saved schedule?</h3>
                <p className="mt-1 text-sm leading-5 text-white/50">
                  Are you sure you want to delete <span className="font-bold text-white/80">{pendingDeleteSaved.name || "this schedule"}</span>? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-45"
                onClick={() => setPendingDeleteSaved(null)}
                disabled={isDeletingSaved}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-sm font-black text-white transition hover:bg-red-400 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                onClick={() => void confirmDeleteSavedCopy()}
                disabled={isDeletingSaved}
              >
                {isDeletingSaved ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design load confirmation modal */}
      {showDesignApplyConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDesignApplyConfirm(false); }}
        >          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0E1410] p-6 shadow-2xl">
            <div className="mb-1 text-base font-black text-white">Load this design?</div>
            <p className="mb-5 text-sm leading-relaxed text-white/50">
              This changes the background, colors, font, and layout. Your courses stay as-is.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => setShowDesignApplyConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dlsu-vivid py-2.5 text-sm font-bold text-white transition hover:bg-dlsu active:scale-95"
                onClick={() => { setShowDesignApplyConfirm(false); void handleApplyDesignCode(); }}
              >
                <FileInput size={14} />
                Load
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-full w-full min-w-0 flex-col lg:grid lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">

        {/* Desktop sidebar */}
        <aside className="hidden min-h-0 border-r border-white/5 bg-[#070A08] lg:flex lg:flex-col">
          <div className="liquid-glass flex min-h-20 shrink-0 items-center justify-between border-b border-white/5 px-6">
            <img src="/logos/logo-full-green.png" alt="Archers Calendar" className="h-10 w-auto object-contain object-left" />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
              title="Toggle App Theme"
            >
              {appTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          {sidebarPanelTabs}
          <div className="flex-1 overscroll-y-contain overflow-y-auto scrollbar-thin" style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
            {controls}
          </div>
        </aside>

        {/* Right: preview area */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          {/* Mobile device switcher (Visible on the right side near bottom on mobile) */}
          <div className={classNames(
            "liquid-glass-strong pointer-events-auto absolute bottom-24 right-4 z-[100] flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-1.5 shadow-xl shadow-black/30 transition-all duration-300 lg:hidden",
            isMobileExpanded ? "pointer-events-none opacity-0" : "opacity-100"
          )}>
            <div className="flex flex-col items-center justify-center gap-1.5">
              {(Object.keys(DEVICES) as DeviceId[]).map((deviceId) => {
                const DeviceIcon = DEVICES[deviceId].icon;
                const active = device === deviceId;
                return (
                  <button
                    key={deviceId}
                    className={classNames(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
                      active
                        ? "bg-dlsu-vivid text-white shadow-lg shadow-dlsu-vivid/20"
                        : "text-white/[0.42] hover:bg-white/[0.12] hover:text-white"
                    )}
                    type="button"
                    onClick={() => selectDevice(deviceId)}
                  >
                    <DeviceIcon size={14} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview — always visible */}
          {/* The canvas is rendered at its real fixed pixel size; a wrapper div
              sized to `canvasSize * previewScale` contains it at `scale(previewScale)`
              so the preview is pixel-perfect with the export output */}
          <div
            ref={previewContainerRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-12 md:p-8 lg:p-8"
            onClick={() => { if (isMobileExpanded) setIsMobileExpanded(false); }}
            onTouchStart={(e) => {
              const touch = e.targetTouches[0];
              previewContainerRef.current?.setAttribute('data-touch-start-y', touch.clientY.toString());
            }}
            onTouchEnd={(e) => {
              const startY = parseFloat(previewContainerRef.current?.getAttribute('data-touch-start-y') || '0');
              const endY = e.changedTouches[0].clientY;
              if (startY && endY - startY > 40 && isMobileExpanded) {
                setIsMobileExpanded(false);
              } else if (startY && startY - endY > 40 && !isMobileExpanded) {
                setIsMobileExpanded(true);
              }
            }}
          >
            <div data-export-hidden="true" className="pointer-events-none absolute inset-x-5 top-5 z-30 hidden lg:block">
              <div className="liquid-glass-strong pointer-events-auto absolute left-0 top-0 rounded-2xl border border-white/10 px-4 py-3 shadow-xl shadow-black/30">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/[0.38]">Live preview</p>
                <h2 className="mt-0.5 text-base font-black leading-none text-white">
                  {activeDevice.label}
                </h2>
              </div>

              <div className="liquid-glass-strong pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 p-1.5 shadow-xl shadow-black/30">
                {(Object.keys(DEVICES) as DeviceId[]).map((deviceId) => {
                  const DeviceIcon = DEVICES[deviceId].icon;
                  const active = device === deviceId;
                  return (
                    <button
                      key={deviceId}
                      className={classNames(
                        "grid h-8 w-9 place-items-center rounded-lg transition-all duration-150",
                        active
                          ? "bg-dlsu-vivid text-white shadow-lg shadow-dlsu-vivid/20"
                          : "text-white/[0.42] hover:bg-white/[0.07] hover:text-white/[0.85]"
                      )}
                      type="button"
                      title={`${DEVICES[deviceId].label} ${DEVICES[deviceId].description}`}
                      aria-label={`${DEVICES[deviceId].label} ${DEVICES[deviceId].description}`}
                      onClick={() => selectDevice(deviceId)}
                    >
                      <DeviceIcon size={15} strokeWidth={active ? 2.5 : 2} />
                    </button>
                  );
                })}
              </div>

              <div className="pointer-events-auto absolute right-0 top-0">
                <button
                  className="group flex h-11 items-center gap-2.5 rounded-2xl bg-dlsu-vivid px-5 text-sm font-black text-white shadow-lg shadow-dlsu-vivid/25 transition-all duration-200 hover:bg-dlsu active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowExportPopup((open) => !open);
                  }}
                  disabled={isExporting}
                >
                  {isExporting
                    ? <Loader2 size={17} className="animate-spin" />
                    : <Download size={17} className="transition-transform group-hover:-translate-y-0.5" />}
                  {isExporting ? "Saving..." : "Save"}
                  <ChevronDown size={14} className={classNames("transition-transform", showExportPopup ? "rotate-180" : "")} />
                </button>
                {renderExportDropdown()}
              </div>
            </div>

            {/* Mobile floating header (logo & theme toggle) — visible when sidebar is hidden */}
            <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between lg:hidden">
              <img src="/logos/logo-mini-green.png" alt="Archers Calendar" className="h-8 w-auto object-contain drop-shadow-md" />
              <button
                type="button"
                className="liquid-glass flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white shadow-md transition hover:bg-white/[0.08]"
                onClick={(e) => { e.stopPropagation(); setAppTheme(appTheme === "dark" ? "light" : "dark"); }}
                title="Toggle App Theme"
              >
                {appTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>

            <div
              key={device}
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${previewScale})`,
                transformOrigin: "center center",
                flexShrink: 0
              }}
              className="animate-device-switch flex items-center justify-center"
            >
              <PreviewCanvas
                canvasRef={canvasRef}
                previewScale={previewScale}
                onManipulationStart={handleManipulationStart}
                isManipulating={!!manipulation}
              />

              {/* Resize hint island (desktop only) */}
              {device !== "share" && showManipulationHint && (
                <div data-export-hidden="true" className="pointer-events-none absolute bottom-8 left-1/2 z-[100] hidden -translate-x-1/2 lg:block">
                  <div className="liquid-glass-strong flex min-w-[320px] items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-white shadow-xl shadow-black/35">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-dlsu-vivid/25 bg-dlsu-vivid/15 text-dlsu-vivid">
                      <Move size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Move & resize</p>
                      <p className="mt-0.5 text-xs font-bold text-white/75">Drag the calendar center or its edges.</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sessionStorage.setItem("archers_manipulation_hud_v2", "true");
                        setShowManipulationHint(false);
                      }}
                      className="pointer-events-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 transition hover:border-white/25 hover:bg-white/[0.10] hover:text-white"
                      title="Dismiss"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}            </div>

            {/* Global Manipulation Event Layer (Desktop Only) */}
            {manipulation && (
              <div
                className="fixed inset-0 z-[9999]"
                style={{ cursor: getManipulationCursor(manipulation.type) }}
                onMouseMove={handleManipulationMove}
                onMouseUp={handleManipulationEnd}
              />
            )}
          </div>

          <div className="lg:hidden">
            <MobileControls>{controls}</MobileControls>
          </div>
        </section>
      </div>

    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={classNames("text-[10px] font-black uppercase tracking-[0.08em] text-white/55", className)}>{children}</h2>;
}

function ControlGroup({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={classNames("liquid-glass rounded-xl border border-white/[0.075] p-2.5 shadow-sm transition-all duration-200", className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <SectionLabel>{title}</SectionLabel>
        {action}
      </div>
      <div className="mt-2 space-y-2.5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <label className={classNames("block", className)}>
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-white/45">{label}</span>
      <input
        className="min-h-10 w-full rounded-lg border border-white/[0.12] bg-white/[0.035] px-3 text-sm font-semibold text-white shadow-sm outline-none transition-all placeholder:text-white/25 hover:border-white/25 hover:bg-white/[0.05] focus:border-dlsu-vivid focus:bg-white/[0.055] focus:ring-1 focus:ring-dlsu-vivid"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
      />
    </label>
  );
}


function CourseField({ label, value, onBlur, className }: { label: string; value: string; onBlur: (v: string) => void; className?: string }) {
  return (
    <label className={classNames("block", className)}>
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.38]">{label}</span>
      <input
        key={`${label}-${value}`}
        className="min-h-9 w-full rounded-lg border border-white/[0.11] bg-white/[0.04] px-2.5 text-xs font-medium text-white outline-none transition placeholder:text-white/25 hover:border-white/[0.22] hover:bg-white/[0.06] focus:border-dlsu-vivid focus:bg-white/[0.055] focus:ring-1 focus:ring-dlsu-vivid/35"
        defaultValue={value}
        onBlur={(e) => onBlur(e.currentTarget.value)}
      />
    </label>
  );
}

function CalendarFontDropdown({ value, onChange }: { value: CalendarFont; onChange: (font: CalendarFont) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const active = getCalendarFontOption(value);

  useEffect(() => {
    if (open && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
          const menuHeight = Math.min(window.innerHeight * 0.6, 420);
          setCoords({
            top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
            left: Math.max(16, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 16)),
            width: rect.width
          });
        }
      };
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [open]);

  return (
    <div className="relative">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[150] cursor-default"
          aria-label="Close font menu"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        ref={triggerRef}
        type="button"
        className={classNames(
          "liquid-glass group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/[0.14] px-3 text-left text-white outline-none transition-all hover:border-white/30 hover:bg-white/[0.08] focus:border-dlsu-vivid focus:ring-1 focus:ring-dlsu-vivid/35",
          active.bodyClass
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={classNames("grid h-7 w-8 shrink-0 place-items-center rounded-md border border-white/[0.10] bg-white/[0.07] text-[13px] font-black text-white shadow-inner", active.headingClass)}>
            Aa
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight">{active.label}</span>
          </span>
        </span>
        <ChevronDown size={16} className={classNames("shrink-0 text-white/45 transition-transform duration-150", open ? "rotate-180" : "")} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          role="listbox"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            minWidth: Math.max(coords.width, 260),
            width: Math.max(coords.width, 260),
            maxWidth: "calc(100vw - 2rem)"
          }}
          className="liquid-glass-strong animate-popover-in z-[2000] max-h-[min(60dvh,420px)] overflow-y-auto rounded-xl border border-white/[0.14] bg-black/60 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/45 scrollbar-thin"
        >
          {CALENDAR_FONT_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={classNames(
                  "group/option grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 text-left transition-all duration-150 hover:bg-white/[0.08] active:scale-[0.99]",
                  selected ? "bg-dlsu-vivid/18 text-white" : "text-white/72 hover:text-white",
                  option.bodyClass
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={classNames("text-[15px] font-black leading-tight", option.headingClass)}>{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-white/30 group-hover/option:text-white/50">The quick brown fox jumps...</span>
                </div>
                <span className={classNames(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[13px] font-black transition-colors",
                  selected
                    ? "border-dlsu-vivid/55 bg-dlsu-vivid/25 text-white"
                    : "border-white/[0.10] bg-white/[0.045] text-white/55 group-hover/option:text-white/85",
                  option.headingClass
                )}>
                  {selected ? <Check size={14} strokeWidth={3} className="text-dlsu-vivid" /> : "Aa"}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
function parseTimeSlotTo24h(slot: string): { start: string; end: string } {
  const m = slot.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return { start: "07:30", end: "09:00" };
  let h1 = parseInt(m[1]), h2 = parseInt(m[4]);
  const min1 = m[2] ?? "00", min2 = m[5] ?? "00";
  const p1 = (m[3] ?? "").toUpperCase(), p2 = (m[6] ?? "").toUpperCase();
  if (p1 === "PM" && h1 !== 12) h1 += 12;
  else if (p1 === "AM" && h1 === 12) h1 = 0;
  if (p2 === "PM" && h2 !== 12) h2 += 12;
  else if (p2 === "AM" && h2 === 12) h2 = 0;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { start: `${pad(h1)}:${min1}`, end: `${pad(h2)}:${min2}` };
}

function format24hToAmPm(t: string): string {
  const [hStr, mStr = "00"] = t.split(":");
  const h = parseInt(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

function TimeField({ value, onBlur }: { value: string; onBlur: (v: string) => void }) {
  const parsed = useMemo(() => parseTimeSlotTo24h(value), [value]);
  return <TimeFieldInputs key={`${parsed.start}-${parsed.end}`} parsed={parsed} onBlur={onBlur} />;
}

function TimeFieldInputs({ parsed, onBlur }: { parsed: { start: string; end: string }; onBlur: (v: string) => void }) {
  const [start, setStart] = useState(parsed.start);
  const [end, setEnd] = useState(parsed.end);

  const emit = (s: string, e: string) => {
    if (s && e) onBlur(`${format24hToAmPm(s)} - ${format24hToAmPm(e)}`);
  };

  const inputCls = "min-h-9 min-w-0 w-full rounded-lg border border-white/[0.11] bg-white/[0.04] px-2 text-center text-xs font-medium text-white outline-none transition [color-scheme:dark] hover:border-white/[0.22] hover:bg-white/[0.06] focus:border-dlsu-vivid focus:bg-white/[0.055] focus:ring-1 focus:ring-dlsu-vivid/35";

  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-white/[0.38]">Time</span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => emit(start, end)}
          className={inputCls}
        />
        <span className="shrink-0 text-[10px] font-bold text-white/[0.28]">–</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={() => emit(start, end)}
          className={inputCls}
        />
      </div>
    </div>
  );
}

function PillSwitch({ checked, label, icon: Icon, onChange }: { checked: boolean; label: string; icon: LucideIcon; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={classNames(
        "liquid-glass group inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-2.5 text-[11px] font-black text-white transition-all duration-200 hover:-translate-y-px active:scale-[0.98]",
        checked
          ? "border-dlsu-vivid/40 bg-dlsu-vivid/25 shadow-sm"
          : "border-white/[0.12] bg-white/[0.05] text-white/60 hover:border-white/25 hover:text-white/80"
      )}
    >
      <Icon size={13} className={classNames("transition-colors", checked ? "text-dlsu-vivid" : "text-white/45 group-hover:text-white/70")} />
      <span className="min-w-7 text-left">{label}</span>
      <span className={classNames(
        "relative flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200",
        checked ? "bg-dlsu-vivid" : "bg-white/[0.18]"
      )}>
        <span className={classNames(
          "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </span>
    </button>
  );
}

function Toggle({ checked, label, icon: Icon, onChange, compact }: { checked: boolean; label: string; icon: LucideIcon; onChange: () => void; compact?: boolean }) {
  return (
    <button
      className={classNames(
        "group flex w-full items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.035] font-semibold text-white shadow-sm transition-all hover:border-white/25 hover:bg-white/[0.055]",
        compact ? "min-h-9 gap-2 px-2.5 text-[11px]" : "min-h-12 gap-3 px-4 text-sm"
      )}
      type="button"
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className={classNames("flex min-w-0 items-center", compact ? "gap-2" : "gap-3")}>
        <Icon size={compact ? 13 : 17} className="shrink-0 text-white/60 transition-colors group-hover:text-white" />
        <span className="min-w-0 truncate leading-tight">{label}</span>
      </span>
      <span className={classNames("flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-300", compact ? "h-[18px] w-8" : "h-6 w-11", checked ? "bg-dlsu-vivid" : "bg-white/20 group-hover:bg-white/25")}>
        <span className={classNames("rounded-full bg-white shadow-sm transition-transform duration-300", compact ? "h-3 w-3" : "h-4 w-4", checked ? (compact ? "translate-x-4" : "translate-x-5") : "translate-x-0")} />
      </span>
    </button>
  );
}
