// Wren logo (11 Nov 2026). Run: node design/logo/generate-wren.mjs <output folder>
// Writes the SVG masters for the app icon and for the variations. PNGs are rendered from them in Chrome at 1024 px.
// Static artwork only: it uses SVG blur filters, which react-native-svg cannot draw.
import fs from 'fs';
const OUT = process.argv[2] || '.';

const SHAPES = {
  pear: 'M410 322 C410 370 366 396 312 420 C226 458 176 540 162 650 C150 740 132 840 132 930 C132 1030 205 1090 320 1090 L704 1090 C819 1090 892 1030 892 930 C892 840 874 740 862 650 C848 540 798 458 712 420 C658 396 614 370 614 322 Z',
  classic: 'M436 322 C436 372 400 392 330 404 C236 420 190 480 190 570 L190 930 C190 1030 250 1090 340 1090 L684 1090 C774 1090 834 1030 834 930 L834 570 C834 480 788 420 694 404 C624 392 588 372 588 322 Z',
  round: 'M420 322 C420 366 380 392 320 418 C200 470 118 584 118 734 C118 904 200 1090 340 1090 L684 1090 C824 1090 906 904 906 734 C906 584 824 470 704 418 C644 392 604 366 604 322 Z',
};
const HEART = 'M0 34 C-30 10 -46 -8 -34 -28 C-24 -44 -6 -38 0 -24 C6 -38 24 -44 34 -28 C46 -8 30 10 0 34 Z';
const star = (x, y, s, o = 1, fill = '#fff') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 C1.2 -3.4 3.4 -1.2 10 0 C3.4 1.2 1.2 3.4 0 10 C-1.2 3.4 -3.4 1.2 -10 0 C-3.4 -1.2 -1.2 -3.4 0 -10 Z" fill="${fill}" opacity="${o}"/>`;

const PALETTES = {
  raspberry: { b: ['#EF5C88', '#D32C62', '#AE174A', '#7C0E36'], light: ['#FF9DB8', '#F2668F'], deep: '#4E0621', rim: '#FFB7A0', sleeve: ['#C92A5E', '#8E1240'], brow: '#7C0E36', cheek: ['#FF9DB8', .7], glint: '#E0457A', stitch: ['#FFE7DA', .62], patch: ['#FFFFFF', '#FFEFE6', '#F3CDBE', '#E0457A'] },
  wine: { b: ['#C9668F', '#A03563', '#771C47', '#4C0C2C'], light: ['#F0A3C0', '#C9668F'], deep: '#2A0416', rim: '#FFB7A0', sleeve: ['#93305A', '#5A1034'], brow: '#4C0C2C', cheek: ['#F58BB0', .6], glint: '#C9668F', stitch: ['#FFE7DA', .55], patch: ['#FFFFFF', '#FFEFE6', '#F3CDBE', '#C9668F'] },
  peach: { b: ['#FFD9C2', '#FFB08A', '#F88B5C', '#DC6A40'], light: ['#FFFFFF', '#FFE3D3'], deep: '#9A3A1E', rim: '#FFF3EA', sleeve: ['#F88B5C', '#CF5E36'], brow: '#B24E2A', cheek: ['#FF6F96', .5], glint: '#FF9468', stitch: ['#B0184B', .5], patch: ['#F2668F', '#D32C62', '#AE174A', '#FFE7DA'] },
};
const GROUNDS = {
  peach: { bg: ['#FFE6D2', '#FFB58D', '#F4875A'], ring: '#FFFFFF', shadow: '#A8391C', sh: .42, halo: ['#FFF6EC', .75] },
  night: { bg: ['#2B3358', '#141829', '#07080F'], ring: '#FF9468', shadow: '#000000', sh: .55, halo: ['#FF9468', .5] },
  cream: { bg: ['#FFFFFF', '#FBF0EA', '#F0D9D0'], ring: '#F6C3B0', shadow: '#8E1240', sh: .28, halo: ['#FFE3D3', .9] },
  blush: { bg: ['#FFF7F4', '#FFDCE3', '#FFB4C6'], ring: '#FFFFFF', shadow: '#8E1240', sh: .3, halo: ['#FFFFFF', .85] },
  raspberry: { bg: ['#F4709A', '#D02A60', '#8E1240'], ring: '#FFFFFF', shadow: '#3A0518', sh: .5, halo: ['#FFB3C7', .55] },
};

