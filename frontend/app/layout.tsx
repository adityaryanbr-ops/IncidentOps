import type { Metadata } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "IncidentOps | Evidence-grounded field response",
  description:
    "Upload incident evidence, extract facts with NVIDIA Nemotron on Nebius Token Factory, enrich with Tavily, and draft actionable response briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${syne.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
