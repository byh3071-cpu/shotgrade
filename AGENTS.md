# ShotGrade — AGENTS.md

## 프로젝트 요약
에스프레소 샷 사진 → Claude Vision AI 등급(A~F) + 조절 가이드 PWA 앱.
Next.js 16 + Tailwind 4 + shadcn/ui + Supabase(shotgrade schema) + Vercel.

## 핵심 파일 맵
| 경로 | 역할 | 주의사항 |
|------|------|----------|
| lib/prompts.ts | Vision API 프롬프트 | 변경 시 ADR 필수 |
| app/api/analyze/route.ts | 분석 API | auth 필수, rate limit |
| lib/supabase/db.ts | schema: shotgrade | prefix 통일 |
| components/grade-card.tsx | 등급 카드 UI | 색상 코드 고정 |
| middleware.ts | Auth 세션 갱신 | |

## 참조 문서
- docs/PRD.md — MVP 범위, 제외 사항
- docs/ARCHITECTURE.md — 데이터 흐름, API 스펙
- .cursorrules — 디자인 시스템, 코딩 규칙

## 작업 규칙
- DB: `shotgrade.shots` 테이블만 사용 (스키마 prefix 필수)
- API 키: ANTHROPIC_API_KEY는 서버 전용 (NEXT_PUBLIC 금지)
- 이미지: 클라이언트 리사이즈 후 Base64 전송 (max 1024px)
- 에러: try-catch 필수, 빈 catch 금지
- 타입: any 금지, strict TypeScript

## 등급 색상 (절대 변경 금지)
- A=#22c55e B=#84cc16 C=#eab308 D=#f97316 F=#ef4444

## 테스트 체크리스트
1. 촬영 → 분석 → 등급 카드 표시
2. 히스토리 리스트 → 카드 클릭 → 상세
3. 비로그인 → OAuth → 리디렉트 복귀
4. 피드백 👍👎 → DB 반영
5. 모바일 PWA 홈화면 추가

## 커밋
- feat: / fix: / refactor: / docs: / chore:
- 기술 변경 → docs/adr/ 먼저 작성
