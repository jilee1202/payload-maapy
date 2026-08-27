import type { PayloadRequest } from 'payload'

/**
 * MCP 플러그인이 발급한 API 키로 인증된 요청인가.
 *
 * 이 키는 `POST /api/mcp` 문에서만 쓰라고 만든 것인데, Payload 의 API 키 방식이라
 * 일반 REST·GraphQL 에도 그대로 로그인으로 통한다. 그러면 MCP 도구 목록으로
 * 좁혀둔 권한이 옆문으로 전부 풀린다 — 회원 목록 조회·글쓰기·삭제·버전 되돌리기까지.
 *
 * MCP 문으로 들어온 요청은 플러그인이 키에 연결된 실제 사용자로 바꿔 놓으므로
 * (`user.collection === 'users'`) 이 검사에 걸리지 않는다. 즉 MCP 는 그대로 돌아간다.
 */
export const isMcpApiKey = (req: PayloadRequest): boolean =>
  (req.user as null | { collection?: string })?.collection === 'payload-mcp-api-keys'
