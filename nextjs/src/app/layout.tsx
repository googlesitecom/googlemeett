import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lucid — Navegador proxy para jugar",
  description:
    "Navegador estilo nativo con proxy propio, motor de búsqueda sin Google, cuenta sin correo, chat con amigos y apartado de juegos: F1, Mario Kart, Counter Strike 2 y Zona Cero.",
  keywords: [
    "Lucid",
    "navegador",
    "proxy",
    "juegos",
    "chat",
    "amigos",
    "F1",
    "Mario Kart",
    "Counter Strike 2",
    "Zona Cero",
  ],
  authors: [{ name: "Lucid" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0b12] text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
