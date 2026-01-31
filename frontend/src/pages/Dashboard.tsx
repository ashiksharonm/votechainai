/**
 * Voter Dashboard
 * Lists active elections and allows voting with candidate selection
 * Includes face verification step before voting
 * 
 * ZK Verification Features:
 * - Generates client-side secret
 * - Computes commitment hash: H(Candidate + Secret)
 * - Sends hash for "Proof of Inclusion"
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { electionsApi, votingApi, API_BASE } from '../api/client';
import type { Election, VoteReceipt } from '../api/types';
import FaceVerification from '../components/FaceVerification';
import './Dashboard.css';

interface ElectionResult {
    election_id: number;
    title: string;
    total_votes: number;
    winner: {
        name: string;
        votes: number;
        percentage: number;
    } | null;
    candidates: Array<{
        id: number;
        name: string;
        position: string;
        votes: number;
        percentage: number;
    }>;
}

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [elections, setElections] = useState<Election[]>([]);
    const [votedElections, setVotedElections] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selection state
    const [selectedElection, setSelectedElection] = useState<Election | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
    const [error, setError] = useState('');

    // ZK Verification State
    const [voteSecret, setVoteSecret] = useState('');
    const [voteHash, setVoteHash] = useState('');

    // Face verification state
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [faceVerified, setFaceVerified] = useState(false);

    // Results modal
    const [selectedResults, setSelectedResults] = useState<ElectionResult | null>(null);
    const [loadingResults, setLoadingResults] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [electionsData, votedData] = await Promise.all([
                electionsApi.getActive(),
                votingApi.getMyVotes()
            ]);
            setElections(electionsData);
            setVotedElections(votedData);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const hasVoted = (electionId: number) => votedElections.includes(electionId);
    const isElectionEnded = (election: Election) => new Date(election.end_time) < new Date();

    // --- Face Verification Flow ---

    const handleStartVoting = (election: Election) => {
        setSelectedElection(election);
        setFaceVerified(false);
        setShowFaceVerification(true);
    };

    const handleFaceVerified = () => {
        setShowFaceVerification(false);
        setFaceVerified(true);
    };

    const handleCancelFaceVerification = () => {
        setShowFaceVerification(false);
        setSelectedElection(null);
        setFaceVerified(false);
    };

    // --- ZK & Voting Logic ---

    // 1. Generate random secret (12 chars)
    const generateSecret = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomValues = new Uint32Array(12);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < 12; i++) {
            result += chars[randomValues[i] % chars.length];
        }
        return result;
    };

    // 2. Compute SHA-256 hash: H(candidate_id + ":" + secret)
    const computeCommitment = async (candidateId: number, secret: string) => {
        const data = `${candidateId}:${secret}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return '0x' + hashHex;
    };

    const handleSelectCandidate = (candidateId: number) => {
        setSelectedCandidateId(candidateId);
    };

    const handleProceedToConfirm = async () => {
        if (selectedCandidateId === null) {
            setError('Please select a candidate');
            return;
        }
        setError('');

        // Generate ZK Proof data
        const secret = generateSecret();
        const hash = await computeCommitment(selectedCandidateId, secret);

        setVoteSecret(secret);
        setVoteHash(hash);
        setShowConfirmation(true);
    };

    const handleVote = async () => {
        if (!selectedElection || selectedCandidateId === null) return;

        setIsVoting(true);
        setError('');

        try {
            // Send candidate choice (for counting) and hash (for ZK verification)
            // In a real ZK system, the counting vote would be homomorphically encrypted.
            // For this demo, we use simple encoding.
            // Send candidate choice (for counting) and hash (for ZK verification)
            // In a real ZK system, the counting vote would be homomorphically encrypted.
            // For this demo, we use simple encoding.
            const encryptedVote = String(selectedCandidateId); // Using ID directly for correct counting in this demo

            // Call API with hash for ZK flow
            const voteReceipt = await votingApi.cast(
                selectedElection.id,
                encryptedVote,
                voteHash
            );

            setReceipt(voteReceipt);
            setSelectedElection(null);
            setSelectedCandidateId(null);
            setShowConfirmation(false);
            setFaceVerified(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to cast vote');
            setShowConfirmation(false);
        } finally {
            setIsVoting(false);
        }
    };

    // --- UI Helpers ---

    const closeModal = () => {
        setSelectedElection(null);
        setSelectedCandidateId(null);
        setShowConfirmation(false);
        setFaceVerified(false);
        setError('');
        setVoteSecret('');
    };

    const closeReceipt = () => {
        setReceipt(null);
        setVoteSecret('');
    };

    const handleViewResults = async (election: Election) => {
        setLoadingResults(true);
        try {
            const results = await electionsApi.getResults(election.id);
            setSelectedResults(results);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Results not available yet');
        } finally {
            setLoadingResults(false);
        }
    };

    const getEmailPrefix = () => user?.email?.split('@')[0] || '';

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Voter Dashboard</h1>
                <p>Welcome, {user?.email}</p>
            </div>

            <section className="dashboard-section">
                <h2>Active Elections</h2>

                {isLoading ? (
                    <div className="loading">Loading elections...</div>
                ) : elections.length === 0 ? (
                    <div className="empty-state">
                        <p>No active elections available at this time.</p>
                    </div>
                ) : (
                    <div className="elections-grid">
                        {elections.map((election) => {
                            const voted = hasVoted(election.id);
                            const ended = isElectionEnded(election);
                            return (
                                <div key={election.id} className={`election-card ${voted ? 'voted' : ''}`}>
                                    <div className="election-header">
                                        <h3>{election.title}</h3>
                                        <span className={`status-badge ${election.status}`}>
                                            {voted ? '✓ Voted' : ended ? 'Ended' : election.status}
                                        </span>
                                    </div>
                                    <p className="election-description">{election.description || 'No description'}</p>
                                    <div className="election-meta">
                                        <span>Candidates: {election.candidates?.length || 0}</span>
                                        <span>Votes: {election.vote_count || 0}</span>
                                        <span>Ends: {new Date(election.end_time).toLocaleDateString()}</span>
                                    </div>

                                    {voted ? (
                                        <button className="btn btn-success voted-btn" disabled>✓ Already Voted</button>
                                    ) : ended ? (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleViewResults(election)}
                                            disabled={loadingResults}
                                        >
                                            {loadingResults ? 'Loading...' : 'View Results'}
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary" onClick={() => handleStartVoting(election)}>🔐 Verify & Vote</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Face Verification */}
            {showFaceVerification && selectedElection && (
                <FaceVerification
                    onVerified={handleFaceVerified}
                    onCancel={handleCancelFaceVerification}
                    referenceImageUrl={`${API_BASE}/face/reference/${getEmailPrefix()}`}
                />
            )}

            {/* Step 1: Candidate Selection */}
            {selectedElection && faceVerified && !showConfirmation && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✅ Identity Verified - Select Candidate</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <h3>{selectedElection.title}</h3>
                            {error && <div className="error-message">{error}</div>}

                            <div className="candidates-list-voting">
                                {selectedElection.candidates?.map(candidate => (
                                    <label key={candidate.id} className={`candidate-option ${selectedCandidateId === candidate.id ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="candidate"
                                            value={candidate.id}
                                            checked={selectedCandidateId === candidate.id}
                                            onChange={() => handleSelectCandidate(candidate.id)}
                                        />
                                        <div className="candidate-info">
                                            <span className="candidate-name">{candidate.name}</span>
                                            <span className="candidate-position">{candidate.position}</span>
                                        </div>
                                        <div className="check-mark">✓</div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleProceedToConfirm}
                                disabled={selectedCandidateId === null}
                            >
                                Generate Secure Vote →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: ZK Proof & Confirmation */}
            {selectedElection && showConfirmation && (
                <div className="modal-overlay">
                    <div className="modal confirmation-modal">
                        <div className="modal-header">
                            <h2>🔐 Secure Vote Generated</h2>
                        </div>
                        <div className="modal-body">
                            <div className="zk-proof-section">
                                <div className="confirmation-candidate">
                                    <p>Voting for:</p>
                                    <strong>{selectedElection.candidates?.find(c => c.id === selectedCandidateId)?.name}</strong>
                                </div>

                                <div className="zk-secret-box">
                                    <label>YOUR VOTE SECRET KEY:</label>
                                    <div className="secret-code">{voteSecret}</div>
                                    <p className="secret-note">
                                        ⚠️ Save this key! It is the ONLY way to verify your vote later.
                                        Even the admin doesn't know it.
                                    </p>
                                </div>

                                <div className="zk-hash-preview">
                                    <label>Cryptographic Hash (Public Proof):</label>
                                    <code>{voteHash.substring(0, 24)}...</code>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)}>Back</button>
                            <button className="btn btn-primary btn-confirm" onClick={handleVote} disabled={isVoting}>
                                {isVoting ? 'Verifying & Submitting...' : 'Confirm & Commit Vote'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receipt && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>✅ Vote Recorded on Blockchain</h2>
                        </div>
                        <div className="modal-body">
                            <div className="receipt">
                                <div className="zk-secret-box success">
                                    <label>SECRET KEY (SAVE NOW):</label>
                                    <div className="secret-code">{voteSecret}</div>
                                </div>

                                <div className="receipt-row">
                                    <span>Vote Hash:</span>
                                    <code>{receipt.vote_hash.substring(0, 16)}...</code>
                                </div>
                                <div className="receipt-row">
                                    <span>Tx Hash:</span>
                                    <code>{receipt.tx_hash.substring(0, 16)}...</code>
                                </div>
                            </div>
                            <p className="receipt-note">
                                Your vote is permanent. Use your Secret Key + Candidate Name to prove
                                your vote was included without revealing who you are.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={closeReceipt}>Done</button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate(`/verify?hash=${receipt.vote_hash}&secret=${voteSecret}&candidate=${selectedCandidateId}`)}
                            >
                                Verify Inclusion Proof
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {selectedResults && (
                <div className="modal-overlay" onClick={() => setSelectedResults(null)}>
                    <div className="modal results-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🏆 Election Results</h2>
                            <button className="modal-close" onClick={() => setSelectedResults(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <h3>{selectedResults.title}</h3>
                            <p>Total Votes: {selectedResults.total_votes}</p>

                            {selectedResults.winner && (
                                <div className="winner-banner">
                                    <span className="winner-label">Winner</span>
                                    <span className="winner-name">{selectedResults.winner.name}</span>
                                    <span className="winner-votes">{selectedResults.winner.votes} votes</span>
                                </div>
                            )}

                            <div className="results-list">
                                {selectedResults.candidates.map((c) => (
                                    <div key={c.id} className="result-row">
                                        <div className="result-info">
                                            <span>{c.name}</span>
                                            <span>{c.percentage}%</span>
                                        </div>
                                        <div className="result-bar">
                                            <div className="result-bar-fill" style={{ width: `${c.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
