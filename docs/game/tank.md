# Tank System Specification

> 탱크 시스템의 설정, 제약사항, 특이사항, 조건을 정의합니다.
> 구현 코드: `client/src/core/tank.ts`, `client/src/renderer/tank-renderer.ts`

---

## 1. 탱크 속성

| 속성 | 타입 | 기본값 | 상수 참조 | 설명 |
|------|------|--------|----------|------|
| `id` | string | - | - | 고유 식별자 (예: "t1") |
| `playerId` | string | - | - | 소속 플레이어 (예: "p1") |
| `name` | string | - | - | 표시 이름 (닉네임 / "Player" / "Bot-1") |
| `x` | number | 0 | - | 좌상단 X 좌표 |
| `y` | number | 0 | - | 좌상단 Y 좌표 |
| `hp` | number | 100 | `TANK.HP` | 체력 (0이 되면 사망) |
| `angle` | number | 90 | - | 포탑 각도 (도, 0~180) |
| `bodyAngle` | number | 0 | - | 본체 기울기 (라디안, 지형 경사에 따라) |
| `color` | number | - | - | 렌더링 색상 (hex) |
| `fuel` | number | 100 | `TANK.FUEL_PER_TURN` | 이동 연료 (턴당 리셋) |
| `status` | TankStatus | 'alive' | - | 'alive' / 'buried' / 'dead' |

### 크기 상수

| 상수 | 값 | 설명 |
|------|-----|------|
| `TANK.WIDTH` | 32px | 탱크 가로 크기 |
| `TANK.HEIGHT` | 24px | 탱크 세로 크기 |
| `TANK.FUEL_PER_TURN` | 100 | 턴당 이동 가능 거리 (px) |
| `TANK.MAX_CLIMB_ANGLE` | 45도 | 이동 가능 최대 경사 |

---

## 2. 이동 시스템

### 2.1 조작

- **좌/우 방향키**: 탱크 이동
- 턴당 `TANK.FUEL_PER_TURN` (100px) 만큼만 이동 가능
- Fuel 게이지가 0이 되면 더 이상 이동 불가
- 턴 시작 시 fuel은 최대값으로 리셋

### 2.2 지형 표면 추적 (Surface Tracking)

이동 시 지형 표면을 따라 이동한다:

```
1. 다음 X 좌표 계산 (현재 x ± 이동속도 * dt)
2. 해당 X의 지형 표면 Y를 getSurfaceY()로 구함
3. 탱크 Y를 새 표면에 스냅
4. 이동한 거리만큼 fuel 차감
```

### 2.3 지형 기울기에 따른 본체 각도

탱크 본체는 지형의 기울기에 따라 기울어진다:

```
// 탱크 좌우 끝의 지형 높이 차이로 기울기 계산
leftY  = getSurfaceY(tank.x)
rightY = getSurfaceY(tank.x + TANK.WIDTH)
bodyAngle = atan2(rightY - leftY, TANK.WIDTH)
```

- 본체 렌더링 시 이 각도만큼 회전
- 포탑 각도는 본체 각도에 더해져서 절대 방향 결정

### 2.4 이동 제약

- 경사가 `MAX_CLIMB_ANGLE` (45도) 이상이면 이동 불가
- `Buried` 상태면 이동 불가
- 이동은 발사 전에만 가능 (같은 턴 내에서 이동 → 발사 순서)

### 2.5 Fuel 게이지 렌더링

- 탱크 하단 또는 HUD 하단에 표시
- 이동할수록 줄어드는 바 형태

---

## 3. 포탑 시스템

### 3.1 각도 규칙

```
  180°          90°          0°
(왼쪽 수평)   (위쪽)    (오른쪽 수평)
   ←───────── ↑ ──────────→
```

- **범위**: 0도 ~ 180도 (반원)
- **기본값**: 90도 (위쪽)
- **조절 단위**: 프레임당 2도
- **입력**: **상 방향키** = +2도 (왼쪽으로), **하 방향키** = -2도 (오른쪽으로)

### 3.2 포탑 렌더링

- 포탑 길이: `TANK.WIDTH * 0.8` = 25.6px
- 포탑 두께: 4px (stroke)
- 포탑 색상: `0x333333` (어두운 회색)
- 회전 기준점: 탱크 본체 상부 중심 `(WIDTH/2, HEIGHT*0.4)`
- 포탑 각도는 본체 기울기(`bodyAngle`)에 상대적

