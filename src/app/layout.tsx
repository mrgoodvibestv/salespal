import type { Metadata } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "SalesPal",
  description: "AI-powered outbound sales.",
  metadataBase: new URL("https://sp.goodvibesai.com"),
  openGraph: {
    title: "SalesPal",
    description: "Turn prospects into customers.",
    url: "https://sp.goodvibesai.com",
    siteName: "SalesPal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SalesPal — Turn prospects into customers.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SalesPal",
    description: "Turn prospects into customers.",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-[family-name:var(--font-sans)] antialiased bg-white text-black">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
