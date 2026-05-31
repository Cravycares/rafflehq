"use client"
import dynamic from 'next/dynamic'

const DashboardContent = dynamic(() => import('./DashboardContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
      <div className="text-white/50">Loading dashboard...</div>
    </div>
  )
})

export default function DashboardPage() {
  return <DashboardContent />
}