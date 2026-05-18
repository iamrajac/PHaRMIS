import axios from 'axios';
import { API_URL } from '../config/constants';

// Configure axios defaults
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to add Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Response Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response Error:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (name: string, email: string, password: string) => 
    api.post('/auth/register', { name, email, password }),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
};

// Profile endpoints
export const profileAPI = {
  getProfile: () => 
    api.get('/profile'),
  
  updateProfile: (profileData: any) => 
    api.put('/profile', profileData),
};

// Daily logs endpoints
export const logsAPI = {
  getLogs: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/logs', { params }),
  
  getLogByDate: (date: string) => 
    api.get(`/logs/${date}`),
  
  createLog: (logData: any) => 
    api.post('/logs', logData),
  
  getLatestLogTimestamp: () => api.get('/logs/latest-timestamp'),
};

// Lifestyle tracking endpoints
export const lifestyleAPI = {
  getLogs: async (params?: { type?: string; startDate?: string; endDate?: string }) => {
    try {
      const response = await api.get('/lifestyle', { params });
      return response;
    } catch (error) {
      console.error('Error fetching lifestyle logs:', error);
      throw error;
    }
  },
  
  createLog: async (logData: any) => {
    try {
      const response = await api.post('/lifestyle', logData);
      return response;
    } catch (error) {
      console.error('Error creating lifestyle log:', error);
      throw error;
    }
  },
};

// Medical files endpoints
export const filesAPI = {
  getFiles: (params?: { category?: string }) => 
    api.get('/files', { params }),
  
  uploadFile: (fileData: FormData) => 
    api.post('/files', fileData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  downloadFile: (fileId: number | string) => 
    api.get(`/files/${fileId}/download`, { responseType: 'blob' }),
  
  deleteFile: (fileId: number | string) => 
    api.delete(`/files/${fileId}`),
};

// Health insights endpoints
export const insightsAPI = {
  getInsights: (params?: { category?: string, timeRange?: string }) => 
    api.get('/insights', { params }),
    
  getLatestInsight: () =>
    api.get('/insights/latest'),
    
  generateInsight: () =>
    api.post('/insights/generate'),
    
  getInsightsHistory: (days = 7) =>
    api.get(`/insights/history?days=${days}`).catch(error => {
      console.error('Error fetching insights history:', error);
      throw error;
    }),
};

// Dashboard endpoints
export const dashboardAPI = {
  getStats: () => 
    api.get('/dashboard/stats'),
  
  getMoodChart: (params?: { days?: number }) => 
    api.get('/dashboard/mood-chart', { params }),
  
  getTopSymptoms: () => 
    api.get('/dashboard/top-symptoms'),
};

export default api;