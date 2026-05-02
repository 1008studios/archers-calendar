import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Poppins
} from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://archers-calendar.vercel.app"),
  title: "Archers Calendar Generator",
  description: "Create simple, readable DLSU schedule wallpapers from ArchersHub text, images, gradients, and emoji patterns.",
  icons: {
    icon: "/logos/logo-mini-green.png",
    shortcut: "/logos/logo-mini-green.png",
    apple: "/logos/logo-mini-green.png",
  },
  openGraph: {
    title: "Archers Calendar Generator",
    description: "Create simple, readable DLSU schedule wallpapers from ArchersHub text, images, gradients, and emoji patterns.",
    images: [
      {
        url: "/logos/logo-full-green.png",
        width: 1200,
        height: 630,
        alt: "Archers Calendar Logo",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Archers Calendar Generator",
    description: "Create simple, readable DLSU schedule wallpapers from ArchersHub text.",
    images: ["/logos/logo-full-green.png"],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    geist.variable,
    geistMono.variable,
    inter.variable,
    poppins.variable
  ].join(" ");

  return (
    <html lang="en">
      <body className={`${fontVariables} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
