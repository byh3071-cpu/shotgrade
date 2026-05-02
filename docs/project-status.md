# Project Status

## 2026-05-02 14:18:58 +09:00

현재 저장소는 앱 구현 작업이 진행 중인 상태다. Cursor 또는 다른 도구가 앱 코드와 설정 파일을 이미 많이 변경한 것으로 보이므로, Codex는 문서 lane 위주로만 작업하는 것이 안전하다.

## 변경 상태 요약

`git status --short` 기준으로 다음 영역에 변경 또는 신규 파일이 있다.

| 영역 | 상태 | 충돌 위험 |
| --- | --- | --- |
| `app/` | 페이지, 레이아웃, 액션, API, 인증 콜백, 히스토리 페이지 변경/추가 | 높음 |
| `components/` | 촬영, 피드백, 결과 카드, 히스토리, 인증 버튼, UI 컴포넌트 추가 | 높음 |
| `lib/` | 분석, 이미지, 프롬프트, 타입, Supabase 유틸 추가 | 높음 |
| `package.json`, `package-lock.json` | 의존성 추가 | 중간 |
| `middleware.ts`, `public/manifest.json` | 신규 파일 | 중간 |
| `docs/` | 협업 규칙, 로그, Supabase 스키마 문서 | 낮음 |
| `CLAUDE.md` | 협업 지침 링크 | 낮음 |

## 현재 의존성 신호

`package.json` 기준으로 다음 기능 축이 보인다.

- Next.js 16.2.4, React 19.2.4 기반 앱
- Anthropic SDK를 통한 이미지/샷 분석 기능
- Supabase SSR/Auth/DB 연동
- shadcn/Base UI 스타일의 UI 컴포넌트 구성
- Pretendard 폰트와 Tailwind CSS 4 사용

## Codex가 당장 맡기 좋은 일

- 문서 정리와 작업 로그 작성
- 변경 파일 분포 점검
- 충돌 위험이 낮은 SQL/schema 문서 리뷰
- 빌드/린트 실행 전 사전 점검
- 오류 로그가 생겼을 때 원인 분석

## Codex가 피해야 할 일

- `app/`, `components/`, `lib/` 직접 수정
- `package.json` 의존성 변경
- Supabase/Auth/API 흐름 임의 변경
- Cursor 또는 Claude가 만든 변경을 되돌리는 작업

## 다음 권장 순서

1. Cursor가 앱 구현을 계속 진행한다.
2. 구현이 멈춘 뒤 Codex가 `npm run lint` 또는 `npm run build`로 검증한다.
3. 실패 로그가 나오면 Codex가 원인 분석 후 최소 패치를 제안하거나, 사용자가 허용하면 직접 수정한다.
4. 각 작업 종료 시 `docs/codex-work-log.md`에 로그를 추가한다.
