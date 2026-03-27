# Terrain System Specification

> 지형 시스템의 설정, 제약사항, 특이사항, 조건을 정의합니다.
> 구현 코드: `shared/src/terrain-mask.ts`, `shared/src/noise.ts`, `client/src/terrain/terrain-generator.ts`

---

## 1. 좌표계

- 원점 `(0, 0)`: 화면 좌상단
- X축: 오른쪽 증가 (0 ~ WORLD_WIDTH-1)
- Y축: **아래쪽 증가** (0 ~ WORLD_HEIGHT-1)
- 따라서 "지형 표면이 높다" = Y 값이 작다

| 상수 | 값 | 설명 |
|------|-----|------|
| `GAME.WORLD_WIDTH` | 1920 | 월드 가로 해상도 |
| `GAME.WORLD_HEIGHT` | 1080 | 월드 세로 해상도 |

---

## 2. TerrainMask 데이터 구조

`Uint8Array` 기반의 2D 픽셀 배열. 각 픽셀은 4바이트 RGBA.

| Channel | 용도 | 값 범위 |
|---------|------|---------|
| **R** (Density) | 지형 밀도 | `0` = 빈 공간, `255` = 고체 |
| **G** (Material) | 소재 타입 | `0` = Dirt, `128` = Rock, `255` = Indestructible |
| **B** | Reserved | 화염 잔류 영역 등 (미구현) |
| **A** | Alpha | Density > 0 이면 255, 아니면 0 |

### 소재별 특성

| 소재 | G값 | 파괴 가능 | 폭발 반경 감소 | 비고 |
|------|-----|----------|--------------|------|
| **Dirt** | 0 | O | 없음 | 일반 흙, 대부분의 지형 |
| **Rock** | 128 | O | 50% | 깊은 층에 분포, 파괴 저항 |
| **Indestructible** | 255 | X | - | 최하단 기반암 (4px 두께) |

---

## 3. 지형 생성

### 3.1 Perlin Noise 높이맵

- `PerlinNoise` 클래스 (`shared/src/noise.ts`)
- **Seed 기반**: 같은 seed → 같은 지형 (멀티플레이 동기화의 핵심)
- 1D Fractal Noise: `fractal1d(x, octaves=5, lacunarity=2.0, persistence=0.5)`
- 노이즈 입력 x를 `(x / width) * 4` 로 정규화 (4 = 지형 기복 빈도)

### 3.2 높이맵 → 지형 채우기

```
지형 표면 Y = minTerrainY + noise * terrainRange
```

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `minTerrainY` | `height * 0.3` (324) | 지형 표면의 최소 Y (가장 높은 산) |
| `maxTerrainY` | `height * 0.8` (864) | 지형 표면의 최대 Y (가장 낮은 골짜기) |
| `terrainRange` | 540 | 지형 높낮이 변동 범위 |

**레이어 구성** (표면으로부터 깊이 비율 기준):

| 깊이 비율 | 소재 | 색상 |
|----------|------|------|
| 0~2px | Dirt | 표면 잔디 (녹색) |
| 2px ~ 40% | Dirt | 흙 (갈색) |
| 40% ~ 70% | Dirt | 깊은 흙 (암갈색) |
| 70% ~ 96% | Rock | 바위 (회색) |
| 최하단 4px | Indestructible | 기반암 (어두운 회색) |

### 3.3 테마 시스템

현재 Grassland 테마만 구현. 테마는 5가지 색상으로 정의:

```typescript
interface TerrainTheme {
  surface: { r, g, b };     // 표면
  dirt: { r, g, b };        // 중간 흙
  deepDirt: { r, g, b };    // 깊은 흙
  rock: { r, g, b };        // 바위
  bedrock: { r, g, b };     // 기반암
}
```

향후 추가 예정: Desert, Arctic, Volcano, Moon

---

## 4. 지형 파괴 (Explosion Brush)

### 4.1 폭발 로직

`TerrainMask.explode(cx, cy, radius)` 호출 시:

1. 폭발 중심 `(cx, cy)` 에서 반경 `radius` 내의 모든 픽셀을 순회
2. 거리 계산: `dx² + dy² <= radius²` 인 픽셀만 대상
3. Material이 `Indestructible` (255)가 아닌 픽셀의 Density를 0으로 설정
4. Alpha도 0으로 설정 (투명화)

### 4.2 제약사항

- **Indestructible 보호**: G=255인 픽셀은 절대 파괴되지 않음
- **Rock 감쇠**: 현재 구현에서는 Rock도 동일하게 파괴됨. 추후 Rock에서 폭발 반경 50% 감소 적용 예정
- **원형 폭발만**: 현재는 원형 브러시만 지원. 비정형 폭발은 미구현

### 4.3 렌더링 갱신

폭발 후 렌더링 갱신 플로우:

```
1. mask.explode(cx, cy, radius)           → TerrainMask 데이터 갱신
2. colorData 해당 영역 투명화              → 색상 데이터 갱신
3. terrainRenderer.redrawExplosion(colorData, cx, cy, radius) → Canvas putImageData → ImageBitmap → PixiJS Texture
```

- **Dirty Rect 최적화**: 변경된 영역만 putImageData로 갱신
- **ImageBitmap 방식**: PixiJS 텍스처 캐시 우회를 위해 매번 createImageBitmap 호출

---

## 5. 셀룰러 오토마타 (미구현)

Phase 3에서 구현 예정. Web Worker 기반 모래 물리:

- 공중에 떠 있는 지형 픽셀이 아래로 떨어짐
- 대각선 이동 지원 (좌/우 랜덤 우선)
- Dirty Rect 영역만 스캔하여 성능 확보

---

## 6. 주요 API 참조

| 메서드 | 설명 |
|--------|------|
| `TerrainMask.isSolid(x, y)` | 해당 좌표가 고체인지 확인 |
| `TerrainMask.getDensity(x, y)` | R 채널 값 (0~255) |
| `TerrainMask.getMaterial(x, y)` | G 채널 값 (소재 타입) |
| `TerrainMask.getSurfaceY(x)` | x 좌표에서 가장 높은 고체 Y (없으면 height) |
| `TerrainMask.explode(cx, cy, r)` | 원형 영역 지형 제거 |
| `TerrainMask.setPixel(x, y, d, m)` | 픽셀 직접 설정 (지형 생성용) |
| `TerrainMask.inBounds(x, y)` | 좌표 범위 체크 |

---

## 7. 특이사항 및 주의점

1. **좌표 기준이 Y-down**: 수학적 좌표(Y-up)와 반대. 물리 공식 적용 시 부호 변환 필요
2. **colorData와 mask 분리**: TerrainMask는 로직용(충돌/파괴), colorData는 렌더링용. 항상 동기화 필수
3. **범위 밖 접근 안전**: `getDensity`, `isSolid` 등은 범위 밖이면 0/false 반환 (에러 없음)
4. **Seed 재현성**: 같은 seed + 같은 해상도 → 동일 지형. 서버/클라이언트 양쪽 보장
5. **PixiJS 텍스처 캐시**: `Texture.from` 캐시 문제로 ImageBitmap 방식 사용. `source.update()` 불충분
