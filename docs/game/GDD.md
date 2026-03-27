# Scorched Modern - Game Design Document & Technical Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-26
> **Platform:** Web (Desktop & Mobile Browser)
> **Play Modes:** Online Multiplayer (2~8 Players) / Single Player vs AI

---

## 1. Game Overview

### 1.1 Concept

Scorched Modern은 고전 턴제 포병 전략 게임 "Scorched Earth"의 현대적 웹 리메이크이다.
브라우저에서 친구들과 실시간 멀티플레이하거나, AI 상대와 솔로 플레이할 수 있다.
2D 물리 기반 포탄 궤적, 픽셀 단위 파괴 가능한 지형, 다양한 특수 무기가 핵심이다.

- **Genre:** Turn-based Artillery Strategy (2D Physics & Destructible Terrain)
- **Target Platform:** Modern Web Browsers (Chrome, Firefox, Safari, Edge)
- **Players:** 2~8명 (온라인 멀티 또는 AI 혼합)

### 1.2 Core Game Loop

```
1. Turn Start     → 바람/환경 랜덤화, 현재 플레이어 표시
2. Player Input   → 각도, 파워, 무기 선택
3. Fire           → 포탄 발사 및 물리 시뮬레이션
4. Impact         → 지형 파괴 & 데미지 계산
5. Settle         → 지형 붕괴 시뮬레이션 (모래 물리)
6. Turn End       → 경제 업데이트, 다음 플레이어로 전환
7. Round End      → 생존자 판정, 보상, 상점 단계
```

### 1.3 Key Features

- **픽셀 단위 파괴 가능 지형** - 폭발로 지형이 깎이고 모래처럼 흘러내림
- **다양한 특수 무기** - 모래주머니탄, 나팔탄, 특이점 폭탄 등
- **온라인 멀티플레이** - 친구와 방을 만들어 실시간 대전
- **AI 대전** - 난이도별 AI 상대와 솔로 플레이
- **경제 시스템** - 킬/적중 보상으로 상점에서 무기 구매

---

## 2. Technology Stack

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Renderer  │  │  Game    │  │   Network    │  │
│  │ (PixiJS)  │  │  Engine  │  │   (Colyseus  │  │
│  │ WebGL/    │  │  (TS)    │  │    Client)   │  │
│  │ Canvas    │  │          │  │              │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Terrain   │  │  Physics │  │   AI Engine  │  │
│  │ (Offscr.  │  │  (Custom │  │   (Client-   │  │
│  │  Canvas)  │  │   Calc)  │  │    side)     │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────┐    │
│  │          UI Layer (Preact + HTM)         │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                        │ WebSocket
┌─────────────────────────────────────────────────┐
│                   Server (Node.js)               │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Colyseus   │  │    Game State Authority  │  │
│  │   (Room      │  │    (Turn Validation,     │  │
│  │    Server)   │  │     Anti-cheat)          │  │
│  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 Tech Stack Detail

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript | 클라이언트/서버 코드 공유, 타입 안전성 |
| **Rendering** | PixiJS 8.17 | WebGL 2.0 기반 고성능 2D 렌더링, Canvas fallback |
| **UI** | Preact + HTM | 경량 UI 라이브러리 (3KB), 빌드 없이 JSX 유사 문법 |
| **Physics** | Custom (자체 구현) | 턴제 포물선 계산은 단순, 외부 라이브러리 불필요 |
| **Terrain** | OffscreenCanvas + ImageData | 픽셀 단위 지형 조작, Web Worker에서 셀룰러 오토마타 |
| **Multiplayer** | Colyseus 0.17 | Node.js 기반 실시간 멀티플레이 프레임워크, Room/State 동기화 내장 |
| **Transport** | WebSocket | Colyseus 내장 WebSocket, 턴제 게임에 적합한 저지연 양방향 통신 |
| **Build** | Vite | 빠른 HMR, TypeScript/ESM 네이티브 지원 |
| **Server** | Node.js + Colyseus Server | 룸 기반 매칭, 상태 권한 서버 |
| **Monorepo** | npm workspaces | 클라이언트/서버/공유 패키지 구조 |
| **Deploy** | Client: Cloudflare Pages / Server: Fly.io | 정적 자산 CDN + 게임 서버 글로벌 배포 |

