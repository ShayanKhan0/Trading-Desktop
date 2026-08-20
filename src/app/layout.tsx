import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TradeLedger — Trading Journal & Analytics",
    template: "%s · TradeLedger",
  },
  description:
    "A professional trading journal and analytics platform. Log every trade, review your psychology, and find the setups that actually make money.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
