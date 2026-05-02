const fs = require('fs');

let page = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Remove helper functions
const helpersStart = page.indexOf('function classNames');
const helpersEnd = page.indexOf('function openCreationsDb');
if (helpersStart > -1 && helpersEnd > -1) {
  page = page.substring(0, helpersStart) + page.substring(helpersEnd);
}

// Add utils import at the top
page = page.replace('import html2canvas', 'import { classNames, getTextColor, computeRowCells, formatTimeSlot, courseParts, getStartMinutes, toneFromRgb, toneFromHex, toneFromColors, getPaletteTextColor, buildGradientBackground, buildEmojiPatternBackground, buildGeometricBackground, normalizeHexColor, hexToRgb, estimateImageTone, courseKeyFromCode, courseKeyFromCourse, getExpandedCourseSet, formatMeetingDays, getSlotDurationMinutes, groupEntriesByCourse, rangeProgress, formatPixels } from "@/lib/utils";\nimport html2canvas');

fs.writeFileSync('app/page.tsx', page);
console.log('Helpers removed');
