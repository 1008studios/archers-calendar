"use client";

import { classNames, getTextColor, computeRowCells, formatTimeSlot, courseParts, getStartMinutes, toneFromRgb, toneFromHex, toneFromColors, getPaletteTextColor, buildGradientBackground, buildEmojiPatternBackground, buildGeometricBackground, normalizeHexColor, hexToRgb, estimateImageTone, courseKeyFromCode, courseKeyFromCourse, getExpandedCourseSet, formatMeetingDays, getSlotDurationMinutes, groupEntriesByCourse, rangeProgress, formatPixels } from "@/lib/utils";
import { toCanvas } from "html-to-image";
import JSZip from "jszip";
import dynamic from "next/dynamic";
import {
  AlignLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Hash,
  History,
  Image as ImageIcon,
  ImagePlus,
  Laptop,
  Layers,
  Loader2,
  MapPin,
  Monitor,
  Moon,
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
  Link2,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EmojiClickData, PickerProps } from "emoji-picker-react";
import { ChangeEvent, CSSProperties, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
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
type CalendarThemeMode = "normal" | "light" | "dark";
type WallpaperStyle = "clean" | "compact" | "bold" | "glass";
type GridPosition = "center" | "left" | "right" | "top" | "bottom";
type ExportVariant = "full" | "transparent" | "background";
type CalendarFont = "geist" | "inter" | "poppins" | "manrope" | "montserrat" | "nunito" | "rubik" | "outfit" | "lexend" | "spaceGrotesk" | "robotoMono" | "merriweather" | "system";
type AppTheme = "dark" | "light";
type BackgroundKind = "solid" | "image" | "gradient";
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

type SavedScheduleState = {
  rawText: string;
  entries: ScheduleEntry[];
  visibleDays: Record<DayKey, boolean>;
  showRoom: boolean;
  showProfessor: boolean;
  showSection: boolean;
  showCourseTitle: boolean;
  autoHideEmptyDays: boolean;
  calendarTitle: string;
  calendarSubtitle: string;
  activeCoursePalette: string[];
  device: DeviceId;
  wallpaperStyle: WallpaperStyle;
  appTheme: AppTheme;
  calendarThemeMode: CalendarThemeMode;
  gridPosition: GridPosition;
  gridOffsetX: number;
  gridOffsetY: number;
  backgroundKind: BackgroundKind;
  overlayKind?: OverlayKind;
  background: string;
  backgroundImage: string;
  backgroundTone: CalendarTone;
  gradient: GradientConfig;
  pattern: PatternConfig;
  geometric?: GeometricConfig;
  calendarSize: number;
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
  background: string;
  backgroundImage: string;
  backgroundTone: CalendarTone;
  gradient: GradientConfig;
  pattern: PatternConfig;
  geometric?: GeometricConfig;
  wallpaperStyle: WallpaperStyle;
  appTheme: AppTheme;
  calendarThemeMode: CalendarThemeMode;
  gridPosition: GridPosition;
  gridOffsetX: number;
  gridOffsetY: number;
  calendarFont: CalendarFont;
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
  iphone:         { label: "iPhone",   aspect: "9 / 19.5",   ratio: 9 / 19.5,   icon: Smartphone,      description: "9:19.5 Portrait"  },
  ipad_portrait:  { label: "iPad",     aspect: "3 / 4",      ratio: 3 / 4,      icon: Tablet,          description: "3:4 Portrait"     },
  ipad_landscape: { label: "iPad",     aspect: "4 / 3",      ratio: 4 / 3,      icon: Tablet,          description: "4:3 Landscape"    },
  laptop:         { label: "Laptop",   aspect: "16 / 9",     ratio: 16 / 9,     icon: Laptop,          description: "16:9 Widescreen"  },
  macbook:        { label: "Laptop",   aspect: "1440 / 900",  ratio: 1440 / 900, icon: Monitor,         description: "16:10 Display"    },
  share:          { label: "Square",   aspect: "1 / 1",      ratio: 1,          icon: ImageIcon,       description: "1:1 Square"       }
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
const EXPORT_SCALE = 4; // High-res export (4× native) — balanced quality vs browser memory use.

const BLOCK_PALETTE_GROUPS = [
  {
    label: "Pink",
    colors: [
      { name: "Blush",      hex: "#FFB3C1" },
      { name: "Rose",       hex: "#FF85A1" },
      { name: "Strawberry", hex: "#FF6B8A" },
      { name: "Hot Pink",   hex: "#FF4D9E" },
      { name: "Fuchsia",    hex: "#E040FB" },
      { name: "Bubblegum",  hex: "#FF9FD7" }
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
      { name: "Amber",      hex: "#FFAB40" },
      { name: "Butter",     hex: "#FFF3A3" }
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
      { name: "Emerald",    hex: "#2EAD6B" },
      { name: "Pine",       hex: "#2F7D52" }
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
      { name: "Navy",       hex: "#385A8C" }
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
      { name: "Grape",      hex: "#7B4FCB" }
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
      { name: "Graphite",   hex: "#2F3437" }
    ]
  }
];

const BLOCK_PALETTES = BLOCK_PALETTE_GROUPS.flatMap((group) => group.colors);

const COURSE_THEMES: Array<{ name: string; colors: string[] }> = [
  { name: "Blossom",    colors: ["#FFB3C1","#FF85A1","#FFD6E7","#F5A0B8","#FFCCE0","#FFC4D6","#FF9BB5","#FFDDE8"] },
  { name: "Candy",      colors: ["#FF6B9D","#FF8ED3","#C084FC","#F472B6","#E879F9","#FF70A0","#A78BFA","#FB7185"] },
  { name: "Berry",      colors: ["#C62828","#AD1457","#7B1FA2","#880E4F","#B71C1C","#8E24AA","#6A1B9A","#C2185B"] },
  { name: "Pastel",     colors: ["#FFB3C1","#FFCBA4","#FFF3A3","#A8EED5","#A8D8F0","#D4BFFF","#B5D5A0","#E8C8F8"] },
  { name: "Lavender",   colors: ["#D4BFFF","#E8C8F8","#C4B0E8","#B8A8FF","#EAD5FF","#CDB8F8","#F0E0FF","#DDD0FF"] },
  { name: "Peach",      colors: ["#FFCBA4","#FFB899","#FFD4B0","#F5A888","#FFBFA8","#F0C0A0","#FFD8C0","#F5B898"] },
  { name: "Citrus",     colors: ["#FACC15","#FB923C","#A3E635","#FCD34D","#86EFAC","#FDE68A","#4ADE80","#FCA5A5"] },
  { name: "Ocean",      colors: ["#A8D8F0","#85C1E9","#B3E5FC","#5DADE2","#81D4FA","#29B6F6","#B2EBF2","#4FC3F7"] },
  { name: "Dusk",       colors: ["#94A3B8","#7B8FAD","#A8B4C0","#8EA3B4","#B8C5D0","#7B9BAE","#A0AEBC","#5A7A9A"] },
  { name: "Sunset",     colors: ["#FFDAB9","#FFCC80","#FFB74D","#FFA726","#FF9800","#FB8C00","#F57C00","#EF6C00"] },
  { name: "Forest",     colors: ["#C8E6C9","#B2DFDB","#80CBC4","#4DB6AC","#26A69A","#009688","#00897B","#00796B"] },
  { name: "Earth",      colors: ["#D4A96A","#A07840","#C49A70","#8B6240","#B8825A","#D4B08A","#986040","#C4A07A"] },
  { name: "Neon",       colors: ["#00FF88","#00D4FF","#FF6B6B","#FFD700","#FF00CC","#7C3AFF","#00E5FF","#FF8C00"] },
  { name: "Monochrome", colors: ["#F5F5F5","#E0E0E0","#EEEEEE","#BDBDBD","#E0E0E0","#9E9E9E","#757575","#616161"] },
  { name: "Black",      colors: ["#000000","#111111","#1A1A1A","#222222","#0A0A0A","#141414","#1C1C1C","#262626"] },
  { name: "Animo",      colors: ["#90C878","#B5D5A0","#68B058","#D4EDC5","#5AB050","#A8D890","#3A9040","#C8E8B0"] },
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
      { name: "Abyss",      value: "#050A14" }
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
      { name: "Pine",     value: "#0F3020" }
    ]
  },
  {
    label: "Light",
    colors: [
      { name: "Milk",    value: "#F8F9FA" },
      { name: "Ivory",   value: "#F5F2EB" },
      { name: "Cream",   value: "#FDF8E8" },
      { name: "Cloud",   value: "#EDF2F7" },
      { name: "Linen",   value: "#EDE0D0" },
      { name: "Sand",    value: "#D6BC9E" },
      { name: "Sage",    value: "#C4D5BA" },
      { name: "Clay",    value: "#C4877E" },
      { name: "Pearl",   value: "#F2EEF5" },
      { name: "Cotton",  value: "#F5F0FF" },
      { name: "Haze",    value: "#E8F0EC" },
      { name: "Blush",   value: "#FCE8EC" }
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
      { name: "Mango",    value: "#FFE0B0" }
    ]
  },
  {
    label: "Warm",
    colors: [
      { name: "Copper",   value: "#8B4513" },
      { name: "Rust",     value: "#7C2D12" },
      { name: "Mahogany", value: "#4A1C10" },
      { name: "Sienna",   value: "#5A2A14" },
      { name: "Burgundy", value: "#4A0E1A" },
      { name: "Maroon",   value: "#3C0A10" },
      { name: "Amber",    value: "#7A4A08" },
      { name: "Caramel",  value: "#6B3A18" },
      { name: "Dusty Rose", value: "#7A3040" },
      { name: "Brick",    value: "#6E2218" },
      { name: "Terracotta", value: "#8C3A20" },
      { name: "Bronze",   value: "#6B4010" }
    ]
  },
  {
    label: "Cool",
    colors: [
      { name: "Ice",       value: "#E6F7FF" },
      { name: "Glacier",   value: "#D5ECF5" },
      { name: "Mist",      value: "#DCE7EF" },
      { name: "Aqua",      value: "#A7F3F0" },
      { name: "Lagoon",    value: "#4ECDC4" },
      { name: "Cyan",      value: "#22D3EE" },
      { name: "Azure",     value: "#38BDF8" },
      { name: "Royal",     value: "#2563EB" },
      { name: "Indigo",    value: "#4338CA" },
      { name: "Violet",    value: "#6D28D9" },
      { name: "Amethyst",  value: "#7C3AED" },
      { name: "Orchid",    value: "#C084FC" }
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
      { name: "Green Pop", value: "#22C55E" }
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
  size: 56,
  spacing: 88,
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
  { name: "Forest", gradient: { type: "radial", colors: ["#134E5E", "#71B280"], angle: 0, position: "bottom", preset: "Forest" } }
];

const PATTERN_PRESETS: Array<{ value: PatternPreset; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "diagonal", label: "Diagonal" }
];

const QUICK_EMOJI_PICKS = ["✨", "🏹", "💚", "🌿", "🌸", "💗", "🔥", "⚡", "📚", "💻", "☕", "🎧"];

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
  { id: "start",    label: "Courses",  icon: CalendarDays },
  { id: "design",   label: "Design",   icon: Palette },
];

