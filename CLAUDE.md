---
id: claude-md-shotgrade
date: 2026-05-02
tags: [process, documentation]
---

@AGENTS.md

# 기록 규칙 (ShotGrade)

## ADR (Architecture Decision Record)
- 새로운 기술/라이브러리/API/DB를 선택하거나 변경할 때,
  docs/adr/ 에 ADR 파일을 자동 생성하라.
- 파일명: ADR-{번호}-{제목}.md
- 포맷:
  ---
  id: ADR-{번호}
  date: YYYY-MM-DD
  status: proposed | accepted | deprecated | superseded
  tags: [기술영역]
  ---
  **맥락 (Context)**
  **결정 (Decision)**
  **대안 (Alternatives)**
  **결과 (Consequences)**

## 작업 로그
- 세션 종료 또는 주요 기능 완성 시, docs/log/ 에 작업 로그를 남겨라.
- 파일명: YYYY-MM-DD-{작업명}.md

## 트러블슈팅 로그
- 에러 해결 완료 시, docs/troubleshooting/ 에 기록하라.
- 파일명: TS-{번호}-{증상 요약}.md
- 포맷: 증상 → 원인 → 해결 → 교훈

## TIL
- 코딩 중 새로 알게 된 개념이 있으면 docs/til.md 에 한 줄 추가.
- 포맷: `- [YYYY-MM-DD] 내용`

## 스키마/API 변경 이력
- DB 테이블이나 API 엔드포인트 변경 시 docs/changelog.md 에 기록.

## 작업 종료 전 체크리스트
- 작업 종료 전 반드시:
  1) ADR 빠진 거 없는지
  2) 작업 로그 작성
  3) 에러 있었으면 트러블슈팅 로그
  4) 새로 배운 거 있으면 TIL