export function wren({
  ground = 'peach', palette = 'raspberry', shape = 'pear', pose = 'wave', eyes = 'open', mouth = 'open',
  top = 'stopper', bow = false, decor = 'sparkles', tilt = -5, scale = 1, origin = [512, 512], dy = -22, patch = true,
} = {}) {
  const G = GROUNDS[ground], P = PALETTES[palette], BODY = SHAPES[shape];
  const INK = '#2A0A18';
  const ribs = (x0, n, w, y, h, gap = 3) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * w + gap / 2}" y="${y}" width="${w - gap}" height="${h}" rx="${(w - gap) / 2}" fill="url(#rib)"/>`).join('');
  const openEye = (cx, cy) => `
    <ellipse cx="${cx}" cy="${cy + 5}" rx="48" ry="60" fill="${P.deep}" opacity=".3" filter="url(#b6)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="44" ry="56" fill="url(#eye)"/>
    <ellipse cx="${cx}" cy="${cy + 28}" rx="27" ry="17" fill="${P.glint}" opacity=".5" filter="url(#b6)"/>
    <circle cx="${cx - 14}" cy="${cy - 23}" r="17" fill="#fff"/>
    <circle cx="${cx + 15}" cy="${cy + 13}" r="7" fill="#fff" opacity=".9"/>`;
  const arcEye = (cx, cy, up) => `<path d="M${cx - 42} ${cy + (up ? 12 : -4)} Q${cx} ${cy + (up ? -46 : 34)} ${cx + 42} ${cy + (up ? 12 : -4)}" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>`;
  const eye = (cx, cy, side) => {
    if (eyes === 'happy') return arcEye(cx, cy, true);
    if (eyes === 'closed') return arcEye(cx, cy, false);
    if (eyes === 'wink' && side === 'R') return arcEye(cx, cy, true);
    return openEye(cx, cy);
  };
  const mitten = (x, y, r, rot, flip = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip} 1)">
    <ellipse cx="${-r * .78}" cy="${r * .2}" rx="${r * .42}" ry="${r * .56}" transform="rotate(-28 ${-r * .78} ${r * .2})" fill="url(#mitt)"/>
    <ellipse cx="0" cy="0" rx="${r}" ry="${r * 1.08}" fill="url(#mitt)"/>
    <ellipse cx="${-r * .3}" cy="${-r * .42}" rx="${r * .34}" ry="${r * .2}" transform="rotate(-30 ${-r * .3} ${-r * .42})" fill="#fff" opacity=".9" filter="url(#b6)"/>
    <rect x="${-r * .8}" y="${r * .78}" width="${r * 1.6}" height="${r * .62}" rx="${r * .3}" fill="url(#cuff)"/>
    <g opacity=".55">${[-.45, -.15, .15, .45].map((k) => `<rect x="${r * k - 3}" y="${r * .88}" width="6" height="${r * .42}" rx="3" fill="#D9B3A6"/>`).join('')}</g></g>`;
  const raisedArm = (flip) => `<g transform="${flip ? 'translate(1024 0) scale(-1 1)' : ''}">
    <path d="M830 660 C880 620 904 566 914 506" fill="none" stroke="${P.deep}" stroke-opacity=".3" stroke-width="96" stroke-linecap="round" filter="url(#b14)" transform="translate(10 16)"/>
    <path d="M830 660 C880 620 904 566 914 506" fill="none" stroke="url(#sleeve)" stroke-width="88" stroke-linecap="round"/>
    <path d="M862 610 C888 580 900 548 906 512" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="16" stroke-linecap="round" filter="url(#b6)"/>
    ${mitten(930, 402, 72, 14)}</g>`;
  const mouthPath = 'M462 716 Q512 738 562 716 Q556 786 512 786 Q468 786 462 716 Z';
  const mouthSvg = mouth === 'open'
    ? `<path d="${mouthPath}" fill="#3A0A1C"/><clipPath id="mc"><path d="${mouthPath}"/></clipPath>
       <ellipse cx="512" cy="778" rx="30" ry="18" fill="#FF7FA4" clip-path="url(#mc)"/>
       <path d="M462 716 Q512 738 562 716" fill="none" stroke="#3A0A1C" stroke-width="9" stroke-linecap="round"/>`
    : `<path d="M468 722 Q512 764 556 722" fill="none" stroke="#3A0A1C" stroke-width="14" stroke-linecap="round"/>`;
  const bigHeart = `<g transform="translate(512 884) scale(3)">
      <path d="${HEART}" fill="${P.deep}" opacity=".4" filter="url(#b3)" transform="translate(2 5)"/>
      <path d="${HEART}" fill="url(#patch)"/>
      <path d="M-24 -22 C-20 -30 -12 -31 -8 -26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <path d="${HEART}" fill="none" stroke="${P.patch[3]}" stroke-width="1.8" stroke-dasharray="4.6 3.8" stroke-linecap="round" transform="scale(.8) translate(0 -1)"/></g>`;
  const hug = `
    <path d="M168 846 C214 880 262 898 322 902" fill="none" stroke="${P.deep}" stroke-opacity=".3" stroke-width="88" stroke-linecap="round" filter="url(#b14)" transform="translate(0 14)"/>
    <path d="M856 846 C810 880 762 898 702 902" fill="none" stroke="${P.deep}" stroke-opacity=".3" stroke-width="88" stroke-linecap="round" filter="url(#b14)" transform="translate(0 14)"/>
    <path d="M168 846 C214 880 262 898 322 902" fill="none" stroke="url(#sleeve)" stroke-width="80" stroke-linecap="round"/>
    <path d="M856 846 C810 880 762 898 702 902" fill="none" stroke="url(#sleeve)" stroke-width="80" stroke-linecap="round"/>
    <path d="M196 842 C232 866 262 876 300 880" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="14" stroke-linecap="round" filter="url(#b6)"/>
    ${bigHeart}
    ${mitten(366, 906, 62, 96, -1)}${mitten(658, 906, 62, -96)}`;
  const stopper = `<rect x="472" y="190" width="80" height="70" rx="14" fill="url(#cap)"/>
    <rect x="440" y="142" width="144" height="72" rx="34" fill="url(#cap)"/>
    <path d="M440 190 H584 V180 A34 34 0 0 1 550 214 H474 A34 34 0 0 1 440 180 Z" fill="#1C040D" opacity=".3"/>
    <g stroke="#1C040D" stroke-width="5" stroke-linecap="round" opacity=".4"><path d="M476 162V198"/><path d="M500 160V200"/><path d="M524 160V200"/><path d="M548 162V198"/></g>
    <rect x="464" y="152" width="58" height="10" rx="5" fill="#fff" opacity=".5" filter="url(#b2)"/>`;
  const pom = `<circle cx="520" cy="190" r="86" fill="${P.deep}" opacity=".3" filter="url(#b14)"/>
    ${Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `<circle cx="${512 + Math.cos(a) * 60}" cy="${168 + Math.sin(a) * 60}" r="28" fill="url(#pomG)"/>`; }).join('')}
    <circle cx="512" cy="168" r="68" fill="url(#pomG)"/>
    ${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + .3; return `<path d="M${512 + Math.cos(a) * 22} ${168 + Math.sin(a) * 22} L${512 + Math.cos(a) * 58} ${168 + Math.sin(a) * 58}" stroke="#C99F90" stroke-width="5" stroke-linecap="round" opacity=".45"/>`; }).join('')}
    <ellipse cx="484" cy="136" rx="30" ry="18" fill="#fff" opacity=".9" filter="url(#b6)"/>`;
  const bowSvg = `<g transform="translate(512 352)">
    <ellipse cx="0" cy="16" rx="96" ry="20" fill="${P.deep}" opacity=".35" filter="url(#b6)"/>
    <path d="M0 0 C-34 -44 -96 -50 -104 -8 C-110 30 -46 40 0 0 Z" fill="url(#bowG)"/><path d="M0 0 C34 -44 96 -50 104 -8 C110 30 46 40 0 0 Z" fill="url(#bowG)"/>
    <path d="M-88 -18 C-74 -34 -52 -34 -36 -24" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55" filter="url(#b2)"/>
    <path d="M-10 14 L-34 74 L-8 62 L6 20 Z" fill="url(#bowG)"/><path d="M10 14 L34 74 L8 62 L-6 20 Z" fill="url(#bowG)"/>
    <rect x="-22" y="-24" width="44" height="48" rx="18" fill="url(#bowG)"/><rect x="-22" y="-24" width="44" height="48" rx="18" fill="#000" opacity=".12"/>
    <path d="M-10 -14 q8 -6 18 -2" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/></g>`;
  const bgDecor = decor === 'moon'
    ? `<mask id="moonM"><rect width="1024" height="1024" fill="#000"/><circle cx="196" cy="214" r="78" fill="#fff"/><circle cx="232" cy="190" r="70" fill="#000"/></mask>
       <circle cx="196" cy="214" r="110" fill="#FFE3C4" opacity=".25" filter="url(#b30)"/><rect width="1024" height="1024" fill="#FFE9CF" mask="url(#moonM)"/>
       ${star(330, 150, 2.4, .9)}${star(846, 180, 3, .9)}${star(770, 96, 1.5, .7)}${star(110, 400, 1.6, .6)}${star(900, 330, 1.3, .55)}`
    : decor === 'hearts'
      ? [[176, 250, 1.5, .85, -14], [258, 150, .8, .6, 10], [852, 196, 1.1, .75, 16], [116, 420, .7, .5, -6]].map(([x, y, s, o, r]) => `<path d="${HEART}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="#fff" opacity="${o}"/>`).join('')
      : decor === 'sparkles' ? `${star(172, 262, 3.6, .95)}${star(246, 176, 1.9, .8)}${star(118, 372, 1.4, .6)}` : '';
  const lit = { pear: [318, 520, 236], classic: [330, 520, 262], round: [300, 560, 214] }[shape];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
