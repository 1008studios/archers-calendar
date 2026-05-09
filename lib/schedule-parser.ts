export type ScheduleEntry = {
  id: string;
  timeSlot: string;
  day: string;
  course: string;
  room: string;
  teacher: string;
  section: string;
  color: string;
};

export const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_ORDER)[number];

const DAY_ALIASES: Record<string, DayKey> = {
  M: "Mon",
  MON: "Mon",
  MONDAY: "Mon",
  T: "Tue",
  TU: "Tue",
  TUE: "Tue",
  TUES: "Tue",
  TUESDAY: "Tue",
  W: "Wed",
  WED: "Wed",
  WEDNESDAY: "Wed",
  H: "Thu",
  TH: "Thu",
  THU: "Thu",
  THUR: "Thu",
  THURS: "Thu",
  THURSDAY: "Thu",
  F: "Fri",
  FRI: "Fri",
  FRIDAY: "Fri",
  S: "Sat",
  SA: "Sat",
  SAT: "Sat",
  SATURDAY: "Sat",
  SUN: "Sun",
  SUNDAY: "Sun"
};

const PASTEL_CYCLE = [
  "#FFE8A3",
  "#BFD8A6",
  "#F8F8F2",
  "#C9B6FF",
  "#FFC4CF",
  "#FF8FA3",
  "#FFE66D",
  "#E8C7A2",
  "#FFD6E7",
  "#C8B6E2",
  "#A7E8BD"
];

const TIME_RANGE_PATTERN =
  /((?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:AM|PM|am|pm)\s*(?:-|to|\u2013|\u2014)\s*(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:AM|PM|am|pm))/;

const LOOSE_TIME_RANGE_PATTERN =
  /((?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:AM|PM|am|pm)?\s*(?:-|to|\u2013|\u2014)\s*(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:AM|PM|am|pm)?)/;

const COURSE_START_PATTERN = /^[-•*]?\s*([A-Z0-9-]{2,})\s+-\s+(.+)/;
const COURSE_ROW_PATTERN =
  /^#?\s*([A-Z0-9-]{2,})\s+(.+?)\s+(Lecture and Laboratory|Practicum \/ Internship|Research \/ Capstone|Examination \/ Defense|Administrative \/ Residency|Seminar \/ Workshop|Lecture|Laboratory)\s+(?:[-A-Za-z &.]+?\s+)?(\d+)$/i;
const CELL_LABELS = "Offline Venue|Online Venue|Room No|Room|Teacher|Professor|Prof|Co-Teacher|Section|Batch|Venue";
const LOOSE_CELL_LABELS = "Offline Venue|Online Venue|Room No|Room|Teacher|Professor|Prof|Co-Teacher|Section|Batch|Venue";
const DAY_WORD_PATTERN = /\b(MON(?:DAY)?|TUE(?:S|SDAY)?|WED(?:NESDAY)?|THU(?:R|RS|RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?)\b/gi;
const COMPACT_DAY_PATTERN = /\b(?:MTH|TTH|MWF|MTWTHF|MTWTF|MW|MF|TF|WF|TH|M\/W|M\/TH|T\/TH|T\/F|W\/F|M-TH|T-TH)\b/i;

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `entry-${Math.random().toString(36).slice(2)}`;
}

function normalizeSpaces(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \f\v]+/g, " ").trim();
}

function normalizeScheduleCellText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/([^\n])\s+([-•*]\s*(?=[A-Z0-9-]{2,}\s+-\s+))/g, "$1\n$2")
    .split("\n")
    .map(normalizeSpaces)
    .filter(Boolean)
    .join("\n");
}

function normalizeTimeSlot(value: string) {
  return normalizeSpaces(value.replace(/[\u2013\u2014]/g, "-").replace(/\s*-\s*/g, " - "));
}

export function normalizeDay(value: string): DayKey | "" {
  const key = value.trim().replace(/\./g, "").toUpperCase();
  return DAY_ALIASES[key] ?? "";
}

