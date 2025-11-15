// src/lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create a base Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Generic GET request
export const getRequest = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.get(url, config);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// Generic POST request
export const postRequest = async <T, U = unknown>(
  url: string,
  data: U,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.post(url, data, config);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// Optional PUT request
export const putRequest = async <T, U = unknown>(
  url: string,
  data: U,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.put(url, data, config);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// Optional DELETE request
export const deleteRequest = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient.delete(url, config);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// Centralized error handler
const handleError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error('Axios error:', error.response?.data || error.message);
  } else {
    console.error('Unexpected error:', error);
  }
};

export default apiClient;
