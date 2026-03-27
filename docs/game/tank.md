# Tank System Specification

> 탱크 시스템의 설정, 제약사항, 특이사항, 조건을 정의합니다.
> 구현 코드: `client/src/core/tank.ts`, `client/src/renderer/tank-renderer.ts`

---

## 1. 탱크 속성

| 속성 | 타입 | 기본값 | 상수 참조 | 설명 |
|------|------|--------|----------|------|
| `id` | string | - | - | 고유 식별자 (예: "t1") |
| `playerId` | string | - | - | 소속 플레이어 (예: "p1") |
| `x` | number | 0 | - | 좌상단 X 좌표 |
| `y` | number | 0 | - | 좌상단 Y 좌표 |
| `hp` | number | 100 | `TANK.HP` | 체력 (0이 되면 사망) |
| `angle` | number | 90 | - | 포탑 각도 (도, 0~180) |
| `color` | number | - | - | 렌더링 색상 (hex) |
| `fuel` | number | 100 | `TANK.FUEL_PER_TURN` | 이동 연료 (턴당 리셋) |
| `status` | TankStatus | 'alive' | - | 'alive' / 'buried' / 'dead' |

### 크기 상수

| 상수 | 값 | 설명 |
|------|-----|------|
| `TANK.WIDTH` | 32px | 탱크 가로 크기 |
| `TANK.HEIGHT` | 24px | 탱크 세로 크기 |
| `TANK.MAX_CLIMB_ANGLE` | 45도 | 이동 가능 최대 경사 |

---

## 2. 포탑 시스템

### 2.1 각도 규칙

```
  180°          90°          0°
(왼쪽 수평)   (위쪽)    (오른쪽 수평)
   ←───────── ↑ ──────────→
```

- **범위**: 0도 ~ 180도 (반원)
- **기본값**: 90도 (위쪽)
- **조절 단위**: 방향키 한 번에 2도
- **입력**: 왼쪽 방향키 = +2도 (왼쪽으로), 오른쪽 방향키 = -2도 (오른쪽으로)

### 2.2 포탑 렌더링

- 포탑 길이: `TANK.WIDTH * 0.8` = 25.6px
- 포탑 두께: 4px (stroke)
- 포탑 색상: `0x333333` (어두운 회색)
- 회전 기준점: 탱크 본체 상부 중심 `(WIDTH/2, HEIGHT*0.4)`

### 2.3 발사 원점

포탄은 포탑 끝에서 발사된다:

```typescript
fireOrigin.x = tank.x + TANK.WIDTH / 2 + cos(angle) * turretLength
fireOrigin.y = tank.y - sin(angle) * turretLength
```

- `turretLength` = `TANK.WIDTH * 0.8` (25.6px)
- Y 좌표는 **빼기** (화면 좌표계에서 위쪽 = Y 감소)

---

## 3. 지형 배치

### 3.1 Surface Snap

`tank.placeOnTerrain(xPos, terrainMask)` 호출 시:

1. `TerrainMask.getSurfaceY(xPos)` 로 해당 X의 지형 표면 Y를 구함
2. `tank.y = surfaceY - TANK.HEIGHT` (탱크 하단이 지형 표면에 닿도록)
3. `tank.x = xPos`

### 3.2 초기 배치 규칙

- 라운드 시작 시 화면 양쪽에 균등 배치
- 현재 구현: 좌측 15%, 우측 85% 위치
- 향후: N명 플레이어 균등 분배 + 경사 45도 이상 회피

### 3.3 폭발 후 재배치

지형이 파괴되면 탱크 아래가 비어 추락할 수 있다:

```
폭발 발생 → mask.explode() → 모든 생존 탱크에 placeOnTerrain(tank.x, mask) 재호출
```

- 현재: 즉시 새 표면으로 스냅 (추락 애니메이션 없음)
- 향후: 추락 데미지 적용 (`fall_height / 10`, 최대 30)

---

## 4. HP 및 데미지

### 4.1 데미지 계산

```
actual_damage = base_damage * (1 - distance / radius)
```

- 폭발 중심 = 100% 데미지
- 폭발 반경 경계 = 0% 데미지
- 반경 밖 = 데미지 없음

### 4.2 사망 판정

- `hp <= 0` → `status = 'dead'`
- 사망한 탱크는 렌더링에서 숨겨짐 (`container.visible = false`)
- 사망한 탱크는 턴에서 스킵됨

### 4.3 자폭

- 자신의 포탄에 의한 데미지 적용됨
- 자폭 시 골드 보상 없음 (경제 시스템 구현 시)

---

## 5. 렌더링

### 5.1 본체

- 하부: 직사각형 (`WIDTH × HEIGHT*0.6`)
- 상부: 타원형 돔 (`WIDTH*0.35 × HEIGHT*0.4`)
- 색상: 플레이어별 고유 색상

### 5.2 HP 바

- 위치: 탱크 상단 10px 위
- 크기: `(TANK.WIDTH + 8) × 4px`
- 배경: `0x333333`
- HP 바 색상:
  - `> 50%`: 녹색 (`0x00cc00`)
  - `25% ~ 50%`: 노랑 (`0xcccc00`)
  - `< 25%`: 빨강 (`0xcc0000`)

### 5.3 플레이어 색상

```typescript
const PLAYER_COLORS = [
  0xe74c3c,  // 빨강 (Player 1)
  0x3498db,  // 파랑 (Player 2)
  0x2ecc71,  // 초록 (Player 3)
  0xf1c40f,  // 노랑 (Player 4)
  0x9b59b6,  // 보라 (Player 5)
  0xe67e22,  // 주황 (Player 6)
  0x1abc9c,  // 청록 (Player 7)
  0xecf0f1,  // 흰색 (Player 8)
];
```

---

## 6. 상태 전이

```
alive → buried (지형에 매몰)
alive → dead   (HP 0)
buried → alive (주변 폭발로 지형 제거)
buried → dead  (HP 0)
```

### Buried 상태 (미구현)

- 탱크 상단 50% 이상이 지형에 묻히면 발동
- 이동 불가, 발사는 가능
- 자연 해제 없음 (주변 폭발로만 해제)

---

## 7. 이동 시스템 (미구현)

Phase 3에서 구현 예정:

- 좌우 방향키로 이동 (fuel 소비)
- 지형 표면을 따라 이동 (Surface Tracking)
- 경사 45도 이상 이동 불가
- 턴마다 fuel 리셋 (`TANK.FUEL_PER_TURN` = 100px)

---

## 8. 특이사항 및 주의점

1. **좌표는 좌상단 기준**: `tank.x`, `tank.y`는 탱크 스프라이트의 좌상단. 중심이 아님.
   - 탱크 중심 X = `tank.x + TANK.WIDTH / 2`
   - 포탑 기준점 Y = `tank.y + TANK.HEIGHT * 0.4`
2. **각도는 도(degree)**: 내부 저장은 도 단위. 물리 계산 시 `tank.angleRad`로 라디안 변환.
3. **포탑 각도와 물리 각도 일치**: 포탑 각도가 그대로 발사 각도로 사용됨. 별도 변환 불필요.
4. **지형 스냅은 X 좌표 기준**: `getSurfaceY(xPos)`는 해당 X의 첫 번째 고체 Y를 반환. 탱크 전체 폭이 아닌 한 점 기준.
5. **사망 시 렌더링만 숨김**: Tank 객체는 메모리에 유지됨. 부활 등 확장 가능.
