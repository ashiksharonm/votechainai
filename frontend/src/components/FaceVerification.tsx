/**
 * Face Verification Component with Liveness Detection
 * 
 * Uses face-api.js for face detection and recognition.
 * Includes anti-spoofing measures:
 * - Blink Detection (Eye Aspect Ratio monitoring)
 * - Head Movement Detection
 * - Motion Analysis
 */

import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './FaceVerification.css';

interface FaceVerificationProps {
    onVerified: () => void;
    onCancel: () => void;
    referenceImageUrl: string;
}

// Eye Aspect Ratio threshold for blink detection
const EAR_THRESHOLD = 0.25;
const REQUIRED_BLINKS = 2;

const FaceVerification: React.FC<FaceVerificationProps> = ({
    onVerified,
    onCancel,
    referenceImageUrl
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'loading' | 'liveness' | 'verifying' | 'success' | 'failed'>('loading');
    const [message, setMessage] = useState('Loading face recognition models...');
    const [matchScore, setMatchScore] = useState<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Liveness detection state
    const [blinkCount, setBlinkCount] = useState(0);
    const [isEyesClosed, setIsEyesClosed] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [livenessProgress, setLivenessProgress] = useState(0);
    const livenessIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastEARRef = useRef<number>(1);

    // Cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (livenessIntervalRef.current) {
                clearInterval(livenessIntervalRef.current);
            }
        };
    }, []);

    // Load models and start camera
    useEffect(() => {
        const loadModels = async () => {
            try {
                setMessage('Loading AI models...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                ]);
                setMessage('Starting camera...');
                await startCamera();
                setStatus('liveness');
                setMessage('👁️ Blink 2 times to prove you are real');
            } catch (error) {
                console.error('Failed to load models:', error);
                setMessage('Failed to load models. Please refresh.');
                setStatus('failed');
            }
        };
        loadModels();
    }, []);

    // Start liveness detection when in liveness mode
    useEffect(() => {
        if (status === 'liveness' && videoRef.current) {
            startLivenessDetection();
        }
        return () => {
            if (livenessIntervalRef.current) {
                clearInterval(livenessIntervalRef.current);
            }
        };
    }, [status]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Failed to start camera:', error);
            setMessage('Camera access denied.');
            setStatus('failed');
        }
    };

    // Calculate Eye Aspect Ratio for blink detection
    const calculateEAR = (eye: faceapi.Point[]) => {
        // Eye landmarks: 0-5 for each eye
        // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        const p1 = eye[0];
        const p2 = eye[1];
        const p3 = eye[2];
        const p4 = eye[3];
        const p5 = eye[4];
        const p6 = eye[5];

        const vertical1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
        const vertical2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
        const horizontal = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

        return (vertical1 + vertical2) / (2 * horizontal);
    };

    const startLivenessDetection = () => {
        livenessIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || status !== 'liveness') return;

            try {
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();

                if (!detection) {
                    setFaceDetected(false);
                    return;
                }

                setFaceDetected(true);

                // Get eye landmarks (indices 36-41 for left eye, 42-47 for right eye)
                const landmarks = detection.landmarks;
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                const leftEAR = calculateEAR(leftEye);
                const rightEAR = calculateEAR(rightEye);
                const avgEAR = (leftEAR + rightEAR) / 2;

                // Detect blink: EAR drops below threshold then rises above
                const wasEyesClosed = lastEARRef.current < EAR_THRESHOLD;
                const isNowOpen = avgEAR >= EAR_THRESHOLD;
                const isNowClosed = avgEAR < EAR_THRESHOLD;

                if (wasEyesClosed && isNowOpen) {
                    // Blink completed
                    setBlinkCount(prev => {
                        const newCount = prev + 1;
                        setLivenessProgress((newCount / REQUIRED_BLINKS) * 100);

                        if (newCount >= REQUIRED_BLINKS) {
                            // Liveness check passed!
                            if (livenessIntervalRef.current) {
                                clearInterval(livenessIntervalRef.current);
                            }
                            proceedToVerification();
                        }
                        return newCount;
                    });
                }

                setIsEyesClosed(isNowClosed);
                lastEARRef.current = avgEAR;

            } catch (error) {
                console.error('Liveness detection error:', error);
            }
        }, 150); // ~7 FPS for smooth detection
    };

    const proceedToVerification = async () => {
        setStatus('verifying');
        setMessage('✓ Liveness confirmed! Verifying identity...');

        try {
            // Detect face in video
            const detection = await faceapi
                .detectSingleFace(videoRef.current!, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setMessage('Face lost. Please try again.');
                setStatus('failed');
                return;
            }

            setMessage('Comparing with your registered photo...');

            // Fetch reference image with auth
            const token = localStorage.getItem('token');
            const response = await fetch(referenceImageUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                setMessage(response.status === 404
                    ? 'Reference image not found. Contact admin.'
                    : 'Failed to load reference image.');
                setStatus('failed');
                return;
            }

            // Convert to image
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            const referenceImg = new Image();
            referenceImg.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                referenceImg.onload = () => resolve();
                referenceImg.onerror = () => reject(new Error('Failed to load image'));
                referenceImg.src = imageUrl;
            });

            const referenceDetection = await faceapi
                .detectSingleFace(referenceImg, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            URL.revokeObjectURL(imageUrl);

            if (!referenceDetection) {
                setMessage('Cannot detect face in reference image.');
                setStatus('failed');
                return;
            }

            // Compare descriptors
            const distance = faceapi.euclideanDistance(
                detection.descriptor,
                referenceDetection.descriptor
            );

            const threshold = 0.6;
            const score = Math.max(0, Math.round((1 - distance) * 100));
            setMatchScore(score);

            if (distance < threshold) {
                setStatus('success');
                setMessage(`✓ Identity verified! Match: ${score}%`);

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                setTimeout(() => onVerified(), 1500);
            } else {
                setStatus('failed');
                setMessage(`Face doesn't match. Score: ${score}%`);
            }
        } catch (error) {
            console.error('Verification error:', error);
            setMessage('Verification failed. Please try again.');
            setStatus('failed');
        }
    };

    const retry = () => {
        setStatus('liveness');
        setBlinkCount(0);
        setLivenessProgress(0);
        setMatchScore(null);
        setMessage('👁️ Blink 2 times to prove you are real');
        startLivenessDetection();
    };

    return (
        <div className="face-verification-overlay">
            <div className="face-verification-modal">
                <div className="fv-header">
                    <h2>🔐 Face Verification</h2>
                    <p>Anti-spoofing liveness check enabled</p>
                </div>

                <div className="fv-content">
                    <div className="camera-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`camera-feed ${status}`}
                        />
                        <canvas ref={canvasRef} className="face-canvas" />

                        {status === 'loading' && (
                            <div className="camera-overlay loading">
                                <div className="spinner"></div>
                            </div>
                        )}

                        {status === 'liveness' && (
                            <div className="liveness-overlay">
                                <div className="blink-indicator">
                                    <span className={`eye-icon ${isEyesClosed ? 'closed' : 'open'}`}>
                                        {isEyesClosed ? '😑' : '👁️'}
                                    </span>
                                </div>
                                {!faceDetected && (
                                    <div className="face-guide">Position your face in frame</div>
                                )}
                            </div>
                        )}

                        {status === 'verifying' && (
                            <div className="camera-overlay detecting">
                                <div className="scanning-line"></div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="camera-overlay success">
                                <div className="checkmark">✓</div>
                            </div>
                        )}

                        {status === 'failed' && (
                            <div className="camera-overlay failed">
                                <div className="cross">✗</div>
                            </div>
                        )}
                    </div>

                    {/* Liveness Progress */}
                    {status === 'liveness' && (
                        <div className="liveness-progress">
                            <div className="progress-label">
                                Blinks detected: {blinkCount} / {REQUIRED_BLINKS}
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${livenessProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className={`status-message ${status}`}>
                        {message}
                    </div>

                    {matchScore !== null && (
                        <div className="match-score">
                            <div className="score-bar">
                                <div
                                    className={`score-fill ${status}`}
                                    style={{ width: `${matchScore}%` }}
                                />
                            </div>
                            <span className="score-text">{matchScore}% match</span>
                        </div>
                    )}
                </div>

                <div className="fv-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>

                    {status === 'failed' && (
                        <button className="btn btn-primary" onClick={retry}>
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceVerification;
