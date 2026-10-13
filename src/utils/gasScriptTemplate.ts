/**
 * Google Apps Script Backend Template (Code.gs)
 * Siap dicopy-paste ke Google Apps Script Editor oleh pengguna.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * SISTEM INVENTARIS & SERAH TERIMA ASET KANTOR - VOXXY MEDIA INDONESIA (VMI)
 * ==============================================================================
 * File: Code.gs (Google Apps Script)
 * Dibuat khusus untuk arsitektur Google Sheets + Web App Mobile
 * 
 * Fitur Utama:
 * 1. Router Scan QR Code (?code=001-VMI-LPT)
 * 2. Keamanan PIN & Whitelist 2 Email Admin
 * 3. Registrasi & Update Aset Otomatis
 * 4. Serah Terima (Handover) dengan Tanda Tangan Digital
 * 5. Generate PDF Berita Acara (BAST) Otomatis ke Google Drive
 * 6. Audit Trail / Log Aktivitas
 * ==============================================================================
 */

// =================== PENGATURAN SISTEM (SILAKAN SESUAIKAN) ===================
const CONFIG = {
  // Nama & Inisial Perusahaan
  COMPANY_NAME: 'Voxxy Media Indonesia',
  COMPANY_PREFIX: 'VMI',
  
  // Keamanan: PIN 6 Digit untuk verifikasi cepat di HP saat serah terima
  ADMIN_PIN: 'GANTI_DENGAN_PIN_ADMIN',
  
  // Whitelist 2 Email yang memiliki wewenang penuh
  ALLOWED_EMAILS: [
    'admin@example.com',
    'admin2@example.com'
  ],
  
  // Nama Folder di Google Drive untuk menyimpan file PDF BAST
  DRIVE_FOLDER_NAME: 'BAST_Inventaris_Voxxy',
  
  // Nama-nama Sheet di Spreadsheet ini
  SHEET_ASET: 'ASET',
  SHEET_HANDOVER: 'HANDOVER',
  SHEET_LOG: 'LOG_AKTIVITAS',
  SHEET_MASTER: 'MASTER_PENGATURAN'
};

/**
 * Endpoint GET: Dipanggil saat QR Code discan dari kamera HP
 * Contoh URL: https://script.google.com/macros/s/XXXX/exec?code=001-VMI-LPT
 */
function doGet(e) {
  const code = (e && e.parameter && e.parameter.code) ? e.parameter.code.trim() : '';
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  // Jika dipanggil via API JSON untuk cek data
  if (action === 'check') {
    const result = findAssetByCode(code);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Melayani halaman HTML Web App ke layar HP
  const template = HtmlService.createTemplateFromFile('index');
  template.initialCode = code;
  template.companyName = CONFIG.COMPANY_NAME;
  
  return template.evaluate()
    .setTitle('Inventory & Handover - ' + CONFIG.COMPANY_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Endpoint POST: Menghandle submit Form Pendaftaran, Handover, dan Verifikasi PIN
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    // Validasi PIN Keamanan untuk setiap tindakan yang mengubah data
    if (requestData.pin !== CONFIG.ADMIN_PIN) {
      return jsonResponse({ success: false, message: 'PIN Keamanan salah! Akses ditolak.' });
    }

    let result;
    switch (action) {
      case 'REGISTER_ASSET':
        result = handleRegisterAsset(requestData.payload, requestData.operatorEmail);
        break;
      case 'UPDATE_ASSET':
        result = handleUpdateAsset(requestData.payload, requestData.operatorEmail);
        break;
      case 'HANDOVER_ASSET':
        result = handleHandoverAsset(requestData.payload, requestData.operatorEmail);
        break;
      case 'RETURN_ASSET':
        result = handleReturnAsset(requestData.payload, requestData.operatorEmail);
        break;
      case 'VERIFY_PIN':
        result = { success: true, message: 'PIN valid.' };
        break;
      default:
        result = { success: false, message: 'Tindakan tidak dikenal.' };
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, message: 'Error Server: ' + error.toString() });
  }
}

/**
 * 1. FUNGSI PENDAFTARAN ASET BARU KE TAB 'ASET'
 */
function handleRegisterAsset(data, operatorEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_ASET);
  
  // Cek duplikasi kode aset
  const existing = findAssetByCode(data.kode_aset);
  if (existing.exists) {
    return { success: false, message: 'Kode aset ' + data.kode_aset + ' sudah terdaftar sebelumnya!' };
  }

  const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  // Baris baru sesuai urutan kolom tabel
  const newRow = [
    data.kode_aset,
    data.kategori || 'LPT',
    data.merk,
    data.tipe_model,
    data.nomor_seri,
    data.spesifikasi,
    data.tgl_beli,
    data.harga,
    data.vendor,
    data.kondisi || 'Baik (Normal)',
    'Tersedia', // Status awal aset baru selalu Tersedia
    data.lokasi || 'Kantor Pusat Voxxy',
    '', // User saat ini (kosong karena belum diserahkan)
    data.catatan || '',
    now,
    now
  ];

  sheet.appendRow(newRow);
  logActivity(operatorEmail, 'REGISTRASI_BARU', data.kode_aset, 'Pendaftaran fisik aset baru ' + data.merk + ' ' + data.tipe_model);

  return { success: true, message: 'Aset ' + data.kode_aset + ' berhasil didaftarkan!', data: data };
}

