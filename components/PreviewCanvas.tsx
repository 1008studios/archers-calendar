
"use client";
import React from "react";
import { useSchedule, CalendarTone, WallpaperStyle } from "@/lib/ScheduleContext";
import { getCalendarFontOption } from "@/lib/calendar-fonts";
import { classNames, getTextColor, computeRowCells, formatTimeSlot, courseParts, getStartMinutes, toneFromRgb, toneFromHex, toneFromColors, getPaletteTextColor, buildGradientBackground, buildEmojiPatternBackground, buildGeometricBackground, normalizeHexColor, hexToRgb, estimateImageTone, courseKeyFromCode, courseKeyFromCourse, getExpandedCourseSet, formatMeetingDays, getSlotDurationMinutes, groupEntriesByCourse, rangeProgress, formatPixels, hasConflict } from "@/lib/utils";
import { DAY_ORDER, DayKey, normalizeDay, parseScheduleHtml, parseScheduleText, scheduleTableHtmlToText, ScheduleEntry } from "@/lib/schedule-parser";
import { AlertCircle, Sparkles, Maximize2 } from "lucide-react";

const EXPORT_VARIANT_OPTIONS = [
  { value: "full", label: "Full", description: "Wallpaper + schedule" },
  { value: "transparent", label: "Transparent", description: "Schedule only PNG" },
  { value: "background", label: "Background", description: "Wallpaper only" }
];

const CANVAS_SIZES = {
  iphone:         { width: 430,  height: 932  },
  ipad_portrait:  { width: 768,  height: 1024 },
  ipad_landscape: { width: 1024, height: 768  },
  laptop:         { width: 1440, height: 810  },
  macbook:        { width: 1440, height: 900  },
  share:          { width: 1080, height: 1080 }
};

