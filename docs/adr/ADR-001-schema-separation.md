---
id: ADR-001
date: 2026-05-02
status: accepted
tags: [database, supabase]
---

# ADR-001: Supabase 스키마 분리 (shotgrade)

## 맥락 (Context)
- Supabase 기본 public 스키마에 테이블을 만들면 다른 프로젝트와 충돌 가능
- 향후 여러 앱을 하나의 Supabase 인스턴스에서 운영할 계획

## 결정 (Decision)
- `CREATE SCHEMA IF NOT EXISTS shotgrade;`로 전용 스키마 생성
- 모든 테이블을 `shotgrade.shots` 형태로 prefix 사용
- Supabase Dashboard → Settings → API → Exposed schemas에 `shotgrade` 추가

## 대안 (Alternatives)
| 대안 | 장점 | 단점 | 탈락 이유 |
|------|------|------|----------|
| public 스키마 사용 | 설정 간편 | 다중 프로젝트 충돌 | 확장성 부족 |
| 별도 Supabase 인스턴스 | 완전 격리 | 비용 2배 | MVP에 과잉 |

## 결과 (Consequences)
- 얻는 것: 깔끔한 네임스페이스, 다중 프로젝트 공존 가능
- 포기하는 것: Exposed schemas 설정 필수 (잊으면 API 접근 불가)
