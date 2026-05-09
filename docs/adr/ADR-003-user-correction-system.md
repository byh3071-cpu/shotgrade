---
id: ADR-003
date: 2026-05-09
status: proposed
tags: [feature, database]
---

# ADR-003: 사용자 보정 시스템 (user_correction)

## 맥락 (Context)
- 👍👎 피드백만으로는 "어디가 틀렸는지" 알 수 없음
- 사용자가 실제 등급/크레마/추출 시간을 보정할 수 있으면 프롬프트 개선에 활용 가능

## 결정 (Decision)
- `shotgrade.shots` 테이블에 2개 컬럼 추가:
  - `user_correction JSONB` — 사용자가 보정한 값
  - `prompt_version TEXT` — 분석 시 사용한 프롬프트 버전
- ALTER SQL로 기존 테이블에 추가 (마이그레이션)

## 대안 (Alternatives)
| 대안 | 장점 | 단점 | 탈락 이유 |
|------|------|------|----------|
| 별도 corrections 테이블 | 정규화 | JOIN 복잡 | MVP 단순성 우선 |
| feedback 컬럼 확장 | 최소 변경 | 구조화 데이터 저장 불가 | 확장성 부족 |

## 결과 (Consequences)
- 얻는 것: 프롬프트 A/B 테스트 기반 데이터, 사용자 참여도 향상
- 포기하는 것: 스키마 복잡도 약간 증가
