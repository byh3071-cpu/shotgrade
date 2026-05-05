import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "ShotGrade — 에스프레소 샷 등급",
  description:
    "에스프레소 샷 사진을 AI로 분석해 크레마·추출 상태를 등급(A~F)과 조절 가이드로 안내합니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ShotGrade",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`dark ${inter.variable} h-full`}>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