### 2.3 Project Structure

```
scorched-modern/
├── packages/
│   ├── client/              # 브라우저 게임 클라이언트
│   │   ├── src/
│   │   │   ├── core/        # GameManager, TurnManager
│   │   │   ├── renderer/    # PixiJS 렌더링 레이어
│   │   │   ├── terrain/     # 지형 시스템 (파괴, 셀룰러 오토마타)
│   │   │   ├── physics/     # 궤적 계산, 충돌 판정
│   │   │   ├── weapons/     # 무기 클래스 (BaseProjectile 상속)
│   │   │   ├── ai/          # AI 엔진
│   │   │   ├── network/     # Colyseus 클라이언트 래퍼
│   │   │   ├── ui/          # Preact UI 컴포넌트
│   │   │   └── assets/      # 스프라이트, 사운드
│   │   └── index.html
│   ├── server/              # 게임 서버
│   │   ├── src/
│   │   │   ├── rooms/       # Colyseus Room 정의
│   │   │   ├── state/       # 공유 게임 상태 스키마
│   │   │   └── logic/       # 서버 사이드 검증 로직
│   │   └── index.ts
│   └── shared/              # 클라이언트/서버 공유 타입 & 상수
│       ├── types.ts
│       ├── constants.ts
│       └── formulas.ts      # 물리 공식 (양쪽에서 사용)
├── docs/
│   └── GDD.md               # 이 문서
├── package.json
└── tsconfig.base.json
```

---

## 3. Core Mechanics: Artillery Physics

### 3.1 Trajectory Calculation

포탄의 궤적은 커스텀 물리 계산으로 시뮬레이션한다. 외부 물리 엔진 없이 아래 공식을 직접 구현한다.

포탄의 위치 `(x, y)`는 시간 `t`에 따라:

```
x(t) = x0 + (v0 * cos(theta) + w) * t
y(t) = y0 + (v0 * sin(theta)) * t - 0.5 * g * t^2
```

| Symbol | Description | Default |
|--------|------------|---------|
| `v0` | 초기 발사 속도 (파워) | 0 ~ 1000 |
| `theta` | 발사 각도 (라디안) | 0 ~ PI |
| `w` | 바람 힘 (수평 가속도) | -200 ~ +200 |
| `g` | 중력 가속도 | 980 |

**구현 방식:**
- `shared/formulas.ts`에 궤적 함수를 정의하여 클라이언트(예측선)/서버(검증) 양쪽에서 사용
- 클라이언트: `requestAnimationFrame` 기반으로 매 프레임 `dt`만큼 시간 전진하며 포탄 위치 업데이트
- 서버: 발사 파라미터(`angle`, `power`, `weapon`)만 수신하여 결과를 독립 시뮬레이션 후 검증

### 3.2 Input System

- **좌/우 방향키:** 탱크 이동 (fuel 소비, 지형 경사에 따라 본체 기울기)
- **상/하 방향키:** 포탑 각도 조절
- **Space 홀드:** 파워 차징 (누르는 동안 0→100% 증가, 떼면 발사)
- **E 키:** 무기 변경 (순환)
- **궤적 예측선:** PixiJS `Graphics`로 점선 렌더링, 바람 영향 포함한 예상 궤적 표시 (짧은 범위만)
- **HUD:** 조작 정보, 턴 표시 등은 **화면 하단**에 배치
- **모바일 대응:** 터치 드래그 + 화면 하단 각도/파워 슬라이더 UI 제공

### 3.3 Collision Detection

- 포탄의 매 프레임 위치를 지형 마스크(TerrainMask)의 픽셀 데이터와 비교
- 포탄 좌표의 Density(R channel) > 0이면 충돌 판정
- 탱크 히트박스와의 충돌은 AABB(Axis-Aligned Bounding Box) 방식으로 판정
- 화면 경계(좌/우/하단) 이탈 시 포탄 소멸

---

## 4. Destructible Terrain System

### 4.1 Data Structure (Terrain Mask)