function getDayFromText(value: string): DayKey | "" {
  const match = value.match(/\b(MON(?:DAY)?|TUE(?:S|SDAY)?|WED(?:NESDAY)?|THU(?:R|RS|RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?|M|T|W|H|F|S)\b/i);
  return match ? normalizeDay(match[1]) : "";
}

function uniqueDays(days: DayKey[]) {
  return days.filter((day, index) => days.indexOf(day) === index);
}

function expandCompactDayToken(value: string): DayKey[] {
  const token = value.replace(/[^A-Za-z]/g, "").toUpperCase();
  const days: DayKey[] = [];
  let index = 0;

  while (index < token.length) {
    if (token.startsWith("SUN", index)) {
      days.push("Sun");
      index += 3;
      continue;
    }

    if (token.startsWith("SAT", index)) {
      days.push("Sat");
      index += 3;
      continue;
    }

    if (token.startsWith("TH", index)) {
      days.push("Thu");
      index += 2;
      continue;
    }

    const day = normalizeDay(token[index]);
    if (day) {
      days.push(day);
    }
    index += 1;
  }

  return uniqueDays(days);
}

function getDaysFromText(value: string) {
  const explicitMatches = Array.from(value.matchAll(DAY_WORD_PATTERN));
  const explicitDays = explicitMatches
    .map((match) => normalizeDay(match[1]))
    .filter((day): day is DayKey => Boolean(day));

  if (explicitDays.length) {
    return {
      days: uniqueDays(explicitDays),
      matchText: explicitMatches.map((match) => match[0]).join(" ")
    };
  }

  const compactMatch = value.match(COMPACT_DAY_PATTERN);
  if (!compactMatch) {
    return { days: [] as DayKey[], matchText: "" };
  }

  return {
    days: expandCompactDayToken(compactMatch[0]),
    matchText: compactMatch[0]
  };
}

function getLabelValue(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `${escaped}[ \\t]*:[ \\t]*([\\s\\S]*?)(?=(?:\\r?\\n|[ \\t]+(?:${CELL_LABELS})[ \\t]*:|(?:${CELL_LABELS})[ \\t]*:|\\||$))`,
    "i"
  );
  return normalizeSpaces(text.match(regex)?.[1] ?? "").replace(/^-\s*$/, "");
}

function getLooseLabelValue(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = label.toLowerCase() === "room" ? `${escaped}(?!\\s+No\\b)` : escaped;
  const regex = new RegExp(
    `\\b${labelPattern}\\b[ \\t]*:?[ \\t]*([\\s\\S]*?)(?=(?:\\r?\\n|[ \\t]+\\b(?:${LOOSE_CELL_LABELS})\\b[ \\t]*:?|\\b(?:${LOOSE_CELL_LABELS})\\b[ \\t]*:?|\\||$))`,
    "i"
  );
  return normalizeSpaces(text.match(regex)?.[1] ?? "").replace(/^-\s*$/, "");
}

function cleanCourse(value: string) {
  let withoutBullet = normalizeSpaces(value).replace(/^[-•*]\s*/, "");
  const labelIndex = withoutBullet.search(new RegExp(`\\b(?:${CELL_LABELS})\\s*:`, "i"));
  if (labelIndex >= 0) {
    withoutBullet = withoutBullet.slice(0, labelIndex);
  }
  
  withoutBullet = withoutBullet.replace(/(?:\s*[\/,+&]\s*)+$/, "").trim();
  
  // Try to strictly match the Title part, discarding extra appended noise if it looks like a standard code-title format
  const match = withoutBullet.match(/^([A-Z0-9-]{2,}\s+-\s+[A-Za-z0-9 &.,:()/-]+?)(?=\s+(?:Teacher|Room|Section|Prof|Venue|Bldg|Bldg\.|Rm|Rm\.)|\s{2,}|\t|$)/i);
  if (match) {
    withoutBullet = normalizeSpaces(match[1]).trim();
  } else {
    withoutBullet = normalizeSpaces(withoutBullet).trim();
  }

  return withoutBullet.replace(/\s*\b(?:OFFLINE|ONLINE)\b\s*$/i, "").trim();
}