### 3.3 발사 원점

포탄은 포탑 끝에서 발사된다:

```typescript
fireOrigin.x = tank.x + TANK.WIDTH / 2 + cos(angle) * turretLength
fireOrigin.y = tank.y - sin(angle) * turretLength
```

---

## 4. 이름 표시

### 4.1 멀티플레이

- 플레이어가 게임 참가 시 닉네임을 입력
- 닉네임은 탱크의 HP 바 위에 표시
- 최대 길이: 12자

### 4.2 싱글플레이

- 플레이어 탱크: `"Player"` 표시
- AI 봇 탱크: `"Bot-1"`, `"Bot-2"`, ... 순서로 표시

### 4.3 렌더링

- 위치: HP 바 상단 (탱크 위)
- 폰트: 12px, 흰색, 볼드
- 중앙 정렬 (탱크 중심 X 기준)

---

## 5. 지형 배치

### 5.1 Surface Snap

`tank.placeOnTerrain(xPos, terrainMask)` 호출 시:

1. `TerrainMask.getSurfaceY(xPos)` 로 해당 X의 지형 표면 Y를 구함
2. `tank.y = surfaceY - TANK.HEIGHT` (탱크 하단이 지형 표면에 닿도록)
3. `tank.x = xPos`
4. 본체 기울기 계산 (`bodyAngle`)

### 5.2 초기 배치 규칙

- N명 플레이어를 월드 가로 범위에 균등 분배
- 양쪽 15% 마진 확보
- 경사 45도 이상인 곳은 회피하여 인접한 평탄 지점에 배치

### 5.3 폭발 후 재배치

```
폭발 발생 → mask.explode() → 모든 생존 탱크에 placeOnTerrain(tank.x, mask) 재호출
```

- 현재: 즉시 새 표면으로 스냅 (추락 애니메이션 없음)
- 향후: 추락 데미지 적용 (`fall_height / 10`, 최대 30)

---

## 6. HP 및 데미지

### 6.1 데미지 계산

```
actual_damage = base_damage * (1 - distance / radius)
```

### 6.2 사망 판정

- `hp <= 0` → `status = 'dead'`
- 사망한 탱크는 렌더링에서 숨겨짐
- 사망한 탱크는 턴에서 스킵됨

### 6.3 자폭

- 자신의 포탄에 의한 데미지 적용됨
- 자폭 시 골드 보상 없음

---

## 7. 렌더링

### 7.1 본체

- 하부: 직사각형 (`WIDTH × HEIGHT*0.6`)
- 상부: 타원형 돔 (`WIDTH*0.35 × HEIGHT*0.4`)
- 색상: 플레이어별 고유 색상
- **본체 기울기**: `bodyAngle`만큼 회전하여 지형 경사에 맞춤

### 7.2 표시 순서 (위에서 아래)

```
1. 이름 (닉네임 / "Player" / "Bot-N")
2. HP 바
3. 포탑
4. 본체
```

### 7.3 HP 바

- 위치: 탱크 상단 10px 위
- 크기: `(TANK.WIDTH + 8) × 4px`
- HP 바 색상: >50% 녹색, 25~50% 노랑, <25% 빨강

### 7.4 플레이어 색상

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

## 8. 상태 전이

```
alive → buried (지형에 매몰)
alive → dead   (HP 0)
buried → alive (주변 폭발로 지형 제거)
buried → dead  (HP 0)
```

---

## 9. 특이사항 및 주의점

1. **좌표는 좌상단 기준**: `tank.x`, `tank.y`는 탱크 스프라이트의 좌상단. 중심이 아님.
2. **각도는 도(degree)**: 내부 저장은 도 단위. 물리 계산 시 `tank.angleRad`로 라디안 변환.
3. **본체 기울기 vs 포탑 각도**: 본체는 지형 경사에 따라 기울어지고, 포탑은 본체에 상대적으로 회전.
4. **이동과 발사는 같은 턴**: 이동 먼저, 발사 나중. 발사 후에는 이동 불가.
5. **Fuel은 턴당 리셋**: 이전 턴에 안 쓴 fuel이 이월되지 않음.