지형은 `OffscreenCanvas`에서 `ImageData` 형태의 2D 픽셀 배열로 관리한다.

```typescript
// TerrainMask: Uint8Array (width * height * 4 channels RGBA)
// R Channel (Density): 0 (Empty) ~ 255 (Solid)
// G Channel (Material): 0 (Dirt), 128 (Rock), 255 (Indestructible)
// B Channel: Reserved (나팔탄 화염 잔류 영역 등)
// A Channel: Rendering alpha
```

- **해상도:** 게임 월드와 1:1 매핑 (예: 1920x600 월드 = 1920x600 TerrainMask)
- **초기 생성:** Perlin Noise 기반 높이맵으로 자연스러운 산악 지형 생성
- **지형 테마:** 색상 팔레트 + 표면 텍스처를 오버레이하여 시각적 다양성 확보 (사막, 눈, 화산 등)

### 4.2 Destruction (Explosion Brush)

포탄 충돌 시 피격 좌표를 중심으로 원형 영역의 지형을 제거한다.

```
for each pixel (px, py) in explosion radius R:
    distance = sqrt((px - cx)^2 + (py - cy)^2)
    if distance <= R:
        if terrainMask[py][px].G < 255:  // Indestructible 제외
            terrainMask[py][px].R = 0     // 지형 제거
```

- Rock(G=128) 소재는 폭발 반경이 50% 감소하여 적용
- 폭발 시 파편 파티클 이펙트 생성 (시각적 피드백)

### 4.3 Cellular Automata (Sand Physics)

지형 파괴 후 공중에 떠 있는 지형 픽셀이 아래로 떨어지는 모래 시뮬레이션.

```
// Web Worker에서 실행 (메인 스레드 블로킹 방지)
for y from (height - 2) down to 0:
    for x from 0 to width:
        if terrain[y][x].R > 0 && terrain[y+1][x].R == 0:
            // 아래로 이동
            terrain[y+1][x] = terrain[y][x]
            terrain[y][x] = EMPTY
        else if terrain[y+1][x].R > 0:
            // 대각선 아래로 시도 (좌/우 랜덤 우선)
            if terrain[y+1][x-1].R == 0:
                move to (x-1, y+1)
            else if terrain[y+1][x+1].R == 0:
                move to (x+1, y+1)
```

- **실행 타이밍:** 폭발 이벤트 후 `TerrainSettle` 상태에서 안정화될 때까지 반복
- **최적화:** 변경된 영역(Dirty Rect)만 스캔하여 성능 확보
- **Web Worker:** 셀룰러 오토마타 계산을 별도 워커에서 실행, 결과 ImageData를 메인 스레드로 전송

### 4.4 Terrain Rendering

```
1. TerrainMask의 R > 0 인 픽셀만 활성
2. PixiJS Sprite에 동적 Texture로 바인딩
3. 폭발/붕괴 시 Texture 업데이트 (부분 업데이트로 최적화)
4. 표면 경계에 윤곽선(edge detection) 추가하여 시각적 명확성 확보
```

---

## 5. Weapons System

모든 무기는 `BaseProjectile` 클래스를 상속하며, `onCollide(x, y)` 및 `onUpdate(dt)` 메서드를 오버라이드한다.

### 5.1 Standard Weapons

| Weapon | Damage | Radius | Cost | Description |
|--------|--------|--------|------|-------------|
| **Standard Shell** | 30 | 25px | Free | 기본 포탄, 무제한 |
| **Heavy Shell** | 50 | 40px | 100G | 강화 포탄 |
| **MIRV** | 15x5 | 15px x5 | 300G | 공중에서 5발로 분산 |
| **Roller** | 25 | 20px | 150G | 지형을 따라 굴러감 |

### 5.2 Sandbag (지형 조작형: 모래주머니탄)

- **Concept:** 폭발 대신 흙더미 지형을 생성하여 방어벽 구축 또는 적 매몰
- **Logic (`onCollide`):**
  1. 피격 지점 주변에 가우시안 분포로 흙 입자(파티클) 다수 생성
  2. 각 입자는 간이 물리(중력 + 지형 충돌)로 낙하
  3. 정지한 입자는 TerrainMask R 채널에 병합되어 새 지형이 됨
  4. **매몰 판정:** 탱크 상단이 새 지형에 묻히면 'Buried' 상태 (다음 턴 이동 불가)
