/**
 * NavBar Component
 * Main navigation with auth-aware links
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

const NavBar: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/" className="navbar-logo">
                    🗳️ VoteChainAI
                </Link>
            </div>

            <div className="navbar-links">
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/verify" className="nav-link">Verify Vote</Link>

                {isAuthenticated ? (
                    <>
                        {user?.role === 'admin' ? (
                            <Link to="/admin" className="nav-link">Admin Panel</Link>
                        ) : (
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                        )}
                        <div className="user-info">
                            <span className="user-email">{user?.email}</span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="nav-link">Login</Link>
                        <Link to="/register" className="btn btn-primary">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default NavBar;
