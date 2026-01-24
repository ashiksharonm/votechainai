/**
 * VoteChainAI API Client
 * Handles all HTTP requests to the FastAPI backend
 */

import axios from 'axios';
import type { User, Election, VoteReceipt, VoteVerification, AuditLog } from './types';

// Re-export types for convenience
export type { User, Election, VoteReceipt, VoteVerification, AuditLog };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: async (email: string, password: string, role: string = 'voter'): Promise<User> => {
        const response = await api.post('/auth/register', { email, password, role });
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });
        localStorage.setItem('token', response.data.access_token);
        const user = await authApi.getProfile();
        localStorage.setItem('user', JSON.stringify(user));
        return { token: response.data.access_token, user };
    },

    getProfile: async (): Promise<User> => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};

// Elections API
export const electionsApi = {
    getActive: async (): Promise<Election[]> => {
        const response = await api.get('/elections/active');
        return response.data;
    },

    getById: async (id: number): Promise<Election> => {
        const response = await api.get(`/elections/${id}`);
        return response.data;
    },

    getAll: async (): Promise<Election[]> => {
        const response = await api.get('/elections/all');
        return response.data;
    },

    create: async (data: {
        title: string;
        description?: string;
        start_time: string;
        end_time: string;
        eligible_roles?: string[];
        candidates: { id: number; name: string; position: string }[];
    }): Promise<Election> => {
        const response = await api.post('/elections/create', data);
        return response.data;
    },

    activate: async (id: number): Promise<Election> => {
        const response = await api.post(`/elections/${id}/activate`);
        return response.data;
    },

    close: async (id: number): Promise<Election> => {
        const response = await api.post(`/elections/${id}/close`);
        return response.data;
    },

    getResults: async (id: number): Promise<{
        election_id: number;
        title: string;
        status: string;
        total_votes: number;
        candidates: Array<{
            id: number;
            name: string;
            position: string;
            votes: number;
            percentage: number;
        }>;
        winner: {
            id: number;
            name: string;
            position: string;
            votes: number;
            percentage: number;
        } | null;
    }> => {
        const response = await api.get(`/elections/${id}/results`);
        return response.data;
    },
};

// Voting API
export const votingApi = {
    cast: async (electionId: number, encryptedVote: string, voteHash?: string): Promise<VoteReceipt> => {
        const response = await api.post('/vote/cast', {
            election_id: electionId,
            encrypted_vote: encryptedVote,
            vote_hash: voteHash,
        });
        return response.data;
    },

    verify: async (voteHash: string): Promise<VoteVerification> => {
        const response = await api.get(`/vote/verify/${encodeURIComponent(voteHash)}`);
        return response.data;
    },

    getMyVotes: async (): Promise<number[]> => {
        const response = await api.get('/vote/my-votes');
        return response.data;
    },
};

// Audit API
export const auditApi = {
    getLogs: async (page: number = 1, perPage: number = 50) => {
        const response = await api.get<{ logs: AuditLog[]; total: number; page: number; per_page: number }>(
            `/audit/logs?page=${page}&per_page=${perPage}`
        );
        return response.data;
    },
};

// Health check
export const checkHealth = async (): Promise<boolean> => {
    try {
        const response = await axios.get('http://localhost:8000/health');
        return response.data.status === 'healthy';
    } catch {
        return false;
    }
};

export default api;
