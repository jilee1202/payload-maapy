import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { authenticated } from '@/access/authenticated'
import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const lockMcpApiKeys: Plugin = (config) => {
  const apiKeys = config.collections?.find(({ slug }) => slug === 'payload-mcp-api-keys')

  // ⚠️ 못 찾으면 조용히 넘어가지 않는다. 그러면 키 컬렉션이 열린 채로 배포된다 —
  //    실제로 한 번 그렇게 새어나갔다(2026-08-29). 잠금은 실패하면 멈춰야 한다.
  if (!apiKeys) {
    throw new Error(
      '[lockMcpApiKeys] payload-mcp-api-keys 컬렉션을 못 찾았다. ' +
        'mcpPlugin 보다 먼저 돌았거나 슬러그가 바뀌었다 — order 를 확인한다.',
    )
  }

  apiKeys.access = {
    ...(apiKeys.access ?? {}),
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  }

  return config
}

// ⚠️ Payload 는 플러그인을 `order` 오름차순으로 돈다(기본 0). `mcpPlugin` 이 `order: 10` 이라
//    이 값을 안 주면 우리가 먼저 돌아 컬렉션이 아직 없다. 배열 순서가 아니라 이 숫자가 순서다.
lockMcpApiKeys.order = 20

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  // MCP — 에이전트가 이 사이트에 말을 거는 문 (/api/mcp).
  // ⚠️ 2026-08-28 이전에는 「읽기」만 열려 있었다. 승인 게이트가 없었기 때문이다.
  //    이제 게이트가 생겼다 — `agentDraftOnly`(저장 직전에 무조건 초안으로 되돌린다). 그래서 한 칸을 연다.
  // ⚠️ 쓰기는 `create` 만 연다 — `update`·`delete` 는 컬렉션 어디에도 안 연다.
  //    ⑴ `update` 는 이미 게시된 글의 상태를 되돌릴 길이 하나 늘어난다.
  //    ⑵ `delete` 는 「초안」이 없어 되돌릴 방법이 없다(`agentDraftOnly` 도 던져서 막는다).
  //    ⑶ 그리고 여는 것 자체가 시험이다 — 쓸 수 있게 되어야 비로소 「잠금이 먹는가」를 잰다.
  //
  // ⚠️ 2026-08-28 (I차 3단계) — `pages.create` 와 `globals.header` 를 더 연다.
  //    ⑴ `pages.create` : 게시판은 페이지 하나다. **Pages 에도 `agentDraftOnly` 가 걸려 있어**
  //       posts 와 똑같이 초안으로 뒤집힌다. 게이트를 새로 지을 것이 없다.
  //    ⑵ `globals.header.update` : 메뉴에 얹으려면 이 문이 있어야 한다.
  //       ⚠️ **글로벌에는 「초안」이 없다.** 고치면 그 순간 손님 화면의 메뉴가 바뀐다.
  //       그래도 게이트를 안 두는 이유 — 되돌리는 데 1분이고, 최악이 「메뉴는 있는데 내용이 없다」다.
  //       ⚠️ **대신 update 는 메뉴를 통째로 덮어쓴다.** 시험 전 현재 메뉴를 기록해 둔다.
  //       (2026-08-28 기준: `/posts`(Posts) · pages 참조(Contact) 두 개)
  //    ⑶ `globals.header` 의 옆문은 그대로 막혀 있다 — `Header/config.ts` 의 `update: authenticated`.
  //       MCP 문으로 들어온 요청만 통과한다(`isMcpApiKey` 주석 참고).
  // ⚠️ 소스만으로는 안 열린다 — 관리자 화면 `MCP → API Keys` 의 키별 토글이 이중 게이트다(기본 꺼짐).
  mcpPlugin({
    collections: {
      categories: { enabled: { create: false, delete: false, find: true, update: false } },
      pages: { enabled: { create: true, delete: false, find: true, update: false } },
      posts: { enabled: { create: true, delete: false, find: true, update: false } },
    },
    globals: {
      header: { enabled: { find: true, update: true } },
    },
  }),
  // ⚠️ MCP 키가 「자기 권한 설정」을 스스로 고치지 못하게 막는다.
  //    키 컬렉션은 플러그인이 만들고 access 를 안 정해서 Payload 기본값(로그인만 하면 됨)이 붙는다.
  //    그대로 두면 에이전트가 옆문으로 자기 토글을 켤 수 있다. 그래서 뒤에서 덧씌운다.
  //    MCP 문 자체는 이 검사를 안 지난다(플러그인이 키를 직접 조회한다). 그래서 안 깨진다.
  lockMcpApiKeys,
]