/**
 * Register Page
 * Multi-step registration with face capture
 * Step 1: Email & Password
 * Step 2: Face Capture via Camera
 * Step 3: Complete Registration
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';
import * as faceapi from 'face-api.js';
import './Auth.css';

const Register: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('voter');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    // Face capture state
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Load face-api models when entering step 2
    useEffect(() => {
        if (step === 2 && !modelsLoaded) {
            loadModelsAndCamera();
        }
    }, [step, modelsLoaded]);

    const loadModelsAndCamera = async () => {
        try {
            setCameraStatus('loading');

            // Load face detection model
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            setModelsLoaded(true);

            // Start camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraStatus('ready');
        } catch (err) {
            console.error('Camera/models error:', err);
            setError('Camera access denied or face models failed to load. Please allow camera access.');
            setCameraStatus('error');
        }
    };

    // Detect face in real-time
    useEffect(() => {
        if (step !== 2 || cameraStatus !== 'ready' || !videoRef.current) return;

        const detectInterval = setInterval(async () => {
            if (!videoRef.current) return;

            const detection = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            );
            setFaceDetected(!!detection);
        }, 300);

        return () => clearInterval(detectInterval);
    }, [step, cameraStatus]);

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        // Proceed to face capture
        setStep(2);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current || !faceDetected) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Mirror the image (since camera is mirrored)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        // Get base64 image
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);

        // Stop camera
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const retakePhoto = async () => {
        setCapturedImage(null);
        setCameraStatus('loading');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraStatus('ready');
        } catch {
            setCameraStatus('error');
        }
    };

    const handleFinalSubmit = async () => {
        if (!capturedImage) {
            setError('Please capture your face photo');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Step 1: Register face image
            const faceResponse = await fetch(`${API_BASE}/face/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    image_data: capturedImage
                })
            });

            if (!faceResponse.ok) {
                const data = await faceResponse.json();
                throw new Error(data.detail || 'Failed to save face photo');
            }

            // Step 2: Create user account
            await register(email, password, role);

            setStep(3);
            setSuccess('Account created successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.message || err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const goBack = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCapturedImage(null);
        setStep(1);
    };

    return (
        <div className="auth-container">
            <div className="auth-card register-card">
                <div className="auth-header">
                    <h1>{step === 1 ? 'Create Account' : step === 2 ? '📸 Face Registration' : '✅ Success!'}</h1>
                    <p>
                        {step === 1 && 'Join VoteChainAI and participate in secure elections'}
                        {step === 2 && 'Take a photo for identity verification during voting'}
                        {step === 3 && 'Your account has been created!'}
                    </p>

                    {/* Progress Indicator */}
                    <div className="register-steps">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                </div>

                {/* Step 1: Credentials */}
                {step === 1 && (
                    <form onSubmit={handleStep1Submit} className="auth-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">Account Type</label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="voter">Voter</option>
                            </select>
                        </div>

                        <button type="submit" className="btn btn-primary btn-full">
                            Next: Face Registration →
                        </button>
                    </form>
                )}

                {/* Step 2: Face Capture */}
                {step === 2 && (
                    <div className="face-capture-section">
                        {error && <div className="error-message">{error}</div>}

                        <div className="camera-preview">
                            {!capturedImage ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`camera-video ${faceDetected ? 'face-detected' : ''}`}
                                    />
                                    {cameraStatus === 'loading' && (
                                        <div className="camera-loading">
                                            <div className="spinner"></div>
                                            <span>Loading camera...</span>
                                        </div>
                                    )}
                                    {cameraStatus === 'ready' && (
                                        <div className={`face-indicator ${faceDetected ? 'detected' : ''}`}>
                                            {faceDetected ? '✓ Face Detected' : 'Position your face in frame'}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <img src={capturedImage} alt="Captured face" className="captured-preview" />
                            )}
                        </div>

                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        <div className="capture-actions">
                            {!capturedImage ? (
                                <>
                                    <button className="btn btn-secondary" onClick={goBack}>
                                        ← Back
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={capturePhoto}
                                        disabled={!faceDetected || cameraStatus !== 'ready'}
                                    >
                                        📸 Capture Photo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="btn btn-secondary" onClick={retakePhoto}>
                                        🔄 Retake
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleFinalSubmit}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Creating Account...' : 'Complete Registration ✓'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="success-section">
                        {success && <div className="success-message">{success}</div>}
                        <div className="success-icon">🎉</div>
                        <p>Your face has been registered for secure voting verification.</p>
                    </div>
                )}

                <div className="auth-footer">
                    <p>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