<radialGradient id="bg" cx=".3" cy=".16" r="1.1"><stop offset="0" stop-color="${G.bg[0]}"/><stop offset=".52" stop-color="${G.bg[1]}"/><stop offset="1" stop-color="${G.bg[2]}"/></radialGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${G.halo[0]}" stop-opacity="${G.halo[1]}"/><stop offset=".6" stop-color="${G.halo[0]}" stop-opacity="${G.halo[1] * .35}"/><stop offset="1" stop-color="${G.halo[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.b[0]}"/><stop offset=".3" stop-color="${P.b[1]}"/><stop offset=".68" stop-color="${P.b[2]}"/><stop offset="1" stop-color="${P.b[3]}"/></linearGradient>
<radialGradient id="bodyLight" cx=".3" cy=".22" r=".75"><stop offset="0" stop-color="${P.light[0]}" stop-opacity=".75"/><stop offset=".5" stop-color="${P.light[1]}" stop-opacity=".25"/><stop offset="1" stop-color="${P.light[1]}" stop-opacity="0"/></radialGradient>
<linearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="${P.deep}" stop-opacity="0"/><stop offset="1" stop-color="${P.deep}" stop-opacity=".55"/></linearGradient>
<linearGradient id="rimMask" x1="0" y1="0" x2="1" y2="0"><stop offset=".7" stop-color="${P.rim}" stop-opacity="0"/><stop offset="1" stop-color="${P.rim}" stop-opacity=".7"/></linearGradient>
<linearGradient id="rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4C6B8"/><stop offset=".35" stop-color="#FFFCF8"/><stop offset=".7" stop-color="#F8E9DD"/><stop offset="1" stop-color="#DDB9AA"/></linearGradient>
<linearGradient id="collarShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9C5B55" stop-opacity=".38"/><stop offset=".25" stop-color="#9C5B55" stop-opacity="0"/><stop offset=".72" stop-color="#9C5B55" stop-opacity="0"/><stop offset="1" stop-color="#9C5B55" stop-opacity=".5"/></linearGradient>
<linearGradient id="collarV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#9C5B55" stop-opacity="0"/><stop offset="1" stop-color="#9C5B55" stop-opacity=".45"/></linearGradient>
<linearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A1028"/><stop offset=".3" stop-color="#8C2F52"/><stop offset=".62" stop-color="#4A1028"/><stop offset="1" stop-color="#240612"/></linearGradient>
<radialGradient id="mitt" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#FBEEE4"/><stop offset="1" stop-color="#DFBFB0"/></radialGradient>
<linearGradient id="cuff" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4C6B8"/><stop offset=".4" stop-color="#FFFCF8"/><stop offset="1" stop-color="#DDB9AA"/></linearGradient>
<linearGradient id="sleeve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.sleeve[0]}"/><stop offset="1" stop-color="${P.sleeve[1]}"/></linearGradient>
<radialGradient id="pomG" gradientUnits="userSpaceOnUse" cx="480" cy="128" r="150"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#FBEEE4"/><stop offset="1" stop-color="#D3A999"/></radialGradient>
<linearGradient id="bowG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC2A6"/><stop offset=".5" stop-color="#FF9468"/><stop offset="1" stop-color="#E86A3E"/></linearGradient>
<radialGradient id="eye" cx=".42" cy=".2" r=".95"><stop offset="0" stop-color="#5A2036"/><stop offset=".55" stop-color="#2A0A18"/><stop offset="1" stop-color="#12030A"/></radialGradient>
<radialGradient id="patch" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="${P.patch[0]}"/><stop offset=".6" stop-color="${P.patch[1]}"/><stop offset="1" stop-color="${P.patch[2]}"/></radialGradient>
<filter id="b2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="b6" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b14" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="b30" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="30"/></filter>
<clipPath id="bodyClip"><path d="${BODY}"/></clipPath>
<clipPath id="aboveHem"><rect x="0" y="0" width="1024" height="1014"/></clipPath>
<clipPath id="collarClip"><rect x="368" y="232" width="288" height="112" rx="54"/></clipPath>
</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<circle cx="512" cy="600" r="560" fill="url(#halo)"/>
<g fill="none" stroke="${G.ring}" filter="url(#b3)"><circle cx="512" cy="640" r="452" stroke-width="30" opacity=".2"/><circle cx="512" cy="640" r="548" stroke-width="26" opacity=".13"/><circle cx="512" cy="640" r="640" stroke-width="22" opacity=".08"/></g>
${bgDecor}
<g transform="translate(${origin[0]} ${origin[1]}) scale(${scale}) translate(${-origin[0]} ${-origin[1]}) translate(0 ${dy}) rotate(${tilt} 512 760)">
  <path d="${BODY}" fill="${G.shadow}" opacity="${G.sh}" filter="url(#b30)" transform="translate(22 34)"/>
  ${pose === 'wave' || pose === 'cheer' ? raisedArm(false) : ''}${pose === 'cheer' ? raisedArm(true) : ''}
  ${top === 'stopper' ? stopper : ''}
  <path d="${BODY}" fill="url(#body)"/>
  <g clip-path="url(#bodyClip)">
    <rect x="100" y="300" width="824" height="800" fill="url(#bodyLight)"/>
    <ellipse cx="${lit[0]}" cy="${lit[1]}" rx="150" ry="84" transform="rotate(-36 ${lit[0]} ${lit[1]})" fill="#fff" opacity=".3" filter="url(#b30)"/>
    <g transform="translate(${lit[2] - 236} 0)"><path d="M236 580 C244 516 286 474 338 452 C352 446 360 460 348 470 C304 500 276 536 264 586 C260 602 234 598 236 580 Z" fill="#fff" opacity=".5" filter="url(#b2)"/>
    <circle cx="240" cy="632" r="11" fill="#fff" opacity=".42" filter="url(#b2)"/></g>
    <rect x="100" y="300" width="824" height="800" fill="url(#bodyShade)"/>
    <path d="${BODY}" fill="none" stroke="url(#rimMask)" stroke-width="40" filter="url(#b6)"/>
    <ellipse cx="512" cy="352" rx="190" ry="46" fill="${P.deep}" opacity=".5" filter="url(#b14)"/>
    <path d="${BODY}" fill="none" stroke="${P.stitch[0]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="20 17" opacity="${P.stitch[1]}" transform="translate(512 706) scale(.915 .925) translate(-512 -706)" clip-path="url(#aboveHem)"/>
    <g>
      <rect x="100" y="946" width="824" height="160" fill="#F8E9DD"/>
      ${ribs(93, 24, 35, 950, 150, 5)}
      <rect x="100" y="938" width="824" height="16" fill="${P.deep}" opacity=".3" filter="url(#b6)"/>
      <rect x="100" y="946" width="824" height="5" fill="#fff" opacity=".8"/>
      <rect x="100" y="946" width="824" height="160" fill="url(#collarShade)"/>
    </g>
  </g>
  <rect x="356" y="318" width="312" height="40" rx="20" fill="${P.deep}" opacity=".3" filter="url(#b6)"/>
  <g clip-path="url(#collarClip)">
    <rect x="368" y="232" width="288" height="112" fill="#F8E9DD"/>
    ${ribs(371, 9, 31.4, 226, 124, 4)}
    <rect x="368" y="232" width="288" height="112" fill="url(#collarShade)"/>
    <rect x="368" y="232" width="288" height="112" fill="url(#collarV)"/>
    <rect x="368" y="262" width="288" height="7" fill="#9C5B55" opacity=".16" filter="url(#b2)"/>
  </g>
  ${top === 'pom' ? pom : ''}
  ${bow ? bowSvg : ''}
  <ellipse cx="296" cy="742" rx="54" ry="32" fill="${P.cheek[0]}" opacity="${P.cheek[1]}" filter="url(#b14)"/>
  <ellipse cx="728" cy="742" rx="54" ry="32" fill="${P.cheek[0]}" opacity="${P.cheek[1]}" filter="url(#b14)"/>
  ${eyes === 'closed' ? '' : `<path d="M352 566 Q392 544 430 562" fill="none" stroke="${P.brow}" stroke-width="11" stroke-linecap="round" opacity=".8"/>
  <path d="M594 562 Q632 544 672 566" fill="none" stroke="${P.brow}" stroke-width="11" stroke-linecap="round" opacity=".8"/>`}
  ${eye(392, 652, 'L')}${eye(632, 652, 'R')}
  ${mouthSvg}
  ${patch && pose !== 'hug' ? `<g transform="translate(742 872) rotate(12) scale(1.5)">
    <path d="${HEART}" fill="${P.deep}" opacity=".35" filter="url(#b3)" transform="translate(3 5)"/>
    <path d="${HEART}" fill="url(#patch)"/>
    <path d="${HEART}" fill="none" stroke="${P.patch[3]}" stroke-width="2.6" stroke-dasharray="5.5 4.5" stroke-linecap="round" transform="scale(.76) translate(0 -1)"/>
  </g>` : ''}
  ${pose === 'hug' ? hug : ''}
</g>
</svg>`;
}

// A flat, two-tone Wren: no gradients, no blur. Reads at the smallest sizes and prints in two inks.
export function wrenFlat() {
  const BODY = SHAPES.pear;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs><clipPath id="fb"><path d="${BODY}"/></clipPath><clipPath id="fc"><rect x="368" y="232" width="288" height="112" rx="54"/></clipPath></defs>
<rect width="1024" height="1024" fill="#FFB58D"/><circle cx="512" cy="640" r="470" fill="#FFC7A6"/>
<g transform="translate(0 -22) rotate(-5 512 760)">
  <path d="M830 660 C880 620 904 566 914 506" fill="none" stroke="#AE174A" stroke-width="88" stroke-linecap="round"/>
  <g transform="translate(930 402) rotate(14)"><ellipse cx="-56" cy="14" rx="30" ry="40" transform="rotate(-28 -56 14)" fill="#FFF3EA"/><ellipse cx="0" cy="0" rx="72" ry="78" fill="#FFF3EA"/><rect x="-58" y="56" width="116" height="44" rx="22" fill="#F3D9CB"/></g>
  <rect x="472" y="190" width="80" height="70" rx="14" fill="#5A1630"/><rect x="440" y="142" width="144" height="72" rx="34" fill="#5A1630"/>
  <path d="${BODY}" fill="#D32C62"/>
  <g clip-path="url(#fb)"><path d="M236 590 C244 520 288 474 340 452" fill="none" stroke="#EF5C88" stroke-width="30" stroke-linecap="round"/>
    <rect x="100" y="946" width="824" height="160" fill="#FFF3EA"/>${Array.from({ length: 22 }, (_, i) => `<rect x="${118 + i * 36}" y="962" width="8" height="120" rx="4" fill="#F0D5C7"/>`).join('')}</g>
  <g clip-path="url(#fc)"><rect x="368" y="232" width="288" height="112" fill="#FFF3EA"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${396 + i * 33}" y="246" width="8" height="84" rx="4" fill="#F0D5C7"/>`).join('')}</g>
  <circle cx="296" cy="742" r="40" fill="#F2668F"/><circle cx="728" cy="742" r="40" fill="#F2668F"/>
  <ellipse cx="392" cy="652" rx="42" ry="54" fill="#2A0A18"/><ellipse cx="632" cy="652" rx="42" ry="54" fill="#2A0A18"/>
  <circle cx="378" cy="630" r="16" fill="#fff"/><circle cx="618" cy="630" r="16" fill="#fff"/>
  <path d="M462 716 Q512 738 562 716 Q556 786 512 786 Q468 786 462 716 Z" fill="#2A0A18" stroke="#2A0A18" stroke-width="9" stroke-linejoin="round"/>
  <g transform="translate(742 872) rotate(12) scale(1.5)"><path d="${HEART}" fill="#FFF3EA"/></g>
