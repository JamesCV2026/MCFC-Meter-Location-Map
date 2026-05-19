import etihadImg from '@assets/Etihad_Stadium_1779198593346.png';
import cfaImg from '@assets/City_Football_Academy_1779198593345.png';
import coopImg from '@assets/Co-op_Live_1779198593344.png';

export interface Sticker {
  id: string;
  label: string;
  src: string;
  x: number;
  y: number;
  width: number;
  opacity?: number;
}

export const stickers: Sticker[] = [
  {
    id: 'sticker-etihad',
    label: 'Etihad Stadium',
    src: etihadImg,
    x: 37,
    y: 36,
    width: 16,
    opacity: 0.92,
  },
  {
    id: 'sticker-cfa',
    label: 'City Football Academy',
    src: cfaImg,
    x: 22,
    y: 29,
    width: 14,
    opacity: 0.92,
  },
  {
    id: 'sticker-coop',
    label: 'Co-op Live',
    src: coopImg,
    x: 26,
    y: 17,
    width: 14,
    opacity: 0.92,
  },
];
