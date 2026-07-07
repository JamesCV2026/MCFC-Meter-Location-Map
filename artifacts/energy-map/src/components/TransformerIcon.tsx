import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

// Transformer icon — a stylised pad-mount transformer with two HV bushings
// poking out the top and cooling fins on the sides. Reads instantly as
// distribution gear rather than a generic "activity" trace.
//
// Typed as a lucide-compatible icon so it drops straight into
// assetTypeConfig without any other wiring changes.
export const TransformerIcon = forwardRef<SVGSVGElement, LucideProps>(
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
        {/* Two HV bushings poking out of the top of the tank.
            Drawn as short vertical posts with rounded caps. */}
        <path d="M8.5 6 L8.5 3" />
        <circle cx="8.5" cy="2.6" r="0.7" fill={stroke} stroke="none" />
        <path d="M15.5 6 L15.5 3" />
        <circle cx="15.5" cy="2.6" r="0.7" fill={stroke} stroke="none" />

        {/* Main tank body — a rounded rectangle. */}
        <rect x="4.5" y="6" width="15" height="13" rx="1.5" />

        {/* Cooling fins / radiator slats — three horizontal lines down the
            front of the tank to suggest the corrugated cooler surface. */}
        <path d="M7.5 10.5 L16.5 10.5" />
        <path d="M7.5 13 L16.5 13" />
        <path d="M7.5 15.5 L16.5 15.5" />

        {/* Base pad. */}
        <path d="M6.5 21 L17.5 21" />
        <path d="M7.5 19 L7.5 21" />
        <path d="M16.5 19 L16.5 21" />
      </svg>
    );
  },
);
TransformerIcon.displayName = 'TransformerIcon';
