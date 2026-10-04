import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import { FoodProvider } from "@/lib/food-context";
import { AskAgent } from "@/components/AskAgent";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xilo-food inspector",
  description: "Understand what's inside your food — and what it means for you.",
};

export const viewport: Viewport = {
  themeColor: "#f6f8f4",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full bg-background pb-20 font-sans text-foreground antialiased">
        <FoodProvider>
          <Navbar />
          {children}
          <AskAgent />
        </FoodProvider>
      </body>
    </html>
  );
}
