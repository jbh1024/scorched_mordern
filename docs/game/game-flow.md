# Game Flow & Turn System Specification

> 게임 상태 머신, 턴 관리, 승패 판정의 설정, 제약사항, 조건을 정의합니다.
> 구현 코드: `client/src/core/game-manager.ts`

---

## 1. 상태 머신

### 1.1 Phase 1 상태 (간소화)

```
[PlayerAction] ──Space──→ [ProjectileFlight] ──충돌/소멸──→ [TurnEnd]
      ↑                                                        │
      └────────────────────────────────────────────────────────┘
                          (다음 턴 or 게임 종료)
```

| 상태 | 설명 | 종료 조건 |
|------|------|----------|
| `player_action` | 현재 플레이어가 각도/파워 조절, 발사 대기 | Space 키 → 발사 |
| `projectile_flight` | 포탄 비행 중, 물리 시뮬레이션 | 충돌 또는 화면 이탈 |
| `turn_end` | 데미지 정산, 턴 교대 | 즉시 → player_action 또는 game_over |
| `game_over` | 게임 종료, 승자 표시 | 종단 상태 |

### 1.2 Full 상태 (Phase 2+)

```
InitRound → TurnStart → PlayerAction → ProjectileFlight → TerrainSettle → TurnEnd → RoundEnd → ShopPhase
```

Phase 1에서는 `InitRound`, `TurnStart`, `TerrainSettle`, `RoundEnd`, `ShopPhase`를 생략.

---

## 2. 턴 관리

### 2.1 턴 순서

- 라운드 시작 시 고정 순서 (Player 1 → Player 2 → ...)
- 사망한 플레이어는 스킵
- Phase 2+: 라운드별 순서 변경 (역순)

### 2.2 턴 교대

```
현재 플레이어 발사 완료 (충돌/소멸)
  → 데미지 정산
  → 탱크 지형 재배치
  → 승패 판정
  → 다음 생존 플레이어로 전환
  → player_action 상태로 복귀
```

### 2.3 Phase 1 제약

- 턴 타이머 없음 (무제한 조준 시간)
- 이동 없음 (발사만)
- 바람 없음 (0 고정)
- Standard Shell만 사용

---

## 3. 승패 판정

| 조건 | 결과 |
|------|------|
| 생존자 1명 | 해당 플레이어 승리 |
| 생존자 0명 (동시 사망) | 무승부 |
| 생존자 2명+ | 게임 계속 |

---

## 4. GameManager 인터페이스

```typescript
class GameManager {
  // 상태
  state: GameState;
  currentPlayerIndex: number;
  tanks: Tank[];
  projectile: Projectile | null;
  wind: number;

  // 읽기 전용 접근
  get currentTank(): Tank;
  get isGameOver(): boolean;
  get winner(): Tank | null;

  // 입력
  adjustAngle(delta: number): void;
  adjustPower(delta: number): void;
  fire(): void;

  // 업데이트 (매 프레임)
  update(dt: number): GameEvent[];

  // 궤적 예측
  getTrajectoryPreview(): Point[];
}
```

### 4.1 GameEvent

`update()`는 발생한 이벤트를 반환한다. 렌더러가 이벤트에 반응:

| Event | 설명 | 렌더러 동작 |
|-------|------|-----------|
| `explosion` | 포탄 폭발 | 지형 렌더링 갱신, 폭발 이펙트 |
| `damage` | 탱크 데미지 | HP 바 갱신 |
| `kill` | 탱크 사망 | 탱크 숨김 |
| `turn_change` | 턴 교대 | HUD 갱신 |
| `game_over` | 게임 종료 | 승자 표시 |

---

## 5. 조작 요약

| 키 | 동작 | 상태 |
|----|------|------|
| **좌/우 방향키** | 탱크 이동 (fuel 소비) | PlayerAction |
| **상/하 방향키** | 포탑 각도 조절 | PlayerAction |
| **Space 홀드** | 파워 차징 (0→100%) | PlayerAction |
| **Space 릴리즈** | 발사 | PlayerAction → ProjectileFlight |
| **E 키** | 무기 변경 | PlayerAction |

### 파워 차징

- Space 누르는 동안 파워가 0%부터 프레임당 +1% 증가
- Space를 떼면 현재 파워로 발사
- 실제 발사 속도: `power% * MAX_POWER (1000)`

### HUD 위치

- 조작법, 턴 정보, 파워 게이지 등은 **화면 하단**에 표시

---

## 6. 플레이 설정

### 6.1 싱글플레이

| 설정 | 범위 | 기본값 |
|------|------|--------|
| 봇 수 | 1 ~ 7 | 1 |
| 봇 난이도 | Easy / Normal / Hard / Brutal | Normal |

- 플레이어 이름: `"Player"`
- 봇 이름: `"Bot-1"`, `"Bot-2"`, ...

### 6.2 멀티플레이

| 설정 | 범위 | 기본값 |
|------|------|--------|
| 최대 참가자 수 | 2 ~ 8 | 4 |
| 봇 추가 여부 | On / Off | Off |
| 봇 수 (추가 시) | 1 ~ (8 - 참가자 수) | 0 |
| 봇 난이도 | Easy / Normal / Hard / Brutal | Normal |

- 플레이어 이름: 각자 입력한 닉네임 (최대 12자)
- 봇 이름: `"Bot-1"`, `"Bot-2"`, ...

---

## 7. 특이사항 및 주의점

1. **GameManager는 렌더링을 모름**: 순수 게임 로직만 담당. 이벤트로 렌더러와 소통.
2. **비동기 폭발 처리**: 지형 텍스처 갱신이 async이므로 main.ts에서 이벤트 기반으로 처리.
3. **턴 리셋**: 턴 교대 시 파워 0%로 리셋, fuel 최대값 리셋. 각도는 이전 값 유지.
4. **game_over는 종단 상태**: 게임 재시작은 새 GameManager 인스턴스 생성.
5. **이동 → 발사 순서**: 같은 턴에서 이동 후 발사. 발사 후에는 이동 불가.
