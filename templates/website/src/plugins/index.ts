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

  if (apiKeys) {
    apiKeys.access = {
      ...(apiKeys.access ?? {}),
      admin: authenticated,
      create: authenticated,
      delete: authenticated,
      read: authenticated,
      update: authenticated,
    }
  }

  return config
}

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
  // ⚠️ 지금은 「읽기」만 연다. 쓰기(create/update/delete)는 승인 게이트가 아직 없어서 닫아 둔다.
  //    권한은 관리자 화면에서 실시간으로 켜고 끌 수 있다.
  mcpPlugin({
    collections: {
      categories: { enabled: { create: false, delete: false, find: true, update: false } },
      pages: { enabled: { create: false, delete: false, find: true, update: false } },
      posts: { enabled: { create: false, delete: false, find: true, update: false } },
    },
  }),
  // ⚠️ MCP 키가 「자기 권한 설정」을 스스로 고치지 못하게 막는다.
  //    키 컬렉션은 플러그인이 만들고 access 를 안 정해서 Payload 기본값(로그인만 하면 됨)이 붙는다.
  //    그대로 두면 에이전트가 옆문으로 자기 토글을 켤 수 있다. 그래서 뒤에서 덧씌운다.
  //    MCP 문 자체는 이 검사를 안 지난다(플러그인이 키를 직접 조회한다). 그래서 안 깨진다.
  lockMcpApiKeys,
]