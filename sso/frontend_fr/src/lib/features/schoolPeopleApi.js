import { httpClient } from '@/lib/common/httpClient';

export const schoolPeopleApi = {
  list: async (personType = '') => {
    const query = personType ? `?person_type=${encodeURIComponent(personType)}` : '';
    const response = await httpClient.get(`/master/people${query}`);
    return Array.isArray(response.data) ? response.data : [];
  },
  create: async (payload) => {
    const response = await httpClient.post('/master/people', payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await httpClient.put(`/master/people/${id}`, payload);
    return response.data;
  },
  revokeBarcode: async (id) => {
    const response = await httpClient.post(`/master/people/${id}/revoke-barcode`, {});
    return response.data;
  },
  delete: async (id) => {
    const response = await httpClient.delete(`/master/people/${id}`);
    return response.data;
  },
  resolveBarcode: async (token) => {
    const response = await httpClient.post('/barcode/resolve', {
      barcode_token: (token || '').trim(),
    });
    return response.data;
  },
  getBarcodeImageUrl: (personId) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    return `${base}/master/people/${personId}/barcode`;
  },
  getExportBarcodesExcelUrl: ({
    personType = '',
    className = '',
    search = '',
    separateSheets = true,
  } = {}) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const params = new URLSearchParams();
    if (personType && personType !== 'ALL') params.set('person_type', personType);
    if (className && className !== 'ALL') params.set('class_name', className);
    if (search && search.trim()) params.set('search', search.trim());
    params.set('separate_sheets', separateSheets ? 'true' : 'false');
    return `${base}/master/people/barcodes/export-excel?${params.toString()}`;
  },
};
