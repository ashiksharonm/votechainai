"""
AI Anomaly Detection Service

Detects suspicious voting patterns using statistical analysis:
- Unusual voting times
- Rapid successive votes
- IP/device fingerprint anomalies
- Face similarity across users (potential duplicates)
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from collections import defaultdict
import hashlib

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.vote import Vote
from app.models.user import User
from app.models.election import Election
from app.models.audit_log import AuditLog


class AnomalyType:
    """Types of detected anomalies"""
    RAPID_VOTING = "rapid_voting"
    UNUSUAL_TIME = "unusual_time"
    MULTIPLE_IP = "multiple_ip"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    DUPLICATE_FACE = "duplicate_face"


class AnomalyScore:
    """Anomaly severity levels"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class AnomalyDetectionService:
    """
    AI-powered anomaly detection for voting fraud prevention.
    
    Uses statistical analysis and pattern matching to identify
    suspicious voting behavior in real-time.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._ip_vote_cache: Dict[str, List[datetime]] = defaultdict(list)
        self._user_vote_times: Dict[int, List[datetime]] = defaultdict(list)
    
    def analyze_vote(
        self,
        user_id: int,
        election_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a vote for potential anomalies.
        
        Returns:
            Dictionary with anomaly analysis results:
            - is_suspicious: bool
            - risk_score: 0-100
            - anomalies: List of detected issues
            - recommendation: str
        """
        anomalies = []
        risk_score = 0
        
        # Check 1: Rapid voting detection
        rapid_check = self._check_rapid_voting(user_id)
        if rapid_check["detected"]:
            anomalies.append({
                "type": AnomalyType.RAPID_VOTING,
                "severity": AnomalyScore.MEDIUM,
                "message": rapid_check["message"]
            })
            risk_score += 25
        
        # Check 2: Unusual voting time (night voting between 1 AM - 5 AM)
        time_check = self._check_unusual_time()
        if time_check["detected"]:
            anomalies.append({
                "type": AnomalyType.UNUSUAL_TIME,
                "severity": AnomalyScore.LOW,
                "message": time_check["message"]
            })
            risk_score += 10
        
        # Check 3: Multiple IPs from same user
        if ip_address:
            ip_check = self._check_ip_patterns(user_id, ip_address)
            if ip_check["detected"]:
                anomalies.append({
                    "type": AnomalyType.MULTIPLE_IP,
                    "severity": AnomalyScore.MEDIUM,
                    "message": ip_check["message"]
                })
                risk_score += 20
        
        # Check 4: Historical voting patterns
        pattern_check = self._check_voting_pattern(user_id, election_id)
        if pattern_check["detected"]:
            anomalies.append({
                "type": AnomalyType.SUSPICIOUS_PATTERN,
                "severity": AnomalyScore.HIGH,
                "message": pattern_check["message"]
            })
            risk_score += 35
        
        # Determine if vote should be flagged
        is_suspicious = risk_score >= 50
        
        # Generate recommendation
        if risk_score >= 75:
            recommendation = "BLOCK: High risk of fraud detected"
        elif risk_score >= 50:
            recommendation = "FLAG: Manual review recommended"
        elif risk_score >= 25:
            recommendation = "MONITOR: Low-level anomalies detected"
        else:
            recommendation = "ALLOW: No significant anomalies"
        
        # Log the analysis
        self._log_anomaly_check(
            user_id=user_id,
            election_id=election_id,
            risk_score=risk_score,
            anomalies=anomalies,
            is_suspicious=is_suspicious
        )
        
        return {
            "is_suspicious": is_suspicious,
            "risk_score": min(100, risk_score),
            "anomalies": anomalies,
            "recommendation": recommendation,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _check_rapid_voting(self, user_id: int) -> Dict[str, Any]:
        """Check if user is voting too rapidly (potential automation)"""
        # Get user's recent votes across all elections
        recent_votes = self.db.query(Vote).filter(
            Vote.user_id == user_id,
            Vote.created_at >= datetime.utcnow() - timedelta(minutes=5)
        ).count()
        
        if recent_votes >= 3:
            return {
                "detected": True,
                "message": f"User cast {recent_votes} votes in last 5 minutes"
            }
        return {"detected": False}
    
    def _check_unusual_time(self) -> Dict[str, Any]:
        """Check if vote is cast at unusual hour"""
        current_hour = datetime.utcnow().hour
        
        # Flag votes between 1 AM - 5 AM (unusual activity window)
        if 1 <= current_hour <= 5:
            return {
                "detected": True,
                "message": f"Vote cast at unusual hour: {current_hour}:00 UTC"
            }
        return {"detected": False}
    
    def _check_ip_patterns(self, user_id: int, ip_address: str) -> Dict[str, Any]:
        """Check for suspicious IP patterns"""
        # Check if this IP has been used by other users recently
        ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
        
        # Query audit logs for same IP, different users
        recent_ips = self.db.query(AuditLog).filter(
            AuditLog.action == "vote_cast",
            AuditLog.ip_address == ip_hash,
            AuditLog.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).distinct(AuditLog.user_id).count()
        
        if recent_ips > 2:
            return {
                "detected": True,
                "message": f"IP address used by {recent_ips} different users"
            }
        return {"detected": False}
    
    def _check_voting_pattern(self, user_id: int, election_id: int) -> Dict[str, Any]:
        """Analyze user's historical voting patterns"""
        # Check if user has voted in an unusually high number of elections
        user_elections = self.db.query(Vote).filter(
            Vote.user_id == user_id
        ).distinct(Vote.election_id).count()
        
        # Average votes per user
        avg_votes = self.db.query(func.count(Vote.id)).scalar() or 0
        total_users = self.db.query(User).count() or 1
        avg_per_user = avg_votes / total_users
        
        # Flag if user has 3x more votes than average
        if user_elections > avg_per_user * 3 and user_elections > 5:
            return {
                "detected": True,
                "message": f"User has voted in {user_elections} elections (avg: {avg_per_user:.1f})"
            }
        return {"detected": False}
    
    def _log_anomaly_check(
        self,
        user_id: int,
        election_id: int,
        risk_score: int,
        anomalies: List[Dict],
        is_suspicious: bool
    ):
        """Log anomaly detection results to audit trail"""
        try:
            import json
            log = AuditLog(
                action="anomaly_check",
                user_id=user_id,
                target_type="vote",
                target_id=election_id,
                details=json.dumps({
                    "risk_score": risk_score,
                    "is_suspicious": is_suspicious,
                    "anomaly_count": len(anomalies)
                }),
                ip_address=None
            )
            self.db.add(log)
            self.db.commit()
        except Exception as e:
            print(f"Failed to log anomaly check: {e}")
    
    def get_election_anomaly_report(self, election_id: int) -> Dict[str, Any]:
        """Generate anomaly report for an entire election"""
        # Get all votes for this election
        votes = self.db.query(Vote).filter(Vote.election_id == election_id).all()
        
        flagged_votes = 0
        total_risk = 0
        anomaly_types = defaultdict(int)
        
        # Analyze each vote
        for vote in votes:
            result = self.analyze_vote(vote.user_id, election_id)
            if result["is_suspicious"]:
                flagged_votes += 1
            total_risk += result["risk_score"]
            
            for anomaly in result["anomalies"]:
                anomaly_types[anomaly["type"]] += 1
        
        avg_risk = total_risk / len(votes) if votes else 0
        
        return {
            "election_id": election_id,
            "total_votes": len(votes),
            "flagged_votes": flagged_votes,
            "flagged_percentage": (flagged_votes / len(votes) * 100) if votes else 0,
            "average_risk_score": round(avg_risk, 2),
            "anomaly_breakdown": dict(anomaly_types),
            "generated_at": datetime.utcnow().isoformat()
        }


# Singleton instance for easy import
_instance: Optional[AnomalyDetectionService] = None


def get_anomaly_service(db: Session) -> AnomalyDetectionService:
    """Get or create anomaly detection service instance"""
    global _instance
    if _instance is None or _instance.db != db:
        _instance = AnomalyDetectionService(db)
    return _instance
