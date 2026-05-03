import { CalendarTone, GradientConfig, PatternConfig, GeometricConfig } from "./ScheduleContext";
import { ScheduleEntry, DayKey, DAY_ORDER, normalizeDay } from "./schedule-parser";

export function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function rangeProgress(value: number, min: number, max: number) {
  return `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
}

export function formatPixels(width: number, height: number) {
  return `${width} x ${height}px`;
}

export function getTextColor(hex: string) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#000000" : "#FFFFFF";
}

export function normalizeHexColor(hex: string) {
  return hex.trim().toUpperCase();
}

export function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return { r, g, b };
}

export function toneFromRgb(r: number, g: number, b: number): CalendarTone {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "light" : "dark";
}

export function toneFromHex(hex: string): CalendarTone {
  const { r, g, b } = hexToRgb(hex);
  return toneFromRgb(r, g, b);
}

export function toneFromColors(colors: string[]): CalendarTone {
  const rgb = colors.map(hexToRgb);
  const avg = rgb.reduce(
    (sum, color) => ({ r: sum.r + color.r, g: sum.g + color.g, b: sum.b + color.b }),
    { r: 0, g: 0, b: 0 }
  );
  return toneFromRgb(avg.r / rgb.length, avg.g / rgb.length, avg.b / rgb.length);
}

export function getPaletteTextColor(colors: string[]) {
  return toneFromColors(colors) === "light" ? "#000000" : "#FFFFFF";
}

export function buildGradientBackground(gradient: GradientConfig) {
  const colors = gradient.colors.join(", ");
  return gradient.type === "radial"
    ? `radial-gradient(circle at ${gradient.position}, ${colors})`
    : `linear-gradient(${gradient.angle}deg, ${colors})`;
}

export function buildEmojiPatternBackground(pattern: PatternConfig, tone: CalendarTone) {
  const textColor = tone === "dark" ? "255,255,255" : "0,0,0";
  const opacity = pattern.opacity.toFixed(2);
  const size = pattern.spacing;
  const emoji = pattern.emoji.replace(/[<>&"]/g, "");
  const cells: Array<{ x: number; y: number; rotate?: number; opacity?: number }> =
    pattern.preset === "diagonal"
      ? [{ x: 24, y: 28, rotate: -12 }, { x: 74, y: 78, rotate: -12, opacity: 0.8 }]
      : [{ x: 50, y: 54 }];

  const text = cells.map((cell) => {
    const transform = cell.rotate ? ` transform="rotate(${cell.rotate} ${cell.x} ${cell.y})"` : "";
    const cellOpacity = typeof cell.opacity === "number" ? (pattern.opacity * cell.opacity).toFixed(2) : opacity;
    return `<text x="${cell.x}" y="${cell.y}" text-anchor="middle" dominant-baseline="middle" font-size="${pattern.size}" opacity="${cellOpacity}" fill="rgb(${textColor})"${transform}>${emoji}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${text}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function buildGeometricBackground(config: GeometricConfig) {
  const { kind, color, size, spacing, opacity, dash = 0 } = config;
  const s = spacing;
  const sw = size;
  const op = opacity;
  let content = "";

  const dashAttr = dash > 0 ? `stroke-dasharray="${dash}"` : "";

  if (kind === "dots") {
    content = `<circle cx="${s/2}" cy="${s/2}" r="${sw/2}" fill="${color}" fill-opacity="${op}" />`;
  } else if (kind === "grid") {
    content = `<path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" ${dashAttr} />`;
  } else if (kind === "lines") {
    content = `<path d="M 0 ${s} L ${s} 0" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" ${dashAttr} />`;
  } else if (kind === "plus") {
    const h = s / 2;
    const l = sw * 2;
    content = `<path d="M ${h-l} ${h} L ${h+l} ${h} M ${h} ${h-l} L ${h} ${h+l}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" ${dashAttr} />`;
  } else if (kind === "blueprint") {
    const sub = s / 4;
    content = `
      <path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" ${dashAttr} />
      <path d="M ${sub} 0 L ${sub} ${s} M ${sub*2} 0 L ${sub*2} ${s} M ${sub*3} 0 L ${sub*3} ${s} M 0 ${sub} L ${s} ${sub} M 0 ${sub*2} L ${s} ${sub*2} M 0 ${sub*3} L ${s} ${sub*3}" fill="none" stroke="${color}" stroke-width="${sw/2}" stroke-opacity="${op/2}" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${content}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function estimateImageTone(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "dark" as CalendarTone;
  const sampleSize = 24;
  const sample = document.createElement("canvas");
  sample.width = sampleSize;
  sample.height = sampleSize;
  const sampleCtx = sample.getContext("2d");
  if (!sampleCtx) return "dark" as CalendarTone;
  sampleCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const data = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return toneFromRgb(r / count, g / count, b / count);
}

export function formatTimeSlot(slot: string): string {
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return slot;
  const [, h1, min1, p1 = "", h2, min2, p2 = ""] = m;
  const t = (h: string, mn: string) => `${Number(h)}:${mn}`;
  const s1 = p1.toUpperCase(), s2 = p2.toUpperCase();
  return s1 === s2
    ? `${t(h1, min1)} – ${t(h2, min2)} ${s2}`.trim()
    : `${t(h1, min1)} ${s1} – ${t(h2, min2)} ${s2}`.trim();
}

export function getStartMinutes(timeSlot: string) {
  const match = timeSlot.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function courseParts(course: string) {
  const [code, ...rest] = course.split(/\s+-\s+/);
  return { code: (code || course).trim(), title: rest.join(" - ").trim() };
}

export function courseKeyFromCode(code: string) {
  return code.trim().toUpperCase();
}

export function courseKeyFromCourse(course: string) {
  return courseKeyFromCode(courseParts(course).code);
}

export function getExpandedCourseSet(source: ScheduleEntry[]) {
  if (source.length === 0) return new Set<string>();
  return new Set([courseKeyFromCourse(source[0].course)]);
}

export function formatMeetingDays(days: DayKey[]) {
  return [...days]
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .join(" / ");
}

export function computeRowCells(
  visibleDayList: DayKey[],
  timeSlot: string,
  entriesByCell: Record<string, ScheduleEntry[]>
): Array<{ days: DayKey[]; entries: ScheduleEntry[] }> {
  const result: Array<{ days: DayKey[]; entries: ScheduleEntry[] }> = [];
  let i = 0;
  while (i < visibleDayList.length) {
    const day = visibleDayList[i];
    const cellEntries = entriesByCell[`${day}|${timeSlot}`] ?? [];
    if (cellEntries.length === 1) {
      const code = cellEntries[0].course.split(/\s+-\s+/)[0].trim().toUpperCase();
      let span = 1;
      while (i + span < visibleDayList.length) {
        const next = entriesByCell[`${visibleDayList[i + span]}|${timeSlot}`] ?? [];
        if (next.length === 1 && next[0].course.split(/\s+-\s+/)[0].trim().toUpperCase() === code) {
          span++;
        } else {
          break;
        }
      }
      result.push({ days: visibleDayList.slice(i, i + span), entries: cellEntries });
      i += span;
    } else {
      result.push({ days: [day], entries: cellEntries });
      i++;
    }
  }
  return result;
}

export function getSlotDurationMinutes(timeSlot: string): number {
  const dash = timeSlot.indexOf(" - ");
  if (dash < 0) return 90;
  const start = getStartMinutes(timeSlot.slice(0, dash));
  const end = getStartMinutes(timeSlot.slice(dash + 3));
  if (start === Number.MAX_SAFE_INTEGER || end === Number.MAX_SAFE_INTEGER || end <= start) return 90;
  return end - start;
}

export function groupEntriesByCourse(entries: ScheduleEntry[]): Array<{
  id: string;
  code: string;
  title: string;
  color: string;
  slots: Array<{ timeSlot: string; days: DayKey[]; room: string; teacher: string; section: string }>;
}> {
  const groups = new Map<string, {
    id: string;
    code: string;
    title: string;
    color: string;
    slots: Array<{ timeSlot: string; days: DayKey[]; room: string; teacher: string; section: string }>;
  }>();

  for (const entry of entries) {
    const { code, title } = courseParts(entry.course);
    const key = courseKeyFromCode(code);
    if (!groups.has(key)) {
      groups.set(key, { id: entry.id, code, title, color: entry.color, slots: [] });
    }
    const group = groups.get(key)!;
    const day = (normalizeDay(entry.day) || entry.day) as DayKey;

    // Find a matching slot (same time) to merge days into
    const existing = group.slots.find((s) => s.timeSlot === entry.timeSlot);
    
    if (existing) {
      if (!existing.days.includes(day)) existing.days.push(day);
    } else {
      group.slots.push({
        timeSlot: entry.timeSlot,
        days: [day],
        room: entry.room,
        teacher: entry.teacher,
        section: entry.section
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      slots: group.slots
        .map((slot) => ({
          ...slot,
          days: [...slot.days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        }))
        .sort((a, b) => getStartMinutes(a.timeSlot) - getStartMinutes(b.timeSlot))
    }))
    .sort((a, b) => getStartMinutes(a.slots[0]?.timeSlot ?? "") - getStartMinutes(b.slots[0]?.timeSlot ?? ""));
}