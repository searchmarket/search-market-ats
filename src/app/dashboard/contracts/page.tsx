'use client'

import { useState } from 'react'
import { Plus, Search, Filter, FileText } from 'lucide-react'

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contracts & Invoicing</h1>
          <p className="text-gray-500 mt-1">Manage contracts, agreements, and invoices</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="w-5 h-5" />
          New Contract
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button className="px-4 py-2.5 text-brand-navy font-medium border-b-2 border-brand-navy">
          Contracts
        </button>
        <button className="px-4 py-2.5 text-gray-500 hover:text-gray-700">
          Invoices
        </button>
        <button className="px-4 py-2.5 text-gray-500 hover:text-gray-700">
          Templates
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-gray-700">Filters</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No contracts yet</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Create contracts for your placements and manage invoicing all in one place.
        </p>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="w-5 h-5" />
          Create Your First Contract
        </button>
      </div>
    </div>
  )
}