- **Cost:** 200G

### 5.3 Napalm (지속 데미지형: 나팔탄)

- **Concept:** 지형 경사를 타고 흐르는 유체 화염
- **Logic:**
  1. 충돌 시 화염 파티클 다수 생성
  2. 파티클은 간이 유체 물리로 경사를 따라 흘러내림 (지형 표면 추적)
  3. 화염 영역의 TerrainMask R 값을 매 프레임 감소 (지형 용해)
  4. 화염 영역에 있는 탱크는 매 턴 DoT 데미지 적용 (3턴 지속)
- **TerrainMask B Channel:** 화염 잔류 영역 마킹에 활용
- **Cost:** 350G

### 5.4 Singularity Bomb (질량 조작형: 특이점 폭탄)

- **Concept:** 반경 내 모든 객체를 끌어당기는 블랙홀
- **Logic:**
  1. 충돌 시 Blackhole Core 생성 (즉시 폭발 안 함)
  2. 1초 후 중력장 활성화: 반경 내 모든 탱크 및 파편에 인력 적용
  3. 인력 공식: `F = k / r` (거리에 반비례, 밸런스용)
  4. 3초 후 중력장 붕괴 + 폭발: 압축 데미지 일괄 적용
- **시각 효과:** 반경 내 배경 왜곡(PixiJS DisplacementFilter), 흡입 파티클
- **Cost:** 500G

### 5.5 MIRV (다탄두 분산형)

- **Concept:** 포물선 정점에서 다수 자탄으로 분리
- **Logic:**
  1. 일반 포물선으로 비행
  2. 포물선 정점(vy <= 0 전환 시점) 도달 시 5개 자탄으로 분리
  3. 각 자탄은 원래 속도 + 랜덤 수평 분산값으로 독립 비행
  4. 각 자탄 개별 충돌 및 폭발 처리
- **Cost:** 300G

---

## 6. Game State Machine

### 6.1 State Flow

```
InitRound → TurnStart → PlayerAction → ProjectileFlight → TerrainSettle → TurnEnd
    ↑                                                                        │
    │           ┌──────────────────────────────────────────────────┐         │
    │           ↓                                                  │         │
    └──── ShopPhase ← RoundEnd ←──────────────────────────────────┘─────────┘
                         ↑ (all enemies dead or max rounds reached)
```

### 6.2 State Descriptions

| State | Description | Duration |
|-------|-------------|----------|
| **InitRound** | 지형 생성, 탱크 배치, 바람 초기화 | 1회 |
| **TurnStart** | 바람 재랜덤화, 현재 플레이어 UI 표시, 턴 타이머 시작 | ~1s |
| **PlayerAction** | 플레이어/AI 입력 대기 (각도, 파워, 무기 선택) | 최대 30s |
| **ProjectileFlight** | 포탄 물리 시뮬레이션, 충돌 판정 | ~2-5s |
| **TerrainSettle** | 셀룰러 오토마타 실행, 지형 안정화 | ~1-3s |
| **TurnEnd** | 데미지 정산, 킬 체크, 골드 지급 | ~1s |
| **RoundEnd** | 라운드 결과, 생존 보너스, MVP 표시 | ~3s |
| **ShopPhase** | 무기 구매 UI | 최대 30s |

### 6.3 Turn Timer

- PlayerAction에 30초 턴 타이머 적용
- 시간 초과 시 자동으로 기본 포탄을 랜덤 방향으로 발사
- 멀티플레이에서 AFK 방지 필수

---

## 7. Multiplayer Architecture

### 7.1 Colyseus Room Structure

```typescript
// server/src/rooms/GameRoom.ts
class GameRoom extends Room<GameState> {
    maxClients = 8;

    onCreate(options: RoomOptions) {
        // 방 설정 (맵 크기, 라운드 수, AI 슬롯 등)
    }

    onJoin(client: Client, options: JoinOptions) {
        // 플레이어 추가, 탱크 스폰 위치 할당
    }

    onMessage(client: Client, type: string, message: any) {
        // "fire" → angle, power, weapon 수신 및 검증
        // "buy_weapon" → 상점 구매 처리
        // "ready" → 다음 라운드 준비 완료
    }

    onLeave(client: Client) {
        // 탱크를 AI로 대체 또는 제거
    }
}
```

