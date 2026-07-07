import etihadStickerImg from '@assets/Etihad_Stadium_Sticker_1779201530235.png';
import coopStickerImg from '@assets/Co-op_Live_sticker_1779201530238.png';
import campusNewImg from '@assets/Sticker_new_1779202118064.png';
import stadiumNewImg from '@assets/dggrggrgrgrg_1779202118064.png';
import mcfcBuildingImg from '@assets/MCFC_Building_Sticker.png';
import mihpBuildingImg from '@assets/MIHP_Building_Sticker.jpg';
import etihadPreviewImg from '@assets/Etihad_Stadium_Preview.jpg';

export interface Sticker {
  id: string;
  label: string;
  src: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  // When true the image is a plain (rectangular) photo and the app crops it
  // to a circle with a blue ring; pre-framed circular PNGs leave this unset.
  framed?: boolean;
  // CSS object-position for framed photos — shifts which part of a wide/tall
  // photo is shown inside the circular crop (default centre).
  objectPosition?: string;
  // Optional asset info for the click-through info panel. Placeholders are
  // shown when these are absent; real figures / CGI renders fill in later.
  images?: string[];
  consumption?: string;
  generation?: string;
  viewDataUrl?: string;
}

// x, y, width and rotation are the permanent layout for image stickers.
// Edit here to reposition/resize a sticker for good; dragging a sticker in
// the app only saves to the browser (localStorage).
export const stickers: Sticker[] = [
  {
    id: 'sticker-etihad',
    label: 'Etihad Stadium',
    src: etihadStickerImg,
    x: 39.74,
    y: 44.16,
    width: 11.29,
    rotation: 0,
    images: [etihadPreviewImg],
  },
  {
    id: 'sticker-coop',
    label: 'Co-op Live',
    src: coopStickerImg,
    x: 41.04,
    y: 18.86,
    width: 6.36,
    rotation: 0,
  },
  {
    id: 'sticker-campus-new',
    label: 'Etihad Campus',
    src: campusNewImg,
    x: 69.08,
    y: 69.41,
    width: 7.73,
    rotation: 0,
  },
  {
    id: 'sticker-stadium-new',
    label: 'Stadium',
    src: stadiumNewImg,
    x: 59.69,
    y: 58.95,
    width: 6.18,
    rotation: 0,
  },
  {
    id: 'sticker-mcfc-building',
    label: 'MCFC Building',
    src: mcfcBuildingImg,
    x: 50,
    y: 45,
    width: 9,
    rotation: 0,
  },
  {
    // id kept stable so any saved position/size carries over from the
    // previous image; this sticker now shows the MIHP building photo.
    id: 'sticker-campus-buildings',
    label: 'MIHP Building',
    src: mihpBuildingImg,
    x: 50,
    y: 55,
    width: 12,
    rotation: 0,
    framed: true,
    objectPosition: '78% 50%',
  },
];
