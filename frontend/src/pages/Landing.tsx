/**
 * Landing Page
 * Project overview with live stats
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../api/client';
import './Landing.css';

const Landing: React.FC = () => {
    const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);

    useEffect(() => {
        checkHealth().then(setIsApiOnline);
    }, []);

    return (
        <div className="landing">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1>
                        <span className="gradient-text">VoteChainAI</span>
                        <br />
                        Secure. Transparent. Explainable.
                    </h1>
                    <p className="hero-subtitle">
                        A production-grade voting platform powered by blockchain immutability
                        and AI-assisted integrity monitoring. Every vote is cryptographically
                        secured and permanently recorded.
                    </p>
                    <div className="hero-ctas">
                        <Link to="/register" className="btn btn-primary">
                            Get Started
                        </Link>
                        <Link to="/verify" className="btn btn-secondary">
                            Verify a Vote
                        </Link>
                    </div>
                    <div className="api-status">
                        <span className={`status-dot ${isApiOnline === null ? '' : isApiOnline ? 'online' : 'offline'}`}></span>
                        <span>
                            {isApiOnline === null ? 'Checking API...' : isApiOnline ? 'API Online' : 'API Offline'}
                        </span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <h2>Built for Trust</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🔐</div>
                        <h3>Secure Authentication</h3>
                        <p>JWT-based authentication with bcrypt password hashing. Role-based access control for voters and admins.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">⛓️</div>
                        <h3>Blockchain Backed</h3>
                        <p>Every vote is recorded on an immutable blockchain ledger. No vote can be modified or deleted once cast.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🔍</div>
                        <h3>Verifiable</h3>
                        <p>Voters receive a cryptographic receipt. Anyone can verify a vote exists without revealing its content.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <h2>How It Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Register & Login</h3>
                        <p>Create an account and authenticate securely</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Cast Your Vote</h3>
                        <p>Select an election and submit your encrypted vote</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Get Receipt</h3>
                        <p>Receive a cryptographic hash as proof of your vote</p>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <h3>Verify Anytime</h3>
                        <p>Use your hash to verify your vote on the blockchain</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <h2>Democracy deserves infrastructure you can trust.</h2>
                <p>Join VoteChainAI and participate in secure, transparent elections.</p>
                <div className="cta-buttons">
                    <Link to="/register" className="btn btn-primary btn-large">
                        Create Account
                    </Link>
                    <Link to="/login" className="btn btn-secondary btn-large">
                        Sign In
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2026 VoteChainAI. Built with FastAPI, React, and Solidity.</p>
            </footer>
        </div>
    );
};

export default Landing;
