import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const { id, categories, introContent, limit: limitFromProps, populateBy, selectedDocs } = props

  const limit = limitFromProps || 3

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    // ⚠️ `overrideAccess` 를 안 주면 Payload 기본값이 true 라 **권한을 통째로 무시하고
    //    초안까지 가져온다.** 2026-08-28 에 실물로 겪었다 — 에이전트가 만든 게시판 페이지에
    //    손님이 볼 수 없어야 할 초안 글 둘이 그대로 떠 있었다.
    //    ⚠️ 저장 게이트(`agentDraftOnly`)는 멀쩡했다. **새는 곳은 「쓰는 길」이 아니라 「읽는 길」이었다.**
    //    같은 저장소의 `app/(frontend)/posts/page.tsx` 는 처음부터 `overrideAccess: false` 다.
    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      overrideAccess: false,
      ...(flattenedCategories && flattenedCategories.length > 0
        ? {
            where: {
              categories: {
                in: flattenedCategories,
              },
            },
          }
        : {}),
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <div className="my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive posts={posts} />
    </div>
  )
}
