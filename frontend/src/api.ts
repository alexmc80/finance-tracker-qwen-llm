import type { Owner, Account, Category, Transaction } from './types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

export const api = {
  owners: {
    getAll: () => request<Owner[]>('/owners'),
    getById: (id: string) => request<Owner>(`/owners/${id}`),
    create: (data: { name: string; pinCode?: string }) => request<Owner>('/owners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: { name?: string; pinCode?: string }) => request<Owner>(`/owners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<void>(`/owners/${id}`, { method: 'DELETE' }),
    verifyPin: (ownerId: string, pinCode: string) => request<{ valid: boolean }>('/owners/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ ownerId, pinCode }),
    }),
  },

  accounts: {
    getAll: () => request<Account[]>('/accounts'),
    getByOwner: (ownerId: string) => request<Account[]>(`/accounts/owner/${ownerId}`),
    getById: (id: string) => request<Account>(`/accounts/${id}`),
    create: (data: { ownerId: string; name: string; currency?: string }) => request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: { name?: string; currency?: string; ownerId?: string }) => request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<void>(`/accounts/${id}`, { method: 'DELETE' }),
  },

  categories: {
    getAll: () => request<Category[]>('/categories'),
    getByOwner: (ownerId: string) => request<Category[]>(`/categories/owner/${ownerId}`),
    getById: (id: string) => request<Category>(`/categories/${id}`),
    create: (data: { ownerId: string; name: string; type: number }) => request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: { name?: string; type?: number; ownerId?: string }) => request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  },

  transactions: {
    getAll: () => request<Transaction[]>('/transactions'),
    getByOwner: (ownerId: string) => request<Transaction[]>(`/transactions/owner/${ownerId}`),
    getById: (id: string) => request<Transaction>(`/transactions/${id}`),
    create: (data: {
      ownerId: string;
      accountId: string;
      categoryId: string;
      amount: number;
      type: number;
      date: string;
    }) => request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: Partial<{
      ownerId: string;
      accountId: string;
      categoryId: string;
      amount: number;
      type: number;
      date: string;
    }>) => request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  },
};
