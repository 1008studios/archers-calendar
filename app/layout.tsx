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
  title: "Archers Calendar - Free Student Schedule Wallpaper Generator",
  description: "Create beautiful, readable schedule wallpapers for students in Metro Manila (DLSU and more). Created by Richard Christian Uaje. Convert your class schedule into high-res wallpapers with custom designs, gradients, and themes. Free to use.",
  keywords: ["DLSU schedule generator", "Metro Manila student tools", "class schedule wallpaper", "Archers Calendar", "DLSU ArchersHub", "student productivity", "Richard Christian Uaje", "free schedule generator"],
  authors: [{ name: "Richard Christian Uaje" }],
  creator: "Richard Christian Uaje",
  icons: {
    icon: "/logos/logo-mini-green.png",
    shortcut: "/logos/logo-mini-green.png",
    apple: "/logos/logo-mini-green.png",
  },
  openGraph: {
    title: "Archers Calendar - Free Schedule Wallpaper Generator",
    description: "Convert your DLSU or university schedule into aesthetic wallpapers. Created by Richard Christian Uaje for students in Metro Manila.",
    url: "https://archers-calendar.vercel.app",
    siteName: "Archers Calendar",
    images: [
      {
        url: "/logos/logo-full-green.png",
        width: 1200,
        height: 630,
        alt: "Archers Calendar - Free Schedule Generator",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Archers Calendar - Free Schedule Wallpaper Generator",
    description: "Beautiful schedule wallpapers for Metro Manila students. Created by Richard Christian Uaje.",
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
