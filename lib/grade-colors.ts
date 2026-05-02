import type { Grade } from "@/lib/types"

const GRADE_HEX: Record<Grade, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
}

export function gradeHex(grade: Grade): string {
  return GRADE_HEX[grade]
}

export function gradeBadgeClass(grade: Grade): string {
  const map: Record<Grade, string> = {
    A: "bg-[#22c55e]/20 text-[#22c55e] ring-[#22c55e]/40",
    B: "bg-[#84cc16]/20 text-[#84cc16] ring-[#84cc16]/40",
    C: "bg-[#eab308]/20 text-[#eab308] ring-[#eab308]/40",
    D: "bg-[#f97316]/20 text-[#f97316] ring-[#f97316]/40",
    F: "bg-[#ef4444]/20 text-[#ef4444] ring-[#ef4444]/40",
  }
  return map[grade]
}
