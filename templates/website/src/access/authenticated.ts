import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

import { isMcpApiKey } from './isMcpApiKey'

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: isAuthenticated = ({ req }) => {
  // MCP API 키는 /api/mcp 문 전용이다. 옆문으로 온 것은 로그인으로 인정하지 않는다.
  if (isMcpApiKey(req)) {
    return false
  }

  return Boolean(req.user)
}
