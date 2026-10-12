/**
 * Library API Re-export Module (Facade)
 * File ini mere-export sub-modul API terpisah dari folder ./api/ untuk menjaga kompatibilitas mundur.
 * Untuk kode baru atau per halaman, direkomendasikan mengimpor langsung dari '@/lib/features/library/api/[namaModul]Api'.
 */

export * from './api';
export { libraryApi as default } from './api';
