import React from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SectionFilterProps {
  searchFilter: string
  setSearchFilter: React.Dispatch<React.SetStateAction<string>>
}

export const SectionFilter: React.FC<SectionFilterProps> = ({
  searchFilter,
  setSearchFilter,
}) => {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search sections..."
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
