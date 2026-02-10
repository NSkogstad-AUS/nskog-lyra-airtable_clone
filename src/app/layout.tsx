import "~/styles/globals.css";

import { type Metadata } from "next";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Airtable Clone",
  description: "A Airtable Clone",
  icons: [{ rel: "icon", url: "/assets/ic-airtable_logo.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
