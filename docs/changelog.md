# ShotGrade Changelog

## 2026-05-09
- Rate limit 우회 차단: `/api/analyze`가 모델 호출 전 `shots`에 pending row(`grade='P'`, `image_url=''`) 선-INSERT, 성공 시 UPDATE하는 방식으로 전환. quota는 호출 즉시 차감
- `saveShotToHistory` 책임 변경: INSERT → 이미지 업로드 + `image_url` UPDATE
- `AnalyzeResponseBody`에 `shot_id` 추가
- 히스토리 리스트/상세에서 `image_url=''` row 필터링 (`.neq("image_url", "")`)
- ALTER TABLE `shotgrade.shots`: `user_correction JSONB`, `prompt_version TEXT` 컬럼 추가 (ADR-003)
- `lib/types.ts` `ShotRow`에 `user_correction`, `prompt_version` 필드 정의
- `lib/prompts.ts`에 `PROMPT_VERSION = "v1"` 상수 추가

## 2026-05-05
- Vision 모델 Opus → Sonnet 전환 (ADR-002)
- Day 3 기능 완성: 촬영→분석→히스토리 풀 플로우

## 2026-05-02
- 프로젝트 초기 세팅
- shotgrade 스키마 + shots 테이블 생성
- Google OAuth 연동