### 7.2 State Synchronization

- **Server Authority:** 서버가 게임 상태의 권한을 가짐
- **클라이언트 → 서버:** 플레이어 입력만 전송 (`{ angle, power, weaponId }`)
- **서버 → 클라이언트:**
  - 상태 변경 브로드캐스트 (Colyseus Schema 자동 직렬화)
  - 포탄 시뮬레이션 결과 (충돌 좌표, 데미지 결과)
  - 지형 변경 데이터 (변경된 영역의 diff만 전송)
- **지형 동기화:**
  - 초기 지형은 시드(seed) 값으로 동기화 (같은 seed = 같은 지형)
  - 이후 변경은 "폭발 이벤트 { x, y, radius, type }" 만 전송하여 각 클라이언트가 로컬에서 적용

### 7.3 Lobby System

```
메인 메뉴
  ├── 싱글플레이
  │   ├── 닉네임: "Player" (고정)
  │   ├── 봇 수: 1~7 (기본 1)
  │   ├── 봇 난이도: Easy / Normal / Hard / Brutal
  │   ├── 라운드 수: 3, 5, 10
  │   └── 맵 테마: 랜덤, Grassland, Desert, Arctic, Volcano, Moon
  │
  └── 멀티플레이
      ├── 방 만들기
      │   ├── 닉네임 입력 (최대 12자)
      │   ├── 방 이름 / 비밀번호 (선택)
      │   ├── 최대 참가자 수: 2~8
      │   ├── 봇 추가: On/Off, 수량, 난이도
      │   ├── 라운드 수: 3, 5, 10
      │   └── 맵 테마
      └── 방 참가
          ├── 닉네임 입력 (최대 12자)
          ├── 방 코드 입력
          └── Ready → 게임 시작
```

- 싱글: 플레이어="Player", 봇="Bot-1","Bot-2",...
- 멀티: 각자 입력한 닉네임, 봇="Bot-1","Bot-2",...
- 닉네임은 탱크 HP 바 위에 표시

### 7.4 Anti-Cheat

- 서버에서 궤적을 독립 시뮬레이션하여 클라이언트 결과와 비교
- 발사 파라미터의 유효 범위 검증 (각도 0~180, 파워 0~1000)
- 턴 타이머 서버 사이드 강제

---

## 8. AI System

### 8.1 Architecture

AI는 클라이언트 사이드에서 실행되며, 싱글플레이 시 서버 없이 로컬에서 동작한다.

```typescript
// client/src/ai/AIController.ts
interface AIController {
    calculateShot(
        myTank: Tank,
        targets: Tank[],
        terrain: TerrainMask,
        wind: number,
        difficulty: AIDifficulty
    ): { angle: number; power: number; weaponId: string };
}
```

### 8.2 Difficulty Levels

| Level | Accuracy | Behavior |
|-------|---------|----------|
| **Easy** | 목표 +-30도 랜덤 오차 | 기본 포탄만 사용, 가장 가까운 적 공격 |
| **Normal** | 목표 +-15도, 2~3회차에 보정 | 일반 무기 사용, 위협도 기반 타겟 선정 |
| **Hard** | 목표 +-5도, 1~2회차에 보정 | 전략적 무기 선택, 지형 활용 |
| **Brutal** | 거의 정확, 바람 완벽 계산 | 최적 무기 선택, 모래주머니 방어 활용 |

### 8.3 AI Shot Calculation

```
1. 타겟 선정: 위협도(HP, 거리, 무기) 기반 우선순위
2. 역궤적 계산: 목표 좌표에서 역으로 angle/power 산출
   - 바람 보정 포함
   - 지형 장애물 검사 (ray march로 경로 확인)
3. 난이도별 오차 적용: 계산된 값에 가우시안 노이즈 추가
4. 학습 보정: 이전 발사 결과(착탄 지점)를 기반으로 다음 발사 보정
```