interface StyleConfig {
  name: string;
  headerFont: string;
  gridOpacity: string;
  cellStyle: string;
  borderColor: string;
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
  },  compact: {
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
const COURSE_THEMES = [
  { name: "Blossom",  colors: ["#FFB3C1","#FF85A1","#FFD6E7","#F5A0B8","#FFCCE0","#FFC4D6","#FF9BB5","#FFDDE8"] },
  { name: "Pastel",   colors: ["#FFB3C1","#FFCBA4","#FFF3A3","#A8EED5","#A8D8F0","#D4BFFF","#B5D5A0","#E8C8F8"] },
  { name: "Lavender", colors: ["#D4BFFF","#E8C8F8","#C4B0E8","#B8A8FF","#EAD5FF","#CDB8F8","#F0E0FF","#DDD0FF"] },
  { name: "Peach",    colors: ["#FFCBA4","#FFB899","#FFD4B0","#F5A888","#FFBFA8","#F0C0A0","#FFD8C0","#F5B898"] },
  { name: "Ocean",    colors: ["#A8D8F0","#85C1E9","#B3E5FC","#5DADE2","#81D4FA","#29B6F6","#B2EBF2","#4FC3F7"] },
  { name: "Sunset",   colors: ["#FFDAB9","#FFCC80","#FFB74D","#FFA726","#FF9800","#FB8C00","#F57C00","#EF6C00"] },
  { name: "Forest",   colors: ["#C8E6C9","#B2DFDB","#80CBC4","#4DB6AC","#26A69A","#009688","#00897B","#00796B"] },
  { name: "Monochrome", colors: ["#F5F5F5","#E0E0E0","#EEEEEE","#BDBDBD","#E0E0E0","#9E9E9E","#757575","#616161"] },
  { name: "Black",    colors: ["#000000","#111111","#1A1A1A","#222222","#0A0A0A","#141414","#1C1C1C","#262626"] },
  { name: "Animo",    colors: ["#90C878","#B5D5A0","#68B058","#D4EDC5","#5AB050","#A8D890","#3A9040","#C8E8B0"] },
];
const BLOCK_PALETTES = [
  { name: "Blush",       hex: "#FFB3C1" },
  { name: "Rose",        hex: "#FF85A1" },
  { name: "Strawberry",  hex: "#FF6B8A" },
  { name: "Coral",       hex: "#FF9080" },
  { name: "Peach",       hex: "#FFCBA4" },
  { name: "Honey",       hex: "#FFDA8A" },
  { name: "Butter",      hex: "#FFF3A3" },
  { name: "Dew",         hex: "#C8F0D8" },
  { name: "Matcha",      hex: "#B5D5A0" },
  { name: "Sage",        hex: "#A8C8A0" },
  { name: "Mint",        hex: "#A8EED5" },
  { name: "Sky",         hex: "#A8D8F0" },
  { name: "Periwinkle",  hex: "#A0B8F0" },
  { name: "Lavender",    hex: "#D4BFFF" },
  { name: "Iris",        hex: "#B8A0F0" },
  { name: "Lilac",       hex: "#E8C8F8" },
  { name: "Taro",        hex: "#C4B0E8" },
  { name: "Mochi",       hex: "#F0D8F8" },
  { name: "Cream",       hex: "#F5ECD8" },
  { name: "Latte",       hex: "#D8C0A8" },
];

function pxValue(value: string | number) {
  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

function estimateTextWidth(text: string, fontSizePx: number) {
  let units = 0;
  for (const char of text.trim()) {
    if (char === " ") units += 0.28;
    else if (/[\-|./]/.test(char)) units += 0.34;
    else if (/[1Iijl]/.test(char)) units += 0.38;
    else if (/[MW@#%]/.test(char)) units += 0.9;
    else if (/[A-Z]/.test(char)) units += 0.72;
    else if (/[0-9]/.test(char)) units += 0.58;
    else units += 0.62;
  }
  return units * fontSizePx;
}

function fitTextPx(text: string, baseFontPx: number, availableWidthPx: number, minFontPx: number) {
  if (!text.trim() || availableWidthPx <= 0) return baseFontPx;
  const estimatedWidth = estimateTextWidth(text, baseFontPx);
  if (estimatedWidth <= availableWidthPx) return baseFontPx;
  return Math.max(Math.min(minFontPx, baseFontPx), Math.floor(baseFontPx * (availableWidthPx / estimatedWidth)));
}

function splitCourseCodeLines(text: string, fontSizePx: number, availableWidthPx: number) {
  const code = text.trim();
  if (!code || code.length < 8 || estimateTextWidth(code, fontSizePx) <= availableWidthPx) return [code];

  let bestIndex = Math.ceil(code.length / 2);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 3; i <= code.length - 3; i += 1) {
    const left = code.slice(0, i);
    const right = code.slice(i);
    const widestLine = Math.max(estimateTextWidth(left, fontSizePx), estimateTextWidth(right, fontSizePx));
    const overflow = Math.max(0, widestLine - availableWidthPx);
    const balance = Math.abs(left.length - right.length);
    const score = overflow * 12 + balance;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return [code.slice(0, bestIndex), code.slice(bestIndex)];
}

export default React.memo(function PreviewCanvas({
  canvasRef,
  previewScale,
  onManipulationStart,
  isManipulating
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>,
  previewScale: number,
  onManipulationStart?: (type: any, e: React.MouseEvent | React.TouchEvent) => void,
  isManipulating?: boolean
}) {
  const {
    entries, visibleDays, autoHideEmptyDays,
    device, wallpaperStyle, backgroundTone,
    calendarFont, backgroundKind, backgroundImage, gradient,
    pattern, geometric, background, exportVariant,
    gridPosition, deviceSettings, calendarTitle, calendarSubtitle,
    showCalendarTitle, showCalendarSubtitle,
    emojiOverlayEnabled, lineOverlayEnabled,
    showRoom, showSection, showProfessor, showCourseTitle,
    setExpandedCourses, setMobileTab, setDesktopPanel
  } = useSchedule();

  const current = deviceSettings[device] || { x: 0, y: 0, sx: 3, sy: 3 };
  const gridOffsetX = current.x;
  const gridOffsetY = current.y;

  const ANIMO_PALETTE = COURSE_THEMES.find(t => t.name === "Animo")?.colors || BLOCK_PALETTES.map(p => p.hex);

  const activeStyle = STYLE_PRESETS[wallpaperStyle] || STYLE_PRESETS["clean"];
  const activeCalendarFont = getCalendarFontOption(calendarFont);
  const headerStyleClass = activeStyle.headerFont.replace(/\bfont-(?:sans|serif|mono)\b/g, "").trim();

  const canvasSize = CANVAS_SIZES[device] || CANVAS_SIZES.laptop;
  const isSharingSquare = device === "share";
  const isSquareDevice = isSharingSquare;
  const isPhoneDevice = device === "iphone";
  const visibleCalendarTitle = showCalendarTitle ? calendarTitle : "";
  const visibleCalendarSubtitle = showCalendarSubtitle ? calendarSubtitle : "";
  const showSquareHeader = isSharingSquare && Boolean(visibleCalendarTitle || visibleCalendarSubtitle);
  const isDarkBg = backgroundTone === "dark";
  const automaticCalendarTone = isDarkBg ? "dark" : "light";
  const resolvedCalendarTone = activeStyle.forceTheme || automaticCalendarTone;
  const logoSrc = backgroundTone === "dark" ? "/logos/logo-mini-white.png" : "/logos/logo-mini-black.png";

  const visibleDayList = React.useMemo(() => {
    const baseList = DAY_ORDER.filter((d) => visibleDays[d]);
    if (!autoHideEmptyDays) return baseList;
    return baseList.filter(day =>
      entries.some(e => (normalizeDay(e.day) || e.day) === day)
    );
  }, [visibleDays, autoHideEmptyDays, entries]);

  const visibleEntries = React.useMemo(
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

  const timeSlots = React.useMemo(() => {
    const slots = Array.from(new Set(visibleEntries.map((e) => e.timeSlot).filter(Boolean)));
    return slots.sort((a, b) => getStartMinutes(a) - getStartMinutes(b));
  }, [visibleEntries]);

  const entriesByCell = React.useMemo(() => {
    return visibleEntries.reduce((groups, entry) => {
      const key = `${entry.day}|${entry.timeSlot}`;
      groups[key] = [...(groups[key] ?? []), entry];
      return groups;
    }, {} as Record<string, ScheduleEntry[]>);
  }, [visibleEntries]);

  const slotDurations = React.useMemo(() => timeSlots.map(getSlotDurationMinutes), [timeSlots]);
  const minDuration = React.useMemo(() => slotDurations.length ? Math.min(...slotDurations) : 90, [slotDurations]);
  const slotRowTemplate = React.useMemo(
    () => slotDurations.length
      ? slotDurations.map((d) => `auto minmax(0, ${(d / minDuration).toFixed(2)}fr)`).join(" ")
      : "auto minmax(0, 1fr)",
    [slotDurations, minDuration]
  );

  const emojiCssImage =
    emojiOverlayEnabled
      ? buildEmojiPatternBackground(pattern, backgroundTone)
      : undefined;
  const lineCssImage =
    lineOverlayEnabled
      ? buildGeometricBackground(geometric)
      : undefined;

  const backgroundCssImage =
    backgroundKind === "image" && backgroundImage
      ? `url(${backgroundImage})`
      : backgroundKind === "gradient"
      ? buildGradientBackground(gradient)
      : undefined;

  const combinedCssImage = [emojiCssImage, lineCssImage, backgroundCssImage].filter(Boolean).join(", ");
  const backgroundSizeLayers = [
    emojiCssImage ? `${pattern.spacing}px ${pattern.spacing}px` : undefined,
    lineCssImage ? `${geometric.spacing}px ${geometric.spacing}px` : undefined,
    backgroundCssImage ? "cover" : undefined
  ].filter(Boolean).join(", ");
  const backgroundRepeatLayers = [
    emojiCssImage ? "repeat" : undefined,
    lineCssImage ? "repeat" : undefined,
    backgroundCssImage ? "no-repeat" : undefined
  ].filter(Boolean).join(", ");

  const previewStyle = {
    backgroundColor: backgroundKind === "gradient" ? gradient.colors[0] : background,
    backgroundImage: combinedCssImage || undefined,
    backgroundSize: backgroundSizeLayers || undefined,
    backgroundPosition: backgroundKind === "gradient" ? gradient.position : "center",
    backgroundRepeat: backgroundRepeatLayers || undefined
  };

  const isTransparentExport = exportVariant === "transparent";
  const isBackgroundOnlyExport = exportVariant === "background";
  const exportPreviewStyle = {
    ...previewStyle,
    backgroundColor: isTransparentExport ? "transparent" : previewStyle.backgroundColor,
    backgroundImage: isTransparentExport ? undefined : previewStyle.backgroundImage
  };

  const isCalendarLight = resolvedCalendarTone === "light";
  const manipulationAccent = backgroundTone === "dark" ? "#A7F3D0" : "#005E38";
  const manipulationGlow = backgroundTone === "dark"
    ? "0 0 0 1px rgba(255,255,255,0.42), 0 0 24px rgba(167,243,208,0.42), inset 0 0 0 1px rgba(0,0,0,0.18)"
    : "0 0 0 1px rgba(0,0,0,0.20), 0 0 24px rgba(0,94,56,0.30), inset 0 0 0 1px rgba(255,255,255,0.38)";
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

  const gridPositionClasses = {
    center: "justify-center items-center",
    left:   "justify-start items-center",
    right:  "justify-end items-center",
    top:    "justify-center items-start",
    bottom: "justify-center items-end"
  }[gridPosition] || "justify-center items-center";

  const szBase = device === "laptop"
    ? { pad: 64,  subtitle: 13, title: 34, dayHeader: 12,   courseCode: 11,   courseTitle: 9.5,  meta: 9,    cellPad: 4, blockPad: 4, titleMb: 14, gap: 3, mt: 1, timePx: 8, timePy: 5, dayPy: 8 }
    : device === "macbook"
    ? { pad: 72,  subtitle: 14, title: 36, dayHeader: 12.5, courseCode: 11.5, courseTitle: 10,   meta: 9.5,  cellPad: 4, blockPad: 5, titleMb: 16, gap: 3, mt: 1, timePx: 8, timePy: 5, dayPy: 8 }
    : isSquareDevice
    ? { pad: 0,   subtitle: 18, title: 64, dayHeader: 18,   courseCode: 18,   courseTitle: 15,   meta: 15,   cellPad: 8, blockPad: 10, titleMb: 0, gap: 6, mt: 3, timePx: 16, timePy: 12, dayPy: 16 }
    : device === "ipad_landscape"
    ? { pad: 56,  subtitle: 12.5, title: 32, dayHeader: 11.5, courseCode: 11.5, courseTitle: 9.5,  meta: 9,    cellPad: 4, blockPad: 4, titleMb: 12, gap: 3, mt: 1, timePx: 6, timePy: 4, dayPy: 6 }
    : device === "ipad_portrait"
    ? { pad: 56,  subtitle: 14, title: 34, dayHeader: 12.5, courseCode: 12.5, courseTitle: 10.5, meta: 10,   cellPad: 5, blockPad: 6, titleMb: 14, gap: 4, mt: 1, timePx: 8, timePy: 5, dayPy: 8 }
    : { pad: 18,  subtitle: 11.5, title: 29, dayHeader: 12, courseCode: 13.5, courseTitle: 9.5, meta: 10.5, cellPad: 3, blockPad: 3.5, titleMb: 10, gap: 3, mt: 1, timePx: 5, timePy: 3, dayPy: 5 };

  const PAD_SCALE:  Record<number, number> = { 1: 0.45, 2: 0.75, 3: 1.0, 4: 1.3, 5: 1.6 };
  const FONT_SCALE: Record<number, number> = { 1: 1.25, 2: 1.1, 3: 1.0, 4: 0.9, 5: 0.8 };

  const lerpScale = (map: Record<number, number>, val: number) => {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (val <= keys[0]) return map[keys[0]];
    if (val >= keys[keys.length - 1]) return map[keys[keys.length - 1]];
    const lower = keys.filter(k => k <= val).pop()!;
    const upper = keys.filter(k => k > val).shift()!;
    const t = (val - lower) / (upper - lower);
    return map[lower] + (map[upper] - map[lower]) * t;
  };

  const densityFactor = React.useMemo(() => {
    const slotCount = timeSlots.length;
    const entryCount = visibleEntries.length;
    const slotImpact = Math.max(0, slotCount - 6) * 0.035;
    const entryImpact = Math.max(0, entryCount - 8) * 0.018;
    const factor = 1.0 - (slotImpact + entryImpact);
    return Math.max(0.45, Math.min(1.0, factor));
  }, [timeSlots.length, visibleEntries.length]);

  const globalCodeShrink = React.useMemo(() => {
    if (!visibleEntries.length) return 1.0;
    if (isPhoneDevice) return 1.0;
    const maxCodeLen = Math.max(...visibleEntries.map((e) => courseParts(e.course).code.length));
    const codeFitLimit = isSquareDevice ? 13 : device.startsWith("ipad") ? 10 : 11;
    return maxCodeLen > codeFitLimit ? Math.max(0.35, codeFitLimit / maxCodeLen) : 1.0;
  }, [visibleEntries, device, isSquareDevice, isPhoneDevice]);

  const globalMetaShrink = React.useMemo(() => {
    if (!visibleEntries.length) return 1.0;
    if (isPhoneDevice) return 1.0;
    const maxMetaLen = Math.max(...visibleEntries.map((e) => {
      return [showRoom ? e.room : "", showSection ? e.section : "", showProfessor ? e.teacher : ""].filter(Boolean).join(" | ").length;
    }));
    const metaFitLimit = isSquareDevice ? 24 : 22;
    return maxMetaLen > metaFitLimit ? Math.max(0.35, metaFitLimit / maxMetaLen) : 1.0;
  }, [visibleEntries, isSquareDevice, isPhoneDevice, showRoom, showSection, showProfessor]);

  const FRAME_WIDTH_MAP: Record<number, number> = device === "iphone"
    ? { 0.2: 1.08, 3: 1.0, 12: 0.1 }
    : { 0.2: 1.0, 3: 0.64, 12: 0.1 };

  const frameScale = lerpScale(FRAME_WIDTH_MAP, current.sx);
  const minFrameMargin = isSquareDevice ? 0 : (device === "iphone" ? 0 : (device.startsWith("ipad") ? 58 : 84));
  const maxFrameWidth = Math.max(1, canvasSize.width - minFrameMargin * 2);
  const maxFrameHeight = Math.max(1, canvasSize.height - minFrameMargin * 2);
  const rawFrameWidth = Math.round(maxFrameWidth * (isSquareDevice ? 1 : frameScale));
  const frameWidth = device === "iphone" ? Math.min(maxFrameWidth, rawFrameWidth) : rawFrameWidth;

  const shouldStretchHeight = true; // Always stretch to allow sy (vertical resize) to work on all devices

  const FRAME_HEIGHT_MAP: Record<number, number> = isSquareDevice
    ? { 0.2: 1, 12: 1 }
    : device === "iphone"
    ? { 0.2: 1.2, 3: 0.90, 12: 0.1 }
    : { 0.2: 1.1, 3: 0.84, 12: 0.1 };

  const frameHeightScale = lerpScale(FRAME_HEIGHT_MAP, current.sy);
  const frameHeight = Math.round(maxFrameHeight * frameHeightScale);

  const defaultFrameWidthScale = isSquareDevice ? 1 : lerpScale(FRAME_WIDTH_MAP, 3);
  const defaultFrameHeightScale = isSquareDevice ? 1 : lerpScale(FRAME_HEIGHT_MAP, 3);
  const frameWidthRatio = isSquareDevice ? 1 : frameScale / defaultFrameWidthScale;
  const frameHeightRatio = isSquareDevice ? 1 : frameHeightScale / defaultFrameHeightScale;
  const frameAreaScale = Math.sqrt(frameWidthRatio * frameHeightRatio);
  const calendarGrowthScale = isSquareDevice ? 1.28 : Math.max(0.68, Math.min(1.85, frameAreaScale));
  const controlFontScale = isSquareDevice ? 1.12 : Math.max(0.9, Math.min(1.18, lerpScale(FONT_SCALE, current.sx)));

  const MIN_FONT_PX = isPhoneDevice ? 6 : 0;
  const fsScale = controlFontScale * calendarGrowthScale * densityFactor;
  const scalePx = (val: number) => `${Math.round(Math.max(MIN_FONT_PX, val * fsScale))}px`;
  const padFactor = densityFactor < 0.7 ? densityFactor * 0.7 : densityFactor;
  const spacingScale = isSquareDevice ? 1.2 : Math.max(0.75, Math.min(1.55, calendarGrowthScale));
  const scalePad = (val: number) => `${Math.round(val * padFactor * spacingScale)}px`;

  const sz = {
    pad:        `${Math.round(szBase.pad * lerpScale(PAD_SCALE, current.sx) * (isSquareDevice ? 1.0 : Math.max(0.4, densityFactor * 0.9)))}px`,
    subtitle:   scalePx(szBase.subtitle),
    title:      scalePx(szBase.title),
    dayHeader:  scalePx(szBase.dayHeader),
    courseCode: scalePx(szBase.courseCode),
    courseTitle: scalePx(szBase.courseTitle),
    meta:       scalePx(szBase.meta),
    cellPad:    scalePad(szBase.cellPad),
    blockPad:   scalePad(isSquareDevice ? szBase.blockPad : Math.max(1.2, szBase.blockPad * (densityFactor < 0.6 ? 0.55 : 0.85))),
    titleMb:    scalePad(szBase.titleMb),
    gap:        scalePad(isSquareDevice ? szBase.gap : Math.max(1, szBase.gap * (densityFactor < 0.6 ? 0.35 : 0.7))),
    mt:         scalePad(isSquareDevice ? szBase.mt : Math.max(0, szBase.mt * (densityFactor < 0.6 ? 0.15 : 0.55))),
    timePx:     scalePad(szBase.timePx),
    timePy:     scalePad(szBase.timePy),
    dayPy:      scalePad(szBase.dayPy)
  };
  const layoutPx = {
    pad: pxValue(sz.pad),
    cellPad: pxValue(sz.cellPad),
    blockPad: pxValue(sz.blockPad),
    courseCode: pxValue(sz.courseCode),
    meta: pxValue(sz.meta),
    gap: pxValue(sz.gap)
  };

  const canvasRadius =
    isSquareDevice        ? "0px" :
    device === "iphone"   ? "1rem" :
    device.startsWith("ipad") ? "0.75rem" : "0.5rem";

  // Standard safe areas for lock screen wallpapers (clock area and home indicator)
  const safeAreaTop =
    device === "iphone" ? (gridPosition === "bottom" ? "25%" : gridPosition === "center" ? "12%" : "8%") :
    device.startsWith("ipad") ? (gridPosition === "bottom" ? "20%" : gridPosition === "center" ? "10%" : "6%") :
    "0%";

  const safeAreaBottom =
    device === "iphone" ? (gridPosition === "top" ? "15%" : gridPosition === "center" ? "12%" : "6%") :
    device.startsWith("ipad") ? (gridPosition === "top" ? "12%" : gridPosition === "center" ? "10%" : "4%") :
    "0%";

  const gridOffsetStyle: React.CSSProperties = {
    transform: `translate(${Math.round((canvasSize.width * gridOffsetX) / 100)}px, ${Math.round((canvasSize.height * gridOffsetY) / 100)}px)`
  };
  const contentFrameStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: `${frameWidth}px`,
    maxWidth: "150%",
    maxHeight: "150%",
    ...(shouldStretchHeight ? { height: `${frameHeight}px` } : {}),
    ...gridOffsetStyle
  };
  return (
    <div
      ref={canvasRef}
      data-wallpaper-canvas="true"
      className={classNames(
        "relative flex overflow-hidden",
        isSquareDevice || isTransparentExport || isBackgroundOnlyExport ? "border-0" : "border border-white/20",
        activeCalendarFont.bodyClass,
        gridPositionClasses
      )}
      style={{
        ...exportPreviewStyle,
        width: canvasSize.width,
        height: canvasSize.height,
        color: "#ffffff",
        borderRadius: canvasRadius,
        boxShadow: isSquareDevice || isTransparentExport || isBackgroundOnlyExport ? "none" : "0 18px 48px rgba(0,0,0,0.38)",
        transition: "background-color 300ms ease-out, background-image 300ms ease-out"
      }}
    >
      {!isTransparentExport && <div className="absolute inset-0 bg-black/5" />}
      {!isTransparentExport && activeStyle.showLines && (
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:28px_28px]" />
      )}

      {/* Visual Snap Guides (Visible during drag) */}
      {isManipulating && !isSquareDevice && (
        <>
          {gridOffsetX === 0 && (
            <div className="absolute inset-y-0 left-1/2 z-50 w-0.5 -translate-x-1/2 bg-dlsu-vivid/40 shadow-[0_0_12px_rgba(0,140,77,0.8)]" />
          )}
          {gridOffsetY === 0 && (
            <div className="absolute inset-x-0 top-1/2 z-50 h-0.5 -translate-y-1/2 bg-dlsu-vivid/40 shadow-[0_0_12px_rgba(0,140,77,0.8)]" />
          )}
        </>
      )}

      {/* Brand Watermark */}      {!isTransparentExport && !isBackgroundOnlyExport && (
      <div className={classNames(
        "absolute bottom-8 right-8 z-50 pointer-events-none opacity-15 transition-opacity hover:opacity-100",
        isSquareDevice ? "bottom-6 right-6 opacity-10" : ""
      )}>
        <img src={logoSrc} alt="" className="h-8 w-auto object-contain" />
      </div>
      )}

      {!isBackgroundOnlyExport && (
      <div
        className={classNames(
          "relative z-10 flex flex-col",
          shouldStretchHeight ? "h-full" : "max-h-full max-w-full"
        )}
        style={{ padding: sz.pad, ...contentFrameStyle }}
      >
        {/* Top safe area spacer (clock area) */}
        {(device === "iphone" || device.startsWith("ipad")) && (
          <div style={{ flexShrink: 0, flexBasis: safeAreaTop }} aria-hidden="true" />
        )}
        {!isSquareDevice && (visibleCalendarTitle || visibleCalendarSubtitle) && (
          <div className={classNames(
            "flex flex-col",
            gridPosition === "right" ? "items-end text-right" : "items-start"
          )} style={{ marginBottom: sz.titleMb }}>
            {visibleCalendarSubtitle && (
              <p style={{ fontSize: sz.subtitle }} className={classNames("font-bold uppercase", activeCalendarFont.headingClass, headerStyleClass, subtitleText)}>
                {visibleCalendarSubtitle}
              </p>
            )}
            {visibleCalendarTitle && (
              <h2 style={{ fontSize: sz.title, marginTop: sz.mt }} className={classNames("break-words font-black leading-none", activeCalendarFont.headingClass, headerStyleClass, titleText)}>
                {visibleCalendarTitle}
              </h2>
            )}
          </div>
        )}

        <div
          data-calendar-grid="true"
          className={classNames(
            "relative grid min-h-0 w-full transition-colors duration-300 ease-out",
            wallpaperStyle === "clean" && !isSquareDevice ? "overflow-hidden rounded-[6px] border" : "overflow-visible border-l border-t",
            isBorderlessStyle ? "shadow-none !border-transparent" : "shadow-lg",
            gridBg,
            shouldStretchHeight ? "flex-1" : "",
            gridBorder
          )}
          style={{
            gridTemplateColumns: `repeat(${Math.max(visibleDayList.length, 1)}, minmax(0, 1fr))`,
            gridTemplateRows: `${showSquareHeader ? "auto " : ""}auto ${slotRowTemplate}`
          }}
        >
          {showSquareHeader && (
            <div
              className={classNames("flex min-w-0 items-center justify-between border-b px-6 py-4", headerCellBg, headerBorder)}
              style={{ gridColumn: "1 / -1" }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {visibleCalendarTitle && (
                  <h2 style={{ fontSize: `calc(${sz.title} * 0.42)` }} className={classNames("truncate font-black uppercase tracking-wider leading-none", activeCalendarFont.headingClass)}>
                    {visibleCalendarTitle}
                  </h2>
                )}
                {visibleCalendarSubtitle && (
                  <>
                    <div className="h-3 w-px bg-white/10" />
                    <p style={{ fontSize: `calc(${sz.subtitle} * 0.62)` }} className={classNames("truncate font-bold opacity-50 leading-none", activeCalendarFont.headingClass)}>
                      {visibleCalendarSubtitle}
                    </p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 opacity-30">
                <Sparkles size={12} />
                <span className="text-[10px] font-black uppercase tracking-tighter">Archers Calendar</span>
              </div>
            </div>
          )}
          {visibleDayList.map((day) => (
            <div key={day} style={{ fontSize: sz.dayHeader, lineHeight: 1.2, paddingTop: sz.dayPy, paddingBottom: sz.dayPy, paddingLeft: sz.timePx, paddingRight: sz.timePx }} className={classNames("border-b border-r text-center font-bold uppercase", headerCellBg, headerBorder, headerText)}>
              {day}
            </div>
          ))}

          {timeSlots.length ? timeSlots.flatMap((timeSlot) => {
            const rowCells = computeRowCells(visibleDayList, timeSlot, entriesByCell);
            const timeLabel = (
              <div
                key={`time-${timeSlot}`}
                className={classNames("flex items-center", timeRowStyle, headerCellBg, headerBorder)}
                style={{ gridColumn: "1 / -1", gap: sz.gap, paddingLeft: sz.timePx, paddingRight: sz.timePx, paddingTop: sz.timePy, paddingBottom: sz.timePy }}
              >
                <span className={classNames("h-px shrink-0 rounded-full", timeRuleStyle)} style={{ width: sz.gap, minWidth: sz.gap }} />
                <span style={{ fontSize: sz.meta, lineHeight: 1, letterSpacing: '-0.025em' }} className={classNames("shrink-0 font-black uppercase tabular-nums whitespace-nowrap", timeTextStyle)}>
                  {formatTimeSlot(timeSlot)}
                </span>
                <span className={classNames("h-px flex-1 rounded-full", timeRuleStyle)} />
              </div>
            );

            const gridCells = rowCells.map((cell) => {
              const { days, entries } = cell;
              const span = days.length;
              return (
                <div
                  key={`${timeSlot}-${days[0]}`}
                  className={classNames("min-w-0 min-h-0 border-b border-r", cellBorder)}
                  style={{ padding: sz.cellPad, ...(span > 1 ? { gridColumn: `span ${span}` } : {}) }}
                >
                  <div className="flex h-full flex-col min-h-0" style={{ gap: sz.gap }}>
                    {entries.map((entry) => {
                      const textColor = uniformCourseTextColor ?? getTextColor(entry.color);
                      const parts = courseParts(entry.course);
                      const meta = [showRoom ? entry.room : "", showSection ? entry.section : "", showProfessor ? entry.teacher : ""].filter(Boolean).join(" | ");
                      const courseBlockStyle: React.CSSProperties = { backgroundColor: entry.color, color: textColor };
                      const courseLineHeight = densityFactor < 0.6 ? 0.9 : densityFactor < 0.75 ? 0.98 : 1.05;
                      const conflict = hasConflict(entry, visibleEntries);

                      // Boost font size if there's very little text (only code and room, no long titles)
                      const isMinimalContent = (!showCourseTitle || !parts.title) && !showSection && !showProfessor;
                      const localFsBoost = isMinimalContent ? 1.15 : 1.0;
                      const gridInnerWidth = Math.max(1, frameWidth - layoutPx.pad * 2);
                      const columnWidth = gridInnerWidth / Math.max(visibleDayList.length, 1);
                      const blockInnerWidth = Math.max(
                        1,
                        columnWidth * span - layoutPx.cellPad * 2 - layoutPx.blockPad * 2
                      );
                      const emojiWidth = entry.emoji ? layoutPx.courseCode * localFsBoost + layoutPx.gap : 0;
                      const conflictWidth = conflict ? 14 : 0;
                      const codeAvailableWidth = Math.max(1, blockInnerWidth - emojiWidth - conflictWidth);
                      const baseCodePx = layoutPx.courseCode * localFsBoost * globalCodeShrink;
                      const baseMetaPx = layoutPx.meta * localFsBoost * globalMetaShrink;
                      const minCodePx = isPhoneDevice ? 10 : isSquareDevice ? 11 : 7;
                      const minMetaPx = isPhoneDevice ? 7.5 : isSquareDevice ? 8 : 6;
                      const fittedCodePx = fitTextPx(parts.code, baseCodePx, codeAvailableWidth, minCodePx);
                      const fittedMetaPx = meta
                        ? fitTextPx(meta, baseMetaPx, blockInnerWidth, minMetaPx)
                        : baseMetaPx;
                      const codeNeedsWrap = estimateTextWidth(parts.code, fittedCodePx) > codeAvailableWidth;
                      const metaNeedsWrap = meta ? estimateTextWidth(meta, fittedMetaPx) > blockInnerWidth : false;
                      const courseCodeLines = isPhoneDevice && codeNeedsWrap
                        ? splitCourseCodeLines(parts.code, fittedCodePx, codeAvailableWidth)
                        : [parts.code];

                      const handleBlockClick = (e: React.MouseEvent) => {
                        if (isSquareDevice) return;
                        e.stopPropagation();
                        const key = courseKeyFromCode(parts.code);
                        setExpandedCourses(new Set([key]));
                        setMobileTab("start");
                        setDesktopPanel("start");
                        window.setTimeout(() => {
                          const el = document.getElementById(`course-editor-${key}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      };

                      return (
                        <div
                          data-course-block="true"
                          key={entry.id}
                          onClick={handleBlockClick}
                          className={classNames(
                            "group/block relative flex flex-1 flex-col justify-center overflow-hidden transition-colors duration-300 ease-out",
                            activeStyle.cellStyle,
                            !isSquareDevice ? "cursor-pointer hover:brightness-110 active:scale-[0.98]" : ""
                          )}
                          style={{ ...courseBlockStyle, padding: sz.blockPad, lineHeight: courseLineHeight, transitionProperty: "background-color, color" }}
                        >
                      <div className="flex min-w-0 items-center gap-1">
                        <p
                          data-course-text="true"
                          style={{
                            fontSize: `${fittedCodePx}px`,
                            lineHeight: courseCodeLines.length > 1 ? 0.95 : 1.05,
                            whiteSpace: codeNeedsWrap ? "normal" : "nowrap",
                            overflowWrap: "anywhere",
                            wordBreak: courseCodeLines.length > 1 ? "normal" : "break-word"
                          }}
                          className="min-w-0 max-w-full font-black leading-tight tracking-tight"
                        >
                          {courseCodeLines.map((line, index) => (
                            <React.Fragment key={`${line}-${index}`}>
                              {index > 0 && <br />}
                              {line}
                            </React.Fragment>
                          ))}
                        </p>
                        {entry.emoji && <span style={{ fontSize: `calc(${sz.courseCode} * ${localFsBoost})` }} className="shrink-0 leading-none">{entry.emoji}</span>}
                        {conflict && <AlertCircle size={10} className="shrink-0 animate-pulse text-red-500" strokeWidth={3} />}
                      </div>
                      {span > 1 && <p data-course-text="true" style={{ fontSize: sz.meta, marginTop: sz.mt, lineHeight: 1.1, whiteSpace: "nowrap" }} className="font-bold opacity-60">{days.join(" · ")}</p>}
                      {showCourseTitle && parts.title && (
                        <p data-course-text="true" style={{ fontSize: sz.courseTitle, marginTop: sz.mt, lineHeight: 1.1 }} className="font-semibold opacity-80 leading-tight line-clamp-3">{parts.title}</p>
                      )}
                      {meta && (
                        <p
                          data-course-text="true"
                          style={{
                            fontSize: `${fittedMetaPx}px`,
                            marginTop: sz.mt,
                            lineHeight: 1.1,
                            whiteSpace: metaNeedsWrap ? "normal" : "nowrap",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word"
                          }}
                          className="max-w-full font-bold opacity-75"
                        >
                          {meta}
                        </p>
                      )}
                      {!isSquareDevice && (
                        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/block:opacity-30"><Sparkles size={8} /></div>
                      )}
                    </div>
                  );
                })}
                  </div>
                </div>
              );
            });
            return ([timeLabel, ...gridCells]);
          }) : (
            <div className={classNames("col-span-full flex items-center justify-center p-12 text-center text-sm font-bold uppercase opacity-40", headerText)}>No Classes Scheduled</div>
            )}

            {/* High-Fidelity Manipulation Handles (All Devices) */}
            {!isTransparentExport && !isBackgroundOnlyExport && !isSquareDevice && (
              <div
                className="absolute inset-0 z-[60] pointer-events-none group/manip"
                style={{ color: manipulationAccent }}
              >
                <div
                  className={classNames(
                    "absolute inset-0 rounded-[6px] border-2 border-current transition-opacity duration-200",
                    isManipulating ? "opacity-100" : "opacity-0 group-hover/manip:opacity-100"
                  )}
                  style={{ boxShadow: manipulationGlow }}
                />

                {/* Center Move Handle */}
                <div
                  data-manipulation-handle="move"
                  className="absolute inset-12 cursor-grab active:cursor-grabbing pointer-events-auto"
                  onMouseDown={(e) => onManipulationStart?.("move", e)}
                  onTouchStart={(e) => onManipulationStart?.("move", e)}
                />

                {/* Edge Handles - Enlarged for touch */}
                <div data-manipulation-handle="resize-n" className="absolute left-10 right-10 top-0 h-8 cursor-ns-resize pointer-events-auto" onMouseDown={(e) => onManipulationStart?.("resize-n", e)} onTouchStart={(e) => onManipulationStart?.("resize-n", e)} />
                <div data-manipulation-handle="resize-s" className="absolute bottom-0 left-10 right-10 h-8 cursor-ns-resize pointer-events-auto" onMouseDown={(e) => onManipulationStart?.("resize-s", e)} onTouchStart={(e) => onManipulationStart?.("resize-s", e)} />
                <div data-manipulation-handle="resize-w" className="absolute bottom-10 left-0 top-10 w-8 cursor-ew-resize pointer-events-auto" onMouseDown={(e) => onManipulationStart?.("resize-w", e)} onTouchStart={(e) => onManipulationStart?.("resize-w", e)} />
                <div data-manipulation-handle="resize-e" className="absolute bottom-10 right-0 top-10 w-8 cursor-ew-resize pointer-events-auto" onMouseDown={(e) => onManipulationStart?.("resize-e", e)} onTouchStart={(e) => onManipulationStart?.("resize-e", e)} />

                {/* Corner Handles - Enlarged for touch */}
                {[
                  { type: "resize-nw", class: "left-0 top-0 cursor-nwse-resize", mark: "left-1.5 top-1.5 rounded-tl-md border-l-2 border-t-2" },
                  { type: "resize-ne", class: "right-0 top-0 cursor-nesw-resize", mark: "right-1.5 top-1.5 rounded-tr-md border-r-2 border-t-2" },
                  { type: "resize-sw", class: "left-0 bottom-0 cursor-nesw-resize", mark: "bottom-1.5 left-1.5 rounded-bl-md border-b-2 border-l-2" },
                  { type: "resize-se", class: "right-0 bottom-0 cursor-nwse-resize", mark: "bottom-1.5 right-1.5 rounded-br-md border-b-2 border-r-2" }
                ].map((h) => (
                  <div
                    key={h.type}
                    data-manipulation-handle={h.type}
                    onMouseDown={(e) => onManipulationStart?.(h.type, e)}
                    onTouchStart={(e) => onManipulationStart?.(h.type, e)}
                    className={classNames(
                      "absolute h-12 w-12 pointer-events-auto",
                      h.class
                    )}
                  >
                    <div
                      className={classNames(
                        "absolute h-4 w-4 border-current transition-opacity duration-200",
                        isManipulating ? "opacity-100" : "opacity-0 group-hover/manip:opacity-100",
                        h.mark
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Bottom safe area spacer (home indicator) */}
            {(device === "iphone" || device.startsWith("ipad")) && (
              <div style={{ flexShrink: 0, flexBasis: safeAreaBottom }} aria-hidden="true" />
            )}
          </div>
        </div>
      )}
    </div>
  );
});
