"use client"

import * as React from "react"
import { Check, ListTodo, FilePlus, X, Trash2 } from "lucide-react"
import { Checkbox } from "./checkbox"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { Button } from "./button"

export interface CheckListItem {
  id: string
  description: string
  isCompleted: boolean
  createdAt?: Date
  completedAt?: Date
}

interface CheckListProps {
  items: CheckListItem[]
  onItemToggle?: (id: string, completed: boolean) => void
  onItemDelete?: (id: string) => void
  onAddItem?: (text: string) => void
  className?: string
  itemClassName?: string
  title?: string
}

export function CheckList({ 
  items, 
  onItemToggle, 
  onItemDelete,
  onAddItem,
  className,
  itemClassName,
  title
}: CheckListProps) {
  const [isAdding, setIsAdding] = React.useState(false)
  const [newItemText, setNewItemText] = React.useState('')

  const handleAddItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim() && onAddItem) {
      onAddItem(newItemText.trim())
      setNewItemText('')
      setIsAdding(false)
    } else if (e.key === 'Escape') {
      setNewItemText('')
      setIsAdding(false)
    }
  }
  const handleToggle = (id: string, completed: boolean) => {
    if (onItemToggle) {
      onItemToggle(id, completed)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between  mb-2">
        {title && (
          <div className="flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            <Label className="text-md font-medium">{title}</Label>
          </div>
        )}
        {onAddItem && (
          <Button
            type="button"
            variant="ghost"
            size="default"
            className="gap-2"
            onClick={() => {
              setIsAdding(true)
              // Enfocar el input después de que se monte
              setTimeout(() => {
                const input = document.getElementById('new-checklist-item')
                input?.focus()
              }, 0)
            }}
          >
            <FilePlus className="h-4 w-4" />
            <span>Agregar</span>
          </Button>
        )}
      </div>
      {isAdding && onAddItem && (
        <div className="flex items-center gap-2 mb-2">
          <input
            id="new-checklist-item"
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleAddItem}
            onBlur={() => {
              if (!newItemText.trim()) {
                setIsAdding(false)
              }
            }}
            placeholder="Nueva tarea..."
            className="flex-1 h-9 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              if (newItemText.trim() && onAddItem) {
                onAddItem(newItemText.trim())
                setNewItemText('')
              }
              setIsAdding(false)
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              setNewItemText('')
              setIsAdding(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {/* Contenedor de tareas */}
      <div className="space-y-2 my-2 bg-background border border-border rounded-md p-2">
        {items.map((item) => (
        <div 
          key={item.id}
          className={cn(
            "flex items-center space-x-3 p-2 rounded-md",
            itemClassName
          )}
        >
          <Checkbox 
            id={item.id}
            checked={item.isCompleted}
            onCheckedChange={(checked) => handleToggle(item.id, checked as boolean)}
          />
          <Label 
            htmlFor={item.id}
            className={cn(
              "text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1",
              item.isCompleted && "line-through text-muted-foreground"
            )}
          >
            {item.description}
          </Label>
          {onItemDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onItemDelete(item.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar tarea</span>
            </Button>
          )}
        </div>
      ))}
      </div>
    </div>
  )
}
