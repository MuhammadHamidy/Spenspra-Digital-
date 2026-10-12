import { booksApi } from './booksApi';
import { membersApi } from './membersApi';
import { loansApi } from './loansApi';
import { attendanceApi } from './attendanceApi';
import { readingApi } from './readingApi';

export { booksApi } from './booksApi';
export { membersApi } from './membersApi';
export { loansApi } from './loansApi';
export { attendanceApi } from './attendanceApi';
export { readingApi } from './readingApi';

/**
 * Objek gabungan libraryApi untuk kompatibilitas penuh dengan kode lama
 */
export const libraryApi = {
  ...booksApi,
  ...membersApi,
  ...loansApi,
  ...attendanceApi,
  ...readingApi,
};

export default libraryApi;
