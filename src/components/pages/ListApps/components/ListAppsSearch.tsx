/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { SearchBar } from '@/components/SearchBar'
import { useSearchTerm } from '@/hooks/useQueryParamState'

export const ListAppsSearch = () => {
  const { searchTermInput, setSearchTerm } = useSearchTerm()
  return (
    <SearchBar
      placeholder="Search apps"
      value={searchTermInput ?? undefined}
      onChange={(e) => setSearchTerm(e.target.value)}
      onClear={() => setSearchTerm('')}
    />
  )
}
