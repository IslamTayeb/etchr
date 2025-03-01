import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CustomSectionProps {
  setSelectedSectionSlugs: React.Dispatch<React.SetStateAction<string[]>>;
  setFocusedSectionSlug: React.Dispatch<React.SetStateAction<string | null>>;
  setTemplates: React.Dispatch<React.SetStateAction<{ slug: string; name: string; markdown: string }[]>>;
}

export const CustomSection: React.FC<CustomSectionProps> = ({
  setSelectedSectionSlugs,
  setFocusedSectionSlug,
  setTemplates,
}) => {
  const [customSectionName, setCustomSectionName] = useState('')

  const handleAddCustomSection = () => {
    if (customSectionName.trim()) {
      const slug = `custom-${customSectionName.toLowerCase().replace(/\s+/g, '-')}`
      setSelectedSectionSlugs((prev) => [...prev, slug])
      setFocusedSectionSlug(slug)
      setTemplates((prev) => [
        ...prev,
        {
          slug,
          name: customSectionName,
          markdown: `## ${customSectionName}`,
        },
      ])
      setCustomSectionName('')
    }
  }

  return (
    <div className="mb-4">
      <h4 className="mb-2 text-xs text-muted-foreground">Add custom section</h4>
      <div className="flex space-x-2">
        <Input
          type="text"
          value={customSectionName}
          onChange={(e) => setCustomSectionName(e.target.value)}
          placeholder="Enter section name"
          className="flex-grow"
        />
        <Button onClick={handleAddCustomSection} size="icon">
          <PlusCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
