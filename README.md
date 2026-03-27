# Scorched Modern

Scorched Earth의 현대적 웹 리메이크. 브라우저에서 친구들과 실시간 멀티플레이하거나 AI와 솔로 대전할 수 있는 턴제 포병 전략 게임.

## Features

- **파괴 가능 지형** - 픽셀 단위 지형 파괴 + 모래 물리 시뮬레이션
- **온라인 멀티플레이** - 2~8인, 방 코드로 친구 초대
- **AI 대전** - 4단계 난이도 AI와 솔로 플레이
- **특수 무기** - 모래주머니탄, 나팔탄, 특이점 폭탄 등
- **경제 시스템** - 킬/적중 보상으로 상점에서 무기 구매

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Rendering | PixiJS 8 (WebGL 2.0) |
| UI | Preact + HTM |
| Multiplayer | Colyseus |
| Build | Vite |
| Server | Node.js |

## Project Structure

```
scorched-modern/
├── packages/
│   ├── client/     # 브라우저 게임 클라이언트
│   ├── server/     # Colyseus 게임 서버
│   └── shared/     # 공유 타입, 상수, 물리 공식
└── docs/
    └── GDD.md      # Game Design Document
```

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (클라이언트 + 서버 동시)
npm run dev

# 클라이언트만
npm run dev:client

# 서버만
npm run dev:server

# 빌드
npm run build
```

## Development

- 게임 설계: [GDD](docs/game/GDD.md) | [게임 규칙](docs/game/game-rules.md)
- 개발 로드맵: [ROADMAP](docs/dev/ROADMAP.md)

## License

MIT
