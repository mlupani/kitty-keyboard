import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teclado de Gatitos",
  description: "Aprende las letras jugando con gatitos",
};

export const viewport: Viewport = { themeColor: "#1a1030" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
