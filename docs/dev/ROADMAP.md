# Scorched Modern - Development Roadmap

> GDD의 Phase를 세부 태스크로 분해한 실행 로드맵.
> 각 태스크는 구현 완료 시 체크합니다.

---

## Phase 1: Core Prototype (MVP) - COMPLETE

> 목표: 2인 로컬 플레이로 "발사 → 지형 파괴" 핵심 루프 동작

### 1.1 프로젝트 셋업
- [x] monorepo 구조 (npm workspaces)
- [x] TypeScript + Vite + PixiJS 설정
- [x] Colyseus 서버 스켈레톤
- [x] shared 패키지 (types, constants, formulas)
- [x] 개발 문서 (GDD, CLAUDE.md, ROADMAP)

### 1.2 지형 시스템
- [x] Perlin Noise 기반 높이맵 생성 (`shared/src/noise.ts`)
- [x] TerrainMask 데이터 구조 (`shared/src/terrain-mask.ts`)
- [x] 지형 → PixiJS Sprite 렌더링 (`client/src/renderer/terrain-renderer.ts`)
- [x] 색상 팔레트 적용 (Grassland 테마 기본)

### 1.3 탱크 시스템
- [x] Tank 클래스 정의 (`client/src/core/tank.ts`)
- [x] 탱크 스프라이트 렌더링 (기본 도형 + HP 바)
- [x] 지형 위 배치 (표면 스냅)
- [x] 포탑 각도 표시 (상/하 방향키)
- [x] 탱크 이동 (좌/우 방향키, fuel 소비, 지형 추적)
- [x] 본체 기울기 (지형 경사에 따라 bodyAngle 회전)
- [x] 이름 표시 (HP 바 위, "Player 1" / "Bot-N")

### 1.4 포탄 물리
- [x] Step simulation 물리 (Y-down 좌표계, 중력+바람)
- [x] 포탄 이동 애니메이션 (PixiJS ticker)
- [x] 지형 충돌 판정 (TerrainMask 픽셀 체크)
- [x] 탱크 충돌 판정 (AABB, 자체 충돌 보호)
- [x] 궤적 예측선 렌더링 (점선, 0.5초 분량)
- [x] Space 홀드 차징 파워 (릴리즈로 발사)
- [x] 데미지 계산 (거리 반비례)

### 1.5 지형 파괴
- [x] Explosion Brush (원형 지형 제거)
- [x] 폭발 시각 이펙트 (파편/먼지 파티클, 중력+페이드아웃)
- [x] TerrainMask → Texture 업데이트 (Dirty Rect + ImageBitmap)

### 1.6 턴 시스템
- [x] GameManager 상태 머신 (`core/game-manager.ts`)
- [x] 이벤트 기반 로직-렌더링 분리
- [x] 2인 턴 교대
- [x] 조작: ←→ 이동, ↑↓ 각도, Space 홀드 차징, E 무기변경
- [x] HUD 하단 배치 (턴 정보, 파워 게이지, 조작법)
- [x] HP 표시 및 데미지 적용
- [x] 승패 판정 (승리 / 무승부)

---

## Phase 2: Single Player (AI)

> 목표: AI 봇과 솔로 대전 가능한 싱글플레이 완성

### 2.1 AI 엔진
- [ ] AIController 인터페이스 (`client/src/ai/ai-controller.ts`)
- [ ] 역궤적 계산 (타겟 좌표 → angle/power 산출)
- [ ] 바람 보정 포함
- [ ] 지형 장애물 검사 (경로에 산이 있는지 ray march)
- [ ] 타겟 선정 로직 (가장 가까운 적 / 위협도 기반)

### 2.2 난이도 시스템
- [ ] Easy: 목표 +-30도 랜덤 오차, 기본 포탄만
- [ ] Normal: 목표 +-15도, 2~3회차 보정
- [ ] Hard: 목표 +-5도, 1~2회차 보정
- [ ] Brutal: 거의 정확, 바람 완벽 계산

### 2.3 AI 턴 실행
- [ ] GameManager에 AI 턴 처리 통합
- [ ] AI 사고 시간 딜레이 (자연스러운 대기)
- [ ] AI 이동 결정 (위치 최적화)
- [ ] AI 차징+발사 시뮬레이션