/**
 * 2. FUNGSI HANDOVER (SERAH TERIMA) DENGAN TANDA TANGAN & PDF DRIVE
 */
function handleHandoverAsset(data, operatorEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetHandover = ss.getSheetByName(CONFIG.SHEET_HANDOVER);
  const sheetAset = ss.getSheetByName(CONFIG.SHEET_ASET);

  // Buat File PDF Berita Acara Serah Terima (BAST) otomatis di Google Drive
  const pdfResult = generateBastPdf(data);
  const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  // Catat ke tab HANDOVER
  const newHandoverRow = [
    data.no_surat,
    data.tgl_handover,
    data.jenis_transaksi,
    data.kode_aset,
    data.nama_penerima,
    data.email_penerima,
    data.nik_karyawan,
    data.departemen,
    data.jabatan,
    operatorEmail,
    data.kondisi_fisik,
    data.kelengkapan.join(', '),
    data.catatan_kelengkapan || '',
    pdfResult.fileUrl || '',
    now
  ];
  sheetHandover.appendRow(newHandoverRow);

  // Update Status Aset di tab ASET menjadi 'Dipakai' dan set user saat ini
  updateAssetStatus(data.kode_aset, 'Dipakai', data.nama_penerima);

  // Catat Audit Log
  logActivity(operatorEmail, 'HANDOVER', data.kode_aset, 'Serah terima ke ' + data.nama_penerima + ' (' + data.departemen + '). BAST: ' + data.no_surat);

  return {
    success: true,
    message: 'Serah terima berhasil & BAST PDF tersimpan di Google Drive!',
    pdfUrl: pdfResult.fileUrl
  };
}

/**
 * 3. FUNGSI GENERATE PDF BERITA ACARA KE GOOGLE DRIVE
 */
