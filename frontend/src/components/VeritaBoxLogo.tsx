import { cn } from "@/lib/utils";

export function VeritaBoxLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 170 40" 
      className={className}
      fill="currentColor"
    >
      <text 
        x="0" 
        y="32" 
        fontFamily="inherit" 
        fontSize="32" 
        fontWeight="500" 
        letterSpacing="-0.04em"
      >
        VeritaBox
      </text>
    </svg>
  );
}
