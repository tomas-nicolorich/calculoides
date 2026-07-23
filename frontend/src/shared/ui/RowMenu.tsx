import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";

interface RowMenuProps {
  onEdit?: () => void;
  onDelete: () => void;
}

export function RowMenu({ onEdit, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 120,
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        className="inline-grid place-items-center rounded-lg border border-transparent bg-transparent text-slate-400 dark:text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-balance focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer h-7 w-7 hover:text-brand-balance"
        onClick={handleToggle}
        aria-label="Row options"
      >
        <MoreVertical size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: `${coords.top.toString()}px`,
              left: `${coords.left.toString()}px`,
              width: "120px",
            }}
            className="z-50 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1 animate-in fade-in duration-100"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {onEdit && (
              <button
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-brand-expense hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