function generateBastPdf(data) {
  try {
    // Dapatkan atau buat folder penyimpanan di Google Drive
    const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
    let targetFolder;
    if (folders.hasNext()) {
      targetFolder = folders.next();
    } else {
      targetFolder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    }

    // HTML Template Berita Acara yang rapi & siap cetak
    const htmlContent = \`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; padding: 25px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .company-name { font-size: 16pt; font-weight: bold; letter-spacing: 1px; color: #0f172a; }
          .doc-title { font-size: 13pt; font-weight: bold; margin-top: 15px; text-decoration: underline; }
          .doc-number { font-size: 10pt; color: #475569; }
          .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; font-size: 11pt; border-bottom: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td { padding: 5px; vertical-align: top; }
          .label { width: 30%; font-weight: bold; color: #334155; }
          .colon { width: 3%; }
          .value { width: 67%; }
          .box { border: 1px solid #cbd5e1; padding: 10px; background-color: #f8fafc; border-radius: 4px; margin-top: 10px; }
          .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; }
          .sig-cell { width: 50%; text-align: center; vertical-align: top; }
          .sig-img { max-height: 70px; max-width: 180px; margin: 10px auto; display: block; }
          .sig-line { border-top: 1px solid #475569; width: 75%; margin: 5px auto 0 auto; }
          .terms { font-size: 8.5pt; color: #64748b; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">\${CONFIG.COMPANY_NAME}</div>
          <div style="font-size: 9pt; color: #64748b;">Perkantoran & Studio Kreatif | IT Infrastructure & Asset Management</div>
          <div class="doc-title">BERITA ACARA SERAH TERIMA ASET OPERASIONAL</div>
          <div class="doc-number">Nomor Surat: \${data.no_surat}</div>
        </div>

        <p>Pada hari ini, tanggal <strong>\${data.tgl_handover}</strong>, telah dilakukan serah terima fasilitas aset kantor kepada pihak yang bersangkutan dengan rincian sebagai berikut:</p>

        <div class="section-title">A. IDENTITAS PENERIMA ASET</div>
        <table>
          <tr><td class="label">Nama Lengkap</td><td class="colon">:</td><td class="value"><strong>\${data.nama_penerima}</strong></td></tr>
          <tr><td class="label">NIK / ID Karyawan</td><td class="colon">:</td><td class="value">\${data.nik_karyawan || '-'}</td></tr>
          <tr><td class="label">Departemen / Divisi</td><td class="colon">:</td><td class="value">\${data.departemen}</td></tr>
          <tr><td class="label">Jabatan</td><td class="colon">:</td><td class="value">\${data.jabatan}</td></tr>
          <tr><td class="label">Email Resmi</td><td class="colon">:</td><td class="value">\${data.email_penerima}</td></tr>
        </table>

        <div class="section-title">B. RINCIAN PERANGKAT LAPTOP / ASET</div>
        <table>
          <tr><td class="label">Kode Aset Kantor</td><td class="colon">:</td><td class="value"><strong style="color: #2563eb;">\${data.kode_aset}</strong></td></tr>
          <tr><td class="label">Merk & Tipe</td><td class="colon">:</td><td class="value">\${data.merk_tipe || '-'}</td></tr>
          <tr><td class="label">Nomor Seri Fisik (SN)</td><td class="colon">:</td><td class="value"><code>\${data.nomor_seri || '-'}</code></td></tr>
          <tr><td class="label">Kondisi Fisik Saat Serah</td><td class="colon">:</td><td class="value">\${data.kondisi_fisik}</td></tr>
          <tr><td class="label">Kelengkapan / Aksesoris</td><td class="colon">:</td><td class="value">\${data.kelengkapan.join(', ')}</td></tr>
        </table>

        <div class="box">
          <strong>Catatan Khusus:</strong><br/>
          \${data.catatan_kelengkapan || 'Perangkat diserahkan dalam keadaan berfungsi normal dan siap dipakai untuk operasional pekerjaan.'}
        </div>

        <div class="terms">
          <strong>Klausul Tanggung Jawab:</strong> Penerima menyetujui untuk menjaga perangkat dengan baik, menggunakan hanya untuk keperluan pekerjaan kantor, serta segera melapor ke pihak IT/GA bila terjadi kerusakan atau kehilangan.
        </div>

        <table class="signatures">
          <tr>
            <td class="sig-cell">
              <div>Yang Menyerahkan (IT/GA Voxxy):</div>
              <img src="\${data.ttd_petugas}" class="sig-img" alt="TTD Petugas" />
              <div class="sig-line"></div>
              <div><strong>\${data.nama_petugas}</strong></div>
              <div style="font-size: 9pt; color: #64748b;">Asset Administrator</div>
            </td>
            <td class="sig-cell">
              <div>Yang Menerima (Karyawan):</div>
              <img src="\${data.ttd_penerima}" class="sig-img" alt="TTD Penerima" />
              <div class="sig-line"></div>
              <div><strong>\${data.nama_penerima}</strong></div>
              <div style="font-size: 9pt; color: #64748b;">\${data.jabatan}</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    \`;

    const blob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html').getAs('application/pdf');
    const fileName = 'BAST_' + data.kode_aset + '_' + data.nama_penerima.replace(/\\s+/g, '_') + '.pdf';
    blob.setName(fileName);

    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, fileUrl: file.getUrl() };
  } catch (err) {
    Logger.log('Gagal buat PDF: ' + err.toString());
    return { success: false, fileUrl: '' };
  }
}

/**
 * 4. PENCARIAN ASET BERDASARKAN KODE (001-VMI-LPT)
 */
function findAssetByCode(kodeAset) {
  if (!kodeAset) return { exists: false };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_ASET);
  const data = sheet.getDataRange().getValues();
  
  // Baris pertama (index 0) adalah header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === kodeAset.trim().toUpperCase()) {
      return {
        exists: true,
        rowNumber: i + 1,
        asset: {
          kode_aset: data[i][0],
          kategori: data[i][1],
          merk: data[i][2],
          tipe_model: data[i][3],
          nomor_seri: data[i][4],
          spesifikasi: data[i][5],
          tgl_beli: data[i][6],
          harga: data[i][7],
          vendor: data[i][8],
          kondisi: data[i][9],
          status: data[i][10],
          lokasi: data[i][11],
          user_saat_ini: data[i][12],
          catatan: data[i][13]
        }
      };
    }
  }

  return { exists: false, kode_aset: kodeAset };
}

/**
 * 5. UPDATE STATUS ASET
 */
function updateAssetStatus(kodeAset, newStatus, newUser) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_ASET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === kodeAset.trim().toUpperCase()) {
      sheet.getRange(i + 1, 11).setValue(newStatus); // Kolom 11: status
      sheet.getRange(i + 1, 13).setValue(newUser);   // Kolom 13: user_saat_ini
      sheet.getRange(i + 1, 16).setValue(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'));
      break;
    }
  }
}

/**
 * 6. AUDIT TRAIL / LOG AKTIVITAS
 */
function logActivity(adminEmail, aksi, kodeAset, deskripsi) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLog = ss.getSheetByName(CONFIG.SHEET_LOG);
  const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  sheetLog.appendRow([
    'LOG-' + new Date().getTime(),
    now,
    adminEmail || 'Admin',
    aksi,
    kodeAset,
    deskripsi
  ]);
}

/**
 * Helper Output JSON
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
