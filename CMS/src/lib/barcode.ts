/**
 * Pure SVG Code-128 Barcode Generator
 * Encodes alphanumeric strings into standard high-density Code 128 barcodes.
 */

// Code 128 pattern dictionary for ASCII 32..126
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (Start/Stop)
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes text into a Code-128 barcode pattern string of bar/space widths.
 */
export function encodeCode128(text: string): string {
  const safeText = text.trim() || "000000";
  let checksum = START_B;
  const codes: number[] = [START_B];

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i) - 32;
    const val = charCode >= 0 && charCode <= 94 ? charCode : 0;
    codes.push(val);
    checksum += val * (i + 1);
  }

  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(STOP);

  return codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]).join("");
}

/**
 * Generates an SVG string representation of the barcode.
 */
export function generateBarcodeSvg(text: string, options: { width?: number; height?: number; color?: string; showText?: boolean } = {}): string {
  const { width = 200, height = 60, color = "#000000", showText = true } = options;
  const pattern = encodeCode128(text);
  
  // Calculate total units
  let totalUnits = 0;
  for (let i = 0; i < pattern.length; i++) {
    totalUnits += parseInt(pattern[i], 10);
  }

  const unitWidth = width / (totalUnits + 10); // 10 units quiet zone
  let currentX = 5 * unitWidth;
  const rects: string[] = [];

  const barHeight = showText ? height - 16 : height;

  for (let i = 0; i < pattern.length; i++) {
    const barWidth = parseInt(pattern[i], 10) * unitWidth;
    if (i % 2 === 0) {
      // Bar (black)
      rects.push(`<rect x="${currentX.toFixed(2)}" y="2" width="${barWidth.toFixed(2)}" height="${barHeight}" fill="${color}" />`);
    }
    currentX += barWidth;
  }

  const textElement = showText
    ? `<text x="${(width / 2).toFixed(2)}" y="${height - 2}" font-family="monospace" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle">${text}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="transparent" />
    ${rects.join("\n    ")}
    ${textElement}
  </svg>`;
}

/**
 * Plays a POS scanner beep sound using Web Audio API.
 */
export function playScannerBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}
