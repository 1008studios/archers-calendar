const DEFAULT_STATE = {
  backgroundKind: "solid",
  background: "#0B100D",
  backgroundImage: "",
  backgroundTone: "dark",
  gradient: { type: "linear", colors: ["#185A37", "#07120C"], angle: 135, position: "center" },
  pattern: { emoji: "✨", preset: "diagonal", size: 24, spacing: 64, opacity: 0.10 },
  geometric: { kind: "dots", color: "#FFFFFF", size: 200, spacing: 100, opacity: 0.05 },
  wallpaperStyle: "clean",
  appTheme: "dark",
  calendarThemeMode: "normal",
  gridPosition: "center",
  calendarFont: "font-sans",
  calendarSize: 3,
};

const KEY_SHORT = {
  backgroundKind: "bk", background: "bg", backgroundImage: "bi", backgroundTone: "bt",
  wallpaperStyle: "ws", appTheme: "at", calendarThemeMode: "ct", gridPosition: "gp",
  calendarFont: "cf", calendarSize: "cs", device: "dv", exportVariant: "ev",
  gradient: "gr", pattern: "pa", geometric: "ge", version: "v",
  type: "t", colors: "c", angle: "a", position: "p", preset: "pr",
  emoji: "em", size: "sz", spacing: "sp", opacity: "op", kind: "k", color: "co"
};

function getDiff(base, current) {
  const diff = {};
  for (const key in current) {
    if (key === 'device' || key === 'exportVariant' || key === 'version' || key === 'backgroundImage') continue;
    if (typeof current[key] === 'object' && typeof base[key] === 'object' && current[key] && base[key]) {
      // If array (like colors)
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

function shortenKeys(obj) {
  if (Array.isArray(obj)) return obj.map(shortenKeys);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[KEY_SHORT[k] ?? k] = shortenKeys(v);
    return out;
  }
  return obj;
}

const current = {
  ...DEFAULT_STATE,
  backgroundKind: "gradient",
  gradient: { ...DEFAULT_STATE.gradient, preset: "Ocean" },
  wallpaperStyle: "glass"
};

const diff = getDiff(DEFAULT_STATE, current);
const short = shortenKeys(diff);
const str = JSON.stringify(short);
const b64 = Buffer.from(str).toString('base64');
console.log("String:", str);
console.log("Length:", str.length);
console.log("Base64 Length:", b64.length);
console.log("Base64:", b64);
