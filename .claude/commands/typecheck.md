TypeScript 타입 체크를 실행합니다.

1. `npm run typecheck` (tsc -b)를 실행합니다.
2. 에러가 있으면 각 에러를 분석하고 수정합니다.
3. 에러가 없으면 "타입 체크 통과"를 보고합니다.

$ARGUMENTS가 있으면:
- "shared" → `npx tsc -b packages/shared`
- "client" → `npx tsc -b packages/client`
- "server" → `npx tsc -b packages/server`