### 8.4 Multiplayer + AI 혼합

- 멀티플레이 방에서 빈 슬롯에 AI를 배치 가능
- AI 턴은 서버에서 계산하여 처리 (클라이언트가 아닌 서버 사이드)
- 호스트가 AI 난이도 설정

---

## 9. Economy System

### 9.1 Gold Acquisition

| Event | Gold Reward |
|-------|-----------|
| 적 적중 (데미지 비례) | `damage * 2` |
| 적 킬 | 200G 보너스 |
| 라운드 생존 | 100G |
| 라운드 승리 | 300G |
| 시작 자금 | 500G |

### 9.2 Shop Phase

라운드 종료 후 다음 라운드 시작 전 상점 UI 표시.

```
┌─────────── SHOP ───────────┐
│  Your Gold: 1,200G         │
│                            │
│  Heavy Shell    100G  [+]  │
│  MIRV           300G  [+]  │
│  Roller         150G  [+]  │
│  Sandbag        200G  [+]  │
│  Napalm         350G  [+]  │
│  Singularity    500G  [+]  │
│  Shield (+30HP) 200G  [+]  │
│  Fuel (+Move)   100G  [+]  │
│                            │
│        [ READY ]           │
└────────────────────────────┘
```

- 무기는 소모품 (구매 수량만큼 사용 가능)
- 기본 포탄(Standard Shell)은 무제한

### 9.3 Tank Upgrades (선택적 확장)

추후 확장으로 탱크 영구 업그레이드 시스템 고려:
- 방어력 강화, 이동 거리 증가, 포탑 회전 속도 등

---

## 10. Visual & Audio Design

### 10.1 Art Style

- **2D 픽셀아트 + 현대적 이펙트** 조합
- 탱크: 심플한 스프라이트 (색상으로 플레이어 구분)
- 지형: 테마별 색상 팔레트 (사막=주황/갈색, 눈=흰/파랑, 화산=검정/빨강)
- 폭발: 파티클 시스템 (PixiJS ParticleContainer)
- 배경: 패럴랙스 스크롤링 (구름, 하늘 그라데이션)

### 10.2 Camera System

- 게임 월드가 화면보다 넓을 수 있음 (횡스크롤)
- 현재 턴 플레이어 탱크로 자동 팬
- 포탄 발사 시 포탄 추적 카메라
- 마우스 휠 / 핀치 줌 지원
- 미니맵 표시 (전체 지형 + 탱크 위치)

### 10.3 Sound Design

| Event | Sound |
|-------|-------|
| 포탄 발사 | 발사 효과음 (무기별 차별화) |
| 비행 중 | 휘파람 소리 (속도 비례 피치) |
| 폭발 | 폭발음 (크기 비례) |
| 지형 붕괴 | 모래/흙 무너지는 소리 |
| 턴 시작 | 알림음 |
| 킬 | 특수 효과음 |
| BGM | 라운드 중 긴장감 있는 루프 |

- Web Audio API 활용
- Howler.js 또는 PixiJS Sound 플러그인 사용

---

## 11. Tank System

### 11.1 Tank Properties

```typescript
interface Tank {
    id: string;
    playerId: string;
    x: number;
    y: number;
    hp: number;           // 100 (기본)
    angle: number;        // 포탑 각도 (0~180)
    color: number;        // 플레이어 색상
    fuel: number;         // 이동 연료 (턴당 리셋)
    inventory: WeaponSlot[];
    status: TankStatus;   // 'alive' | 'buried' | 'dead'
}
```

### 11.2 Movement

- **좌/우 방향키**로 이동 (fuel 소비)
- 각 턴 시작 시 fuel 리셋 (`TANK.FUEL_PER_TURN` = 100px)
- 이동 시 지형 경사를 따라 이동 (표면 추적)
- **본체 기울기**: 지형 경사에 따라 탱크 본체가 기울어짐
- 경사 45도 이상은 이동 불가
- Buried 상태면 이동 불가
- 이동은 발사 전에만 가능 (발사 후 이동 불가)

### 11.3 Tank Placement

- 라운드 시작 시 지형 위에 균등 간격으로 배치
- 지형 표면에 자동 스냅