function getRoomValue(text: string) {
  return (
    getLabelValue(text, "Offline Venue") ||
    getLabelValue(text, "Online Venue") ||
    getLabelValue(text, "Venue") ||
    getLabelValue(text, "Room No") ||
    getLabelValue(text, "Room") ||
    getLooseLabelValue(text, "Offline Venue") ||
    getLooseLabelValue(text, "Online Venue") ||
    getLooseLabelValue(text, "Venue") ||
    getLooseLabelValue(text, "Room No") ||
    getLooseLabelValue(text, "Room")
  );
}

function buildEntry(entry: Omit<ScheduleEntry, "id" | "color">, colorIndex: number): ScheduleEntry {
  return {
    ...entry,
    id: makeId(),
    color: PASTEL_CYCLE[colorIndex % PASTEL_CYCLE.length]
  };
}

function splitCellIntoClassBlocks(cellText: string) {
  const lines = normalizeScheduleCellText(cellText)
    .split(/\r?\n/)
    .map(normalizeSpaces)
    .filter(Boolean)
    .filter((line) => !/^Batch\s*:/i.test(line) && !/^Co-Teacher\s*:/i.test(line));

  if (!lines.length || lines.some((line) => /^Please Select$/i.test(line))) {
    return [];
  }

  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (COURSE_START_PATTERN.test(line) && current.length) {
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function parseScheduleCell(cellText: string, day: DayKey, timeSlot: string, colorSeed: number) {
  return splitCellIntoClassBlocks(cellText)
    .map((block, index) => {
      const courseLine = block.split(/\r?\n/).find((line) => COURSE_START_PATTERN.test(line)) ?? block;
      const course = cleanCourse(courseLine);

      if (!course || /^[-\s]+$/.test(course)) {
        return null;
      }

      return buildEntry(
        {
          timeSlot,
          day,
          course,
          room: getRoomValue(block),
          teacher: getLabelValue(block, "Teacher"),
          section: getLabelValue(block, "Section")
        },
        colorSeed + index
      );
    })
    .filter((entry): entry is ScheduleEntry => Boolean(entry));
}

function isScheduleTableEnd(line: string) {
  return /^(MasterSoft|Privacy Policy|Core Courses|Elective Courses|Restudy\/Retake Courses)$/i.test(line.trim());
}

function getEmptyVerticalCells(blankLineCount: number) {
  return Math.max(0, Math.round(blankLineCount / 2));
}

function collectVerticalClassBlocks(rowLines: string[]) {
  const blocks: Array<{ leadingBlankLines: number; lines: string[] }> = [];
  let blankLines = 0;
  let index = 0;

  while (index < rowLines.length) {
    const line = normalizeSpaces(rowLines[index]);

    if (!line) {
      blankLines += 1;
      index += 1;
      continue;
    }

    if (!COURSE_START_PATTERN.test(line)) {
      index += 1;
      continue;
    }

    const blockLines = [line];
    index += 1;

    while (index < rowLines.length) {
      const nextLine = normalizeSpaces(rowLines[index]);

      if (!nextLine || COURSE_START_PATTERN.test(nextLine) || TIME_RANGE_PATTERN.test(nextLine)) {
        break;
      }

      blockLines.push(nextLine);
      index += 1;
    }

    blocks.push({ leadingBlankLines: blankLines, lines: blockLines });
    blankLines = 0;
  }

  return blocks;
}

function parseVerticalScheduleTableRow(rowLines: string[], days: DayKey[], colorSeed: number) {
  const timeMatch = rowLines[0]?.match(TIME_RANGE_PATTERN);
  if (!timeMatch) {
    return [];
  }

  const timeSlot = normalizeTimeSlot(timeMatch[1]);
  const blocks = collectVerticalClassBlocks(rowLines.slice(1));
  const entries: ScheduleEntry[] = [];
  let dayIndex = -1;

  blocks.forEach((block, blockIndex) => {
    const emptyCells = getEmptyVerticalCells(block.leadingBlankLines);
    dayIndex = blockIndex === 0 ? emptyCells : dayIndex + 1 + emptyCells;

    if (dayIndex < 0 || dayIndex >= days.length) {
      return;
    }

    entries.push(
      ...parseScheduleCell(block.lines.join("\n"), days[dayIndex], timeSlot, colorSeed + entries.length)
    );
  });

  return entries;
}

function parseVerticalScheduleWeekTable(input: string): ScheduleEntry[] {
  const lines = input.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^Time Slot$/i.test(normalizeSpaces(line)));

  if (headerIndex < 0) {
    return [];
  }

  const days: DayKey[] = [];
  let firstRowIndex = -1;

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = normalizeSpaces(lines[index]);

    if (!line) {
      continue;
    }

    if (TIME_RANGE_PATTERN.test(line)) {
      firstRowIndex = index;
      break;
    }

    const day = getDayFromText(line);
    if (!day) {
      return [];
    }

    days.push(day);
  }

  if (days.length < 2 || firstRowIndex < 0) {
    return [];
  }

  const entries: ScheduleEntry[] = [];
  let rowLines: string[] = [];

  function flushRow() {
    if (!rowLines.length) {
      return;
    }

    entries.push(...parseVerticalScheduleTableRow(rowLines, days, entries.length));
    rowLines = [];
  }

  for (let index = firstRowIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = normalizeSpaces(line);

    if (isScheduleTableEnd(trimmed)) {
      flushRow();
      break;
    }

    if (TIME_RANGE_PATTERN.test(trimmed)) {
      flushRow();
      rowLines = [line];
      continue;
    }

    if (rowLines.length) {
      rowLines.push(line);
    }
  }

  flushRow();
  return entries;
}

