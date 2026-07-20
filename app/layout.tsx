import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Costco Jewelry PDP",
  description:
    "A Costco jewelry product detail page with an embedded iJewel 3D ring viewer.",
  icons: {
    icon: "assets/brand/costco-wholesale-logo.png",
    shortcut: "assets/brand/costco-wholesale-logo.png",
  },
  openGraph: {
    title: "Costco Jewelry PDP",
    description:
      "Explore a Costco round brilliant diamond ring with the embedded iJewel 3D viewer.",
    images: ["assets/images/costco-ring-poster.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
