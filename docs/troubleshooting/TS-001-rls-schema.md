---
id: TS-001
date: 2026-05-03
tags: [supabase, rls]
---

# TS-001: RLS + 스키마 분리 시 API 접근 불가

## 증상
- Supabase 클라이언트에서 `shotgrade.shots` 쿼리 시 빈 배열 반환
- 에러 메시지 없이 조용히 실패

## 원인
- Supabase Dashboard → Settings → API → Exposed schemas에 `shotgrade`가 추가되지 않음
- RLS 정책이 `public.shots`가 아닌 `shotgrade.shots`에 걸려야 함

## 해결
1. Exposed schemas에 `shotgrade` 추가
2. `lib/supabase/db.ts`에서 `.schema('shotgrade')` 호출 확인
3. RLS 정책에서 테이블 참조가 `shotgrade.shots`인지 확인

## 교훈
- 커스텀 스키마 사용 시 Exposed schemas 설정을 첫 번째로 확인할 것