function parseScheduleWeekTable(input: string): ScheduleEntry[] {
  const lines = input.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => /^Schedule Week$/i.test(line.trim()));
  const headerIndex = lines.findIndex(
    (line, index) => (startIndex < 0 || index > startIndex) && /\bTime Slot\b/i.test(line)
  );

  if (headerIndex < 0) {
    return [];
  }

  const headerCells = lines[headerIndex].includes("\t")
    ? lines[headerIndex].split("\t")
    : lines[headerIndex].split(/\s{2,}/);
  const days = headerCells
    .slice(1)
    .map(getDayFromText)
    .filter((day): day is DayKey => Boolean(day));

  if (!days.length) {
    return [];
  }

  const entries: ScheduleEntry[] = [];
  let rowLines: string[] = [];

  function flushRow() {
    if (!rowLines.length) {
      return;
    }

    entries.push(...parseScheduleTableRow(rowLines, days, entries.length));
    rowLines = [];
  }

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (isScheduleTableEnd(trimmed)) {
      flushRow();
      break;
    }

    if (TIME_RANGE_PATTERN.test(trimmed)) {
      flushRow();
      rowLines = [line];
      continue;
    }

    if (rowLines.length) {
      rowLines.push(line);
    }
  }

  flushRow();
  return entries;
}

function appendCell(cellLines: string[], value: string) {
  const clean = normalizeSpaces(value);
  if (clean) {
    cellLines.push(clean);
  }
}

