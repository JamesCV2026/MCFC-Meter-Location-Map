import etihadStickerImg from '@assets/Etihad_Stadium_Sticker_1779201530235.png';
import joieStickerImg from '@assets/Joie_Stadium_Sticker_1779201530237.png';
import performanceStickerImg from '@assets/Performance_Centre_sticker_1779201530237.png';
import coopStickerImg from '@assets/Co-op_Live_sticker_1779201530238.png';
import campusNewImg from '@assets/Sticker_new_1779202118064.png';
import stadiumNewImg from '@assets/dggrggrgrgrg_1779202118064.png';

export interface Sticker {
  id: string;
  label: string;
  src: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
}

export const stickers: Sticker[] = [
  {
    id: 'sticker-etihad',
    label: 'Etihad Stadium',
    src: etihadStickerImg,
    x: 37,
    y: 40,
    width: 13,
    rotation: 0,
  },
  {
    id: 'sticker-joie',
    label: 'Joie Stadium',
    src: joieStickerImg,
    x: 23,
    y: 30,
    width: 9,
    rotation: 0,
  },
  {
    id: 'sticker-performance',
    label: 'Performance Centre',
    src: performanceStickerImg,
    x: 30,
    y: 35,
    width: 10,
    rotation: 0,
  },
  {
    id: 'sticker-coop',
    label: 'Co-op Live',
    src: coopStickerImg,
    x: 27,
    y: 18,
    width: 10,
    rotation: 0,
  },
  {
    id: 'sticker-campus-new',
    label: 'Etihad Campus',
    src: campusNewImg,
    x: 33,
    y: 30,
    width: 11,
    rotation: 0,
  },
  {
    id: 'sticker-stadium-new',
    label: 'Stadium',
    src: stadiumNewImg,
    x: 50,
    y: 28,
    width: 11,
    rotation: 0,
  },
];
