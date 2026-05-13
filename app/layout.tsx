import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  Archivo_Black,
  Bebas_Neue,
  Cormorant_Garamond,
  DM_Sans,
  Geist,
  Geist_Mono,
  Josefin_Sans,
  Lexend,
  Manrope,
  Merriweather,
  Montserrat,
  Nunito,
  Outfit,
  Playfair_Display,
  Poppins,
  Quicksand,
  Raleway,
  Roboto_Mono,
  Rubik,
  Sora,
  Space_Grotesk,
  Urbanist,
  Work_Sans
} from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas-neue" });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant-garamond" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-dm-sans" });
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const josefinSans = Josefin_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-josefin-sans" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-merriweather" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-playfair-display" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins"
});
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });
const raleway = Raleway({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-raleway" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });
const rubik = Rubik({ subsets: ["latin"], variable: "--font-rubik" });
const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sora" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-urbanist" });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-work-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://archers-calendar.vercel.app"),
  title: "Archers Calendar - Build Your Schedule Wallpaper in 30 Seconds",
  description: "The ultimate free schedule wallpaper generator for PH students. Build a custom calendar in 30 seconds by pasting your schedule. Support for iPhone, iPad, MacBook, and Laptop. Export as full wallpapers, clear PNGs, or backdrops. 100% FREE, all features unlocked. Created by Richard Christian Uaje.",
  keywords: [
    "schedule wallpaper generator", "PH student tools", "class schedule builder", "university schedule maker",
    "iPhone schedule wallpaper", "iPad schedule wallpaper", "MacBook schedule wallpaper", "free student app",
    "Richard Christian Uaje", "UP schedule", "UST schedule", "DLSU schedule", "ADMU schedule", "FEU schedule",
    "custom calendar background", "emoji pattern calendar", "gradient schedule"
  ],
  authors: [{ name: "Richard Christian Uaje" }],
  creator: "Richard Christian Uaje",
  icons: {
    icon: "/logos/logo-mini-green.png",
    shortcut: "/logos/logo-mini-green.png",
    apple: "/logos/logo-mini-green.png",
  },
  openGraph: {
    title: "Archers Calendar - Free Universal Schedule Generator",
    description: "Build beautiful, high-res schedule wallpapers in seconds. Works for all PH universities. 100% FREE and fully unlocked. Created by Richard Christian Uaje.",
    url: "https://archers-calendar.vercel.app",
    siteName: "Archers Calendar",
    images: [
      {
        url: "/logos/logo-full-green.png",
        width: 1200,
        height: 630,
        alt: "Archers Calendar - Free Schedule Wallpaper Generator",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Archers Calendar - 30-Second Schedule Builder",
    description: "Convert your university schedule into aesthetic wallpapers. 100% FREE for all PH students. Created by Richard Christian Uaje.",
    images: ["/logos/logo-full-green.png"],
    creator: "@rcuaje",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    archivoBlack.variable,
    bebasNeue.variable,
    cormorantGaramond.variable,
    dmSans.variable,
    geist.variable,
    geistMono.variable,
    josefinSans.variable,
    lexend.variable,
    manrope.variable,
    merriweather.variable,
    montserrat.variable,
    nunito.variable,
    outfit.variable,
    playfairDisplay.variable,
    poppins.variable,
    quicksand.variable,
    raleway.variable,
    robotoMono.variable,
    rubik.variable,
    sora.variable,
    spaceGrotesk.variable,
    urbanist.variable,
    workSans.variable
  ].join(" ");

  return (
    <html lang="en">
      <body className={`${fontVariables} font-sans antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