### 2.4 싱글플레이 설정
- [ ] 게임 시작 화면 (싱글/멀티 선택)
- [ ] 봇 수 설정 (1~7)
- [ ] 봇 난이도 선택
- [ ] 플레이어 이름: "Player", 봇: "Bot-1", "Bot-2", ...

---

## Phase 3: Multiplayer

> 목표: 온라인에서 친구와 대전 가능

### 3.1 서버 게임 로직
- [ ] Colyseus GameState Schema 정의
- [ ] 서버 사이드 턴 관리
- [ ] 발사 파라미터 수신 및 검증
- [ ] 시뮬레이션 결과 브로드캐스트

### 3.2 네트워크 동기화
- [ ] seed 기반 지형 동기화
- [ ] 이벤트 기반 지형 변경 전파
- [ ] 탱크 상태 동기화
- [ ] 턴 전환 동기화

### 3.3 로비 시스템
- [ ] 방 생성 UI (이름, 인원, 설정)
- [ ] 방 참가 (코드 입력)
- [ ] 닉네임 입력 (최대 12자)
- [ ] 대기실 UI (Ready 버튼)
- [ ] 봇 추가 (수량, 난이도)
- [ ] 게임 시작 트리거

### 3.4 연결 관리
- [ ] 턴 타이머 (30초, 서버 강제)
- [ ] 연결 끊김 감지 및 AI 대체
- [ ] 재접속 처리

---

## Phase 4: Content & Polish

> 목표: 다양한 무기, 경제 시스템으로 게임성 확보

### 4.1 셀룰러 오토마타
- [ ] Web Worker 셋업
- [ ] 모래 물리 시뮬레이션 (Sand Gravity)
- [ ] Worker ↔ 메인 스레드 ImageData 전송
- [ ] Dirty Rect 최적화

### 4.2 특수 무기
- [ ] BaseProjectile 클래스 (`weapons/base-projectile.ts`)
- [ ] Heavy Shell
- [ ] MIRV (공중 분리)
- [ ] Roller (지형 표면 추적)
- [ ] Sandbag (지형 생성)
- [ ] Napalm (유체 화염 + DoT)
- [ ] Singularity Bomb (흡인 + 폭발)

### 4.3 경제 시스템
- [ ] 골드 획득 로직 (적중, 킬, 생존, 승리)
- [ ] 상점 UI
- [ ] 무기 인벤토리 관리
- [ ] 구매/사용 로직

### 4.4 맵 다양화
- [ ] 맵 테마 시스템 (색상 팔레트 + 파라미터)
- [ ] Desert, Arctic, Volcano, Moon 테마
- [ ] seed 기반 재현 가능한 생성

---

## Phase 5: Audio & Visual

> 목표: 게임 느낌을 살리는 시청각 효과

### 5.1 사운드
- [ ] 사운드 매니저 (Web Audio API)
- [ ] 발사 효과음
- [ ] 폭발 효과음
- [ ] 비행 휘파람 소리
- [ ] 턴 시작 알림
- [ ] BGM 루프

### 5.2 카메라 시스템
- [ ] 월드 뷰포트 (팬/줌)
- [ ] 현재 턴 플레이어로 자동 팬
- [ ] 포탄 추적 카메라
- [ ] 마우스 휠/핀치 줌
- [ ] 미니맵

### 5.3 배경
- [ ] 하늘 그라데이션
- [ ] 구름 패럴랙스
- [ ] 테마별 배경 변화

---

## Phase 6: Release & Optimize

> 목표: 배포 가능한 완성도

### 6.1 모바일 대응
- [ ] 터치 입력 (드래그 발사)
- [ ] 모바일 UI 레이아웃
- [ ] 가로 모드 강제
- [ ] 성능 최적화 (30fps 목표)

### 6.2 성능 최적화
- [ ] 프로파일링 (Chrome DevTools)
- [ ] TerrainMask 업데이트 최적화 (< 16ms)
- [ ] 메모리 사용량 최적화 (< 200MB)
- [ ] 번들 사이즈 최적화 (코드 스플리팅)

### 6.3 배포
- [ ] 클라이언트: Cloudflare Pages 배포
- [ ] 서버: Fly.io 배포
- [ ] 도메인 설정
- [ ] HTTPS 설정

### 6.4 밸런스
- [ ] 무기 밸런스 테스트 및 조정
- [ ] AI 난이도 밸런스
- [ ] 경제 시스템 밸런스
- [ ] 맵 생성 파라미터 조정