---

## 12. Map Generation

### 12.1 Procedural Terrain

```typescript
function generateTerrain(width: number, height: number, seed: number): TerrainMask {
    // 1. Perlin Noise로 높이맵 생성
    // 2. 높이맵 아래를 Dirt(R=255, G=0)로 채움
    // 3. 깊은 층에 Rock(G=128) 분포
    // 4. 최하단에 Indestructible(G=255) 레이어
    // 5. seed 기반으로 동일 지형 재현 (멀티플레이 동기화)
}
```

### 12.2 Map Themes

| Theme | 특징 | 색상 팔레트 |
|-------|------|-----------|
| **Grassland** | 완만한 언덕 | 초록/갈색 |
| **Desert** | 평탄 + 급경사 협곡 | 주황/노랑 |
| **Arctic** | 빙하 플랫폼 | 흰/파랑 |
| **Volcano** | 높은 산 + 용암 (데미지 존) | 검정/빨강 |
| **Moon** | 낮은 중력 + 크레이터 | 회색 |

---

## 13. UI/UX Design

### 13.1 Screen Flow

```
Main Menu → Lobby (Create/Join Room) → Game → Results → Shop → Next Round
    │                                                          ↑
    └→ Single Player Setup → Game → Results → Shop ───────────┘
```

### 13.2 In-Game HUD

```
┌──────────────────────────────────────────────────────────┐
│ Wind: ← 35                    Round 2/5    Turn Timer 25s│
│                                                          │
│  [Nickname]        [Game World]              [Bot-1]     │
│  [HP Bar]                                    [HP Bar]    │
│  [Tank]               Terrain                [Tank]      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Player 1 │ Angle: 45° │ Power: ████░░ 70% │ [Shell ▶]   │
│ ←→ Move  │ ↑↓ Angle   │ [Space] Hold=Fire │ [E] Weapon  │
└──────────────────────────────────────────────────────────┘
```

- 탱크 위에: 닉네임 → HP 바 → 포탑 → 본체 순서로 표시
- HUD 하단: 현재 플레이어, 각도, 파워 게이지, 무기 선택, 조작법

### 13.3 Responsive Design

- **Desktop:** 풀 HUD, 키보드+마우스 조작
- **Tablet:** 터치 조작, 하단 컨트롤 패널 확대
- **Mobile:** 세로 모드 비권장, 가로 모드 강제 + 간소화 UI

---

## 14. Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60fps (데스크톱), 30fps (모바일) |
| Initial Load | < 3s (코드 스플리팅 + 에셋 레이지 로딩) |
| TerrainMask 업데이트 | < 16ms (Web Worker) |
| 네트워크 지연 | < 100ms (턴제이므로 관대) |
| 메모리 | < 200MB |
| 번들 사이즈 | < 500KB (gzip, 에셋 제외) |

---

## 15. Development Phases

### Phase 1: Core Prototype (MVP) - COMPLETE
- [x] 프로젝트 셋업, 지형, 탱크, 포탄, 파괴, 턴 시스템

### Phase 2: Single Player (AI)
- [ ] AI 엔진 (역궤적 계산, 타겟 선정)
- [ ] 난이도 시스템 (Easy ~ Brutal)
- [ ] 싱글플레이 설정 UI (봇 수, 난이도)

### Phase 3: Multiplayer
- [ ] Colyseus 서버 (GameState Schema, 턴 관리)
- [ ] 로비 시스템 (방 생성/참가, 닉네임 입력)
- [ ] 네트워크 동기화 (seed 지형 + 이벤트 전파)
- [ ] 연결 관리 (턴 타이머, 재접속)

### Phase 4: Content & Polish
- [ ] 셀룰러 오토마타 (모래 물리)
- [ ] 특수 무기 (Sandbag, Napalm, MIRV, Singularity 등)
- [ ] 경제 시스템 및 상점
- [ ] 맵 테마 다양화

### Phase 5: Audio & Visual
- [ ] 사운드, 카메라, 배경 패럴랙스

### Phase 6: Release & Optimize
- [ ] 모바일, 성능, 배포, 밸런스

---

## 16. Technical Decisions & Rationale

