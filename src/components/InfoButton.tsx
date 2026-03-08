import { useState } from "react";
import { Info, X } from "lucide-react";

interface InfoButtonProps {
  title: string;
  description: string;
}

export default function InfoButton({ title, description }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        aria-label={`Info om ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div
            className="relative z-50 w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-card border border-border shadow-lg p-5 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-200 font-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-serif text-foreground">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </>
  );
}
