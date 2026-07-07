import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

// Industrial diesel generator icon — a containerised genset on a skid, with
// an exhaust stack rising from the top, a radiator grille on one end, and a
// control-panel door on the other. Reads at a glance as standby power plant
// rather than a fuel pump.
//
// Typed as a lucide-compatible icon so it drops straight into assetTypeConfig
// with no other wiring changes.
export const DieselGeneratorIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color, strokeWidth = 2, className, style }, ref) => {
    const stroke = color ?? 'currentColor';
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        {/* Exhaust stack rising out of the top of the enclosure, with a small
            rain-hat / mitre cap. Offset to the left so the right side reads
            as the control-panel end. */}
        <path d="M7 9 L7 4" />
        <path d="M5.6 4 L8.4 4" />
        <path d="M5.6 4 L7 2.8" />

        {/* Skid base — short legs under the enclosure. */}
        <path d="M4 20.5 L20 20.5" />
        <path d="M5.5 19 L5.5 20.5" />
        <path d="M18.5 19 L18.5 20.5" />

        {/* Main enclosure / canopy — a wide rectangle with rounded corners. */}
        <rect x="3.5" y="9" width="17" height="10" rx="1.2" />

        {/* Radiator grille — three short vertical slats on the left end,
            suggesting the cooling air intake louvres. */}
        <path d="M5.5 11.5 L5.5 16.5" />
        <path d="M7 11.5 L7 16.5" />
        <path d="M8.5 11.5 L8.5 16.5" />

        {/* Control-panel door on the right end — small rectangle with a
            handle dot, the visual cue that this is operator-accessible kit
            rather than a pump or tank. */}
        <rect x="14" y="11.5" width="4.5" height="5" rx="0.4" />
        <circle cx="17.6" cy="14" r="0.45" fill={stroke} stroke="none" />
      </svg>
    );
  },
);
DieselGeneratorIcon.displayName = 'DieselGeneratorIcon';
