const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const schoolImportApi = {
  importStudents: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BASE_URL}/school/import/students`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  },

  importTeachers: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BASE_URL}/school/import/teachers`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  },

  getTemplateUrl: (type) => {
    return `${BASE_URL}/school/import/template/${type}`;
  },
};