### 16.1 왜 PixiJS인가?

| 대안 | 장점 | 단점 | 결론 |
|------|------|------|------|
| **Phaser 3** | 풀 게임 엔진, 물리 내장 | 번들 크기 대(~1MB), 자유도 제한 | X - 오버킬 |
| **Raw Canvas 2D** | 의존성 없음, 직접 픽셀 조작 | WebGL 미사용 시 성능 한계, 이펙트 구현 난이도 | X - 성능 부족 |
| **PixiJS** | WebGL 기반 고성능, 경량, 유연 | 물리 엔진 미포함 | O - 최적 선택 |
| **Three.js** | 3D 가능 | 2D 게임에 불필요한 복잡성 | X - 과도 |

PixiJS는 WebGL 기반 고성능 렌더링을 제공하면서도 경량이며, 파티클 시스템/필터 등 시각 이펙트에 강점. 물리는 턴제 포물선 계산으로 자체 구현이 더 적합.

### 16.2 왜 Colyseus인가?

| 대안 | 장점 | 단점 | 결론 |
|------|------|------|------|
| **Socket.IO** | 범용, 커뮤니티 큼 | Room/State 직접 구현 필요 | X - 보일러플레이트 과다 |
| **Colyseus** | Room/State/Schema 내장, 게임 특화 | 학습 곡선 | O - 게임 서버 최적 |
| **Firebase Realtime** | 서버리스 | 턴제 게임 상태 관리 부적합, 비용 | X - 부적합 |
| **WebRTC (P2P)** | 서버 비용 없음 | 상태 동기화/치트 방지 어려움 | X - 신뢰성 부족 |

Colyseus는 Room 기반 매칭, Schema 자동 직렬화, 상태 패치 동기화를 제공하여 멀티플레이 게임 서버 개발에 최적화.

### 16.3 왜 Custom Physics인가?

턴제 포병 게임의 물리는 단순한 포물선 운동이다. Matter.js 같은 범용 물리 엔진은:
- 프레임 단위 연속 시뮬레이션 오버헤드
- 지형 마스크와의 통합 복잡
- 턴제 특성에 불필요한 기능 다수

직접 구현하면:
- `shared/formulas.ts`에서 클라이언트/서버 코드 공유
- 지형 마스크와 직접 충돌 판정 (픽셀 단위)
- 서버 사이드 검증이 간단

---

## Appendix A: Key Constants

```typescript
// shared/constants.ts
export const GAME = {
    WORLD_WIDTH: 1920,
    WORLD_HEIGHT: 1080,
    TERRAIN_HEIGHT: 600,        // 지형 최대 높이
    GRAVITY: 980,
    MAX_POWER: 1000,
    TURN_TIME_LIMIT: 30,        // seconds
    MAX_PLAYERS: 8,
    STARTING_GOLD: 500,
} as const;

export const WIND = {
    MIN: -200,
    MAX: 200,
    CHANGE_PER_TURN: 50,       // 턴마다 최대 변화량
} as const;

export const TANK = {
    HP: 100,
    WIDTH: 32,
    HEIGHT: 24,
    FUEL_PER_TURN: 100,        // 픽셀 이동 거리
    MAX_CLIMB_ANGLE: 45,       // 도 (이동 가능 최대 경사)
} as const;
```

## Appendix B: Network Message Types

```typescript
// shared/types.ts
type ClientMessage =
    | { type: 'fire'; angle: number; power: number; weaponId: string }
    | { type: 'move'; direction: 'left' | 'right'; distance: number }
    | { type: 'buy'; weaponId: string; quantity: number }
    | { type: 'ready' }
    | { type: 'chat'; text: string };

type ServerMessage =
    | { type: 'turn_start'; playerId: string; wind: number }
    | { type: 'fire_result'; trajectory: Point[]; impacts: Impact[] }
    | { type: 'terrain_update'; explosions: Explosion[] }
    | { type: 'damage'; tankId: string; amount: number; newHp: number }
    | { type: 'kill'; tankId: string; killerId: string }
    | { type: 'round_end'; results: RoundResult }
    | { type: 'game_end'; winner: string; stats: GameStats };
```
