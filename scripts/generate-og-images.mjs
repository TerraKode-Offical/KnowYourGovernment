// Generates the social/OG preview images (no text in the artwork).
// Renders an inline SVG scene — neoclassical capitol building, open book,
// laurel branches, stars on a deep-navy sky — with sharp.
//
//   node scripts/generate-og-images.mjs
//
// Outputs:
//   src/app/opengraph-image.png   1200x630 (Facebook/Slack/etc.)
//   src/app/twitter-image.png     1200x630 (X/Twitter large card)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const GOLD = "#C9A227";
const GOLD_BRIGHT = "#E3B94C";
const MARBLE = "#EFE9DC";
const MARBLE_SHADE = "#D9D2C2";
const MARBLE_DARK = "#C7BFAE";
const NAVY_TOP = "#0C1830";
const NAVY_BOTTOM = "#1B2A4A";
const GLOW = "#2E4A78";
const LAUREL = "#4E8D66";
const LAUREL_DARK = "#3B6E4F";
const BOOK_CREAM = "#F5F0E3";
const BOOK_EDGE = "#D9D2C2";
const BOOK_COVER = "#7E3138";

function star(cx, cy, r, fill, opacity = 1) {
  // 5-point star path
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" opacity="${opacity}"/>`;
}

function column(x, yTop, yBot, w) {
  const half = w / 2;
  const flutes = [-half * 0.45, 0, half * 0.45]
    .map((o) => `<line x1="${x + o}" y1="${yTop + 8}" x2="${x + o}" y2="${yBot - 4}" stroke="${MARBLE_SHADE}" stroke-width="1.6"/>`)
    .join("");
  return `
    <rect x="${x - half - 3}" y="${yTop - 8}" width="${w + 6}" height="8" rx="2" fill="${MARBLE}"/>
    <rect x="${x - half}" y="${yTop}" width="${w}" height="${yBot - yTop}" fill="${MARBLE}"/>
    ${flutes}
    <rect x="${x - half - 2}" y="${yBot}" width="${w + 4}" height="6" rx="1.5" fill="${MARBLE_SHADE}"/>`;
}

