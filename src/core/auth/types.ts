import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AuthClientOptions {
  baseUrl?: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface LoginOptions {
  useArchive?: boolean;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface IAuthClient {
  post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse>;
}
