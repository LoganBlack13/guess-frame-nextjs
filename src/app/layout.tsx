import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guess the Frame",
  description: "Create cinematic quiz rooms, drop frames to your friends, and see who can guess the movie first.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="synthwave">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <script src="https://cdn.jsdelivr.net/npm/theme-change@2.0.2/index.js"></script>
      </body>
    </html>
  );
}