function parseScheduleTableRow(rowLines: string[], days: DayKey[], colorSeed: number) {
  const firstLine = rowLines[0] ?? "";
  const timeMatch = firstLine.match(TIME_RANGE_PATTERN);

  if (!timeMatch) {
    return [];
  }

  const timeSlot = normalizeTimeSlot(timeMatch[1]);
  const dayCells = Array.from({ length: days.length }, () => [] as string[]);

  if (rowLines.some((line) => line.includes("\t"))) {
    let looseDayIndex = -1;

    rowLines.forEach((line, lineIndex) => {
      if (!line.includes("\t")) {
        const clean = normalizeSpaces(line);
        if (!clean) {
          return;
        }

        if (COURSE_START_PATTERN.test(clean)) {
          looseDayIndex = Math.min(days.length - 1, looseDayIndex + 1);
        } else if (looseDayIndex < 0) {
          looseDayIndex = 0;
        }

        appendCell(dayCells[looseDayIndex], clean);
        return;
      }

      const parts = line.split("\t");

      if (lineIndex === 0) {
        parts[0] = parts[0].replace(TIME_RANGE_PATTERN, "");
      }

      const alignedParts =
        parts.length === days.length + 1 || (parts.length > 1 && !parts[0].trim()) ? parts.slice(1) : parts;

      alignedParts.slice(0, days.length).forEach((part, dayIndex) => {
        appendCell(dayCells[dayIndex], part);
        if (normalizeSpaces(part)) {
          looseDayIndex = dayIndex;
        }
      });
    });
  } else {
    const rowText = rowLines.join("\n");
    const dayFromOffering = getDayFromText(rowText);
    const dayIndex = days.findIndex((day) => day === dayFromOffering);

    if (dayIndex >= 0) {
      appendCell(dayCells[dayIndex], rowText.replace(TIME_RANGE_PATTERN, ""));
    }
  }

  return dayCells.flatMap((cellLines, dayIndex) =>
    parseScheduleCell(cellLines.join("\n"), days[dayIndex], timeSlot, colorSeed + dayIndex)
  );
}

function parseOfferingSchedules(input: string): ScheduleEntry[] {
  const scheduleArea = input.split(/\bSchedule Week\b/i)[0] ?? input;
  const lines = scheduleArea
    .split(/\r?\n/)
    .map(normalizeSpaces)
    .filter(Boolean);
  const entries: ScheduleEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const courseMatch = lines[index].match(COURSE_ROW_PATTERN);

    if (!courseMatch) {
      continue;
    }

    const [, code, name] = courseMatch;
    const sectionLine = lines[index + 1] ?? "";
    const schedulesLine = lines[index + 2] ?? "";
    const section = normalizeSpaces(sectionLine.match(/^([A-Z]\d{2,}[A-Z]?)\b/)?.[1] ?? "");

    if (!section || /^Please Select$/i.test(sectionLine) || !schedulesLine.includes("[")) {
      continue;
    }

    const scheduleMatches = Array.from(schedulesLine.matchAll(/\[\s*([A-Z/ -]+?)\s*-\s*([^\]-]+(?:AM|PM))\s*-\s*([^\]-]+(?:AM|PM))\s*-\s*\]/gi));

    scheduleMatches.forEach((match, matchIndex) => {
      const days = expandCompactDayToken(match[1]);
      if (!days.length) {
        return;
      }

      days.forEach((day) => entries.push(
        buildEntry(
          {
            timeSlot: normalizeTimeSlot(`${match[2]} - ${match[3]}`),
            day,
            course: `${code} - ${name}`,
            room: "",
            teacher: "",
            section
          },
          entries.length + matchIndex
        )
      ));
    });
  }

  return entries;
}

function takeMatch(line: string, pattern: RegExp) {
  const match = line.match(pattern);
  if (!match) {
    return { value: "", line };
  }

  const value = (match.slice(1).find(Boolean) ?? match[0]).trim();
  return {
    value,
    line: line.replace(match[0], " ").replace(/\s+/g, " ").trim()
  };
}

