import QRCode from 'qrcode';

/**
 * QR Code generator using local client-side QRCode library with Level H Error Correction
 * Level H provides ~30% damage/glare resistance (ideal for physical stickers covered with tape/solasi).
 */
export async function generateQrDataUrl(
  text: string, 
  size = 240, 
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'H'
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2, // Ample quiet zone around modules
      errorCorrectionLevel, // 30% error correction tolerance
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    // Fallback to QuickChart with Level H if local generation fails
    const encoded = encodeURIComponent(text);
    return `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=2&ecLevel=H&format=svg`;
  }
}

export function getQrCodeImageUrl(text: string, size = 200, ecLevel = 'H'): string {
  // QuickChart with high error correction (ecLevel=H) for tape/glare resilience
  const encoded = encodeURIComponent(text);
  return `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=2&ecLevel=${ecLevel}&format=svg`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function generateNextAssetCode(existingCodes: string[], prefix = 'VMI', category = 'LPT'): string {
  // Pattern: 001-VMI-LPT
  const regex = new RegExp(`^(\\d{3,4})-${prefix}-${category}$`, 'i');
  let maxSeq = 0;

  existingCodes.forEach(code => {
    const match = code.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${nextSeq}-${prefix}-${category}`;
}

export function generateBastNumber(seq: number): string {
  const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const now = new Date();
  const monthRomawi = romawi[now.getMonth()];
  const year = now.getFullYear();
  const paddedSeq = seq.toString().padStart(3, '0');
  return `${paddedSeq}/BAST-IT/VMI/${monthRomawi}/${year}`;
}