</g></svg>`;
}

// One-colour Wren: iOS tinted mode, Android themed icons, favicons, stamps.
export function wrenMono({ fg = 'url(#mfg)', cut = '#1b1b1d', bg = true, scale = 1 } = {}) {
  const BODY = SHAPES.pear;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>
<linearGradient id="mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#313135"/><stop offset="1" stop-color="#141416"/></linearGradient>
<linearGradient id="mfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C4C4CA"/></linearGradient></defs>
${bg ? '<rect width="1024" height="1024" fill="url(#mbg)"/>' : ''}
<g transform="translate(512 512) scale(${scale}) translate(-512 -512) translate(0 -22) rotate(-5 512 760)">
  <path d="M830 660 C880 620 904 566 914 506" fill="none" stroke="${fg}" stroke-width="88" stroke-linecap="round"/>
  <g transform="translate(930 402) rotate(14)"><ellipse cx="-56" cy="14" rx="30" ry="40" transform="rotate(-28 -56 14)" fill="${fg}"/><ellipse cx="0" cy="0" rx="72" ry="78" fill="${fg}"/></g>
  <path d="M872 498 L956 518" stroke="${cut}" stroke-width="12" stroke-linecap="round"/>
  <rect x="472" y="190" width="80" height="70" rx="14" fill="${fg}"/><rect x="440" y="142" width="144" height="72" rx="34" fill="${fg}"/>
  <path d="${BODY}" fill="${fg}"/>
  <path d="${BODY}" fill="none" stroke="${cut}" stroke-width="14"/>
  <rect x="368" y="232" width="288" height="112" rx="54" fill="${fg}" stroke="${cut}" stroke-width="14"/>
  <ellipse cx="392" cy="652" rx="44" ry="56" fill="${cut}"/><ellipse cx="632" cy="652" rx="44" ry="56" fill="${cut}"/>
  <circle cx="378" cy="629" r="17" fill="${fg}"/><circle cx="618" cy="629" r="17" fill="${fg}"/>
  <path d="M462 716 Q512 738 562 716 Q556 786 512 786 Q468 786 462 716 Z" fill="${cut}" stroke="${cut}" stroke-width="9" stroke-linejoin="round"/>
  <g transform="translate(742 872) rotate(12) scale(1.5)"><path d="${HEART}" fill="${cut}"/></g>
  <clipPath id="mclip"><path d="${BODY}"/></clipPath><rect x="100" y="946" width="824" height="12" fill="${cut}" clip-path="url(#mclip)"/>
</g></svg>`;
}