function parseLooseLine(line: string, index: number): ScheduleEntry[] {
  let working = normalizeSpaces(line.replace(/\t/g, " "));

  if (!working || /^[-=_]+$/.test(working) || /^Please Select$/i.test(working)) {
    return [];
  }

  const time = takeMatch(working, LOOSE_TIME_RANGE_PATTERN);
  working = time.line;

  const dayMatch = getDaysFromText(working);
  if (dayMatch.matchText) {
    for (const token of dayMatch.matchText.split(/\s+/)) {
      working = working.replace(new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), " ");
    }
    working = normalizeSpaces(working);
  }

  const teacher =
    getLabelValue(working, "Teacher") ||
    getLabelValue(working, "Prof") ||
    getLooseLabelValue(working, "Teacher") ||
    getLooseLabelValue(working, "Professor") ||
    getLooseLabelValue(working, "Prof");
  const room =
    getRoomValue(working) ||
    normalizeSpaces(working.match(/\b(ONLINE|ZOOM|TBA|TBD|[A-Z]{1,4}\d{2,5}[A-Z]?)\b/i)?.[1] ?? "");
  const section =
    getLabelValue(working, "Section") ||
    getLooseLabelValue(working, "Section") ||
    normalizeSpaces(working.match(/\b(?:SEC|SECTION)\s*:?\s*([A-Z]\d{2,}[A-Z]?)\b/i)?.[1] ?? "");
  const looseLabelIndex = working.search(new RegExp(`\\b(?:${LOOSE_CELL_LABELS})\\b\\s*:?`, "i"));
  const courseSource = looseLabelIndex >= 0 ? working.slice(0, looseLabelIndex) : working;
  const course = cleanCourse(
    courseSource
      .replace(/\b(?:MON(?:DAY)?|TUE(?:S|SDAY)?|WED(?:NESDAY)?|THU(?:R|RS|RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?)\b/gi, "")
      .replace(room, "")
      .replace(section, "")
      .replace(teacher, "")
  );

  if (!time.value || !dayMatch.days.length || !course) {
    return [];
  }

  return dayMatch.days.map((day, dayIndex) =>
    buildEntry(
      {
        timeSlot: normalizeTimeSlot(time.value),
        day,
        course,
        room,
        teacher,
        section
      },
      index + dayIndex
    )
  );
}

function dedupeEntries(entries: ScheduleEntry[]) {
  const seen = new Set<string>();

  return entries.filter((entry, index) => {
    const key = [
      entry.day,
      entry.timeSlot.toUpperCase(),
      entry.course.toUpperCase(),
      entry.room.toUpperCase(),
      entry.teacher.toUpperCase(),
      entry.section.toUpperCase()
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    entry.color = PASTEL_CYCLE[index % PASTEL_CYCLE.length];
    return true;
  });
}

function getTableCellText(cell: Element) {
  const clone = cell.cloneNode(true) as Element;

  clone.querySelectorAll("br").forEach((breakNode) => {
    breakNode.replaceWith("\n");
  });
  clone.querySelectorAll("div,p,li").forEach((blockNode) => {
    blockNode.append(clone.ownerDocument.createTextNode("\n"));
  });

  return normalizeScheduleCellText(clone.textContent ?? "");
}

export function parseScheduleHtml(input: string): ScheduleEntry[] {
  if (typeof DOMParser === "undefined" || !input.trim()) {
    return [];
  }

  const document = new DOMParser().parseFromString(input, "text/html");
  const tables = Array.from(document.querySelectorAll("table"));
  const entries: ScheduleEntry[] = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("th,td")).map(getTableCellText)
    );
    const headerIndex = rows.findIndex((row) => row.some((cell) => /\bTime Slot\b/i.test(cell)));

    if (headerIndex < 0) {
      continue;
    }

    const header = rows[headerIndex];
    const days = header
      .slice(1)
      .map(getDayFromText)
      .filter((day): day is DayKey => Boolean(day));

    if (!days.length) {
      continue;
    }

    for (const row of rows.slice(headerIndex + 1)) {
      const timeSlot = normalizeTimeSlot(row[0] ?? "");
      if (!TIME_RANGE_PATTERN.test(timeSlot)) {
        continue;
      }

      row.slice(1, days.length + 1).forEach((cell, index) => {
        entries.push(...parseScheduleCell(cell, days[index], timeSlot, entries.length + index));
      });
    }
  }

  return dedupeEntries(entries);
}

