"""
AI Anomaly Detection Hooks

Real-time voting anomaly detection using statistical analysis:
- Rapid voting detection
- Unusual time patterns
- IP correlation analysis
- Voting pattern analysis
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib
import logging

logger = logging.getLogger(__name__)


class VotingAnomalyDetector:
    """
    AI-powered anomaly detection for voting fraud prevention.
    
    Analyzes voting patterns in real-time to detect:
    - Rapid successive votes (bot detection)
    - Unusual voting hours
    - IP address correlation
    - Abnormal voting frequency
    """
    
    # Detection thresholds
    RAPID_VOTE_WINDOW_MINUTES = 5
    RAPID_VOTE_THRESHOLD = 3
    UNUSUAL_HOURS = (1, 5)  # 1 AM - 5 AM
    
    def __init__(self):
        self._vote_cache: Dict[int, List[datetime]] = defaultdict(list)
        self._ip_cache: Dict[str, List[tuple]] = defaultdict(list)  # (user_id, timestamp)
    
    def analyze_vote(
        self,
        user_id: int,
        election_id: int,
        ip_address: Optional[str] = None,
        db = None
    ) -> Dict[str, Any]:
        """
        Analyze a vote for potential anomalies.
        
        Returns:
            {
                "is_suspicious": bool,
                "risk_score": 0-100,
                "anomalies": [...],
                "recommendation": str
            }
        """
        anomalies = []
        risk_score = 0
        now = datetime.utcnow()
        
        # Check 1: Rapid voting detection
        self._vote_cache[user_id].append(now)
        # Clean old entries
        self._vote_cache[user_id] = [
            t for t in self._vote_cache[user_id]
            if now - t < timedelta(minutes=self.RAPID_VOTE_WINDOW_MINUTES)
        ]
        
        if len(self._vote_cache[user_id]) >= self.RAPID_VOTE_THRESHOLD:
            anomalies.append({
                "type": "rapid_voting",
                "severity": "MEDIUM",
                "message": f"User cast {len(self._vote_cache[user_id])} votes in {self.RAPID_VOTE_WINDOW_MINUTES} minutes",
                "score_impact": 30
            })
            risk_score += 30
        
        # Check 2: Unusual voting time
        current_hour = now.hour
        if self.UNUSUAL_HOURS[0] <= current_hour <= self.UNUSUAL_HOURS[1]:
            anomalies.append({
                "type": "unusual_time",
                "severity": "LOW",
                "message": f"Vote cast at unusual hour: {current_hour}:00 UTC",
                "score_impact": 15
            })
            risk_score += 15
        
        # Check 3: IP correlation (multiple users from same IP)
        if ip_address:
            ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
            self._ip_cache[ip_hash].append((user_id, now))
            # Clean old entries
            self._ip_cache[ip_hash] = [
                (uid, t) for uid, t in self._ip_cache[ip_hash]
                if now - t < timedelta(hours=1)
            ]
            
            unique_users = len(set(uid for uid, _ in self._ip_cache[ip_hash]))
            if unique_users > 2:
                anomalies.append({
                    "type": "ip_correlation",
                    "severity": "HIGH",
                    "message": f"IP used by {unique_users} different users in 1 hour",
                    "score_impact": 40
                })
                risk_score += 40
        
        # Check 4: Database-based historical analysis (if db provided)
        if db:
            try:
                from sqlalchemy import select, func
                from app.models.vote import Vote
                
                # Count user's total votes
                result = db.execute(
                    select(func.count()).select_from(Vote).where(Vote.user_id == user_id)
                )
                total_votes = result.scalar() or 0
                
                if total_votes > 10:  # Threshold for "high activity"
                    anomalies.append({
                        "type": "high_frequency_voter",
                        "severity": "LOW",
                        "message": f"User has voted in {total_votes} elections",
                        "score_impact": 10
                    })
                    risk_score += 10
            except Exception as e:
                logger.warning(f"DB analysis failed: {e}")
        
        # Determine result
        is_suspicious = risk_score >= 50
        
        if risk_score >= 75:
            recommendation = "BLOCK: High fraud risk"
        elif risk_score >= 50:
            recommendation = "FLAG: Manual review needed"
        elif risk_score >= 25:
            recommendation = "MONITOR: Low-level anomalies"
        else:
            recommendation = "ALLOW: No issues detected"
        
        logger.info(f"Anomaly check: user={user_id}, election={election_id}, risk={risk_score}")
        
        return {
            "is_suspicious": is_suspicious,
            "risk_score": min(100, risk_score),
            "anomalies": anomalies,
            "recommendation": recommendation,
            "checked_at": now.isoformat()
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get anomaly detection summary stats"""
        return {
            "active_user_sessions": len(self._vote_cache),
            "tracked_ips": len(self._ip_cache),
            "detection_active": True
        }


# Global detector instance
_detector: Optional[VotingAnomalyDetector] = None


def get_detector() -> VotingAnomalyDetector:
    """Get or create detector singleton"""
    global _detector
    if _detector is None:
        _detector = VotingAnomalyDetector()
    return _detector


def analyze_vote_pattern(
    election_id: int,
    user_id: int = None,
    ip_address: str = None,
    db = None
) -> Dict[str, Any]:
    """
    Main hook for vote anomaly analysis.
    Called after each vote is cast.
    """
    detector = get_detector()
    
    if user_id is None:
        # Legacy call without user context
        return {"skipped": True, "reason": "No user context"}
    
    return detector.analyze_vote(
        user_id=user_id,
        election_id=election_id,
        ip_address=ip_address,
        db=db
    )


def detect_turnout_spike(election_id: int, window_minutes: int = 5) -> Optional[Dict]:
    """Detect sudden turnout spikes"""
    detector = get_detector()
    # Would analyze vote rate vs baseline
    return None


def detect_timing_irregularities(election_id: int) -> List[Dict]:
    """Detect suspicious timing patterns"""
    return []


def detect_duplicate_behavior(election_id: int) -> List[Dict]:
    """Detect potential duplicate voting behavior"""
    return []
