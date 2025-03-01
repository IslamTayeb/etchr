// frontend/app/_components/sections/rename-dialog.tsx
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RenameDialogProps {
  currentName: string;
  currentLevel?: number; // Make optional
  onRename: (newName: string, newLevel?: number) => void;
  children: React.ReactNode;
}

const RenameDialog = ({ currentName, currentLevel, onRename, children }: RenameDialogProps) => {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState(currentName)
  const [level, setLevel] = useState(currentLevel ? currentLevel.toString() : "2")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRename(newName.trim(), parseInt(level));
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
      }}>
        {children}
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => {
        e.preventDefault()
      }}>
        <form onSubmit={handleSubmit} id="rename-form">
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
            <DialogDescription>
              Enter a new name and heading level for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              id="section-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              autoComplete="off"
              autoFocus
            />
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select heading level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 (#)</SelectItem>
                <SelectItem value="2">Level 2 (##)</SelectItem>
                <SelectItem value="3">Level 3 (###)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RenameDialog;
