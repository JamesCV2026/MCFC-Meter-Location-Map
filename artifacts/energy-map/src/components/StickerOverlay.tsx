import { useState } from 'react';
import { Sticker } from '@/data/stickers';

interface StickerOverlayProps {
  sticker: Sticker;
}

export function StickerOverlay({ sticker }: StickerOverlayProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-testid={`sticker-${sticker.id}`}
      className="absolute"
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        width: `${sticker.width}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        opacity: sticker.opacity ?? 1,
        transition: 'opacity 0.2s, transform 0.2s',
        ...(hovered ? { opacity: 1, transform: 'translate(-50%, -50%) scale(1.03)' } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          boxShadow: hovered
            ? '0 8px 32px rgba(0,0,0,0.28), 0 0 0 2px rgba(255,255,255,0.9)'
            : '0 4px 16px rgba(0,0,0,0.22), 0 0 0 2px rgba(255,255,255,0.85)',
        }}
      >
        <img
          src={sticker.src}
          alt={sticker.label}
          className="w-full h-auto block"
          draggable={false}
        />
        {hovered && (
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 backdrop-blur-sm">
            <p className="text-white text-[10px] font-semibold leading-tight truncate">{sticker.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
