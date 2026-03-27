# Scorched Modern - Project Rules

## Project Overview
Scorched Earth 웹 리메이크. 턴제 포병 전략 게임 (멀티플레이 + AI 솔로).

## Architecture
- **Monorepo**: npm workspaces (`packages/client`, `packages/server`, `packages/shared`)
- **Language**: TypeScript (strict mode)
- **Client**: PixiJS 8 + Preact + Vite
- **Server**: Node.js + Colyseus
- **Shared**: 클라이언트/서버 공유 타입, 상수, 물리 공식

## Code Conventions

### TypeScript
- strict mode 필수
- `any` 사용 금지 - 타입을 명시하거나 `unknown` 사용
- 인터페이스 이름에 `I` 접두어 사용하지 않음 (예: `Tank`, not `ITank`)
- enum 대신 `as const` 객체 사용
- 함수형 우선, 클래스는 게임 객체(Tank, Projectile 등) 상속 구조에만 사용

### Naming
- 파일명: `kebab-case.ts` (예: `game-manager.ts`)
- 클래스: `PascalCase` (예: `GameManager`)
- 함수/변수: `camelCase` (예: `calculateTrajectory`)
- 상수: `UPPER_SNAKE_CASE` (예: `MAX_POWER`)
- 타입/인터페이스: `PascalCase` (예: `TankState`)

### File Organization
- 한 파일에 하나의 주요 클래스 또는 관련 함수 그룹
- `index.ts`는 re-export 전용 (로직 금지)
- 공유 타입은 반드시 `packages/shared`에 정의

## Commands

```bash
# 전체 의존성 설치
npm install

# 개발 서버 (클라이언트 + 서버 동시)
npm run dev

# 클라이언트만 (포트 3000)
npm run dev:client

# 서버만 (포트 2567)
npm run dev:server

# 빌드 (shared → server → client 순서)
npm run build

# 타입 체크 (project references 기반)
npm run typecheck

# 테스트 (Vitest)
npm run test

# 테스트 (watch 모드)
npm run test:watch
```

> **Note:** ESLint는 아직 미설정. lint 스크립트는 package.json에 정의되어 있으나 eslint 패키지 설치 필요.

## Game Architecture Patterns

### State Machine
게임 플로우는 명시적 상태 머신으로 관리:
`InitRound → TurnStart → PlayerAction → ProjectileFlight → TerrainSettle → TurnEnd → RoundEnd → ShopPhase`

### Manager Pattern
핵심 시스템은 Manager 클래스로 분리:
- `GameManager` - 전체 게임 플로우 제어
- `TurnManager` - 턴 순서, 타이머 관리
- `TerrainManager` - 지형 생성, 파괴, 셀룰러 오토마타
- `WeaponManager` - 무기 팩토리, 인벤토리

### Client-Server Boundary
- 클라이언트 → 서버: 플레이어 입력만 전송 (`angle`, `power`, `weaponId`)
- 서버: 입력 검증 + 시뮬레이션 결과 브로드캐스트
- 지형 동기화: seed 기반 초기 생성 + 이벤트 기반 변경 전파
- 물리 공식은 `packages/shared/formulas.ts`에서 양쪽 공유

## Git Convention

### Commit Messages
[Conventional Commits](https://www.conventionalcommits.org/) 규격을 따른다.

```
<type>(<scope>): <description>

[optional body]
```

- **type**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`
- **scope** (선택): `client`, `server`, `shared`, `terrain`, `physics`, `weapons`, `ai`, `network`
- **description**: 명령형 현재 시제, 소문자 시작, 마침표 없음

예시:
```
feat(terrain): add perlin noise terrain generation
fix(physics): correct wind force direction in trajectory calc
docs: update GDD with weapon balance table
chore: configure eslint and prettier
```

### Branch Strategy
- `main` - 안정 브랜치
- `feature/<description>` - 새 기능 (예: `feature/terrain-destruction`)
- `fix/<description>` - 버그 수정
- `docs/<description>` - 문서 작업

### Pre-Commit Checklist
커밋 전 반드시 확인:
1. `npm run test` 통과
2. `npm run typecheck` 통과
3. 브라우저에서 기본 동작 확인 (해당하는 경우)
4. `packages/shared`의 타입 변경 시 client/server 양쪽 영향 확인

## Development Workflow

### 구현 프로세스
1. **Plan** - Sequential Thinking MCP로 작업 계획 수립
2. **Spec** - 해당 시스템의 스펙 문서 작성/확인 (`docs/game/`)
3. **Implement** - 스펙에 따라 구현
4. **Verify** - `npm run test` + `npm run typecheck` + 브라우저 확인
5. **Document** - 구현 결과에 맞게 스펙 문서 갱신, CLAUDE.md 링크 추가
6. **Commit** - 코드 + 문서를 함께 Conventional Commits 규격으로 커밋

### 게임 기능 문서화 규칙
새로운 게임 시스템(포탄, 무기, AI 등) 구현 시:
- `docs/game/<system>.md` 에 스펙 문서를 작성한다
- 포함 내용: 설정값, 상수 참조, 제약사항, 좌표/각도 규칙, 상태 전이, API 참조, 특이사항
- 기존 문서 참고 패턴: `docs/game/terrain.md`, `docs/game/tank.md`
- 구현 중 스펙이 변경되면 문서도 함께 갱신한다
- CLAUDE.md의 Game Specifications 섹션에 링크를 추가한다

### MCP Tools
- **Sequential Thinking** - 복잡한 작업의 계획 수립, 문제 분석
- **Playwright** - 브라우저 E2E 테스트, 게임 UI 검증
- **Serena** - 프로젝트 컨텍스트 관리, 세션 간 메모리

## Game Specifications

게임 시스템별 상세 스펙, 제약사항, 조건은 아래 문서를 참조:

- **[Terrain](docs/game/terrain.md)** - 지형 좌표계, TerrainMask 구조, 생성 파라미터, 파괴 로직, 렌더링
- **[Tank](docs/game/tank.md)** - 탱크 속성, 포탑 각도, 지형 배치, HP/데미지, 상태 전이, 렌더링
- **[Projectile](docs/game/projectile.md)** - 포탄 물리(Y-down), 충돌 판정, 데미지 계산, 궤적 예측, 파워 게이지
- **[Game Flow](docs/game/game-flow.md)** - 상태 머신, 턴 관리, 승패 판정, GameManager 인터페이스
- **[GDD](docs/game/GDD.md)** - 전체 게임 설계 문서
- **[Game Rules](docs/game/game-rules.md)** - 밸런스 수치, 경제, 엣지 케이스

> 구현 시 해당 시스템의 스펙 문서를 먼저 확인하고, 구현 후 변경사항이 있으면 문서도 함께 갱신할 것.

## Important Notes
- 지형 시스템의 픽셀 조작은 Web Worker에서 수행 (메인 스레드 블로킹 금지)
- PixiJS Texture 업데이트는 변경된 영역(Dirty Rect)만 갱신
- 싱글플레이 시 서버 없이 클라이언트 로컬에서 모든 로직 실행
