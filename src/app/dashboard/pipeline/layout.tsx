import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Smart Pipeline | ATS | Search.Market',
}

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
