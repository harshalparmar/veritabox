import * as React from "react";
import { Check, ChevronsUpDown, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LocationSelectorProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  icon?: any;
}

export function LocationSelector({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage = "No results found.",
  disabled = false,
  className,
  icon: Icon
}: LocationSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-11 bg-background/50 border-border hover:bg-accent/50 transition-all duration-200 text-sm font-medium",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
            <span className="truncate">{value || placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-border bg-background/95 backdrop-blur-xl" 
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput 
            placeholder={searchPlaceholder || `Search ${placeholder.toLowerCase()}...`} 
            className="h-10 border-none focus:ring-0"
          />
          <CommandList className="max-h-[300px] scrollbar-thin scrollbar-thumb-border">
            <CommandEmpty className="py-6 text-[13px] text-muted-foreground text-center">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 cursor-pointer transition-all duration-200 border-l-2",
                    value === option 
                      ? "border-foreground bg-secondary text-foreground font-semibold" 
                      : "border-transparent hover:bg-accent/50 hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-[13px]">{option}</span>
                  {value === option && (
                    <Check className="h-4 w-4 text-foreground animate-in zoom-in-50 duration-200" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
