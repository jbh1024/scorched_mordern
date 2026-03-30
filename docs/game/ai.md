# AI System Specification

> AI 봇의 사격 계산, 타겟 선정, 난이도 시스템을 정의합니다.
> 구현 코드: `client/src/ai/shot-solver.ts`, `client/src/ai/ai-controller.ts`

---

## 1. 개요

AI는 클라이언트 사이드에서 실행되며, 싱글플레이 시 서버 없이 동작한다.
자기 턴이 오면 타겟을 선정하고, 최적의 (angle, power)를 계산하여 발사한다.

---

## 2. Shot Solver (역궤적 계산)

### 2.1 브루트포스 시뮬레이션

각도/파워 조합을 순회하며 궤적을 시뮬레이션하여 타겟에 가장 가까운 착탄점을 찾는다.

```
1. 조대 탐색 (Coarse Search)
   - angle: 5° ~ 175°, 5° 간격 (34개)
   - power: 10% ~ 100%, 10% 간격 (10개)
   - 총 340회 시뮬레이션

2. 정밀 탐색 (Fine Search)
   - 조대 탐색 최적값 주변 ±4°, 1° 간격
   - power 주변 ±8%, 2% 간격
   - 총 ~80회 시뮬레이션

3. 최적 (angle, power) 선택
```

### 2.2 시뮬레이션 방식

기존 `predictTrajectory()`와 동일한 step simulation:

```
vx = power * cos(angle), vy = -power * sin(angle)
매 step: vx += wind*dt, vy += gravity*dt, x += vx*dt, y += vy*dt
지형 충돌 or 화면 이탈 시 종료 → 착탄 좌표 반환
```

### 2.3 장점

- 지형 장애물 자동 고려 (산에 막히는 궤적 제외)
- 바람 자동 포함
- 코드 단순, 디버그 용이

---

## 3. 타겟 선정

### 3.1 기본 전략

가장 가까운 생존 적 탱크를 타겟으로 선정:

```
target = alive tanks
  .filter(t => t.id !== myTank.id)
  .sort by distance(myTank, t)
  .first
```

### 3.2 향후 확장 (Hard/Brutal)

- HP가 낮은 적 우선 (킬 확보)
- 위협도 기반 (높은 파워 무기 보유한 적 우선)

---

## 4. 난이도 시스템

계산된 정확한 (angle, power)에 가우시안 노이즈를 추가하여 난이도를 조절한다.

| 난이도 | 각도 오차 (σ) | 파워 오차 (σ) | 보정 |
|--------|-------------|-------------|------|
| **Easy** | ±15° | ±15% | 없음 |
| **Normal** | ±8° | ±8% | 3회차 후 ±4° |
| **Hard** | ±3° | ±3% | 2회차 후 ±1° |
| **Brutal** | ±1° | ±1% | 즉시 보정 |

### 4.1 가우시안 노이즈

```
noisy_angle = ideal_angle + gaussian(0, sigma_angle)
noisy_power = ideal_power + gaussian(0, sigma_power)
clamp to valid range
```

### 4.2 학습 보정 (Normal+)

동일 타겟에 대한 이전 착탄점을 기억하여 보정:

```
error = previous_landing - target_position
correction = error * 0.5  // 50% 보정
next_shot = ideal + correction
```

---

## 5. AI 턴 실행 흐름

```
1. ai_thinking 상태 진입 (0.5~1초 딜레이)
2. 타겟 선정
3. ShotSolver로 최적 (angle, power) 계산
4. 난이도별 노이즈 적용
5. 포탑 각도 설정 → 파워 설정 → 발사
6. projectile_flight 상태로 전환
```

---

## 6. API 참조

```typescript
// ShotSolver
function findBestShot(
  origin: Point, target: Point,
  terrain: TerrainMask, wind: number,
): { angle: number; power: number; score: number }

// AIController
class AIController {
  pickTarget(myTank: Tank, enemies: Tank[]): Tank
  computeShot(myTank: Tank, target: Tank, terrain: TerrainMask, wind: number): { angle: number; power: number }
}
```

---

## 7. 특이사항

1. **클라이언트 전용**: 서버에서 실행하지 않음. 멀티플레이 봇은 서버 사이드 별도 구현 필요.
2. **비동기 아님**: 계산은 동기적으로 1ms 이내 완료. Web Worker 불필요.
3. **이동 미사용**: Phase 2에서 AI는 이동하지 않음 (향후 확장).
4. **무기 선택 미사용**: Phase 2에서 Standard Shell만 사용.
