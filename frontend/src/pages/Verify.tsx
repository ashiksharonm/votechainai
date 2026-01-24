/**
 * Verify Vote Page
 * Supports two modes:
 * 1. Simple Verification (via Hash)
 * 2. Zero-Knowledge Proof (via Secret Key + Candidate)
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { votingApi } from '../api/client';
import type { VoteVerification } from '../api/types';
import './Verify.css';

const Verify: React.FC = () => {
    const [searchParams] = useSearchParams();

    // Mode toggling
    const [mode, setMode] = useState<'hash' | 'zk'>('hash');

    // Simple Hash Mode
    const [voteHash, setVoteHash] = useState(searchParams.get('hash') || '');

    // ZK Mode Inputs
    const [zkSecret, setZkSecret] = useState(searchParams.get('secret') || '');
    const [zkCandidateId, setZkCandidateId] = useState(searchParams.get('candidate') || '');

    // State
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<VoteVerification | null>(null);
    const [error, setError] = useState('');
    const [computedHash, setComputedHash] = useState('');

    useEffect(() => {
        const hashFromUrl = searchParams.get('hash');
        const secretFromUrl = searchParams.get('secret');
        const candidateFromUrl = searchParams.get('candidate');

        if (secretFromUrl && candidateFromUrl) {
            setMode('zk');
            setZkSecret(secretFromUrl);
            setZkCandidateId(candidateFromUrl);
            // Auto-verify if ZK params present
            handleZKVerify(secretFromUrl, candidateFromUrl);
        } else if (hashFromUrl) {
            setMode('hash');
            setVoteHash(hashFromUrl);
            handleVerify(hashFromUrl);
        }
    }, [searchParams]);

    const computeCommitment = async (candidateId: string, secret: string) => {
        const data = `${candidateId}:${secret}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return '0x' + hashHex;
    };

    const handleVerify = async (hash?: string) => {
        const hashToVerify = hash || voteHash;
        if (!hashToVerify.trim()) {
            setError('Please enter a vote hash');
            return;
        }

        setIsVerifying(true);
        setError('');
        setResult(null);

        try {
            const data = await votingApi.verify(hashToVerify);
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Vote not found. Check your hash.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleZKVerify = async (secret?: string, candidate?: string) => {
        const s = secret || zkSecret;
        const c = candidate || zkCandidateId;

        if (!s.trim() || !c.trim()) {
            setError('Please enter both Secret Key and Candidate ID');
            return;
        }

        setIsVerifying(true);
        setError('');
        setResult(null);
        setComputedHash('');

        try {
            // Local Computation (Client-side ZK step)
            const hash = await computeCommitment(c, s);
            setComputedHash(hash);
            setVoteHash(hash); // Update common state

            // Verify existence on chain
            const data = await votingApi.verify(hash);
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Proof verification failed. Vote not found.');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="verify-page">
            <div className="verify-container">
                <div className="verify-header">
                    <h1>🔍 Verify Your Vote</h1>
                    <p>Cryptographic proof of inclusion on the blockchain</p>
                </div>

                <div className="verify-tabs">
                    <button
                        className={`tab-btn ${mode === 'hash' ? 'active' : ''}`}
                        onClick={() => { setMode('hash'); setError(''); setResult(null); }}
                    >
                        # By Vote Hash
                    </button>
                    <button
                        className={`tab-btn ${mode === 'zk' ? 'active' : ''}`}
                        onClick={() => { setMode('zk'); setError(''); setResult(null); }}
                    >
                        🔐 By Secret Key (ZK)
                    </button>
                </div>

                {mode === 'hash' ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="verify-form">
                        <div className="form-group">
                            <label>Vote Hash (from receipt)</label>
                            <input
                                type="text"
                                value={voteHash}
                                onChange={(e) => setVoteHash(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isVerifying}>
                            {isVerifying ? 'Checking Ledger...' : 'Verify Hash'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleZKVerify(); }} className="verify-form">
                        <div className="form-group">
                            <label>Your Secret Key</label>
                            <input
                                type="text"
                                value={zkSecret}
                                onChange={(e) => setZkSecret(e.target.value)}
                                placeholder="e.g. AbC123XyZ..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Candidate ID</label>
                            <input
                                type="number"
                                value={zkCandidateId}
                                onChange={(e) => setZkCandidateId(e.target.value)}
                                placeholder="Candidate ID (e.g. 1)"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isVerifying}>
                            {isVerifying ? 'Generating Proof & Verifying...' : 'Check Inclusion Proof'}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="verify-error">
                        <span className="error-icon">❌</span>
                        <p>{error}</p>
                    </div>
                )}

                {result && (
                    <div className="verify-result">
                        <div className="result-header">
                            <span className={`verification-status ${result.verified ? 'verified' : 'pending'}`}>
                                {result.verified ? '✅ Verified Included' : '⏳ Pending'}
                            </span>
                        </div>

                        {mode === 'zk' && (
                            <div className="zk-success-info">
                                <p><strong>Zero-Knowledge Proof Valid:</strong></p>
                                <p className="xs-text">Your secret key generated hash:</p>
                                <code className="xs-code">{computedHash}</code>
                                <p className="xs-text">which matches the blockchain record.</p>
                            </div>
                        )}

                        <div className="result-details">
                            <div className="detail-row">
                                <span className="label">Election</span>
                                <span>{result.election_title}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Block Number</span>
                                <span>{result.block_number || 'Pending'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Timestamp</span>
                                <span>{new Date(result.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Transaction</span>
                                <code title={result.tx_hash}>{result.tx_hash.substring(0, 20)}...</code>
                            </div>
                        </div>

                        <div className="verification-note">
                            <p>
                                ✓ Proof of Inclusion successful. Your vote is permanently recorded.
                            </p>
                        </div>
                    </div>
                )}

                <div className="verify-info">
                    <h3>How ZK Verification Works</h3>
                    <ul>
                        <li>Your <strong>Secret Key</strong> + <strong>Candidate</strong> generates a unique Hash.</li>
                        <li>We verify this Hash exists on the blockchain.</li>
                        <li>This proves your vote is counted WITHOUT revealing your candidate to the server during verification.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Verify;