const CALENDAR_SIZE_LABELS: Record<number, string> = { 1: "XL", 2: "L", 3: "M", 4: "S", 5: "XS" };
const CALENDAR_SIZE_OPTIONS = [
  { value: 5, label: "XS" },
  { value: 4, label: "S" },
  { value: 3, label: "M" },
  { value: 2, label: "L" },
  { value: 1, label: "XL" },
];
const CALENDAR_THEME_OPTIONS: Array<{ value: CalendarThemeMode; label: string; icon: LucideIcon }> = [
  { value: "normal", label: "Normal", icon: Sparkles },
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
];

const EXPORT_VARIANT_OPTIONS: Array<{ value: ExportVariant; label: string; description: string; icon: LucideIcon }> = [
  { value: "full", label: "Wallpaper", description: "Background and schedule", icon: ImageIcon },
  { value: "transparent", label: "Schedule", description: "Schedule only PNG", icon: Layers },
  { value: "background", label: "Backdrop", description: "Background only", icon: ImagePlus }
];

const CALENDAR_FONT_OPTIONS: Array<{
  value: CalendarFont;
  label: string;
  description: string;
  bodyClass: string;
  headingClass: string;
}> = [
  {
    value: "geist",
    label: "Geist",
    description: "Clean modern sans",
    bodyClass: "font-sans",
    headingClass: "font-sans"
  },
  {
    value: "inter",
    label: "Inter",
    description: "Readable UI style",
    bodyClass: "font-inter",
    headingClass: "font-inter"
  },
  {
    value: "poppins",
    label: "Poppins",
    description: "Rounded student feel",
    bodyClass: "font-poppins",
    headingClass: "font-poppins"
  },
  {
    value: "manrope",
    label: "Manrope",
    description: "Crisp geometric sans",
    bodyClass: "font-manrope",
    headingClass: "font-manrope"
  },
  {
    value: "montserrat",
    label: "Montserrat",
    description: "Bold poster style",
    bodyClass: "font-montserrat",
    headingClass: "font-montserrat"
  },
  {
    value: "nunito",
    label: "Nunito",
    description: "Soft rounded sans",
    bodyClass: "font-nunito",
    headingClass: "font-nunito"
  },
  {
    value: "rubik",
    label: "Rubik",
    description: "Rounded blocky UI",
    bodyClass: "font-rubik",
    headingClass: "font-rubik"
  },
  {
    value: "outfit",
    label: "Outfit",
    description: "Clean display sans",
    bodyClass: "font-outfit",
    headingClass: "font-outfit"
  },
  {
    value: "lexend",
    label: "Lexend",
    description: "Wide readable spacing",
    bodyClass: "font-lexend",
    headingClass: "font-lexend"
  },
  {
    value: "spaceGrotesk",
    label: "Space Grotesk",
    description: "Techy modern feel",
    bodyClass: "font-space-grotesk",
    headingClass: "font-space-grotesk"
  },
  {
    value: "robotoMono",
    label: "Roboto Mono",
    description: "Structured mono",
    bodyClass: "font-roboto-mono",
    headingClass: "font-roboto-mono"
  },
  {
    value: "merriweather",
    label: "Merriweather",
    description: "Classic serif",
    bodyClass: "font-merriweather",
    headingClass: "font-merriweather"
  },
  {
    value: "system",
    label: "System",
    description: "Native UI font",
    bodyClass: "font-[ui-sans-serif,system-ui,sans-serif]",
    headingClass: "font-[ui-sans-serif,system-ui,sans-serif]"
  }
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
const DEVICE_VALUES = new Set<DeviceId>(Object.keys(DEVICES) as DeviceId[]);
const CALENDAR_FONT_VALUES = new Set<CalendarFont>(CALENDAR_FONT_OPTIONS.map((option) => option.value));
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

// Canonical day pairs — courses that share the same code across these pairs are treated as one subject
const DAY_PAIRS: DayKey[][] = [["Mon", "Thu"], ["Tue", "Fri"], ["Wed", "Sat"]];

function normalizeCalendarFont(value: unknown): CalendarFont {
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

function normalizeCalendarThemeMode(value: unknown): CalendarThemeMode {
  return value === "light" || value === "dark" || value === "normal" ? value : "normal";
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
    size: typeof record.size === "number" ? Math.max(12, Math.min(96, record.size)) : DEFAULT_PATTERN.size,
    spacing: typeof record.spacing === "number" ? Math.max(36, Math.min(180, record.spacing)) : DEFAULT_PATTERN.spacing,
    opacity: typeof record.opacity === "number" ? Math.max(0.04, Math.min(1.0, record.opacity)) : DEFAULT_PATTERN.opacity
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  backgroundKind: "bk", overlayKind: "ok", background: "bg", backgroundImage: "bi", backgroundTone: "bt",
  wallpaperStyle: "ws", appTheme: "at", calendarThemeMode: "ct", gridPosition: "gp", gridOffsetX: "gx", gridOffsetY: "gy",
  calendarFont: "cf", calendarSize: "cs", device: "dv", exportVariant: "ev",
  gradient: "gr", pattern: "pa", geometric: "ge", version: "v",
  type: "t", colors: "c", angle: "a", position: "p", preset: "pr",
  emoji: "em", size: "sz", spacing: "sp", opacity: "op", kind: "k", color: "co"
};
const KEY_LONG: Record<string, string> = Object.fromEntries(Object.entries(KEY_SHORT).map(([k, v]) => [v, k]));

const DEFAULT_STATE: Partial<SharedDesignState> = {
  backgroundKind: "solid",
  overlayKind: "none",
  background: "#0B100D",
  backgroundImage: "",
  backgroundTone: "dark",
  gradient: DEFAULT_GRADIENT,
  pattern: DEFAULT_PATTERN,
  geometric: DEFAULT_GEOMETRIC,
  wallpaperStyle: "clean",
  appTheme: "dark",
  calendarThemeMode: "normal",
  gridPosition: "center",
  gridOffsetX: 0,
  gridOffsetY: 0,
  calendarFont: "geist",
  calendarSize: 3,
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
      if (/^-?\d+(?:\.\d+)?$/.test(v) && !/^\d{6}$/.test(v)) {
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
      const records = Array.isArray(request.result) ? request.result as SavedScheduleSnapshot[] : [];
      resolve(records.sort((a, b) => b.updatedAt - a.updatedAt));
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveCreationToDb(snapshot: SavedScheduleSnapshot) {
  const db = await openCreationsDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CREATION_STORE_NAME, "readwrite");
    tx.objectStore(CREATION_STORE_NAME).put(snapshot);
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
import { ScheduleProvider, useSchedule } from "@/lib/ScheduleContext";

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
    autoHideEmptyDays, setAutoHideEmptyDays,
    device, setDevice,
    wallpaperStyle, setWallpaperStyle,
    appTheme, setAppTheme,
    calendarThemeMode, setCalendarThemeMode,
    gridPosition, setGridPosition,
    gridOffsetX, setGridOffsetX,
    gridOffsetY, setGridOffsetY,
    backgroundKind, setBackgroundKind,
    background, setBackground,
    backgroundImage, setBackgroundImage,
    backgroundTone, setBackgroundTone,
    gradient, setGradient,
    pattern, setPattern,
    geometric, setGeometric,
    overlayKind, setOverlayKind,
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
  const [savedCopies, setSavedCopies] = useState<SavedScheduleSnapshot[]>([]);
  const [hasLoadedLocalSchedule, setHasLoadedLocalSchedule] = useState(false);
  const [activeCreationId, setActiveCreationId] = useState("");
  const [activeCreationCreatedAt, setActiveCreationCreatedAt] = useState(() => Date.now());
  const [showBetaPopup, setShowBetaPopup] = useState(false);
  const [openDaysDropdown, setOpenDaysDropdown] = useState(false);
  const [openSlotDropdownId, setOpenSlotDropdownId] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [showDesignApplyConfirm, setShowDesignApplyConfirm] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);

  useEffect(() => {
    const hasSeenBeta = sessionStorage.getItem("archers_calendar_beta_seen");
    if (!hasSeenBeta) {
      sessionStorage.setItem("archers_calendar_beta_seen", "true");
      const timer = window.setTimeout(() => setShowBetaPopup(true), 0);
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
        .then(() => {
          setSavedCopies((current) => {
            const next = [snapshot, ...current.filter((creation) => creation.id !== snapshot.id)];
            return next.sort((a, b) => b.updatedAt - a.updatedAt);
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
    autoHideEmptyDays,
    calendarTitle,
    calendarSubtitle,
    activeCoursePalette,
    device,
    wallpaperStyle,
    appTheme,
    calendarThemeMode,
    gridPosition,
    gridOffsetX,
    gridOffsetY,
    backgroundKind,
    background,
    backgroundImage,
    backgroundTone,
    gradient,
    pattern,
    calendarSize,
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

  const activeDevice = DEVICES[device];
  const activeStyle = STYLE_PRESETS[wallpaperStyle];
  const activeCalendarFont = CALENDAR_FONT_OPTIONS.find((option) => option.value === calendarFont) ?? CALENDAR_FONT_OPTIONS[0];
  const headerStyleClass = activeStyle.headerFont.replace(/\bfont-(?:sans|serif|mono)\b/g, "").trim();
  const canvasSize = CANVAS_SIZES[device];
  const isDarkBg = backgroundTone === "dark";
  const automaticCalendarTone: CalendarTone = isDarkBg ? "dark" : "light";
  const resolvedCalendarTone: CalendarTone = calendarThemeMode === "normal" ? automaticCalendarTone : calendarThemeMode;
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
      const gap = 48;
      const scale = Math.min((availableWidth - gap) / fw, (availableHeight - gap) / fh);
      setPreviewScale(Math.max(0.08, scale));
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
    gradient, pattern, geometric, wallpaperStyle, appTheme,
    calendarThemeMode, gridPosition, gridOffsetX, gridOffsetY, calendarFont, calendarSize,
    device, exportVariant
  ]);

  const timeSlots = useMemo(() => {
    const slots = Array.from(new Set(visibleEntries.map((e) => e.timeSlot).filter(Boolean)));
    return slots.sort((a, b) => getStartMinutes(a) - getStartMinutes(b));
  }, [visibleEntries]);

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
  const gridBg        = isBorderlessStyle ? activeStyle.gridOpacity : calendarThemeMode === "normal" ? activeStyle.gridOpacity : forcedGridBg;
  const gridBorder    = isBorderlessStyle ? "border-transparent" : calendarThemeMode === "normal" ? activeStyle.borderColor : themeBorder;
  const headerCellBg  = isBorderlessStyle ? "bg-transparent" : isCalendarLight ? "bg-black/[0.05]" : "bg-white/[0.08]";
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
    ? "1 format selected"
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
  const MIN_FONT_PX = device === "iphone" ? 5 : 0;
  const fs = device === "share" ? 1 : FONT_SCALE[calendarSize];
  // Round to whole pixels — fractional values cause spacing glitches in image exports
  const scalePx  = (val: number) => `${Math.round(Math.max(MIN_FONT_PX, val * fs))}px`;
  const scalePad = (val: number) => `${Math.round(val * fs)}px`; // no font minimum — for spacing/padding only
  const sz = {
    pad:        device === "share" ? "0px" : `${Math.round(szBase.pad * PAD_SCALE[calendarSize])}px`,
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
    device === "share"    ? "0px" :
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
    return {
      rawText,
      entries,
      visibleDays,
      showRoom,
      showProfessor,
      showSection,
      showCourseTitle,
      autoHideEmptyDays,
      calendarTitle,
      calendarSubtitle,
      activeCoursePalette,
      device,
      wallpaperStyle,
      appTheme,
      calendarThemeMode,
      gridPosition,
      gridOffsetX,
      gridOffsetY,
      backgroundKind,
      background,
      backgroundImage,
      backgroundTone,
      gradient,
      pattern,
      geometric,
      calendarSize,
      exportVariant,
      calendarFont,
      workflowStep: desktopPanel
    };
  }

  function buildSharedDesignState(): SharedDesignState {
    return {
      version: 1,
      backgroundKind,
      overlayKind,
      background,
      backgroundImage,
      backgroundTone,
      gradient,
      pattern,
      geometric,
      wallpaperStyle,
      appTheme,
      calendarThemeMode,
      gridPosition,
      gridOffsetX,
      gridOffsetY,
      calendarFont,
      calendarSize,
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
    const nextBackground = hasBackground && typeof state.background === "string" && /^#[0-9A-F]{6}$/i.test(state.background)
      ? state.background
      : background;

    if (hasBackgroundKind) setBackgroundKind(nextBackgroundKind);
    setOverlayKind(nextOverlayKind);
    if (hasBackground) setBackground(nextBackground);
    if ("backgroundImage" in state) setBackgroundImage(typeof state.backgroundImage === "string" ? state.backgroundImage : "");
    if (hasGradient) setGradient(nextGradient);
    if ("pattern" in state) setPattern(normalizePatternConfig(state.pattern));
    if ("geometric" in state) setGeometric(normalizeGeometricConfig(state.geometric));
    if ("wallpaperStyle" in state) setWallpaperStyle(normalizeWallpaperStyle(state.wallpaperStyle));
    if ("appTheme" in state) setAppTheme(normalizeAppTheme(state.appTheme));
    if ("calendarThemeMode" in state) setCalendarThemeMode(normalizeCalendarThemeMode(state.calendarThemeMode));
    if ("gridPosition" in state) setGridPosition(normalizeGridPosition(state.gridPosition));
    if ("gridOffsetX" in state) setGridOffsetX(normalizeGridOffset(state.gridOffsetX));
    if ("gridOffsetY" in state) setGridOffsetY(normalizeGridOffset(state.gridOffsetY));
    if ("calendarFont" in state) setCalendarFont(normalizeCalendarFont(state.calendarFont));
    if ("calendarSize" in state) setCalendarSize(normalizeCalendarSize(state.calendarSize));
    if ("device" in state) setDevice(normalizeDevice(state.device));
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
    setAutoHideEmptyDays(state.autoHideEmptyDays ?? true);
    setCalendarTitle(state.calendarTitle ?? "Name's Schedule");
    setCalendarSubtitle(state.calendarSubtitle ?? "Term 3");
    setActiveCoursePalette(palette);
    setDevice(state.device ?? "laptop");
    setWallpaperStyle(normalizeWallpaperStyle(state.wallpaperStyle));
    setAppTheme(normalizeAppTheme(state.appTheme));
    setCalendarThemeMode(state.calendarThemeMode ?? "normal");
    setGridPosition(state.gridPosition ?? "center");
    setGridOffsetX(normalizeGridOffset(state.gridOffsetX));
    setGridOffsetY(normalizeGridOffset(state.gridOffsetY));
    setBackgroundKind(nextBackgroundKind);
    setOverlayKind(nextOverlayKind);
    setBackground(nextBackground);
    setBackgroundImage(state.backgroundImage ?? "");
    setBackgroundTone(nextBackgroundTone);
    setGradient(nextGradient);
    setPattern(nextPattern);
    if ("geometric" in state) setGeometric(normalizeGeometricConfig(state.geometric));
    setCalendarSize(state.calendarSize ?? 3);
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
    const migrated = [legacyLast, ...legacyCopies].filter(Boolean) as SavedScheduleSnapshot[];

    for (const snapshot of migrated) {
      await saveCreationToDb(snapshot);
    }

    return migrated.sort((a, b) => b.updatedAt - a.updatedAt);
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

  function applyPatternPreset(preset: PatternPreset) {
    setPattern((current) => ({ ...current, preset }));
  }

  function updatePattern(next: Partial<PatternConfig>) {
    const updated = normalizePatternConfig({ ...pattern, ...next });
    setPattern(updated);
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
      await saveCreationToDb(snapshot);
      setSavedCopies((current) => [snapshot, ...current.filter((creation) => creation.id !== snapshot.id)]);
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
    setEditingSavedId("");
    setEditingSavedName("");

    if (name === snapshot.name) return;

    const updated: SavedScheduleSnapshot = {
      ...snapshot,
      name,
      state: {
        ...snapshot.state,
        calendarTitle: name
      }
    };

    try {
      await saveCreationToDb(updated);
      setSavedCopies((current) =>
        current.map((saved) => saved.id === snapshot.id ? updated : saved)
      );
      if (activeCreationId === snapshot.id) {
        setCalendarTitle(name);
      }
      setSaveNotice("Renamed saved schedule.");
    } catch {
      setSaveNotice("Saved name could not be updated.");
    }
  }

  async function deleteSavedCopy(id: string) {
    try {
      await deleteCreationFromDb(id);
      setSavedCopies((current) => current.filter((snapshot) => snapshot.id !== id));
      if (activeCreationId === id) {
        setActiveCreationId("");
        localStorage.removeItem(ACTIVE_CREATION_KEY);
      }
      setSaveNotice("Deleted local creation.");
    } catch {
      setSaveNotice("Local creation could not be deleted.");
    }
  }

  function resetSchedule() {
    setRawText("");
    setEntries([]);
    setExpandedCourses(new Set());
    setCalendarTitle("Name's Schedule");
    setCalendarSubtitle("Term 3");
    setVisibleDays(DEFAULT_VISIBLE_DAYS);
    setImportError("");
    setImportSource("");
    setSaveNotice("Schedule reset.");
    setMobileTab("start");
    setDesktopPanel("start");
  }

  async function handleParse() {
    setIsParsing(true);
    setImportError("");
    setImportSource("");

    const localImport = parseScheduleImport(rawText);

    try {
      await new Promise(r => setTimeout(r, 300));

      if (localImport.entries.length && !localImport.shouldUseAi) {
        applyParsedEntries(localImport.entries);
        setImportSource("local");
        return;
      }

      if (!localImport.scheduleLike) {
        setImportError(localImport.message ?? "No schedule details found in the pasted text.");
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
        applyParsedEntries(parsed);
        setImportSource(result.source ?? "local");
        if (result.message) setImportError(result.message);
        return;
      }

      setImportError(result.message ?? "No classes were found in the pasted schedule.");
    } catch (error) {
      if (localImport.entries.length) {
        applyParsedEntries(localImport.entries);
        setImportSource("local");
        setImportError("AI fallback was unavailable, so the local import was used.");
        return;
      }

      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsParsing(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const tableText = html ? scheduleTableHtmlToText(html) : "";
    const parsedFromTable = html ? parseScheduleHtml(html) : [];
    if (!parsedFromTable.length && !tableText) return;

    event.preventDefault();
    handleRawTextChange(tableText || text);

    if (parsedFromTable.length) {
      applyParsedEntries(parsedFromTable);
      setImportSource("local");
    }
  }

  function updateEntry(id: string, field: keyof ScheduleEntry, value: string) {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  function addEntry() {
    const code = `NEWCLASS ${Math.floor(Math.random() * 1000)}`;
    const timeSlot = "09:00 AM - 10:30 AM";
    const days: DayKey[] = ["Mon", "Thu"];

    setEntries((current) => {
      const newEntries = days.map((day) => ({
        id: crypto.randomUUID(),
        timeSlot,
        day,
        course: code,
        room: "",
        teacher: "",
        section: "",
        color: BLOCK_PALETTES[0].hex
      }));
      return [...current, ...newEntries];
    });
    setExpandedCourses((current) => new Set(current).add(courseKeyFromCode(code)));
    setMobileTab("start");
    setDesktopPanel("start");
  }

  function focusImportBox() {
    setShowBetaPopup(false);
    setMobileTab("start");
    setDesktopPanel("start");
    window.setTimeout(() => {
      desktopImportTextAreaRef.current?.focus();
    }, 50);
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
        setBackgroundImage(canvas.toDataURL("image/jpeg", 0.85));
        setBackgroundTone(estimateImageTone(canvas));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
    const wrapper = document.createElement("div");
    const clone = target.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-export-hidden='true']").forEach((node) => node.remove());

    Object.assign(wrapper.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${size.width}px`,
      height: `${size.height}px`,
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "-1"
    });

    Object.assign(clone.style, {
      width: `${size.width}px`,
      height: `${size.height}px`,
      transform: "none"
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      await waitForExportFrame();
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
      wrapper.remove();
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
    return `${base}-${deviceId}${suffix}.png`;
  }

  async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    const blob = await canvasToPngBlob(canvas);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.type = "image/png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
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
    try {
      await waitForExportFrame();
      const exportedCanvas = await captureExportCanvas(canvasRef.current, canvasSize, EXPORT_SCALE);
      await downloadCanvas(exportedCanvas, makeExportFilename(device, getExportVariantSuffix()));
      setTimeout(triggerShare, 500);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportDevices(deviceIds: DeviceId[]) {
    if (deviceIds.length === 0) return;
    setIsExporting(true);
    const originalDevice = device;
    
    try {
      if (deviceIds.length === 1) {
        const deviceId = deviceIds[0];
        setDevice(deviceId);
        await waitForCanvasSize(CANVAS_SIZES[deviceId]);
        if (canvasRef.current) {
          const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId], EXPORT_SCALE);
          await downloadCanvas(exported, makeExportFilename(deviceId, getExportVariantSuffix()));
        }
      } else {
        const zip = new JSZip();
        const folder = zip.folder("archers-calendar");
        
        for (const deviceId of deviceIds) {
          setDevice(deviceId);
          await waitForCanvasSize(CANVAS_SIZES[deviceId]);
          if (!canvasRef.current) continue;
          
          const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId]);
          const pngBlob = await canvasToPngBlob(exported);
          folder?.file(makeExportFilename(deviceId, getExportVariantSuffix()), pngBlob);
        }
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = "archers-calendar.zip";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      }
      setTimeout(triggerShare, 500);
    } finally {
      setDevice(originalDevice);
      setIsExporting(false);
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
  const groupedCourses = useMemo(() => groupEntriesByCourse(entries), [entries]);

  function updateCourseColor(code: string, color: string) {
    setEntries((current) =>
      current.map((e) =>
        courseKeyFromCourse(e.course) === courseKeyFromCode(code) ? { ...e, color } : e
      )
    );
  }

  function applyColorTheme(colors: string[]) {
    setActiveCoursePalette(colors);
    applyCoursePalette(colors);
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

  const sidebarPanelTabs = (
    <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
        {SIDEBAR_PANELS.map(({ id, label }) => {
          const active = desktopPanel === id;
          return (
            <button
              key={id}
              className={classNames(
                "flex min-h-10 items-center justify-center rounded-lg px-2 text-[11px] font-bold transition-all",
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
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  function renderSavedScheduleActions() {
    const currentName = calendarTitle || "Untitled Schedule";
    return (
      <>
        {/* Current active schedule */}
        <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
          <span className="min-w-0 truncate text-xs font-black text-white/75">{currentName}</span>
          <span className="ml-2 shrink-0 text-[10px] font-bold text-white/30">current</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[10px] font-bold text-white/60 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
            onClick={duplicateSchedule}
            disabled={!entries.length}
            title="Save a copy of the current schedule"
          >
            <Copy size={13} />
            Duplicate
          </button>
          <button
            type="button"
            className="flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[10px] font-bold text-white/60 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
            onClick={resetSchedule}
            title="Clear the current schedule"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            type="button"
            className="flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[10px] font-bold text-white/60 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
            onClick={() => {
              setMobileTab("start");
              setDesktopPanel("start");
            }}
            title="Go to Import"
          >
            <FileInput size={13} />
            Import
          </button>
        </div>

        {/* Saved list */}
        {savedCopies.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase text-white/30">Saved</p>
            {savedCopies.slice(0, 8).map((snapshot) => {
              const isEditing = editingSavedId === snapshot.id;
              const isActive = activeCreationId === snapshot.id;
              return (
                <div
                  key={snapshot.id}
                  className={classNames(
                    "flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 transition",
                    isActive
                      ? "border-dlsu-vivid/40 bg-dlsu-vivid/10"
                      : "border-white/[0.06] bg-black/[0.14] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      className="min-h-8 min-w-0 flex-1 rounded-md border border-dlsu-vivid/50 bg-white/[0.04] px-2.5 text-xs font-bold text-white outline-none transition placeholder:text-white/25 focus:border-dlsu-vivid"
                      value={editingSavedName}
                      onChange={(event) => setEditingSavedName(event.target.value)}
                      onBlur={(event) => void renameSavedCopy(snapshot, event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") { setEditingSavedId(""); setEditingSavedName(""); }
                      }}
                    />
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col">
                      <button
                        type="button"
                        className="min-w-0 truncate text-left text-xs font-bold text-white/80 hover:text-white"
                        onClick={() => startEditingSavedCopy(snapshot)}
                        title="Click to rename"
                      >
                        {snapshot.name}
                      </button>
                      <span className="text-[10px] text-white/30">
                        {new Date(snapshot.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {!isEditing && (
                    <>
                      <button
                        type="button"
                        className={classNames(
                          "shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition",
                          isActive
                            ? "text-dlsu-vivid/70"
                            : "text-white/40 hover:bg-white/[0.08] hover:text-white"
                        )}
                        onClick={() => loadSavedCopy(snapshot)}
                      >
                        {isActive ? "Active" : "Load"}
                      </button>
                      <button
                        type="button"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/25 transition hover:bg-white/[0.08] hover:text-white"
                        onClick={() => void deleteSavedCopy(snapshot.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {saveNotice && (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium leading-5 text-white/55">
            {saveNotice}
          </p>
        )}
      </>
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
            onClick={() => setEntries((current) => autoColorByCourse(current, activeCoursePalette))}
          >
            <Wand2 size={14} strokeWidth={2.5} />
            Auto
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
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
                onClick={() => applyColorTheme(theme.colors)}
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
        <div className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2">
          <Field label="Name" value={calendarTitle} onChange={setCalendarTitle} placeholder="e.g. Richard" />
          <Field label="Term" value={calendarSubtitle} onChange={setCalendarSubtitle} placeholder="e.g. Term 3" />
        </div>
        <div className="space-y-4">
          <div>
            <SectionLabel className="mb-2">Visible Days</SectionLabel>
            <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
              <div className="relative">
                <button 
                  onClick={() => setOpenDaysDropdown(!openDaysDropdown)}
                  className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/[0.12] bg-white/[0.035] px-3 text-xs font-bold text-white shadow-sm outline-none transition-all hover:border-white/25 hover:bg-white/[0.055] focus:border-dlsu-vivid"
                >
                  <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <CalendarDays size={14} className="shrink-0 text-white/50 transition-colors group-hover:text-white/75" />
                    <span className="truncate">{label}</span>
                  </span>
                  <ChevronDown size={14} className={classNames("shrink-0 opacity-45 transition-transform", openDaysDropdown ? "rotate-180" : "")} />
                </button>
                {openDaysDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#0D1210] p-1 shadow-2xl">
                    {DAY_ORDER.filter((d) => d !== "Sun").map((day) => (
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
            <SectionLabel className="mb-2">Cell Details</SectionLabel>
            <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
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
   <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-4 scrollbar-thin md:px-5 md:pb-5">
      {/* ── Paste Schedule ─────────────────────── */}
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
              Imported with AI fallback.
            </p>
          )}
          {!importError && importSource === "local" && (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium leading-5 text-white/55">
              Imported locally.
            </p>
          )}
        </ControlGroup>

        <ControlGroup title="Schedule">
          {renderScheduleDetails()}
        </ControlGroup>
      </section>

      {/* ── Courses (grouped, editable) ── */}
      <section
        className={classNames(
          "flex-col gap-5",
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
          <div className="space-y-2.5">
            {groupedCourses.map((course) => {
              const courseKey = courseKeyFromCode(course.code);
              const isExpanded = expandedCourses.has(courseKey);
              const displayCode = course.code || "Untitled";
              return (
                <div key={course.id} className={classNames(
                  "overflow-hidden rounded-lg border transition-colors duration-150",
                  isExpanded ? "border-white/20 bg-[#111713]" : "border-white/10 bg-[#0C100E] hover:border-white/20 hover:bg-[#101612]"
                )}>
                  <div className="flex items-start gap-1.5 p-2.5">
                    <button
                      type="button"
                      className="group flex min-w-0 flex-1 items-start gap-2.5 rounded-md p-1 text-left transition-colors duration-150 hover:bg-white/[0.04]"
                      onClick={() => toggleCourseExpand(course.code)}
                    >
                      <span
                        className="mt-0.5 h-9 w-1.5 shrink-0 rounded-full border border-black/20"
                        style={{ backgroundColor: course.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-black text-white">{displayCode}</p>
                        </div>
                        {course.title && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-white/50">{course.title}</p>
                        )}
                      </div>
                      <ChevronDown
                        size={16}
                        className={classNames(
                          "mt-1 shrink-0 text-white/30 transition-all duration-200 group-hover:text-white/60",
                          isExpanded ? "rotate-180 text-white/60" : ""
                        )}
                      />
                    </button>
                    <button
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/30 transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-90"
                      type="button"
                      aria-label="Remove course"
                      onClick={() => removeCourse(course.code)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-white/[0.06] px-3 pb-3 pt-3">
                      <div className="space-y-1.5">
                        {course.slots.map((slot) => {
                          const slotId = `${course.code}-${slot.timeSlot}-${slot.days.join("")}`;
                          const isDropdownOpen = openSlotDropdownId === slotId;
                          
                          return (
                            <div
                              key={slotId}
                              className="grid grid-cols-1 gap-2 rounded-md border border-white/[0.06] bg-black/[0.16] p-2"
                            >
                              <div className="space-y-1">
                                <span className="block text-[10px] font-bold text-white/40">Days</span>
                                <div className="relative">
                                  <button 
                                    onClick={() => setOpenSlotDropdownId(isDropdownOpen ? null : slotId)}
                                    className="flex min-h-9 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2.5 text-xs text-white outline-none transition hover:border-white/20"
                                  >
                                    <span className="truncate">{formatMeetingDays(slot.days)}</span>
                                    <ChevronDown size={12} className={classNames("opacity-40 transition-transform", isDropdownOpen ? "rotate-180" : "")} />
                                  </button>
                                  {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border border-white/10 bg-[#0D1210] p-1 shadow-2xl">
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

                      <div className="grid grid-cols-2 gap-2">
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
                        <CourseField
                          label="Section"
                          value={course.slots[0]?.section ?? ""}
                          onBlur={(v) => updateCourseMeta(course.code, "section", v)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-white/28">Color</p>
                          <label
                            className={classNames(
                              "relative flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-white/[0.06] px-2 text-[10px] font-bold text-white/70 shadow-sm transition hover:border-white/55 hover:bg-white/[0.09] hover:text-white",
                              !BLOCK_PALETTES.some(p => p.hex === course.color)
                                ? "border-white ring-2 ring-white/70 ring-offset-2 ring-offset-[#111713]"
                                : "border-white/25"
                            )}
                            title="Custom color"
                            aria-label="Custom color"
                          >
                            <Palette size={12} className="pointer-events-none" />
                            Custom
                            <span
                              className="pointer-events-none h-4 w-4 rounded-full border border-white/70 shadow-sm"
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
                        {BLOCK_PALETTE_GROUPS.map((group) => (
                          <div key={group.label}>
                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-white/24">{group.label}</p>
                            <div className="grid grid-cols-8 gap-1.5">
                              {group.colors.map((palette) => (
                                <button
                                  key={`${group.label}-${palette.name}`}
                                  className={classNames(
                                    "grid h-7 place-items-center rounded-md border border-white/10 transition-transform hover:scale-105 hover:border-white/40 active:scale-95",
                                    course.color === palette.hex ? "ring-2 ring-white ring-offset-2 ring-offset-[#111713]" : ""
                                  )}
                                  type="button"
                                  aria-label={palette.name}
                                  title={palette.name}
                                  style={{ backgroundColor: palette.hex, color: getTextColor(palette.hex) }}
                                  onClick={() => updateCourseColor(course.code, palette.hex)}
                                >
                                  {course.color === palette.hex ? <Check size={11} strokeWidth={3} /> : null}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
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
          <ControlGroup title="Share">
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
        <div className="order-2">
          <ControlGroup title="Style">
            {(() => {
              const hints: Record<WallpaperStyle, string> = {
                clean:   "Subtle borders",
                compact: "Flat & minimal",
                bold:    "Soft shadows",
                glass:   "Frosted look",
              };
              return (
                <div className="grid grid-cols-2 gap-1.5">
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
                          "group grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all duration-150 active:scale-[0.98]",
                          active
                            ? "border-dlsu-vivid/80 bg-[#102017] text-white shadow-sm shadow-dlsu-vivid/20"
                            : "border-white/15 bg-white/[0.035] text-white/72 hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
                        )}
                        onClick={() => setWallpaperStyle(style)}
                      >
                        <div className={classNames(
                          "grid h-7 w-7 shrink-0 grid-cols-2 gap-0.5 rounded-md border p-1",
                          active ? "border-dlsu-vivid/35 bg-dlsu-vivid/15" : "border-white/[0.08] bg-white/[0.04]"
                        )}>
                          <span className={classNames("rounded-[2px]", style === "clean" ? "border border-white/30 bg-white/10" : "bg-white/15")} />
                          <span className={classNames("rounded-[2px]", style === "bold" ? "shadow-[0_3px_8px_rgba(0,0,0,0.48)]" : "", style === "glass" ? "border border-white/35 bg-white/20" : "bg-white/10")} />
                          <span className={classNames("rounded-[2px]", style === "compact" ? "bg-white/25" : "bg-white/10")} />
                          <span className={classNames("rounded-[2px]", style === "glass" ? "border border-white/30 bg-white/20" : "bg-white/10")} />
                        </div>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-black">{label}</span>
                          <span className={classNames("block truncate text-[9px] font-semibold leading-tight", active ? "text-white/48" : "text-white/34 group-hover:text-white/45")}>
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
            <div className="grid grid-cols-2 gap-1.5">
              {CALENDAR_FONT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={calendarFont === option.value}
                  aria-label={`${option.label}, ${option.description}`}
                  title={`${option.label}: ${option.description}`}
                  className={classNames(
                    "grid h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border px-2 text-left transition-all duration-150 active:scale-[0.98]",
                    option.bodyClass,
                    calendarFont === option.value
                      ? "border-dlsu-vivid/80 bg-[#102017] text-white shadow-sm shadow-dlsu-vivid/20"
                      : "border-white/15 bg-white/[0.04] text-white/72 hover:border-white/30 hover:bg-white/[0.07] hover:text-white"
                  )}
                  onClick={() => setCalendarFont(option.value)}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.07] text-[10px] font-black">Aa</span>
                  <span className="min-w-0 truncate text-[11px] font-black leading-none">{option.label}</span>
                  {calendarFont === option.value && <Check size={12} className="shrink-0 text-dlsu-vivid" />}
                </button>
              ))}
            </div>
          </ControlGroup>
        </div>

        <div className="order-3">
          {renderCourseColorThemes()}
        </div>

        <div className="order-4">
          <ControlGroup title="Layout">
            <SectionLabel>Size</SectionLabel>
            <div className="grid grid-cols-5 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
              {CALENDAR_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={classNames(
                    "rounded-md py-2 text-[11px] font-bold transition-all",
                    calendarSize === value
                      ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                      : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                  )}
                  onClick={() => setCalendarSize(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <SectionLabel className="pt-1">Mode</SectionLabel>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
              {CALENDAR_THEME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={classNames(
                    "rounded-md py-2 text-[11px] font-bold transition-all",
                    calendarThemeMode === value
                      ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                      : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                  )}
                  type="button"
                  onClick={() => setCalendarThemeMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
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
                    setGridOffsetX(0);
                    setGridOffsetY(0);
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
                  <span>{gridOffsetX === 0 ? "0" : gridOffsetX > 0 ? `+${gridOffsetX}` : gridOffsetX}</span>
                </span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={gridOffsetX}
                  onChange={(e) => setGridOffsetX(normalizeGridOffset(Number(e.target.value)))}
                  className="archers-range w-full"
                  style={{ "--range-progress": rangeProgress(gridOffsetX, -30, 30) } as CSSProperties}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                  <span>Y</span>
                  <span>{gridOffsetY === 0 ? "0" : gridOffsetY > 0 ? `+${gridOffsetY}` : gridOffsetY}</span>
                </span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={gridOffsetY}
                  onChange={(e) => setGridOffsetY(normalizeGridOffset(Number(e.target.value)))}
                  className="archers-range w-full"
                  style={{ "--range-progress": rangeProgress(gridOffsetY, -30, 30) } as CSSProperties}
                />
              </label>
            </div>
          </ControlGroup>
        </div>

        {/* Background */}
        <div className="order-5">
          <ControlGroup title="Background">

            {/* ── Base background tabs: Color / Gradient / Photo ── */}
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
                  onClick={() => {
                    if (kind === "solid") handleSolidBackgroundChange(background);
                    else if (kind === "gradient") applyGradientPreset(gradient);
                    else setBackgroundKind("image");
                  }}
                >
                  <KindIcon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Solid ── */}
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
                      <div className="grid grid-cols-6 gap-1.5">
                        {cat.colors.map((preset) => (
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

            {/* ── Gradient ── */}
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
                <div className="grid grid-cols-2 gap-1.5">
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

            {/* ── Image ── */}
            {backgroundKind === "image" && (
              <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/25 bg-white/[0.055] text-white/65 transition hover:border-white/45 hover:bg-white/[0.08] hover:text-white">
                <ImagePlus size={20} />
                <span className="text-[11px] font-bold">{backgroundImage ? "Replace photo" : "Upload a photo"}</span>
                <input className="sr-only" type="file" accept="image/*" onChange={handleBackgroundUpload} />
              </label>
            )}



            {/* ── Overlay section: None / Emoji / Lines ── */}
            <div className="border-t border-white/[0.06] pt-3">
              <SectionLabel className="mb-2">Overlay</SectionLabel>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                {([
                  { kind: "none",      label: "Off",   icon: X       },
                  { kind: "pattern",   label: "Emoji", icon: Sparkles },
                  { kind: "geometric", label: "Lines", icon: Layers   },
                ] as { kind: OverlayKind; label: string; icon: LucideIcon }[]).map(({ kind, label, icon: OverlayIcon }) => (
                  <button
                    key={kind}
                    type="button"
                    className={classNames(
                      "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition-all",
                      overlayKind === kind
                        ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20"
                        : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                    )}
                    onClick={() => setOverlayKind(kind)}
                  >
                    <OverlayIcon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Overlay: Emoji Pattern ── */}
            {overlayKind !== "geometric" && (
              <div className="space-y-3 rounded-lg border border-white/[0.10] bg-white/[0.04] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <button
                      type="button"
                      className={classNames(
                        "grid h-14 w-14 place-items-center rounded-xl border text-3xl shadow-inner transition hover:border-white/30",
                        overlayKind === "pattern"
                          ? "border-dlsu-vivid/60 bg-dlsu-vivid/15"
                          : "border-white/15 bg-black/25"
                      )}
                      onClick={() => setOverlayKind(overlayKind === "pattern" ? "none" : "pattern")}
                      aria-label={overlayKind === "pattern" ? "Turn emoji overlay off" : "Turn emoji overlay on"}
                    >
                      {pattern.emoji}
                    </button>
                    <button
                      type="button"
                      className={classNames(
                        "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide transition",
                        overlayKind === "pattern"
                          ? "border-dlsu-vivid/50 bg-dlsu-vivid/15 text-dlsu-vivid"
                          : "border-white/15 bg-white/[0.04] text-white/55 hover:border-white/30 hover:text-white"
                      )}
                      onClick={() => setOverlayKind(overlayKind === "pattern" ? "none" : "pattern")}
                    >
                      {overlayKind === "pattern" ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/45">Layout</p>
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
                          onClick={() => applyPatternPreset(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {QUICK_EMOJI_PICKS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={classNames(
                        "grid h-11 w-11 place-items-center rounded-xl border text-2xl transition hover:border-white/25 hover:bg-white/[0.07] active:scale-95",
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

                {overlayKind === "pattern" && (
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

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                        <span>Size</span><span>{pattern.size}px</span>
                      </span>
                      <input type="range" min="12" max="96" value={pattern.size} onChange={(e) => updatePattern({ size: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.size, 12, 96) } as CSSProperties} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                        <span>Spacing</span><span>{pattern.spacing}px</span>
                      </span>
                      <input type="range" min="36" max="180" value={pattern.spacing} onChange={(e) => updatePattern({ spacing: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.spacing, 36, 180) } as CSSProperties} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                      <span>Opacity</span><span>{Math.round(pattern.opacity * 100)}%</span>
                    </span>
                    <input type="range" min="0.04" max="1" step="0.01" value={pattern.opacity} onChange={(e) => updatePattern({ opacity: Number(e.target.value) })} className="archers-range w-full" style={{ "--range-progress": rangeProgress(pattern.opacity, 0.04, 1) } as CSSProperties} />
                  </label>
                </div>
              </div>
            )}

            {/* ── Overlay: Geometric Lines ── */}
            {overlayKind === "geometric" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid flex-1 grid-cols-5 gap-1 rounded-lg border border-white/[0.10] bg-white/[0.045] p-1">
                    {GEOMETRIC_KIND_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        className={classNames("rounded-md py-1.5 text-[10px] font-bold transition-all",
                          geometric.kind === opt.value ? "bg-dlsu-vivid text-white shadow-sm shadow-dlsu-vivid/20" : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
                        )}
                        onClick={() => setGeometric(prev => ({ ...prev, kind: opt.value }))}
                      >{opt.label}</button>
                    ))}
                  </div>
                  <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/[0.07] transition hover:border-white/35">
                    <input type="color" value={geometric.color} onChange={(e) => setGeometric(prev => ({ ...prev, color: e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" />
                    <div className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: geometric.color }} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                      <span>Thickness</span><span>{geometric.size < 5 ? "Thin" : geometric.size > 12 ? "Thick" : "Medium"}</span>
                    </span>
                    <input type="range" min="1" max="20" step="1" value={geometric.size} onChange={(e) => setGeometric(prev => ({ ...prev, size: Number(e.target.value) }))} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.size, 1, 20) } as CSSProperties} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                      <span>Density</span><span>{geometric.spacing < 30 ? "Dense" : geometric.spacing > 80 ? "Spaced" : "Normal"}</span>
                    </span>
                    <input type="range" min="16" max="128" step="4" value={geometric.spacing} onChange={(e) => setGeometric(prev => ({ ...prev, spacing: Number(e.target.value) }))} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.spacing, 16, 128) } as CSSProperties} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                      <span>Opacity</span><span>{Math.round(geometric.opacity * 100)}%</span>
                    </span>
                    <input type="range" min="0.05" max="1" step="0.05" value={geometric.opacity} onChange={(e) => setGeometric(prev => ({ ...prev, opacity: Number(e.target.value) }))} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.opacity, 0.05, 1) } as CSSProperties} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-[10px] font-bold text-white/40">
                      <span>Broken</span><span>{geometric.dash > 0 ? `${geometric.dash}px` : "Solid"}</span>
                    </span>
                    <input type="range" min="0" max="32" step="1" value={geometric.dash} onChange={(e) => setGeometric(prev => ({ ...prev, dash: Number(e.target.value) }))} className="archers-range w-full" style={{ "--range-progress": rangeProgress(geometric.dash, 0, 32) } as CSSProperties} />
                  </label>
                </div>
              </div>
            )}

          </ControlGroup>
        </div>
      </section>

      {/* ── Export ─────────────────────────────── */}
      <section
        className={classNames(
          "space-y-5",
          mobileTab === "export" ? "block" : "hidden",
          desktopPanel === "export" ? "md:block" : "md:hidden"
        )}
      >
        <ControlGroup title="Save As">
          <div className="grid grid-cols-3 gap-1.5">
            {EXPORT_VARIANT_OPTIONS.map(({ value, label, description, icon: VariantIcon }) => (
              <button
                key={value}
                type="button"
                title={description}
                className={classNames(
                  "flex flex-col items-center gap-1.5 rounded-lg border py-2.5 px-1 text-center transition-all active:scale-95",
                  exportVariant === value
                    ? "border-dlsu-vivid bg-dlsu-vivid/20 text-white shadow-md shadow-dlsu-vivid/20"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:bg-white/[0.06] hover:text-white/80"
                )}
                onClick={() => setExportVariant(value)}
              >
                <VariantIcon size={15} />
                <span className="text-[10px] font-black">{label}</span>
              </button>
            ))}
          </div>
        </ControlGroup>

        <ControlGroup title="Save">
          <button
            type="button"
            className="group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-dlsu-vivid px-4 text-white shadow-lg shadow-dlsu-vivid/25 transition-all duration-200 hover:bg-dlsu active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setShowExportPopup(true)}
            disabled={isExporting}
          >
            {isExporting
              ? <Loader2 size={18} className="animate-spin" />
              : <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />}
            <span className="text-sm font-black">{isExporting ? "Saving..." : "Save"}</span>
          </button>
        </ControlGroup>
      </section>


    </div>
  );

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <main data-app-theme={appTheme} className="h-dvh w-full overflow-hidden bg-[#080B09] text-white">
      <ExportOverlay />

      {/* Export device picker popup */}
      {showExportPopup && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center px-4 pb-safe"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExportPopup(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0E1410] p-5 shadow-2xl">
            <h3 className="mb-4 text-base font-black text-white">Save</h3>

            {/* Output variant */}
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/40">Type</p>
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {EXPORT_VARIANT_OPTIONS.map(({ value, label, icon: VariantIcon }) => (
                <button
                  key={value}
                  type="button"
                  className={classNames(
                    "flex flex-col items-center gap-1.5 rounded-lg border py-2.5 px-1 text-center transition-all active:scale-95",
                    exportVariant === value
                      ? "border-dlsu-vivid bg-dlsu-vivid/20 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/80"
                  )}
                  onClick={() => setExportVariant(value)}
                >
                  <VariantIcon size={15} />
                  <span className="text-[10px] font-black">{label}</span>
                </button>
              ))}
            </div>

            {/* Device selection */}
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/40">Sizes</p>
              <button
                type="button"
                className="text-[10px] font-bold text-white/40 transition hover:text-white"
                onClick={() => setSelectedExportDevices(
                  (prev) => prev.size === COMMON_EXPORT_DEVICES.length ? new Set() : new Set(COMMON_EXPORT_DEVICES)
                )}
              >
                {selectedExportDevices.size === COMMON_EXPORT_DEVICES.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="mb-5 grid grid-cols-3 gap-1.5">
              {(Object.keys(DEVICES) as DeviceId[]).map((deviceId) => {
                const DeviceIcon = DEVICES[deviceId].icon;
                const checked = selectedExportDevices.has(deviceId);
                return (
                  <label
                    key={deviceId}
                    className={classNames(
                      "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition active:scale-[0.97]",
                      checked
                        ? "border-dlsu-vivid/60 bg-dlsu-vivid/10 text-white"
                        : "border-white/[0.07] bg-white/[0.025] text-white/50 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    <DeviceIcon size={16} className={checked ? "text-dlsu-vivid" : ""} />
                    <span className="text-[10px] font-bold leading-tight">{EXPORT_DEVICE_LABELS[deviceId]}</span>
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
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => setShowExportPopup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dlsu-vivid py-2.5 text-sm font-bold text-white transition hover:bg-dlsu active:scale-95 disabled:opacity-60"
                disabled={isExporting}
                onClick={() => {
                  setShowExportPopup(false);
                  if (selectedExportDevices.size > 0) handleExportSelected();
                  else handleExport();
                }}
              >
                {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {selectedExportDevices.size > 0
                  ? `Save ${selectedExportDevices.size}`
                  : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design load confirmation modal */}
      {showDesignApplyConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDesignApplyConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0E1410] p-6 shadow-2xl">
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
      <div className="flex h-full w-full min-w-0 flex-col md:grid md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">

        {/* Desktop sidebar */}
        <aside className="hidden min-h-0 border-r border-white/5 bg-[#070A08] md:flex md:flex-col">
          <div className="flex min-h-20 shrink-0 items-center justify-between border-b border-white/5 bg-[#090D0B]/50 px-6 backdrop-blur-md">
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
          {controls}
        </aside>

        {/* Right: preview area */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">

          {/* Mobile header */}
          <header className="flex min-h-16 w-full max-w-full shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#080B09]/95 px-3 backdrop-blur-md md:hidden">
            <div className="flex flex-1 items-center gap-3">
              <img src="/logos/logo-mini-green.png" alt="Archers Calendar" className="h-8 w-auto object-contain" />
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
                title="Toggle App Theme"
              >
                {appTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
            <div className="relative shrink-0">
              <button
                className="flex h-10 items-center gap-1.5 rounded-lg bg-dlsu-vivid px-3 text-xs font-bold text-white shadow-lg shadow-dlsu-vivid/20 transition hover:bg-dlsu disabled:opacity-60 active:scale-95"
                type="button"
                onClick={() => setShowExportPopup(true)}
                disabled={isExporting}
              >
                <Download size={15} />
                {isExporting ? "..." : "Save"}
              </button>
            </div>
          </header>

          {/* Desktop header */}
          <header className="hidden min-h-20 shrink-0 items-center justify-between border-b border-white/5 bg-[#090D0B]/80 px-8 backdrop-blur-md md:flex">
            <div>
              <p className="text-[10px] font-bold text-white/40">Live preview</p>
              <h2 className="mt-0.5 text-xl font-black text-white">
                {activeDevice.label} <span className="font-medium text-white/40">{activeDevice.description}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1.5 shadow-inner">
                {(Object.keys(DEVICES) as DeviceId[]).map((deviceId) => {
                  const DeviceIcon = DEVICES[deviceId].icon;
                  const active = device === deviceId;
                  return (
                    <button
                      key={deviceId}
                      className={classNames(
                        "grid h-10 w-11 place-items-center rounded-lg transition-all duration-200",
                        active 
                          ? "bg-dlsu-vivid text-white shadow-lg shadow-dlsu-vivid/20" 
                          : "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                      )}
                      type="button"
                      title={DEVICES[deviceId].label}
                      aria-label={DEVICES[deviceId].label}
                      onClick={() => setDevice(deviceId)}
                    >
                      <DeviceIcon size={18} strokeWidth={active ? 2.5 : 2} />
                    </button>
                  );
                })}
              </div>
              <div className="relative ml-1">
                <button
                  className="group flex h-12 items-center gap-2.5 rounded-xl bg-dlsu-vivid px-6 text-sm font-black text-white shadow-lg shadow-dlsu-vivid/25 transition-all duration-200 hover:bg-dlsu active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="button"
                  onClick={() => setShowExportPopup(true)}
                  disabled={isExporting}
                >
                  {isExporting
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />}
                  {isExporting ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </header>

          {/* Preview — always visible */}
          {/* The canvas is rendered at its real fixed pixel size; a wrapper div
              sized to `canvasSize * previewScale` contains it at `scale(previewScale)`
              so the preview is pixel-perfect with the export output */}
          <div
            ref={previewContainerRef}
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-6"
          >
            <div
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${previewScale})`,
                transformOrigin: "center center",
                flexShrink: 0
              }}
              className="flex items-center justify-center"
            >
              <PreviewCanvas canvasRef={canvasRef} previewScale={previewScale} />
            </div>
          </div>
          
          <MobileControls>{controls}</MobileControls>
</section>

      </div>

      {/* Welcome Popup Modal */}
      {showBetaPopup && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#080B09]/80 p-4 backdrop-blur-xl"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBetaPopup(false); }}
        >
          <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0D110F] shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
            <button
              type="button"
              onClick={() => setShowBetaPopup(false)}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-white/30 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center px-7 pb-5 pt-8 text-center">
              <div className="mb-4">
                <img src="/logos/logo-mini-green.png" alt="Archers Calendar" className="h-10 w-auto object-contain" />
              </div>
              <h2 className="mb-2 text-[22px] font-black leading-tight tracking-tight text-white">
                Your schedule,<br />wallpaper-ready.
              </h2>
              <p className="text-[13px] leading-relaxed text-white/45">
                Paste your ArchersHub or EAF table, customize, then download.
              </p>
            </div>

            {/* Steps */}
            <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
              {[
                { n: "1", text: "Paste your schedule" },
                { n: "2", text: "Customize the design" },
                { n: "3", text: "Download your wallpaper" },
              ].map(({ n, text }, i, arr) => (
                <div key={n} className={classNames(
                  "flex items-center gap-3 px-4 py-3",
                  i < arr.length - 1 ? "border-b border-white/[0.06]" : ""
                )}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dlsu-vivid/20 text-[11px] font-black text-dlsu-vivid">{n}</span>
                  <span className="text-[13px] font-medium leading-snug text-white/60">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={focusImportBox}
                className="flex w-full items-center justify-center rounded-xl bg-white py-3.5 text-[14px] font-black text-black shadow-lg shadow-white/5 transition-all hover:bg-white/90 active:scale-95"
              >
                Start
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-5 py-3 text-center">
              <p className="text-[11px] font-medium text-white/25">
                Bugs?{" "}
                <a className="text-white/40 transition-colors hover:text-white hover:underline underline-offset-4" href="https://instagram.com/richarduaje" target="_blank" rel="noreferrer">
                  DM @richarduaje
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={classNames("text-[11px] font-black text-white/60", className)}>{children}</h2>;
}

function ControlGroup({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={classNames("border-b border-white/[0.07] pb-5 last:border-b-0", className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <SectionLabel>{title}</SectionLabel>
        {action}
      </div>
      <div className="mt-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <label className={classNames("block", className)}>
      <span className="mb-2 block text-[11px] font-black text-white/55">{label}</span>
      <input
        className="min-h-12 w-full rounded-lg border border-white/[0.12] bg-white/[0.035] px-4 text-[15px] font-semibold text-white shadow-sm outline-none transition-all placeholder:text-white/25 hover:border-white/25 hover:bg-white/[0.05] focus:border-dlsu-vivid focus:bg-white/[0.055] focus:ring-1 focus:ring-dlsu-vivid"
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
      <span className="mb-1 block text-[10px] font-bold text-white/40">{label}</span>
      <input
        key={`${label}-${value}`}
        className="min-h-9 w-full rounded-md border border-white/10 bg-white/[0.03] px-2.5 text-xs text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-dlsu-vivid"
        defaultValue={value}
        onBlur={(e) => onBlur(e.currentTarget.value)}
      />
    </label>
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

  const inputCls = "min-h-9 min-w-0 w-full rounded-md border border-white/10 bg-white/[0.03] px-2 text-center text-xs text-white outline-none transition [color-scheme:dark] hover:border-white/20 focus:border-dlsu-vivid";

  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[10px] font-bold text-white/40">Time</span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => emit(start, end)}
          className={inputCls}
        />
        <span className="shrink-0 text-[10px] font-bold text-white/25">–</span>
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

function Toggle({ checked, label, icon: Icon, onChange, compact }: { checked: boolean; label: string; icon: LucideIcon; onChange: () => void; compact?: boolean }) {
  return (
    <button
      className={classNames(
        "group flex w-full items-center justify-between rounded-lg border border-white/[0.12] bg-white/[0.035] font-semibold text-white shadow-sm transition-all hover:border-white/25 hover:bg-white/[0.055]",
        compact ? "min-h-11 gap-2 px-3 text-xs" : "min-h-12 gap-3 px-4 text-sm"
      )}
      type="button"
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className={classNames("flex min-w-0 items-center", compact ? "gap-2" : "gap-3")}>
        <Icon size={compact ? 14 : 17} className="shrink-0 text-white/60 transition-colors group-hover:text-white" />
        <span className="min-w-0 truncate leading-tight">{label}</span>
      </span>
      <span className={classNames("flex shrink-0 items-center rounded-full p-1 transition-colors duration-300", compact ? "h-5 w-9" : "h-6 w-11", checked ? "bg-dlsu-vivid" : "bg-white/20 group-hover:bg-white/25")}>
        <span className={classNames("rounded-full bg-white shadow-sm transition-transform duration-300", compact ? "h-3 w-3" : "h-4 w-4", checked ? (compact ? "translate-x-4" : "translate-x-5") : "translate-x-0")} />
      </span>
    </button>
  );
}
