import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reference Check | Search.Market',
  description: 'Complete a reference check for a candidate',
}

export default function ReferenceFormLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
