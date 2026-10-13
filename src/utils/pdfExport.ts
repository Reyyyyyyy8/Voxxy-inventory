import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { HandoverRecord, Asset } from '../types';
import { DEFAULT_BAST_TEMPLATE } from './bastConfig';

/**
 * Generates and downloads the official BAST document directly as a pure vector PDF (A4).
 * 100% deterministic, ultra fast, no CORS/taint issues, never opens print dialog.
 */
export async function downloadBastVectorPdf(
  handover: HandoverRecord,
  asset?: Asset
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm

  // Background subtle border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX - 4, 10, contentWidth + 8, pageHeight - 20, 3, 3);

  // 1. KOP SURAT
  // Logo badge box
  doc.setFillColor(249, 115, 22); // Orange #f97316
  doc.roundedRect(marginX + 2, 14, 12, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VMI', marginX + 8, 21.5, { align: 'center' });

  // Company Name
  doc.setTextColor(15, 23, 42); // Navy slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(DEFAULT_BAST_TEMPLATE.namaPerusahaan.toUpperCase(), marginX + 18, 19);

  // Tagline
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(DEFAULT_BAST_TEMPLATE.tagline, marginX + 18, 24);

  // Address
  doc.setFontSize(7);
  doc.text(
    `${DEFAULT_BAST_TEMPLATE.alamatKantor} | ${DEFAULT_BAST_TEMPLATE.kontakKantor}`,
    marginX + 18,
    28
  );

  // Horizontal rules under letterhead
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, 32, marginX + contentWidth, 32);
  doc.setLineWidth(0.2);
  doc.line(marginX, 33.2, marginX + contentWidth, 33.2);

  // 2. JUDUL DOKUMEN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(DEFAULT_BAST_TEMPLATE.judulSurat.toUpperCase(), pageWidth / 2, 39, {
    align: 'center',
  });
  doc.setLineWidth(0.3);
  const titleWidth = doc.getTextWidth(DEFAULT_BAST_TEMPLATE.judulSurat.toUpperCase());
  doc.line((pageWidth - titleWidth) / 2, 40, (pageWidth + titleWidth) / 2, 40);

  // Nomor Dokumen
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nomor: ${handover.no_surat || '-'}`, pageWidth / 2, 45, {
    align: 'center',
  });

  // 3. KALIMAT PEMBUKA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const openingText = `Pada hari ini, tanggal ${handover.tgl_handover}, bertempat di Kantor ${DEFAULT_BAST_TEMPLATE.namaPerusahaan}, ${DEFAULT_BAST_TEMPLATE.kalimatPembuka}:`;
  const splitOpening = doc.splitTextToSize(openingText, contentWidth);
  doc.text(splitOpening, marginX, 51);

  let currentY = 51 + splitOpening.length * 4 + 2;

  // 4. BAGIAN I: DATA PENERIMA
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(marginX, currentY, 2, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('I. PIHAK PENERIMA (KARYAWAN)', marginX + 4, currentY + 3.8);

  currentY += 7.5;

  const penerimaRows = [
    ['Nama Lengkap', handover.nama_penerima],
    ['NIK / ID Karyawan', handover.nik_karyawan || '-'],
    ['Departemen / Divisi', handover.departemen],
    ['Jabatan', handover.jabatan],
    ['Email Resmi', handover.email_penerima],
  ];

  doc.setFontSize(7.5);
  penerimaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, marginX + 2, currentY);
    doc.text(':', marginX + 46, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), marginX + 50, currentY);

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 1.2, marginX + contentWidth, currentY + 1.2);

    currentY += 4.5;
  });

  currentY += 2;

  // 5. BAGIAN II: SPESIFIKASI PERANGKAT ASET
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, currentY, contentWidth, 5.5, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(marginX, currentY, 2, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('II. RINCIAN SPESIFIKASI PERANGKAT ASET', marginX + 4, currentY + 3.8);

  currentY += 7.5;

  const asetRows = [
    ['Kode Aset Kantor', handover.kode_aset, true],
    ['Perangkat / Merk & Model', asset ? `${asset.merk} ${asset.tipe_model}` : 'Unit Laptop Kantor', false],
    ['Nomor Seri (Serial Number)', asset?.nomor_seri || '-', false],
    ['Spesifikasi Hardware', asset?.spesifikasi || '-', false],
    ['Kondisi Fisik Saat Serah', handover.kondisi_fisik, false],
    ['Kelengkapan Aksesoris', handover.kelengkapan.join(', '), false],
  ];

  asetRows.forEach(([label, val, isCode]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(String(label), marginX + 2, currentY);
    doc.text(':', marginX + 46, currentY);

    if (isCode) {
      doc.setFont('courier', 'bold');
      doc.setTextColor(234, 88, 12); // Orange
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
    }
    const valText = doc.splitTextToSize(String(val), contentWidth - 52);
    doc.text(valText, marginX + 50, currentY);

    const rowHeight = Math.max(4.5, valText.length * 3.8 + 1);

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + rowHeight - 3, marginX + contentWidth, currentY + rowHeight - 3);

    currentY += rowHeight;
  });

  // Catatan Tambahan (jika ada)
  if (handover.catatan_kelengkapan) {
    currentY += 1;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, contentWidth, 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Catatan Tambahan: `, marginX + 2.5, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(handover.catatan_kelengkapan, marginX + 28, currentY + 5);
    currentY += 10;
  } else {
    currentY += 2;
  }

  // 6. KLAUSUL TANGGUNG JAWAB PENGGUNAAN
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('KETENTUAN DAN TANGGUNG JAWAB PENGGUNAAN:', marginX + 3, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  let clauseY = currentY + 8;
  DEFAULT_BAST_TEMPLATE.klausulTanggungJawab.forEach((clause, idx) => {
    doc.text(`${idx + 1}. ${clause}`, marginX + 3, clauseY);
    clauseY += 3.6;
  });

  currentY += 26;

  // 7. KOLOM TANDA TANGAN DIGITAL
  const col1X = marginX + 10;
  const col2X = marginX + contentWidth - 65;
  const ttdWidth = 45;
  const ttdHeight = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Yang Menyerahkan (IT/GA):', col1X + ttdWidth / 2, currentY, { align: 'center' });
  doc.text('Yang Menerima (Karyawan):', col2X + ttdWidth / 2, currentY, { align: 'center' });

  currentY += 2;

  // TTD Petugas
  if (handover.ttd_petugas && handover.ttd_petugas.startsWith('data:image')) {
    try {
      doc.addImage(handover.ttd_petugas, 'PNG', col1X, currentY, ttdWidth, ttdHeight);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('(Tertanda Digital)', col1X + ttdWidth / 2, currentY + 8, { align: 'center' });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Tertanda Digital)', col1X + ttdWidth / 2, currentY + 8, { align: 'center' });
  }

  // TTD Penerima
  if (handover.ttd_penerima && handover.ttd_penerima.startsWith('data:image')) {
    try {
      doc.addImage(handover.ttd_penerima, 'PNG', col2X, currentY, ttdWidth, ttdHeight);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('(Tertanda Digital)', col2X + ttdWidth / 2, currentY + 8, { align: 'center' });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('(Tertanda Digital)', col2X + ttdWidth / 2, currentY + 8, { align: 'center' });
  }

  currentY += ttdHeight + 2;

  // Garis nama
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(col1X, currentY, col1X + ttdWidth, currentY);
  doc.line(col2X, currentY, col2X + ttdWidth, currentY);

  currentY += 3.5;

  // Nama & Jabatan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(handover.nama_petugas, col1X + ttdWidth / 2, currentY, { align: 'center' });
  doc.text(handover.nama_penerima, col2X + ttdWidth / 2, currentY, { align: 'center' });

  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Asset Management Officer', col1X + ttdWidth / 2, currentY, { align: 'center' });
  doc.text(`${handover.jabatan} - ${handover.departemen}`, col2X + ttdWidth / 2, currentY, { align: 'center' });

  // 8. FOOTER
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, pageHeight - 16, marginX + contentWidth, pageHeight - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen diterbitkan secara elektronik oleh Sistem Inventaris Voxxy Media Indonesia • Kode Aset: ${handover.kode_aset} • Tgl Buat: ${handover.created_at}`,
    pageWidth / 2,
    pageHeight - 12.5,
    { align: 'center' }
  );

  const cleanNo = (handover.no_surat || 'DOC').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `BAST_${cleanNo}_${handover.kode_aset}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads an A4 sheet of QR stickers directly as vector/image PDF.
 */
export async function downloadQrBatchPdf(
  stickers: Array<{ assetCode: string; scanUrl: string }>,
  categoryName = 'LPT'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginX = 12;
  const marginY = 12;

  // Header sheet
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, marginY, pageWidth - marginX * 2, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(249, 115, 22);
  doc.text('VOXXY MEDIA INDONESIA', marginX + 4, marginY + 6.5);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('— LEMBAR STIKER LABEL QR ASSET', marginX + 48, marginY + 6.5);

  const cols = 3;
  const stickerW = 58;
  const stickerH = 54;
  const gapX = 4;
  const gapY = 5;
  const startY = marginY + 14;

  for (let i = 0; i < stickers.length; i++) {
    const stk = stickers[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = marginX + col * (stickerW + gapX);
    const y = startY + row * (stickerH + gapY);

    // Box sticker
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, stickerW, stickerH, 2, 2);

    // Top mini header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(234, 88, 12);
    doc.text('VOXXY MEDIA', x + 3, y + 4.5);
    doc.setTextColor(100, 116, 139);
    doc.text('IT INVENTORY', x + stickerW - 3, y + 4.5, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(x + 2, y + 6, x + stickerW - 2, y + 6);

    // Generate local QR base64 code
    try {
      const qrDataUrl = await QRCode.toDataURL(stk.scanUrl, {
        width: 180,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      const qrSize = 31;
      const qrX = x + (stickerW - qrSize) / 2;
      const qrY = y + 7;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.error('Error adding QR to batch PDF:', err);
    }

    // Asset Code
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(stk.assetCode, x + stickerW / 2, y + 43, { align: 'center' });

    // Subtext
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('SCAN WITH MOBILE CAMERA', x + stickerW / 2, y + 47.5, { align: 'center' });
  }

  const filename = `LEMBAR_STIKER_QR_${categoryName}_${stickers.length}_LABEL.pdf`;
  doc.save(filename);
}

/**
 * Downloads a DOM element as a crisp, high-quality PDF document (A4 format).
 * NEVER calls window.print() on failure.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: { title?: string }
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false, // Must be false to allow canvas.toDataURL export!
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  if (options?.title) {
    pdf.setProperties({ title: options.title });
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printWidth = pageWidth - margin * 2;
  const printHeight = (canvas.height * printWidth) / canvas.width;

  if (printHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight);
  } else {
    let heightLeft = printHeight;
    let position = margin;
    let page = 1;

    while (heightLeft > 0) {
      if (page > 1) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
      heightLeft -= pageHeight;
      position -= pageHeight;
      page++;
    }
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

/**
 * Downloads a DOM element as a high-resolution PNG image.
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads a physical QR Sticker badge directly as a PNG.
 */
export async function downloadQrBadgeAsImage(
  assetCode: string,
  scanUrlOrQrUrl: string,
  companyName = 'VOXXY MEDIA INDONESIA'
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 400;
  const height = 480;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border with rounded corners
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Top header background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(8, 8, width - 16, 48);

  // Top header text
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(companyName, width / 2, 38);

  // Generate QR code data URL cleanly without cross-origin issues (Level H for tape resilience)
  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(scanUrlOrQrUrl, { 
      width: 280, 
      margin: 2,
      errorCorrectionLevel: 'H'
    });
  } catch {
    qrDataUrl = scanUrlOrQrUrl;
  }

  // Load and draw QR code
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve) => {
    img.onload = () => {
      const qrSize = 250;
      const qrX = (width - qrSize) / 2;
      const qrY = 70;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
    img.onerror = () => {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText('[QR CODE]', width / 2, 200);
      resolve();
    };
    img.src = qrDataUrl;
  });

  // Asset Code
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(assetCode, width / 2, 360);

  // Divider line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 385);
  ctx.lineTo(width - 40, 385);
  ctx.stroke();

  // Bottom caption
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('STIKER IDENTITAS ASSET RESMI', width / 2, 412);
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ea580c';
  ctx.fillText('PINDAI QR UNTUK VERIFIKASI UNIT', width / 2, 434);

  // Trigger download
  const link = document.createElement('a');
  link.download = `STIKER_QR_${assetCode}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