const put = (name, svg) => fs.writeFileSync(`${OUT}/${name}.svg`, svg);
// The installed app icon and its appearances
put('wren-icon', wren());
put('wren-icon-dark', wren({ ground: 'night' }));
put('wren-icon-cream', wren({ ground: 'cream' }));
put('wren-icon-tinted', wrenMono());
put('wren-glyph', wrenMono({ fg: '#B0184B', cut: '#FFFFFF', bg: false }));
put('wren-android', wren({ scale: .8 }));
put('wren-android-mono', wrenMono({ fg: '#FFFFFF', cut: '#000000', bg: false, scale: .72 }).replace('<g transform', '<rect width="1024" height="1024" fill="#000"/><g transform'));
// Variations for the owner to choose from (11 Nov 2026)
fs.mkdirSync(`${OUT}/variations`, { recursive: true });
const V = {
  '1-wave': wren(),
  '2-hug': wren({ ground: 'blush', pose: 'hug', eyes: 'happy', mouth: 'smile', tilt: 0, decor: 'hearts' }),
  '3-close-up': wren({ top: 'none', pose: 'none', eyes: 'wink', tilt: -4, scale: 1.4, origin: [512, 700], dy: -10, decor: 'none' }),
  '4-peach-wren': wren({ ground: 'raspberry', palette: 'peach' }),
  '5-cosy-night': wren({ ground: 'night', palette: 'wine', pose: 'none', eyes: 'closed', mouth: 'smile', tilt: 0, decor: 'moon' }),
  '6-classic-bow': wren({ ground: 'cream', shape: 'classic', bow: true, tilt: -4 }),
  '7-bobble-cheer': wren({ shape: 'round', top: 'pom', pose: 'cheer', eyes: 'happy', tilt: 0, decor: 'sparkles' }),
  '8-flat': wrenFlat(),
};
for (const [n, s] of Object.entries(V)) put(`variations/wren-${n}`, s);
