import type { Access } from 'payload'

import { isMcpApiKey } from './isMcpApiKey'

export const authenticatedOrPublished: Access = ({ req }) => {
  // MCP API 키로 옆문에 들어온 요청은 손님과 똑같이 게시된 것만 본다.
  if (req.user && !isMcpApiKey(req)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
