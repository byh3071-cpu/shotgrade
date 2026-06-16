---
id: ADR-002
date: 2026-05-05
status: accepted
tags: [ai, api, cost]
---

# ADR-002: Vision 모델 Opus → Sonnet 전환

## 맥락 (Context)
- 초기 개발에서 claude-opus-4-7 사용 → 분석 정확도 높지만 비용/속도 문제
- MVP 단계에서 비용 효율이 중요

## 결정 (Decision)
- 프로덕션 모델을 `claude-sonnet-4-20250514`로 통일
- `lib/prompts.ts`의 `ANALYSIS_MODEL` 상수 변경
- Opus는 프롬프트 튜닝/검증용으로만 사용

## 대안 (Alternatives)
| 대안 | 장점 | 단점 | 탈락 이유 |
|------|------|------|----------|
| Opus 유지 | 최고 정확도 | ~10x 비용, 느림 | MVP 비용 초과 |
| Haiku | 최저 비용 | Vision 정확도 부족 | 등급 신뢰도 낮음 |

## 결과 (Consequences)
- 얻는 것: ~$0.01/분석, 응답 2초 이내
- 포기하는 것: Opus 대비 미세한 정확도 차이 (체감 어려움)
