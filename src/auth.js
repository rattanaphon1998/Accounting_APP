const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY = 'expense_tracker_auth';

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

export const saveSession = session => localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(STORAGE_KEY);
export const authHeaders = () => {
  const token = getSession()?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};
export const apiUrl = API_URL;
