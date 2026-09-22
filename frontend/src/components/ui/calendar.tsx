import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { format, setMonth, setYear, getYear } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const [view, setView] = React.useState<"day" | "month" | "year">("day");
  
  // We need to keep track of the month being displayed to allow year/month selection to update it
  const [currentMonth, setCurrentMonth] = React.useState<Date>(props.month || props.defaultMonth || new Date());

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(currentMonth, monthIndex);
    setCurrentMonth(newDate);
    if (props.onMonthChange) props.onMonthChange(newDate);
    setView("day");
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(currentMonth, year);
    setCurrentMonth(newDate);
    if (props.onMonthChange) props.onMonthChange(newDate);
    setView("month");
  };

  const years = React.useMemo(() => {
    const currentYear = getYear(new Date());
    const startYear = props.fromYear || 1900;
    const endYear = props.toYear || currentYear;
    const arr = [];
    for (let i = endYear; i >= startYear; i--) arr.push(i);
    return arr;
  }, [props.fromYear, props.toYear]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    <div className={cn("p-2 sm:p-3 w-[260px] sm:w-[280px]", className)}>
      {/* Custom Header */}
      <div className="flex items-center justify-between px-1 pb-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView(view === "month" ? "day" : "month")}
            className="text-[12px] sm:text-[13px] font-bold uppercase tracking-widest hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-secondary"
          >
            {format(currentMonth, "MMMM")}
          </button>
          <button
            type="button"
            onClick={() => setView(view === "year" ? "day" : "year")}
            className="text-[12px] sm:text-[13px] font-bold uppercase tracking-widest hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-secondary"
          >
            {format(currentMonth, "yyyy")}
          </button>
        </div>
        
        {view === "day" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
                if (props.onMonthChange) props.onMonthChange(prev);
              }}
              className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
                if (props.onMonthChange) props.onMonthChange(next);
              }}
              className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="h-[260px] sm:h-[280px] flex flex-col justify-center">
        {view === "day" && (
          <DayPicker
            showOutsideDays={showOutsideDays}
            fixedWeeks
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "hidden", // Hide default caption as we use custom header
              nav: "hidden",     // Hide default nav as we use custom buttons
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-[0.7rem] sm:text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-8 w-8 sm:h-9 sm:w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100"),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
              ...classNames,
            }}
            {...props}
          />
        )}

        {view === "month" && (
          <div className="grid grid-cols-3 gap-2 h-full items-center animate-in fade-in zoom-in-95 duration-200">
            {months.map((m, i) => (
              <button
                key={m}
                onClick={() => handleMonthSelect(i)}
                className={cn(
                  "h-12 sm:h-14 rounded-md text-[12px] sm:text-[13px] font-bold uppercase tracking-widest transition-all",
                  getYear(currentMonth) === getYear(new Date()) && i === new Date().getMonth() 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {view === "year" && (
          <div className="grid grid-cols-3 gap-2 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border animate-in fade-in zoom-in-95 duration-200">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => handleYearSelect(y)}
                className={cn(
                  "h-10 sm:h-12 rounded-md text-[12px] sm:text-[13px] font-bold tracking-widest transition-all",
                  y === getYear(currentMonth) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
