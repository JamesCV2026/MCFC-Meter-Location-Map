import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

// Substation icon — a stylised compact substation switchyard, drawn from
// the front: two HV portal masts with insulator stacks, a horizontal busbar
// strung between them, a vertical dropper carrying current down into a
// transformer/equipment enclosure, and a ground line. Reads instantly as a
// substation rather than the generic "building" silhouette lucide ships.
//
// Typed as a lucide-compatible icon so it drops straight into
// assetTypeConfig without any other wiring changes.
export const SubstationIcon = forwardRef<SVGSVGElement, LucideProps>(
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
        {/* Two HV portal masts (the lattice steel towers at either side of a
            switchyard). Drawn as short verticals with insulator caps. */}
        <path d="M5 9 L5 3.5" />
        <circle cx="5" cy="3" r="0.75" fill={stroke} stroke="none" />
        <path d="M19 9 L19 3.5" />
        <circle cx="19" cy="3" r="0.75" fill={stroke} stroke="none" />

        {/* Horizontal busbar strung between the two masts. */}
        <path d="M3.5 9 L20.5 9" />

        {/* Two vertical droppers carrying current down off the busbar into
            the equipment compound. */}
        <path d="M9 9 L9 13" />
        <path d="M15 9 L15 13" />

        {/* Equipment compound — the transformer / switchgear enclosure. */}
        <rect x="6" y="13" width="12" height="6" rx="0.8" />

        {/* Three internal radiator slats hint at a transformer tank. */}
        <path d="M8.5 15 L15.5 15" />
        <path d="M8.5 17 L15.5 17" />

        {/* Ground line / yard base. */}
        <path d="M3.5 21 L20.5 21" />
      </svg>
    );
  },
);
SubstationIcon.displayName = 'SubstationIcon';
