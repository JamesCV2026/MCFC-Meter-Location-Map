import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

// Wind-turbine icon — a stylised model turbine with a tapered tower, a
// visible nacelle, and three tapered blades. Beefed up vs the original
// stick-figure version because wind turbines are the focus of the
// feasibility study and should stand out from other map icons.
//
// The rotor lives in a `.wt-blades` group so it can be spun on its own —
// the `.wind-spin` class on the marker drives it (see index.css); the
// tower / base / nacelle stay still.
//
// Typed as a lucide-compatible icon so it drops straight into
// assetTypeConfig without any extra wiring.
export const WindTurbineIcon = forwardRef<SVGSVGElement, LucideProps>(
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
        {/* Slim base pad. */}
        <path d="M9 22 L15 22" />
        {/* Tower — a subtly tapered shaft drawn as a closed shape, slimmer
            than a chunky icon, wider at the base than at the nacelle. */}
        <path d="M11.25 22 L11.7 10 L12.3 10 L12.75 22 Z" fill={stroke} stroke={stroke} strokeWidth="0.4" />
        {/* Three-blade rotor — spins around the hub at (12, 10). Refined
            tapered aerofoils, slimmer than the earlier chunky version. */}
        <g className="wt-blades">
          {/* Blade pointing up */}
          <path d="M12 10 L11.62 2.4 L12.38 2.4 Z" fill={stroke} stroke={stroke} strokeWidth="0.4" />
          {/* Blade pointing down-right */}
          <path d="M12 10 L18.2 13.6 L17.85 14.32 Z" fill={stroke} stroke={stroke} strokeWidth="0.4" />
          {/* Blade pointing down-left */}
          <path d="M12 10 L5.8 13.6 L6.15 14.32 Z" fill={stroke} stroke={stroke} strokeWidth="0.4" />
          {/* Nacelle — clean disc, no extra ornamentation. */}
          <circle cx="12" cy="10" r="1.3" fill={stroke} stroke="none" />
        </g>
      </svg>
    );
  },
);
WindTurbineIcon.displayName = 'WindTurbineIcon';