function laurelBranch(cx, cy, dir, scale = 1) {
  // dir = 1 -> leaves point right; -1 -> left. Stem arcs upward toward the center.
  const s = scale;
  let out = `<g transform="translate(${cx} ${cy}) scale(${dir * s} ${s})">`;
  out += `<path d="M0 0 C 34 -30 74 -46 118 -50" stroke="${LAUREL_DARK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  const leaves = [
    [12, -6, -50], [24, -14, -44], [36, -21, -38], [48, -27, -32],
    [60, -33, -26], [72, -38, -20], [84, -43, -13], [96, -47, -7], [108, -49, -1],
  ];
  for (const [x, y, rot] of leaves) {
    out += `<ellipse cx="${x}" cy="${y}" rx="12.5" ry="4.4" fill="${LAUREL}" stroke="${LAUREL_DARK}" stroke-width="0.9" transform="rotate(${rot} ${x} ${y})"/>`;
    out += `<ellipse cx="${x + 1.5}" cy="${y - 8.5}" rx="11" ry="4" fill="${LAUREL}" stroke="${LAUREL_DARK}" stroke-width="0.9" transform="rotate(${rot + 40} ${x + 1.5} ${y - 8.5})"/>`;
  }
  out += "</g>";
  return out;
}

function scene(W, H) {
  const cx = W / 2;
  const baseY = H * 0.86;          // ground line
  const colTop = baseY - H * 0.20; // column tops
  const colBot = baseY - H * 0.06;
  const entY = colTop - H * 0.032; // entablature top
  const bw = W * 0.235;            // building half-width

  const steps = [0, 1, 2]
    .map((i) => {
      const pad = W * 0.02 * i;
      const h = H * 0.016;
      const y = colBot + i * h;
      return `<rect x="${cx - bw - W * 0.03 + pad}" y="${y}" width="${(bw + W * 0.03) * 2 - pad * 2}" height="${h}" fill="${i % 2 ? MARBLE_SHADE : MARBLE_DARK}"/>`;
    })
    .join("");

  const cols = [-3, -2, -1, 1, 2, 3]
    .map((i) => column(cx + i * (W * 0.043), colTop, colBot, W * 0.019))
    .join("");

  const pedBase = entY;
  const pedApex = entY - H * 0.115;
  const drumTop = pedApex - H * 0.055;
  const domeR = W * 0.052;

  const sky = `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${NAVY_TOP}"/>
        <stop offset="1" stop-color="${NAVY_BOTTOM}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
        <stop offset="0" stop-color="${GLOW}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${GLOW}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="dome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${MARBLE}"/>
        <stop offset="0.55" stop-color="${MARBLE_SHADE}"/>
        <stop offset="1" stop-color="${MARBLE_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${star(W * 0.14, H * 0.16, 9, GOLD_BRIGHT, 0.9)}
    ${star(W * 0.24, H * 0.30, 6, GOLD, 0.75)}
    ${star(W * 0.10, H * 0.42, 5, GOLD, 0.6)}
    ${star(W * 0.87, H * 0.14, 9, GOLD_BRIGHT, 0.9)}
    ${star(W * 0.78, H * 0.28, 6, GOLD, 0.75)}
    ${star(W * 0.91, H * 0.40, 5, GOLD, 0.6)}
    ${star(W * 0.50, H * 0.09, 7, GOLD_BRIGHT, 0.8)}`;

  const building = `
    <g>
      <!-- dome drum (behind pediment) -->
      <rect x="${cx - W * 0.062}" y="${drumTop}" width="${W * 0.124}" height="${pedBase - drumTop + H * 0.004}" fill="${MARBLE_SHADE}"/>
      ${[-2, -1, 0, 1, 2].map((i) => `<rect x="${cx + i * (W * 0.021) - W * 0.004}" y="${drumTop + H * 0.012}" width="${W * 0.008}" height="${(pedBase - drumTop) * 0.6}" rx="${W * 0.004}" fill="${NAVY_BOTTOM}" opacity="0.55"/>`).join("")}
      <!-- dome -->
      <path d="M ${cx - domeR} ${drumTop} A ${domeR} ${domeR} 0 0 1 ${cx + domeR} ${drumTop} Z" fill="url(#dome)"/>
      <line x1="${cx - domeR * 0.55}" y1="${drumTop - domeR * 0.80}" x2="${cx - domeR * 0.38}" y2="${drumTop}" stroke="${MARBLE_DARK}" stroke-width="2"/>
      <line x1="${cx + domeR * 0.55}" y1="${drumTop - domeR * 0.80}" x2="${cx + domeR * 0.38}" y2="${drumTop}" stroke="${MARBLE_DARK}" stroke-width="2"/>
      <line x1="${cx}" y1="${drumTop - domeR}" x2="${cx}" y2="${drumTop}" stroke="${MARBLE_DARK}" stroke-width="2"/>
      <!-- cupola + finial -->
      <rect x="${cx - W * 0.012}" y="${drumTop - domeR - H * 0.026}" width="${W * 0.024}" height="${H * 0.026}" fill="${MARBLE_SHADE}"/>
      <rect x="${cx - W * 0.0022}" y="${drumTop - domeR - H * 0.058}" width="${W * 0.0044}" height="${H * 0.033}" fill="${GOLD}"/>
      <circle cx="${cx}" cy="${drumTop - domeR - H * 0.064}" r="${W * 0.0062}" fill="${GOLD_BRIGHT}"/>
      ${star(cx, drumTop - domeR - H * 0.092, W * 0.011, GOLD_BRIGHT)}
      <!-- pediment -->
      <polygon points="${cx - bw},${pedBase} ${cx + bw},${pedBase} ${cx},${pedApex}" fill="${MARBLE}"/>
      <polygon points="${cx - bw + 10},${pedBase - 6} ${cx + bw - 10},${pedBase - 6} ${cx},${pedApex + 9}" fill="${MARBLE_SHADE}" opacity="0.5"/>
      <circle cx="${cx}" cy="${pedBase - H * 0.026}" r="${W * 0.0135}" fill="none" stroke="${GOLD}" stroke-width="4"/>
      <circle cx="${cx}" cy="${pedBase - H * 0.026}" r="${W * 0.0055}" fill="${GOLD_BRIGHT}"/>
      <!-- entablature -->
      <rect x="${cx - bw - W * 0.012}" y="${entY}" width="${(bw + W * 0.012) * 2}" height="${colTop - entY}" fill="${MARBLE}"/>
      <rect x="${cx - bw - W * 0.012}" y="${colTop - H * 0.005}" width="${(bw + W * 0.012) * 2}" height="${H * 0.005}" fill="${GOLD}"/>
      <!-- columns + steps -->
      ${cols}
      ${steps}
    </g>`;

  // Open book, foreground bottom-center: two page stacks on a red cover
  const bx = cx - W * 0.008;
  const by = H * 0.885;
  const bwid = W * 0.132;
  const ph = bwid * 0.16; // page stack height
  let book = `<g transform="translate(${bx} ${by})">`;
  // cover (red, slightly larger than pages)
  book += `
      <path d="M 0 ${ph * 0.55} C ${-bwid * 0.35} ${ph * 0.30} ${-bwid * 0.85} ${ph * 0.26} ${-bwid} ${ph * 0.46} L ${-bwid} ${ph * 2.05} C ${-bwid * 0.85} ${ph * 2.5} ${-bwid * 0.35} ${ph * 2.55} 0 ${ph * 2.2} C ${bwid * 0.35} ${ph * 2.55} ${bwid * 0.85} ${ph * 2.5} ${bwid} ${ph * 2.05} L ${bwid} ${ph * 0.46} C ${bwid * 0.85} ${ph * 0.26} ${bwid * 0.35} ${ph * 0.30} 0 ${ph * 0.55} Z" fill="${BOOK_COVER}"/>`;
  // page stacks: 3 layers per side, each lifted
  for (let i = 0; i < 3; i++) {
    const lift = ph * 0.62 * (2 - i) * 0.55;
    book += `
      <path d="M 0 ${ph * 0.62 - lift} C ${-bwid * 0.35} ${ph * 0.40 - lift} ${-bwid * 0.85} ${ph * 0.36 - lift} ${-bwid} ${ph * 0.52 - lift} L ${-bwid} ${ph * 0.52 - lift + ph} C ${-bwid * 0.85} ${ph * 0.36 - lift + ph} ${-bwid * 0.35} ${ph * 0.40 - lift + ph} 0 ${ph * 0.62 - lift + ph} Z" fill="${BOOK_CREAM}"/>
      <path d="M 0 ${ph * 0.62 - lift} C ${bwid * 0.35} ${ph * 0.40 - lift} ${bwid * 0.85} ${ph * 0.36 - lift} ${bwid} ${ph * 0.52 - lift} L ${bwid} ${ph * 0.52 - lift + ph} C ${bwid * 0.85} ${ph * 0.36 - lift + ph} ${bwid * 0.35} ${ph * 0.40 - lift + ph} 0 ${ph * 0.62 - lift + ph} Z" fill="${BOOK_CREAM}"/>`;
  }
  // top page curl lines + spine
  book += `
      <path d="M ${-bwid * 0.88} ${ph * 0.42} C ${-bwid * 0.55} ${ph * 0.30} ${-bwid * 0.25} ${ph * 0.32} 0 ${ph * 0.52}" stroke="${BOOK_EDGE}" stroke-width="2" fill="none"/>
      <path d="M ${bwid * 0.88} ${ph * 0.42} C ${bwid * 0.55} ${ph * 0.30} ${bwid * 0.25} ${ph * 0.32} 0 ${ph * 0.52}" stroke="${BOOK_EDGE}" stroke-width="2" fill="none"/>
      <line x1="0" y1="${ph * 0.52}" x2="0" y2="${ph * 2.2}" stroke="${BOOK_EDGE}" stroke-width="2.5"/>`;
  book += "</g>";

  const laurels = `
    ${laurelBranch(W * 0.315, H * 0.905, 1, W / 1200)}
    ${laurelBranch(W * 0.685, H * 0.905, -1, W / 1200)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${sky}
    ${building}
    ${book}
    ${laurels}
  </svg>`;
}

await mkdir("src/app", { recursive: true });
for (const [file, w, h] of [
  ["src/app/opengraph-image.png", 1200, 630],
  ["src/app/twitter-image.png", 1200, 630],
]) {
  await sharp(Buffer.from(scene(w, h))).png({ compressionLevel: 9 }).toFile(file);
  console.log(`wrote ${file}`);
}
