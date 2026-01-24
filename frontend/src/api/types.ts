/**
 * VoteChainAI API Types
 */

export interface User {
    id: number;
    email: string;
    role: 'admin' | 'voter' | 'auditor';
    is_active: boolean;
    created_at: string;
}

export interface Candidate {
    id: number;
    name: string;
    position: string;
}

export interface Election {
    id: number;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    status: 'draft' | 'active' | 'closed';
    eligible_roles: string[];
    candidates: Candidate[];
    created_by: number | null;
    created_at: string;
    vote_count?: number;
}

export interface VoteReceipt {
    vote_id: string;
    vote_hash: string;
    tx_hash: string;
    election_id: number;
    election_title: string;
    cast_at: string;
}

export interface VoteVerification {
    vote_hash: string;
    tx_hash: string;
    block_number: number | null;
    election_id: number;
    election_title: string;
    verified: boolean;
    timestamp: string;
}

export interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    tx_hash: string | null;
    created_at: string;
}
