# Projectile System Specification

> 포탄 물리, 충돌, 데미지 시스템의 설정, 제약사항, 특이사항을 정의합니다.
> 구현 코드: `client/src/core/projectile.ts`, `client/src/renderer/projectile-renderer.ts`

---

## 1. 물리 시뮬레이션

### 1.1 좌표계 (Y-down)

화면 좌표계에서 Y축은 **아래쪽이 증가**한다. 따라서:

- 위로 발사 = Y 감소
- 중력 = Y 증가 (아래로 끌어당김)

### 1.2 Step Simulation

매 프레임 속도/위치를 업데이트하는 방식으로 시뮬레이션한다:

```
// 매 프레임 (dt = delta time in seconds)
vx += wind * dt
vy += GRAVITY * dt        // GRAVITY = 980, 아래로(+)
x  += vx * dt
y  += vy * dt
```

### 1.3 초기 속도

발사 시 포탑 각도와 파워로 초기 속도를 결정한다:

```
vx = power * cos(angle)
vy = -power * sin(angle)   // 위쪽 = Y 감소이므로 부호 반전
```

- `angle`: 탱크 포탑 각도 (라디안, 0=오른쪽, PI/2=위, PI=왼쪽)
- `power`: 발사 파워 (0 ~ MAX_POWER=1000)
- Phase 1에서 바람은 0 고정

### 1.4 발사 원점

포탄은 포탑 끝에서 생성된다:

```
origin = tank.getFireOrigin()
// = (tank.x + WIDTH/2 + cos(angle) * turretLength,
//    tank.y - sin(angle) * turretLength)
```

---

## 2. 충돌 판정

### 2.1 지형 충돌

매 프레임 포탄의 정수 좌표에서 `TerrainMask.isSolid(x, y)` 체크:

- `isSolid === true` → 지형 충돌 → 폭발 처리

### 2.2 탱크 충돌

각 탱크의 AABB(Axis-Aligned Bounding Box)와 비교:

```
hit = (projectile.x >= tank.x) &&
      (projectile.x <= tank.x + TANK.WIDTH) &&
      (projectile.y >= tank.y) &&
      (projectile.y <= tank.y + TANK.HEIGHT)
```

- 발사한 탱크 자신도 충돌 대상 (자폭 가능)
- 단, 발사 직후 자기 히트박스를 벗어나기 전까지는 자체 충돌 무시

### 2.3 화면 경계

| 조건 | 결과 |
|------|------|
| `x < 0` or `x >= WORLD_WIDTH` | 소멸 (좌우 이탈) |
| `y >= WORLD_HEIGHT` | 소멸 (하단 이탈) |
| `y < 0` | **계속 비행** (위로 나갔다가 중력으로 복귀) |

---

## 3. 폭발 및 데미지

### 3.1 폭발 처리

충돌 시 해당 좌표에서 폭발:

1. `TerrainMask.explode(x, y, radius)` → 지형 파괴
2. colorData 갱신 → 렌더링 갱신
3. 반경 내 모든 탱크에 데미지 계산
4. 탱크 지형 재배치 (추락)

### 3.2 데미지 계산

```
distance = sqrt((tank_center_x - explosion_x)² + (tank_center_y - explosion_y)²)
damage = base_damage * max(0, 1 - distance / radius)
```

- `tank_center_x` = `tank.x + TANK.WIDTH / 2`
- `tank_center_y` = `tank.y + TANK.HEIGHT / 2`
- 반경 밖 (`distance > radius`) = 0 데미지
- 자기 탱크에도 적용 (자폭)

### 3.3 Phase 1 무기

| 속성 | 값 |
|------|-----|
| Standard Shell damage | 30 |
| Standard Shell radius | 25px |
| 바람 | 0 (고정) |

---

## 4. 조작

### 4.1 각도 조절

- **상 방향키**: 포탑 각도 증가 (+2도, 왼쪽으로)
- **하 방향키**: 포탑 각도 감소 (-2도, 오른쪽으로)
- 범위: 0° ~ 180°

### 4.2 파워 (Space 홀드 차징)

- **Space 키 누르고 있기**: 파워가 0%부터 증가
- **Space 키 떼기**: 현재 파워로 발사
- 파워 증가 속도: 프레임당 +1% (약 1.7초에 100%)
- 범위: 0% ~ 100% (0 ~ MAX_POWER)
- 파워 게이지 바가 차오르는 시각적 피드백

### 4.3 무기 변경

- **E 키**: 다음 무기로 순환 변경
- 현재 선택된 무기가 HUD에 표시
- Phase 1에서는 Standard Shell만 사용

### 4.4 발사 플로우

```
1. 이동 (좌/우 방향키, 선택)
2. 각도 조절 (상/하 방향키)
3. Space 홀드 → 파워 차징 → Space 릴리즈 → 발사
4. PlayerAction → ProjectileFlight 상태 전환
```

---

## 5. 궤적 예측선

현재 각도/파워 설정으로 포탄이 날아갈 경로를 점선으로 표시:

- 시뮬레이션 시간: 0.5초 분량
- 점 간격: 0.02초
- 점 개수: 25개
- 바람 포함 (Phase 1에서는 0)
- 지형/탱크 충돌 시 예측선 중단
- 색상: 흰색 반투명 (`0xffffff`, alpha 0.6)

---

## 6. 렌더링

### 6.1 포탄

- 원형: 반경 3px
- 색상: `0xffffff` (흰색)
- 비행 중에만 표시

### 6.2 궤적 예측선

- PixiJS Graphics로 점선 렌더링
- 각 점은 2px 원
- PlayerAction 상태에서만 표시

---

## 7. 상태 플로우

```
[PlayerAction]
  ├── 좌/우 방향키: 탱크 이동 (fuel 소비)
  ├── 상/하 방향키: 포탑 각도 조절
  ├── E 키: 무기 변경
  ├── 궤적 예측선 실시간 표시
  └── Space 홀드 → 차징 → Space 릴리즈 → 발사 → [ProjectileFlight]

[ProjectileFlight]
  ├── 매 프레임: 물리 업데이트 + 충돌 체크
  ├── 충돌/소멸: 폭발 처리 → [TurnEnd]
  └── 화면 이탈: 소멸 → [TurnEnd]

[TurnEnd]
  ├── 데미지 정산
  ├── 탱크 재배치 (지형 스냅)
  ├── 승패 판정
  └── 다음 턴 → [PlayerAction]
```

---

## 8. 특이사항 및 주의점

1. **Y-down 부호 주의**: 초기 vy는 `-power * sin(angle)` (위로 쏘려면 음수). 중력은 `+GRAVITY`.
2. **자체 충돌 보호**: 발사 직후 자기 탱크 히트박스 내에서는 충돌 무시. `hasLeftOrigin` 플래그로 관리.
3. **dt 일관성**: PixiJS ticker의 `deltaMS / 1000`을 사용. 고정 dt가 아니므로 프레임 독립적.
4. **정수 좌표 충돌**: `isSolid(Math.floor(x), Math.floor(y))`로 정수 변환 후 체크.
5. **shared/formulas.ts와의 관계**: `projectilePosition()`은 수학 좌표(Y-up) 기준이므로 클라이언트 step simulation과 다름. 궤적 예측에 사용 시 Y 부호 변환 필요하거나, step simulation을 직접 사용.
6. **Space 홀드 차징**: keydown에서 차징 시작, keyup에서 발사. 프레임마다 파워 증가. 최대 100%에서 자동 발사 가능 여부는 선택적.