export function scheduleTableHtmlToText(input: string): string {
  if (typeof DOMParser === "undefined" || !input.trim()) {
    return "";
  }

  const document = new DOMParser().parseFromString(input, "text/html");
  const tables = Array.from(document.querySelectorAll("table"));

  return tables
    .map((table) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      return rows
        .map((row) =>
          Array.from(row.querySelectorAll("th,td"))
            .map(getTableCellText)
            .join("\t")
        )
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function parseEAFText(input: string): ScheduleEntry[] {
  const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  if (!lines.some(l => /Sr\.No\s+Course\s+Course Type/i.test(l))) {
    return [];
  }

  const entries: ScheduleEntry[] = [];
  
  let currentCourseCode = '';
  let currentCourseName = '';
  let collectingCourseName = false;
  
  const startPattern = /^(\d+)\s+([A-Z0-9-]{4,})-(.*)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (/^Sr\.No/i.test(line)) continue;

    const startMatch = line.match(startPattern);
    if (startMatch) {
      currentCourseCode = startMatch[2];
      currentCourseName = startMatch[3].trim();
      collectingCourseName = true;
      continue;
    }
    
    const detailsMatch = line.match(/^(Lecture|Laboratory|Practicum[^\s]*|Research[^\s]*|Examination[^\s]*|Seminar[^\s]*)\s+([A-Z0-9]+)\s+(\d+\.\d{2})\s+(.*)$/i);
    
    if (detailsMatch) {
      collectingCourseName = false;
      const section = detailsMatch[2];
      let scheduleText = detailsMatch[4];
      
      let nextIdx = i + 1;
      while (nextIdx < lines.length) {
        const nextLine = lines[nextIdx];
        if (nextLine.match(startPattern) || nextLine.match(/^(Lecture|Laboratory|Practicum|Research|Examination|Seminar)\s+[A-Z0-9]+\s+\d+\.\d{2}/i)) {
          break;
        }
        scheduleText += " " + nextLine;
        nextIdx++;
      }
      i = nextIdx - 1;

      const blocks = scheduleText.split(',').map(s => s.trim()).filter(Boolean);
      for (const block of blocks) {
        const parts = block.split('|').map(s => s.trim());
        if (parts.length >= 2) {
          const day = normalizeDay(parts[0]);
          let timeSlot = parts[1].replace(/-/g, ' - ');
          let room = parts.length >= 3 ? parts[2] : '';
          
          timeSlot = timeSlot.replace(/\s+/g, ' ').trim();
          
          if (day && timeSlot) {
            entries.push(
              buildEntry(
                {
                  course: `${currentCourseCode} - ${currentCourseName}`,
                  section: section,
                  day: day,
                  timeSlot: timeSlot,
                  room: room,
                  teacher: ''
                },
                entries.length
              )
            );
          }
        }
      }
    } else if (collectingCourseName) {
      currentCourseName += " " + line;
    }
  }

  return entries;
}

export function parseScheduleText(input: string): ScheduleEntry[] {
  const eafEntries = parseEAFText(input);
  if (eafEntries.length) {
    return dedupeEntries(eafEntries);
  }

  const verticalTableEntries = parseVerticalScheduleWeekTable(input);
  if (verticalTableEntries.length) {
    return dedupeEntries(verticalTableEntries);
  }

  const tableEntries = parseScheduleWeekTable(input);
  if (tableEntries.length) {
    return dedupeEntries(tableEntries);
  }

  const offeringEntries = parseOfferingSchedules(input);
  if (offeringEntries.length) {
    return dedupeEntries(offeringEntries);
  }

  return dedupeEntries(
    input
      .split(/\r?\n/)
      .flatMap((line, index) => parseLooseLine(line, index))
  );
}
