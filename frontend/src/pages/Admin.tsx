/**
 * Admin Panel
 * Election management for administrators
 */

import React, { useState, useEffect } from 'react';
import { electionsApi, auditApi } from '../api/client';
import type { Election, AuditLog, Candidate } from '../api/types';
import './Admin.css';

const Admin: React.FC = () => {
    const [elections, setElections] = useState<Election[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [activeTab, setActiveTab] = useState<'elections' | 'create' | 'audit'>('elections');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Create election form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [candidates, setCandidates] = useState<Candidate[]>([
        { id: 1, name: '', position: '' },
        { id: 2, name: '', position: '' }
    ]);

    useEffect(() => {
        if (activeTab === 'elections') loadElections();
        if (activeTab === 'audit') loadAuditLogs();
    }, [activeTab]);

    const loadElections = async () => {
        setIsLoading(true);
        try {
            const data = await electionsApi.getAll();
            setElections(data);
        } catch (err) {
            console.error('Failed to load elections:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        setIsLoading(true);
        try {
            const data = await auditApi.getLogs();
            setAuditLogs(data.logs);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const addCandidate = () => {
        const newId = Math.max(...candidates.map(c => c.id)) + 1;
        setCandidates([...candidates, { id: newId, name: '', position: '' }]);
    };

    const removeCandidate = (id: number) => {
        if (candidates.length <= 2) {
            setMessage({ type: 'error', text: 'Election must have at least 2 candidates' });
            return;
        }
        setCandidates(candidates.filter(c => c.id !== id));
    };

    const updateCandidate = (id: number, field: 'name' | 'position', value: string) => {
        setCandidates(candidates.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const handleCreateElection = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validate candidates
        const validCandidates = candidates.filter(c => c.name.trim() && c.position.trim());
        if (validCandidates.length < 2) {
            setMessage({ type: 'error', text: 'Please add at least 2 candidates with name and position' });
            return;
        }

        try {
            await electionsApi.create({
                title,
                description,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                eligible_roles: ['voter', 'admin'],
                candidates: validCandidates,
            });
            setMessage({ type: 'success', text: 'Election created successfully!' });
            setTitle('');
            setDescription('');
            setStartTime('');
            setEndTime('');
            setCandidates([
                { id: 1, name: '', position: '' },
                { id: 2, name: '', position: '' }
            ]);
            setActiveTab('elections');
            loadElections();
        } catch (err: any) {
            // Handle different error formats
            let errorMsg = 'Failed to create election';
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (typeof detail === 'string') {
                    errorMsg = detail;
                } else if (Array.isArray(detail)) {
                    errorMsg = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
                }
            }
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleActivate = async (id: number) => {
        try {
            await electionsApi.activate(id);
            loadElections();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to activate election');
        }
    };

    const handleClose = async (id: number) => {
        if (!confirm('Are you sure you want to close this election?')) return;
        try {
            await electionsApi.close(id);
            loadElections();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to close election');
        }
    };

    // Results modal state
    const [selectedResults, setSelectedResults] = useState<{
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
    } | null>(null);

    const handleViewResults = async (id: number) => {
        try {
            const results = await electionsApi.getResults(id);
            setSelectedResults(results);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to load results');
        }
    };

    const closeResults = () => {
        setSelectedResults(null);
    };

    return (
        <div className="admin">
            <div className="admin-header">
                <h1>Admin Panel</h1>
                <p>Manage elections and view audit logs</p>
            </div>

            <div className="admin-tabs">
                <button
                    className={`tab ${activeTab === 'elections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('elections')}
                >
                    Elections
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    Create Election
                </button>
                <button
                    className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    Audit Logs
                </button>
            </div>

            <div className="admin-content">
                {/* Elections Tab */}
                {activeTab === 'elections' && (
                    <div className="elections-list">
                        {isLoading ? (
                            <div className="loading">Loading elections...</div>
                        ) : elections.length === 0 ? (
                            <div className="empty-state">No elections found. Create one!</div>
                        ) : (
                            elections.map((election) => (
                                <div key={election.id} className="election-item">
                                    <div className="election-info">
                                        <h3>{election.title}</h3>
                                        <p>{election.description || 'No description'}</p>
                                        <div className="election-stats">
                                            <span>Votes: {election.vote_count || 0}</span>
                                            <span>Candidates: {election.candidates?.length || 0}</span>
                                            <span>Status: <span className={`status ${election.status}`}>{election.status}</span></span>
                                        </div>
                                        {election.candidates && election.candidates.length > 0 && (
                                            <div className="candidates-preview">
                                                <strong>Candidates:</strong> {election.candidates.map(c => c.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="election-actions">
                                        {election.status === 'draft' && (
                                            <button className="btn btn-primary" onClick={() => handleActivate(election.id)}>
                                                Activate
                                            </button>
                                        )}
                                        {election.status === 'active' && (
                                            <button className="btn btn-secondary" onClick={() => handleClose(election.id)}>
                                                Close
                                            </button>
                                        )}
                                        {election.status === 'closed' && (
                                            <button className="btn btn-primary" onClick={() => handleViewResults(election.id)}>
                                                View Results
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Create Election Tab */}
                {activeTab === 'create' && (
                    <form className="create-election-form" onSubmit={handleCreateElection}>
                        {message.text && (
                            <div className={`message ${message.type}`}>{message.text}</div>
                        )}

                        <div className="form-group">
                            <label>Election Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Board Member Election 2026"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the election..."
                                rows={3}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Time</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Candidates Section */}
                        <div className="candidates-section">
                            <div className="candidates-header">
                                <h3>Candidates</h3>
                                <button type="button" className="btn btn-secondary" onClick={addCandidate}>
                                    + Add Candidate
                                </button>
                            </div>

                            <div className="candidates-list">
                                {candidates.map((candidate, index) => (
                                    <div key={candidate.id} className="candidate-row">
                                        <span className="candidate-number">{index + 1}</span>
                                        <input
                                            type="text"
                                            placeholder="Candidate Name"
                                            value={candidate.name}
                                            onChange={(e) => updateCandidate(candidate.id, 'name', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Current Position"
                                            value={candidate.position}
                                            onChange={(e) => updateCandidate(candidate.id, 'position', e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removeCandidate(candidate.id)}
                                            disabled={candidates.length <= 2}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary">
                            Create Election
                        </button>
                    </form>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'audit' && (
                    <div className="audit-logs">
                        {isLoading ? (
                            <div className="loading">Loading audit logs...</div>
                        ) : auditLogs.length === 0 ? (
                            <div className="empty-state">No audit logs found.</div>
                        ) : (
                            <table className="audit-table">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>User ID</th>
                                        <th>Details</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td><code>{log.action}</code></td>
                                            <td>{log.user_id || 'N/A'}</td>
                                            <td className="details-cell">
                                                {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                                            </td>
                                            <td>{new Date(log.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Results Modal */}
            {selectedResults && (
                <div className="modal-overlay" onClick={closeResults}>
                    <div className="modal results-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🏆 Election Results</h2>
                            <button className="modal-close" onClick={closeResults}>×</button>
                        </div>
                        <div className="modal-body">
                            <h3>{selectedResults.title}</h3>
                            <p className="total-votes">Total Votes: {selectedResults.total_votes}</p>

                            {selectedResults.winner && (
                                <div className="winner-banner">
                                    <span className="winner-label">🎉 Winner</span>
                                    <span className="winner-name">{selectedResults.winner.name}</span>
                                    <span className="winner-votes">{selectedResults.winner.votes} votes ({selectedResults.winner.percentage}%)</span>
                                </div>
                            )}

                            <div className="results-list">
                                {selectedResults.candidates.map((candidate, index) => (
                                    <div
                                        key={candidate.id}
                                        className={`result-row ${index === 0 ? 'winner' : ''}`}
                                    >
                                        <div className="result-rank">{index + 1}</div>
                                        <div className="result-info">
                                            <span className="result-name">{candidate.name}</span>
                                            <span className="result-position">{candidate.position}</span>
                                        </div>
                                        <div className="result-votes">
                                            <span className="result-count">{candidate.votes} votes</span>
                                            <div className="result-bar">
                                                <div
                                                    className="result-bar-fill"
                                                    style={{ width: `${candidate.percentage}%` }}
                                                />
                                            </div>
                                            <span className="result-percentage">{candidate.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={closeResults}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
