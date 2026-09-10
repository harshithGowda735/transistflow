export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const statusClass = (status = '') => status.toLowerCase().replace(' ', '-');
