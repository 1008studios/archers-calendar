import {
  DAY_ORDER,
  normalizeDay,
  parseScheduleText,
  type DayKey,
  type ScheduleEntry
} from "@/lib/schedule-parser";

export type ImportSource = "local" | "ai";

export type ScheduleImportAssessment = {
  entries: ScheduleEntry[];
  scheduleLike: boolean;
  shouldUseAi: boolean;
  message?: string;
};

const MAX_IMPORT_ENTRIES = 80;
const DEFAULT_COLORS = [
  "#FFE8A3",
  "#BFD8A6",
  "#F8F8F2",
  "#C9B6FF",
  "#FFC4CF",
  "#FF8FA3",
  "#FFE66D",
  "#E8C7A2"
];

const TIME_RANGE_PATTERN =
  /\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:A\.?M\.?|P\.?M\.?)?\s*(?:-|to|\u2013|\u2014)\s*(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:A\.?M\.?|P\.?M\.?)?\b/gi;

const TIME_RANGE_EXTRACT_PATTERN =
  /((?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:A\.?M\.?|P\.?M\.?)?\s*(?:-|to|\u2013|\u2014)\s*(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:A\.?M\.?|P\.?M\.?)?)/i;

const COURSE_CODE_PATTERN = /\b[A-Z]{2,}(?:\s?\d+|\d+)[A-Z0-9-]*\b/g;
const DAY_WORD_PATTERN = /\b(?:MON(?:DAY)?|TUE(?:S|SDAY)?|WED(?:NESDAY)?|THU(?:R|RS|RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?)\b/gi;
const COMPACT_DAY_PATTERN = /\b(?:MTH|TTH|MWF|MTWTHF|MTWTF|MW|MF|TF|WF|TH|M\/W|M\/TH|T\/TH|T\/F|W\/F|M-TH|T-TH|M-W-F|T-W-F|T-H|T-TH)\b/i;

function normalizeSpaces(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \f\v]+/g, " ").trim();
}

function makeId(index: number) {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `entry-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const cleaned = normalizeSpaces(value);
  return /^[-_]+$/.test(cleaned) ? "" : cleaned;
}

function normalizePeriod(value: string) {
  return value.replace(/\./g, "").toUpperCase();
}

function parseTimePart(value: string, fallbackPeriod = "") {
  const match = value.trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(A\.?M\.?|P\.?M\.?)?$/i);
  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  let period = match[3] ? normalizePeriod(match[3]) : fallbackPeriod;

  if (!period && hour > 12) {
    period = "PM";
    hour -= 12;
  }

  if (!period && hour === 0) {
    period = "AM";
    hour = 12;
  }

  if (hour < 1 || hour > 12 || !period) {
    return `${Number(match[1])}:${minute}`;
  }

  return `${hour}:${minute} ${period}`;
}

function normalizeTimeSlot(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = normalizeSpaces(
    value
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\bto\b/gi, "-")
      .replace(/\s*-\s*/g, " - ")
  );
  const match = normalized.match(TIME_RANGE_EXTRACT_PATTERN);
  const range = match?.[1] ?? normalized;
  const parts = range.split(/\s+-\s+/);

  if (parts.length !== 2) {
    return normalized;
  }

  const startPeriod = normalizePeriod(parts[0].match(/(A\.?M\.?|P\.?M\.?)/i)?.[1] ?? "");
  const endPeriod = normalizePeriod(parts[1].match(/(A\.?M\.?|P\.?M\.?)/i)?.[1] ?? "");
  const start = parseTimePart(parts[0], endPeriod);
  const end = parseTimePart(parts[1], startPeriod);

  return start && end ? `${start} - ${end}` : normalized;
}

function countMatches(input: string, pattern: RegExp) {
  return Array.from(input.matchAll(pattern)).length;
}

function getImportSignals(input: string) {
  const upper = input.toUpperCase();
  const timeRanges = countMatches(input, TIME_RANGE_PATTERN);
  const dayWords = new Set(Array.from(input.matchAll(DAY_WORD_PATTERN)).map((match) => normalizeDay(match[0]))).size;
  const courseCodes = countMatches(upper, COURSE_CODE_PATTERN);
  const fieldLabels = countMatches(input, /\b(?:Room|Teacher|Professor|Prof|Section|Time Slot|Schedule Week|Bldg|Building|Location|Venue)\b/gi);
  const hasCompactDays = COMPACT_DAY_PATTERN.test(upper);
  const hasTableShape = input.includes("\t") || /\bTime Slot\b/i.test(input) || /\bSchedule Week\b/i.test(input);

  return {
    timeRanges,
    daySignals: dayWords + (hasCompactDays ? 1 : 0),
    courseCodes,
    fieldLabels,
    hasTableShape
  };
}

function isScheduleLike(input: string) {
  const signals = getImportSignals(input);
  const hasScheduleContext =
    signals.daySignals > 0 ||
    signals.courseCodes > 0 ||
    signals.fieldLabels > 0 ||
    signals.hasTableShape;

  return signals.hasTableShape || (signals.timeRanges > 0 && hasScheduleContext);
}

function looksLowConfidence(input: string, parsedCount: number) {
  if (!parsedCount) {
    return true;
  }

  const signals = getImportSignals(input);
  if (signals.timeRanges < 3) {
    return false;
  }

  return parsedCount <= Math.max(1, Math.floor(signals.timeRanges * 0.35));
}

export function sanitizeScheduleEntries(value: unknown, maxEntries = MAX_IMPORT_ENTRIES): ScheduleEntry[] {
  const rawEntries = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const entries: ScheduleEntry[] = [];

  rawEntries.slice(0, maxEntries).forEach((rawEntry, index) => {
    const record = asRecord(rawEntry);
    if (!record) {
      return;
    }

    const day = normalizeDay(String(record.day ?? ""));
    const timeSlot = normalizeTimeSlot(record.timeSlot);
    const course = normalizeSpaces(String(record.course ?? ""));

    if (!day || !timeSlot || !course) {
      return;
    }

    const entry: ScheduleEntry = {
      id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : makeId(index),
      timeSlot,
      day,
      course,
      room: cleanOptionalText(record.room),
      teacher: cleanOptionalText(record.teacher),
      section: cleanOptionalText(record.section),
      color:
        typeof record.color === "string" && /^#[0-9A-F]{6}$/i.test(record.color)
          ? record.color
          : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    };

    const key = [
      entry.day,
      entry.timeSlot.toUpperCase(),
      entry.course.toUpperCase(),
      entry.room.toUpperCase(),
      entry.teacher.toUpperCase(),
      entry.section.toUpperCase()
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      entries.push(entry);
    }
  });

  return entries.sort((a, b) => DAY_ORDER.indexOf(a.day as DayKey) - DAY_ORDER.indexOf(b.day as DayKey));
}

export function parseScheduleImport(input: string): ScheduleImportAssessment {
  const text = input.trim();
  if (!text) {
    return {
      entries: [],
      scheduleLike: false,
      shouldUseAi: false,
      message: "Paste your schedule first."
    };
  }

  const entries = sanitizeScheduleEntries(parseScheduleText(text));
  const scheduleLike = isScheduleLike(text);
  const shouldUseAi = scheduleLike && looksLowConfidence(text, entries.length);

  return {
    entries,
    scheduleLike,
    shouldUseAi,
    message: !entries.length && !scheduleLike ? "No schedule details found in the pasted text." : undefined
  };
}
