import React from 'react'

export const metadata = {
  description: '사이트입니다.',
  title: '홈',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
