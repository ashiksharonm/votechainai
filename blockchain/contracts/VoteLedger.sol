// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VoteLedger
 * @author VoteChainAI
 * @notice Immutable vote recording for election integrity
 * @dev Stores only vote hashes - never actual vote content
 * 
 * SECURITY GUARANTEES:
 * - No vote modification after submission
 * - No vote deletion
 * - No admin override of votes
 * - One vote per wallet per election
 * - All votes emit verifiable events
 */
contract VoteLedger {
    // ============ Structs ============
    
    struct Vote {
        bytes32 voteHash;
        uint256 timestamp;
        bool exists;
    }
    
    struct Election {
        bool exists;
        bool isActive;
        uint256 startTime;
        uint256 endTime;
        uint256 voteCount;
    }
    
    // ============ State Variables ============
    
    address public admin;
    
    /// @notice Mapping of election ID to election data
    mapping(uint256 => Election) public elections;
    
    /// @notice Mapping of election ID => voter address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Mapping of election ID => array of vote hashes
    mapping(uint256 => bytes32[]) public electionVoteHashes;
    
    /// @notice Mapping of vote hash to vote data
    mapping(bytes32 => Vote) public votes;
    
    // ============ Events ============
    
    event ElectionCreated(
        uint256 indexed electionId,
        uint256 startTime,
        uint256 endTime
    );
    
    event ElectionActivated(uint256 indexed electionId);
    
    event ElectionClosed(uint256 indexed electionId, uint256 finalVoteCount);
    
    event VoteSubmitted(
        uint256 indexed electionId,
        address indexed voter,
        bytes32 indexed voteHash,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error OnlyAdmin();
    error ElectionNotFound();
    error ElectionNotActive();
    error ElectionAlreadyExists();
    error VotingNotStarted();
    error VotingEnded();
    error AlreadyVoted();
    error InvalidVoteHash();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }
    
    modifier electionExists(uint256 electionId) {
        if (!elections[electionId].exists) revert ElectionNotFound();
        _;
    }
    
    modifier electionActive(uint256 electionId) {
        Election storage election = elections[electionId];
        if (!election.exists) revert ElectionNotFound();
        if (!election.isActive) revert ElectionNotActive();
        if (block.timestamp < election.startTime) revert VotingNotStarted();
        if (block.timestamp > election.endTime) revert VotingEnded();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        admin = msg.sender;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Create a new election
     * @param electionId Unique election identifier
     * @param startTime Unix timestamp when voting starts
     * @param endTime Unix timestamp when voting ends
     */
    function createElection(
        uint256 electionId,
        uint256 startTime,
        uint256 endTime
    ) external onlyAdmin {
        if (elections[electionId].exists) revert ElectionAlreadyExists();
        require(endTime > startTime, "Invalid time range");
        
        elections[electionId] = Election({
            exists: true,
            isActive: false,
            startTime: startTime,
            endTime: endTime,
            voteCount: 0
        });
        
        emit ElectionCreated(electionId, startTime, endTime);
    }
    
    /**
     * @notice Activate an election to start accepting votes
     * @param electionId Election to activate
     */
    function activateElection(uint256 electionId) 
        external 
        onlyAdmin 
        electionExists(electionId) 
    {
        elections[electionId].isActive = true;
        emit ElectionActivated(electionId);
    }
    
    /**
     * @notice Close an election to stop accepting votes
     * @param electionId Election to close
     */
    function closeElection(uint256 electionId) 
        external 
        onlyAdmin 
        electionExists(electionId) 
    {
        Election storage election = elections[electionId];
        election.isActive = false;
        emit ElectionClosed(electionId, election.voteCount);
    }
    
    // ============ Voting Functions ============
    
    /**
     * @notice Submit a vote hash to the blockchain
     * @param electionId Election to vote in
     * @param voteHash SHA-256 hash of the encrypted vote
     * @dev Vote content is never stored - only the hash
     */
    function submitVote(
        uint256 electionId,
        bytes32 voteHash
    ) external electionActive(electionId) {
        // Validate vote hash
        if (voteHash == bytes32(0)) revert InvalidVoteHash();
        
        // Check if already voted (one vote per wallet per election)
        if (hasVoted[electionId][msg.sender]) revert AlreadyVoted();
        
        // Record vote
        hasVoted[electionId][msg.sender] = true;
        electionVoteHashes[electionId].push(voteHash);
        elections[electionId].voteCount++;
        
        votes[voteHash] = Vote({
            voteHash: voteHash,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit VoteSubmitted(electionId, msg.sender, voteHash, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get the total vote count for an election
     * @param electionId Election to query
     * @return Number of votes cast
     */
    function getVoteCount(uint256 electionId) 
        external 
        view 
        electionExists(electionId) 
        returns (uint256) 
    {
        return elections[electionId].voteCount;
    }
    
    /**
     * @notice Check if a vote hash exists
     * @param voteHash Hash to verify
     * @return True if vote exists on chain
     */
    function verifyVote(bytes32 voteHash) external view returns (bool) {
        return votes[voteHash].exists;
    }
    
    /**
     * @notice Get vote timestamp
     * @param voteHash Hash to query
     * @return Unix timestamp of vote
     */
    function getVoteTimestamp(bytes32 voteHash) external view returns (uint256) {
        require(votes[voteHash].exists, "Vote not found");
        return votes[voteHash].timestamp;
    }
    
    /**
     * @notice Check if an address has voted in an election
     * @param electionId Election to check
     * @param voter Address to check
     * @return True if address has voted
     */
    function hasAddressVoted(uint256 electionId, address voter) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[electionId][voter];
    }
    
    /**
     * @notice Get election info
     * @param electionId Election to query
     * @return exists Whether election exists
     * @return isActive Whether election is active
     * @return startTime Voting start time
     * @return endTime Voting end time
     * @return voteCount Number of votes cast
     */
    function getElection(uint256 electionId) 
        external 
        view 
        returns (
            bool exists,
            bool isActive,
            uint256 startTime,
            uint256 endTime,
            uint256 voteCount
        ) 
    {
        Election storage election = elections[electionId];
        return (
            election.exists,
            election.isActive,
            election.startTime,
            election.endTime,
            election.voteCount
        );
    }
}
