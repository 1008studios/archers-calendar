export const CALENDAR_FONT_OPTIONS = [
  { value: "geist", label: "Geist", bodyClass: "font-sans", headingClass: "font-sans" },
  { value: "poppins", label: "Poppins", bodyClass: "font-poppins", headingClass: "font-poppins" },
  { value: "dmSans", label: "DM Sans", bodyClass: "font-dm-sans", headingClass: "font-dm-sans" },
  { value: "sora", label: "Sora", bodyClass: "font-sora", headingClass: "font-sora" },
  { value: "urbanist", label: "Urbanist", bodyClass: "font-urbanist", headingClass: "font-urbanist" },
  { value: "quicksand", label: "Quicksand", bodyClass: "font-quicksand", headingClass: "font-quicksand" },
  { value: "raleway", label: "Raleway", bodyClass: "font-raleway", headingClass: "font-raleway" },
  { value: "josefinSans", label: "Josefin Sans", bodyClass: "font-josefin-sans", headingClass: "font-josefin-sans" },
  { value: "workSans", label: "Work Sans", bodyClass: "font-work-sans", headingClass: "font-work-sans" },
  { value: "playfairDisplay", label: "Playfair Display", bodyClass: "font-playfair-display", headingClass: "font-playfair-display" },
  { value: "cormorantGaramond", label: "Cormorant Garamond", bodyClass: "font-cormorant-garamond", headingClass: "font-cormorant-garamond" },
  { value: "comicSans", label: "Comic Sans", bodyClass: "font-comic-sans", headingClass: "font-comic-sans" },
  { value: "archivoBlack", label: "Archivo Black", bodyClass: "font-archivo-black", headingClass: "font-archivo-black" },
  { value: "manrope", label: "Manrope", bodyClass: "font-manrope", headingClass: "font-manrope" },
  { value: "montserrat", label: "Montserrat", bodyClass: "font-montserrat", headingClass: "font-montserrat" },
  { value: "nunito", label: "Nunito", bodyClass: "font-nunito", headingClass: "font-nunito" },
  { value: "rubik", label: "Rubik", bodyClass: "font-rubik", headingClass: "font-rubik" },
  { value: "outfit", label: "Outfit", bodyClass: "font-outfit", headingClass: "font-outfit" },
  { value: "lexend", label: "Lexend", bodyClass: "font-lexend", headingClass: "font-lexend" },
  { value: "spaceGrotesk", label: "Space Grotesk", bodyClass: "font-space-grotesk", headingClass: "font-space-grotesk" },
  { value: "robotoMono", label: "Roboto Mono", bodyClass: "font-roboto-mono", headingClass: "font-roboto-mono" },
  { value: "merriweather", label: "Merriweather", bodyClass: "font-merriweather", headingClass: "font-merriweather" },
  { value: "system", label: "System", bodyClass: "font-[ui-sans-serif,system-ui,sans-serif]", headingClass: "font-[ui-sans-serif,system-ui,sans-serif]" }
] as const;

export type CalendarFont = (typeof CALENDAR_FONT_OPTIONS)[number]["value"];

export const CALENDAR_FONT_VALUES = new Set<CalendarFont>(
  CALENDAR_FONT_OPTIONS.map((option) => option.value)
);

export function getCalendarFontOption(font: CalendarFont) {
  return CALENDAR_FONT_OPTIONS.find((option) => option.value === font) ?? CALENDAR_FONT_OPTIONS[0];
}
