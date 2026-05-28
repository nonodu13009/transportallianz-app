import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portefeuille Transport — Allianz Nogaro & Boetti",
  description:
    "Pilotage du portefeuille transport : primes, sinistralite, S/P brut par client.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${sourceSans.variable} antialiased`}>
      <body className="min-h-screen bg-[#F4F2EC] text-[#1C1B1B]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
