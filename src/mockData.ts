import { Asset, HandoverRecord, ActivityLog, CategoryItem } from './types';

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { kode: 'LPT', nama: 'Laptop & Komputer', icon: 'Laptop', deskripsi: 'Laptop MacBook, ThinkPad, iMac, dan PC Desktop kantor' },
  { kode: 'MON', nama: 'Monitor & Display', icon: 'Monitor', deskripsi: 'Monitor eksternal 24"-27", Smart TV Ruang Meeting' },
  { kode: 'HPN', nama: 'Smartphone & Tablet', icon: 'Smartphone', deskripsi: 'HP operasional admin sosmed, iPad review & tablet' },
  { kode: 'PRN', nama: 'Printer & Scanner', icon: 'Printer', deskripsi: 'Perangkat cetak dokumen, scan, dan fotokopi kantor' },
  { kode: 'NET', nama: 'Jaringan & Server', icon: 'Wifi', deskripsi: 'Router Wi-Fi, Switch, Access Point, NAS Storage & UPS' },
  { kode: 'FURN', nama: 'Furnitur & Meja Kerja', icon: 'Armchair', deskripsi: 'Kursi ergonomis, meja kerja elektrik/standing desk, lemari' },
  { kode: 'AV', nama: 'Audio Visual & Kamera', icon: 'Camera', deskripsi: 'Kamera video, mic wireless podcast, speaker conference' },
  { kode: 'ELK', nama: 'Elektronik & Fasilitas', icon: 'Zap', deskripsi: 'AC ruangan, proyektor, dispenser, mesin kopi, brankas' },
];

export const INITIAL_ASSETS: Asset[] = [];
export const INITIAL_HANDOVERS: HandoverRecord[] = [];
export const INITIAL_LOGS: ActivityLog[] = [];
