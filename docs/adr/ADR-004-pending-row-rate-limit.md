---
id: ADR-004
date: 2026-05-09
status: accepted
tags: [security, api, database]
---

# ADR-004: Pending Row 기반 Rate Limit

## 맥락 (Context)
- 기존: rate limit이 saved shots(image_url 있는 row) 기준 → 분석만 하고 저장 안 하면 무한 호출 가능
- 코드 리뷰에서 High 취약점으로 식별

## 결정 (Decision)
- /api/analyze에서 모델 호출 전 pending row 선삽입 (grade='P', image_url='', analysis='{}')
- rate limit COUNT에 pending 포함 → 호출 즉시 quota 차감
- saveShotToHistory는 image_url UPDATE만 담당하도록 분리
- 히스토리에서 image_url='' row는 필터링

## 대안 (Alternatives)
| 대안 | 장점 | 단점 | 탈락 이유 |
|------|------|------|----------|
| 별도 quota 테이블 | 원자적 카운트 | 테이블 추가 복잡 | MVP 과잉 |
| Redis 카운터 | 빠름, race-safe | 인프라 추가 필요 | Supabase only 제약 |

## 결과 (Consequences)
- 얻는 것: 무한 호출 차단, Anthropic 비용 폭탄 방지
- 포기하는 것: 동시 요청 시 최대 1회 초과 가능 (MVP 수용)
- 알려진 제약: race condition은 Postgres function으로 v2에서 해결

## 알려진 제약
- race condition: 동시 요청 시 dailyLimit 초과 가능 (최대 N-1회).
  v2에서 Postgres RPC atomic check+insert로 해결 예정.
  MVP 기간 동안은 Anthropic spend cap으로 비용 상한 보호.
