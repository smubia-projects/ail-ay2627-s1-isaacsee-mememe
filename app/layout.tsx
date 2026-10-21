import type { Metadata, Viewport } from "next";
import { Anton, Baloo_2, Bricolage_Grotesque, Inter } from "next/font/google";
import { ApiNotices } from "@/components/ApiNotices";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Caption fonts are only drawn on the canvas, so don't preload them.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: "800",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MemeMe: turn your pet into a sticker",
    template: "%s · MemeMe",
  },
  description:
    "Upload a photo of yourself or your pet, pick a vibe, and get a die-cut meme sticker for Telegram or WhatsApp in about 20 seconds.",
  openGraph: {
    title: "MemeMe: turn your pet into a sticker",
    description: "Personal meme stickers in about 20 seconds. No photos stored.",
    siteName: "MemeMe",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF0FF" },
    { media: "(prefers-color-scheme: dark)", color: "#16142B" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${anton.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ApiNotices />
      </body>
    </html>
  );
}
