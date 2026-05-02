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

const merge = (base, target) => {
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

const expanded = {
  backgroundKind: "gradient",
  gradient: { preset: "Ocean" }
};

console.log(merge(DEFAULT_STATE, expanded));
