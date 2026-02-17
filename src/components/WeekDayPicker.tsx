import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, isSameDay, isAfter, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";

const DAY_LABELS = ["M", "T", "O", "T", "F", "L", "S"];

interface WeekDayPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  markedDates?: string[]; // ISO date strings that have data
  weekMode?: boolean; // If true, highlight entire week instead of single day
}

export default function WeekDayPicker({ selectedDate, onDateChange, markedDates = [], weekMode = false }: WeekDayPickerProps) {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const canGoForward = !isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }));

  const goBack = () => onDateChange(addWeeks(selectedDate, -1));
  const goForward = () => {
    if (canGoForward) onDateChange(addWeeks(selectedDate, 1));
  };

  const weekLabel = `${format(weekStart, "d MMM", { locale: sv })} – ${format(addDays(weekStart, 6), "d MMM", { locale: sv })}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground font-medium">{weekLabel}</span>
        <Button variant="ghost" size="icon" onClick={goForward} disabled={!canGoForward} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const iso = format(day, "yyyy-MM-dd");
          const isSelected = weekMode
            ? true // In week mode all days in the week are "selected"
            : isSameDay(day, selectedDate);
          const isFuture = isAfter(day, today);
          const hasData = markedDates.includes(iso);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={i}
              onClick={() => !isFuture && onDateChange(day)}
              disabled={isFuture}
              className={`
                flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-colors relative
                ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}
                ${isFuture ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                ${isToday && !isSelected ? "ring-1 ring-primary/50" : ""}
              `}
            >
              <span>{DAY_LABELS[i]}</span>
              <span className="text-[10px] opacity-70">{format(day, "d")}</span>
              {hasData && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
              {hasData && isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
