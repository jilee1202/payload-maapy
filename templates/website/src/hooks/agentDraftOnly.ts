import type { CollectionBeforeOperationHook, PayloadRequest } from 'payload'

import { Forbidden } from 'payload'

/**
 * MCP 문(`POST /api/mcp`)으로 들어온 요청인가 — 즉 「에이전트가 한 일」인가.
 *
 * MCP 엔드포인트가 `req.payloadAPI = 'MCP'` 를 찍고, 키에 연결된 사용자에 `_strategy` 를 단다.
 * 둘 다 본다 — 하나가 바뀌어도 잠금이 조용히 풀리지 않게.
 *
 * ⚠️ 관리자 화면에서 사람이 하는 일과는 갈린다. MCP 안에서 에이전트는 연결된 계정
 *    (= 주일님 계정)으로 행세하므로 **사용자만 봐서는 못 가른다.** 문이 무엇인지를 봐야 한다.
 */
const isAgentRequest = (req: PayloadRequest): boolean => {
  const api = (req as { payloadAPI?: string }).payloadAPI
  const strategy = (req.user as null | { _strategy?: string })?._strategy

  return api === 'MCP' || strategy === 'mcp-api-key'
}

/**
 * 에이전트가 쓴 것은 **무조건 초안으로만** 남는다. 게시는 사람이 관리자 화면에서 누른다.
 *
 * 소스 수정은 PR 이 관문이 되는데 콘텐츠는 그 관문을 안 거친다. 그 자리를 메우는 잠금이다.
 *
 * ⚠️ 지시문에 *"초안으로만 써라"* 라고 적는 것은 **부탁**이지 장치가 아니다.
 *    타이르는 문장이 안 먹는다는 것은 이 프로젝트에서 네 번 확인했다. 그래서 코드로 막는다.
 *
 * ⚠️ **`beforeChange` 가 아니라 `beforeOperation` 인 이유** — Payload 는 「초안이냐 게시냐」를
 *    `beforeChange` 보다 **먼저** 정한다. 거기서 `_status` 만 고치면 본문은 초안이 되어도
 *    판정 자체는 이미 끝나 있다. `beforeOperation` 은 그 판정 **앞**이라 `draft` 를 뒤집을 수 있다.
 *
 * ⚠️ **삭제는 초안이라는 것이 없다.** 되돌릴 방법이 없으므로 아예 막는다.
 */
export const agentDraftOnly: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (!isAgentRequest(req)) {
    return
  }

  if (operation === 'delete') {
    throw new Forbidden(req.t)
  }

  if (operation !== 'create' && operation !== 'update') {
    return
  }

  const incoming = args as { data?: Record<string, unknown>; draft?: boolean }

  return {
    ...incoming,
    ...(incoming.data ? { data: { ...incoming.data, _status: 'draft' } } : {}),
    draft: true,
  } as typeof args
}
