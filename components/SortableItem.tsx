import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** Show a dedicated drag handle. If false, the whole element is the handle. */
  withHandle?: boolean;
  handleClassName?: string;
};

/**
 * A wrapper that makes its children draggable+sortable via @dnd-kit/sortable.
 */
export function SortableItem({ id, children, className, withHandle = true, handleClassName }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };
  if (withHandle) {
    return (
      <div ref={setNodeRef} style={style} className={cn("relative group", className)}>
        <button
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing",
            "p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity",
            handleClassName,
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {children}
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </div>
  );
}
