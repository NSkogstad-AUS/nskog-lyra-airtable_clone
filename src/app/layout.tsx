import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Airtable Clone",
  description: "A Airtable Clone",
  icons: [{ rel: "icon", url: "/assets/ic-airtable_logo.png" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
