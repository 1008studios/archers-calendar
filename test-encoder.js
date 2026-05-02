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
  backgroundKind: "bk", background: "bg", backgroundTone: "bt",
  wallpaperStyle: "ws", appTheme: "at", calendarThemeMode: "ct", gridPosition: "gp",
  calendarFont: "cf", calendarSize: "cs",
  gradient: "gr", pattern: "pa", geometric: "ge",
  type: "t", colors: "c", angle: "a", position: "p", preset: "pr",
  emoji: "em", size: "sz", spacing: "sp", opacity: "op", kind: "k", color: "co"
};
const KEY_LONG = Object.fromEntries(Object.entries(KEY_SHORT).map(([k, v]) => [v, k]));

function getDiff(base, current) {
  const diff = {};
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

function shortenKeys(obj) {
  if (Array.isArray(obj)) return obj.map(shortenKeys);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[KEY_SHORT[k] ?? k] = shortenKeys(v);
    return out;
  }
  return obj;
}

function flatten(obj, prefix = '') {
  let res = {};
  for(const k in obj) {
    if(typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      Object.assign(res, flatten(obj[k], prefix + k + '.'));
    } else {
      res[prefix + k] = obj[k];
    }
  }
  return res;
}

function encodeV3(state) {
  const diff = getDiff(DEFAULT_STATE, state);
  const short = shortenKeys(diff);
  const flat = flatten(short);
  
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
  return parts.length ? `ac3.${parts.join('_')}` : `ac3.default`;
}

function expandKeys(obj) {
  if (Array.isArray(obj)) return obj.map(expandKeys);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[KEY_LONG[k] ?? k] = expandKeys(v);
    return out;
  }
  return obj;
}

function unflatten(flat) {
  const res = {};
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

function decodeV3(code) {
  if (code === 'ac3.default') return DEFAULT_STATE;
  const str = code.replace('ac3.', '');
  const parts = str.split('_');
  const flat = {};
  for (const p of parts) {
    const [k, v] = p.split('~');
    // try to parse
    let val = v;
    if (v.includes('-')) {
      val = v.split('-').map(x => /^[0-9A-Fa-f]{6}$/.test(x) ? '#' + x : x);
    } else if (/^[0-9A-Fa-f]{6}$/.test(v)) {
      val = '#' + v;
    } else if (!isNaN(Number(v))) {
      val = Number(v);
    }
    flat[k] = val;
  }
  const unflat = unflatten(flat);
  const expanded = expandKeys(unflat);
  
  // merge with default
  const merge = (base, target) => {
    const res = { ...base };
    for (const key in target) {
      if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
        res[key] = merge(base[key], target[key]);
      } else {
        res[key] = target[key];
      }
    }
    return res;
  }
  return merge(DEFAULT_STATE, expanded);
}

const current = {
  ...DEFAULT_STATE,
  backgroundKind: "gradient",
  gradient: { ...DEFAULT_STATE.gradient, preset: "Ocean", colors: ["#FFFFFF", "#000000"] },
  wallpaperStyle: "glass",
  calendarSize: 5
};

const code = encodeV3(current);
console.log("Encoded:", code);
const decoded = decodeV3(code);
console.log("Decoded matches?", JSON.stringify(current) === JSON.stringify(decoded));
console.log(decoded);
