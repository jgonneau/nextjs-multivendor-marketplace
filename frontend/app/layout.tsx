import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { Providers } from "@/components/providers";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";
import { MESSAGES } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function currentLocale() {
  // Saved choice first, then the browser's Accept-Language.
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: "Marketplace", template: "%s · Marketplace" },
    description: MESSAGES[await currentLocale()].meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await currentLocale();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
