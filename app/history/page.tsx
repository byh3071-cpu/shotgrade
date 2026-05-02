import Link from "next/link"
import { ShotHistoryList } from "@/components/shot-history-list"

export default function HistoryPage() {
  return (
    <div className="bg-background min-h-full">
      <header className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← 뒤로
        </Link>
        <h1 className="text-lg font-semibold">내 샷 히스토리</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <ShotHistoryList />
      </div>
    </div>
  )
}
