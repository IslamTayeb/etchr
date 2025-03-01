"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import RenameDialog from "./rename-dialog";
import { SectionData } from "./sections-column";

interface SortableItemProps {
  section: SectionData;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string, newLevel?: number) => void;
}

const SortableItem = ({
  section,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center bg-secondary rounded-md hover:bg-secondary/80",
        isActive && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="flex-1 px-3.5 py-2 text-left focus:outline-none min-w-0"
        onClick={onSelect}
      >
        <span className="flex items-center gap-2.5">
            <span className={cn(
            "inline-flex items-center justify-center rounded-full h-[1.1rem] text-xs font-semibold p-1.5 text-nowrap min-w-fit",
            section.level === 1 ? "bg-primary text-primary-foreground" :
              section.level === 2 ? "bg-secondary-foreground/25" :
              section.level === 3 ? "border border-secondary-foreground/50" : ""
            )}>
            <span className="tracking-normal">{Array.from("#".repeat(section.level)).join(" ")}</span>
            </span>
          <span className="block truncate text-sm font-medium">{section.title}</span>
        </span>
      </button>
      <div className="flex-none flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <RenameDialog
              currentName={section.title}
              currentLevel={section.level}
              onRename={(newName, newLevel) => onRename(newName, newLevel || 2)}
            >
              <DropdownMenuItem>
                Rename
              </DropdownMenuItem>
            </RenameDialog>
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="cursor-move p-1.5 opacity-100" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </div>
    </li>
  );
};

export default SortableItem;
