const fs = require('fs');
let pageContent = fs.readFileSync('app/page.tsx', 'utf-8');

// We know that `PreviewCanvas` will need a bunch of imports. Let's just create it directly.
const content = `
"use client";
import React from "react";
import { useSchedule } from "@/lib/ScheduleContext";
import { classNames, getTextColor, computeRowCells, formatTimeSlot, courseParts, getStartMinutes, toneFromRgb, toneFromHex, toneFromColors, getPaletteTextColor, buildGradientBackground, buildEmojiPatternBackground, buildGeometricBackground, normalizeHexColor, hexToRgb, estimateImageTone, courseKeyFromCode, courseKeyFromCourse, getExpandedCourseSet, formatMeetingDays, getSlotDurationMinutes, groupEntriesByCourse, rangeProgress, formatPixels } from "@/lib/utils";
import { DAY_ORDER, DayKey, normalizeDay, parseScheduleHtml, parseScheduleText, scheduleTableHtmlToText, ScheduleEntry } from "@/lib/schedule-parser";

const EXPORT_VARIANT_OPTIONS = [
  { value: "full", label: "Full", description: "Wallpaper + schedule" },
  { value: "transparent", label: "Transparent", description: "Schedule only PNG" },
  { value: "background", label: "Background", description: "Wallpaper only" }
];

const CALENDAR_FONT_OPTIONS = [
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

const CANVAS_SIZES = {
  iphone:         { width: 430,  height: 932  },
  ipad_portrait:  { width: 768,  height: 1024 },
  ipad_landscape: { width: 1024, height: 768  },
  laptop:         { width: 1440, height: 810  }, 
  macbook:        { width: 1440, height: 900  },
  share:          { width: 1080, height: 1080 }
};

const STYLE_PRESETS = {
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

export default function PreviewCanvas({ canvasRef, previewScale }: { canvasRef: React.RefObject<HTMLDivElement | null>, previewScale: number }) {
  const {
    entries, visibleDays, autoHideEmptyDays,
    device, wallpaperStyle, calendarThemeMode, backgroundTone,
    calendarFont, backgroundKind, backgroundImage, gradient,
    pattern, geometric, background, exportVariant,
    gridPosition, calendarTitle, calendarSubtitle,
    showRoom, showSection, showProfessor, showCourseTitle, calendarSize
  } = useSchedule();

  const ANIMO_PALETTE = COURSE_THEMES.find(t => t.name === "Animo")?.colors || BLOCK_PALETTES.map(p => p.hex);

  const activeStyle = STYLE_PRESETS[wallpaperStyle] || STYLE_PRESETS["clean"];
  const activeCalendarFont = CALENDAR_FONT_OPTIONS.find((option) => option.value === calendarFont) ?? CALENDAR_FONT_OPTIONS[0];
  const headerStyleClass = activeStyle.headerFont.replace(/\\bfont-(?:sans|serif|mono)\\b/g, "").trim();
  const canvasSize = CANVAS_SIZES[device];
  const isDarkBg = backgroundTone === "dark";
  const automaticCalendarTone = isDarkBg ? "dark" : "light";
  const resolvedCalendarTone = calendarThemeMode === "normal" ? automaticCalendarTone : calendarThemeMode;
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
      const key = \`\${entry.day}|\${entry.timeSlot}\`;
      groups[key] = [...(groups[key] ?? []), entry];
      return groups;
    }, {} as Record<string, ScheduleEntry[]>);
  }, [visibleEntries]);

  const slotDurations = React.useMemo(() => timeSlots.map(getSlotDurationMinutes), [timeSlots]);
  const minDuration = React.useMemo(() => slotDurations.length ? Math.min(...slotDurations) : 90, [slotDurations]);
  const slotRowTemplate = React.useMemo(
    () => slotDurations.length
      ? slotDurations.map((d) => \`auto minmax(0, \${(d / minDuration).toFixed(2)}fr)\`).join(" ")
      : "auto minmax(0, 1fr)",
    [slotDurations, minDuration]
  );

  const backgroundCssImage =
    backgroundKind === "image" && backgroundImage
      ? \`url(\${backgroundImage})\`
      : backgroundKind === "gradient"
      ? buildGradientBackground(gradient)
      : backgroundKind === "pattern"
      ? buildEmojiPatternBackground(pattern, backgroundTone)
      : backgroundKind === "geometric"
      ? buildGeometricBackground(geometric)
      : undefined;
      
  const previewStyle = {
    backgroundColor: backgroundKind === "gradient" ? gradient.colors[0] : background,
    backgroundImage: backgroundCssImage,
    backgroundSize: backgroundKind === "pattern" ? \`\${pattern.spacing}px \${pattern.spacing}px\` : backgroundKind === "geometric" ? \`\${geometric.spacing}px \${geometric.spacing}px\` : backgroundKind === "image" ? "cover" : undefined,
    backgroundPosition: backgroundKind === "gradient" ? gradient.position : "center",
    backgroundRepeat: backgroundKind === "pattern" || backgroundKind === "geometric" ? "repeat" : undefined
  };
  
  const isTransparentExport = exportVariant === "transparent";
  const isBackgroundOnlyExport = exportVariant === "background";
  const exportPreviewStyle = {
    ...previewStyle,
    backgroundColor: isTransparentExport ? "transparent" : previewStyle.backgroundColor,
    backgroundImage: isTransparentExport ? undefined : previewStyle.backgroundImage
  };

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

  const gridPositionClasses = {
    center: "justify-center items-center",
    left:   "justify-start items-center",
    right:  "justify-end items-center",
    top:    "justify-center items-start",
    bottom: "justify-center items-end"
  }[gridPosition] || "justify-center items-center";

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
    : { pad: 20,  subtitle: 8, title: 18, dayHeader: 8, courseCode: 8,  courseTitle: 8,    meta: 7,    cellPad: 2, blockPad: 2, titleMb: 5, gap: 2, mt: 0, timePx: 5, timePy: 2, dayPy: 3 };

  const PAD_SCALE = { 1: 0.4, 2: 0.7, 3: 1.0, 4: 1.4, 5: 1.8 };
  const FONT_SCALE_BASE = { 1: 1.3, 2: 1.12, 3: 1.0, 4: 0.9, 5: 0.82 };
  
  // Dynamic scaling for density (the more courses/slots, the smaller the text)
  const densityFactor = (() => {
    const slotCount = timeSlots.length;
    const entryCount = visibleEntries.length;
    if (slotCount <= 6 && entryCount <= 8) return 1.0;
    if (slotCount > 12 || entryCount > 18) return 0.75;
    if (slotCount > 9 || entryCount > 14) return 0.85;
    return 0.92;
  })();

  const MIN_FONT_PX = device === "iphone" ? 4 : 0;
  const fsScale = (device === "share" ? 1 : (FONT_SCALE_BASE[calendarSize as keyof typeof FONT_SCALE_BASE] || 1.0)) * densityFactor;
  const scalePx = (val: number) => \`\${Math.round(Math.max(MIN_FONT_PX, val * fsScale))}px\`;
  const scalePad = (val: number) => \`\${Math.round(val * (densityFactor < 0.9 ? fsScale * 0.8 : fsScale))}px\`; 
  
  const sz = {
    pad:        device === "share" ? "0px" : \`\${Math.round(szBase.pad * (PAD_SCALE[calendarSize as keyof typeof PAD_SCALE] || 1.0))}px\`,
    subtitle:   scalePx(szBase.subtitle),
    title:      scalePx(szBase.title),
    dayHeader:  scalePx(szBase.dayHeader),
    courseCode: scalePx(szBase.courseCode),
    courseTitle: scalePx(szBase.courseTitle),
    meta:       scalePx(szBase.meta),
    cellPad:    scalePad(szBase.cellPad),
    blockPad:   scalePad(Math.max(2, szBase.blockPad * (densityFactor < 0.8 ? 0.6 : 1.0))),
    titleMb:    scalePad(szBase.titleMb),
    gap:        scalePad(Math.max(1, szBase.gap * (densityFactor < 0.8 ? 0.5 : 1.0))),
    mt:         scalePad(Math.max(0, szBase.mt * (densityFactor < 0.8 ? 0.2 : 1.0))),
    timePx:     scalePad(szBase.timePx),
    timePy:     scalePad(szBase.timePy),
    dayPy:      scalePad(szBase.dayPy)
  };
  const canvasRadius =
    device === "share"    ? "0px" :
    device === "iphone"   ? "1rem" :
    device.startsWith("ipad") ? "0.75rem" : "0.5rem";

  return (
    <div
      ref={canvasRef}
      data-wallpaper-canvas="true"
      className={classNames(
        "relative flex overflow-hidden",
        device === "share" || isTransparentExport || isBackgroundOnlyExport ? "border-0" : "border border-white/20",
        activeCalendarFont.bodyClass,
        gridPositionClasses
      )}
      style={{
        ...exportPreviewStyle,
        width: canvasSize.width,
        height: canvasSize.height,
        color: "#ffffff",
        borderRadius: canvasRadius,
        boxShadow: device === "share" || isTransparentExport || isBackgroundOnlyExport ? "none" : "0 18px 48px rgba(0,0,0,0.38)"
      }}
    >
      {/* Visual textures */}
      {!isTransparentExport && <div className="absolute inset-0 bg-black/5" />}
      {!isTransparentExport && activeStyle.showLines && (
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:28px_28px]" />
      )}

      {/* Brand Watermark */}
      {!isTransparentExport && !isBackgroundOnlyExport && (
      <div className={classNames(
        "absolute bottom-8 right-8 z-50 pointer-events-none opacity-15 transition-opacity hover:opacity-100",
        device === "share" ? "bottom-6 right-6 opacity-10" : ""
      )}>
        <img src={logoSrc} alt="" className="h-8 w-auto object-contain" />
      </div>
      )}

      {/* Content */}
      {!isBackgroundOnlyExport && (
      <div
        className={classNames(
          "relative z-10 flex max-h-full max-w-full flex-col",
          device === "share" ? "h-full w-full" : ""
        )}
        style={{ padding: sz.pad }}
      >
        {/* iPhone only: push content to lower portion so clock area stays clear */}
        {device === "iphone" && (gridPosition === "center" || gridPosition === "bottom") && (
          <div style={{ flexShrink: 0, flexBasis: "55%" }} aria-hidden="true" />
        )}

        {/* Title block — hidden for share (rendered as overlay below) */}
        {device !== "share" && (calendarTitle || calendarSubtitle) && (
          <div className={classNames(
            "flex flex-col",
            gridPosition === "right" ? "items-end text-right" : "items-start"
          )} style={{ marginBottom: sz.titleMb }}>
            {calendarSubtitle && (
              <p style={{ fontSize: sz.subtitle }} className={classNames("font-bold uppercase", activeCalendarFont.headingClass, headerStyleClass, subtitleText)}>
                {calendarSubtitle}
              </p>
            )}
            {calendarTitle && (
              <h2 style={{ fontSize: sz.title, marginTop: sz.mt }} className={classNames("break-words font-black leading-none", activeCalendarFont.headingClass, headerStyleClass, titleText)}>
                {calendarTitle}
              </h2>
            )}
          </div>
        )}

        {/* Grid */}
        <div
          className={classNames(
            "grid min-h-0",
            wallpaperStyle === "clean" && device !== "share" ? "overflow-hidden rounded-[6px] border" : "overflow-visible rounded-none",
            isBorderlessStyle ? "shadow-none" : "shadow-lg",
            gridBg,
            device === "share" ? "flex-1" : "",
            gridBorder
          )}
          style={{
            gridTemplateColumns: \`repeat(\${Math.max(visibleDayList.length, 1)}, minmax(0, 1fr))\`,
            gridTemplateRows: \`\${device === "share" ? "auto " : ""}auto \${slotRowTemplate}\`
          }}
        >
          {device === "share" && (calendarTitle || calendarSubtitle) && (
            <div
              className={classNames("flex min-w-0 items-end px-8 pb-5 pt-7", headerCellBg, headerBorder)}
              style={{ gridColumn: "1 / -1" }}
            >
              <div className="min-w-0">
                {calendarSubtitle && (
                  <p style={{ fontSize: sz.subtitle }} className={classNames("font-bold uppercase", activeCalendarFont.headingClass, headerStyleClass, subtitleText)}>
                    {calendarSubtitle}
                  </p>
                )}
                {calendarTitle && (
                  <h2 style={{ fontSize: sz.title }} className={classNames("mt-1 font-black leading-none", device === "share" ? "break-words" : "truncate", activeCalendarFont.headingClass, headerStyleClass, titleText)}>
                    {calendarTitle}
                  </h2>
                )}
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
                key={\`time-\${timeSlot}\`}
                className={classNames(
                  "flex items-center",
                  timeRowStyle,
                  headerCellBg,
                  headerBorder
                )}
                style={{ gridColumn: "1 / -1", gap: sz.gap, paddingLeft: sz.timePx, paddingRight: sz.timePx, paddingTop: sz.timePy, paddingBottom: sz.timePy }}
              >
                <span className={classNames("h-px shrink-0 rounded-full", timeRuleStyle)} style={{ width: sz.gap, minWidth: sz.gap }} />
                <span
                  style={{ fontSize: sz.meta, lineHeight: 1, letterSpacing: '-0.025em' }}
                  className={classNames(
                    "shrink-0 font-black uppercase tabular-nums whitespace-nowrap",
                    timeTextStyle
                  )}
                >
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
                  key={\`\${timeSlot}-\${days[0]}\`}
                  className={classNames("min-w-0 min-h-0 border-b border-r", cellBorder)}
                  style={{ padding: sz.cellPad, ...(span > 1 ? { gridColumn: \`span \${span}\` } : {}) }}
                >
                  <div className="flex h-full flex-col min-h-0" style={{ gap: sz.gap }}>
                    {entries.map((entry) => {
                      const textColor = uniformCourseTextColor ?? getTextColor(entry.color);
                      const parts = courseParts(entry.course);
                      const meta = [showRoom ? entry.room : "", showSection ? entry.section : "", showProfessor ? entry.teacher : ""].filter(Boolean).join(" | ");
                      const courseBlockStyle: React.CSSProperties = {
                        backgroundColor: entry.color,
                        color: textColor
                      };
                      return (
                        <div key={entry.id} className={classNames("flex flex-1 flex-col justify-center overflow-hidden transition-all", activeStyle.cellStyle)} style={{ ...courseBlockStyle, padding: sz.blockPad, lineHeight: 1.05 }}>
                          <p style={{ fontSize: sz.courseCode, lineHeight: 1.05 }} className="font-black leading-tight tracking-tight truncate">{parts.code}</p>
                          {span > 1 && (
                            <p style={{ fontSize: sz.meta, marginTop: sz.mt, lineHeight: 1.1 }} className="font-bold opacity-60 truncate">
                              {days.join(" · ")}
                            </p>
                          )}
                          {showCourseTitle && parts.title ? (
                            <p style={{ fontSize: sz.courseTitle, marginTop: sz.mt, lineHeight: 1.1 }} className="font-semibold opacity-80 leading-tight line-clamp-3">{parts.title}</p>
                          ) : null}
                          {meta ? <p style={{ fontSize: sz.meta, marginTop: sz.mt, lineHeight: 1.1 }} className="font-bold opacity-75 truncate">{meta}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });

            return [timeLabel, ...gridCells];
          }) : (
            <div className={classNames("col-span-full flex items-center justify-center p-12 text-center text-sm font-bold uppercase opacity-40", headerText)}>
              No Classes Scheduled
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('components/PreviewCanvas.tsx', content);
console.log('PreviewCanvas created successfully');
