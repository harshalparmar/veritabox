/** Static SVG logo  -  Network node graph representing VeritaBox */
export const StackedLogo = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Center node */}
    <circle cx="8" cy="8" r="2.8" fill={color} />
    {/* Connections */}
    <line x1="8" y1="8" x2="3.5" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="8" x2="12.5" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="8" x2="8" y2="13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    {/* Outer nodes */}
    <circle cx="3.5" cy="4" r="1.5" fill={color} />
    <circle cx="12.5" cy="4" r="1.5" fill={color} />
    <circle cx="8" cy="13.5" r="1.5" fill={color} />
  </svg>
);
