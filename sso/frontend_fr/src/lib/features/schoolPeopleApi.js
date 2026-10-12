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
};
