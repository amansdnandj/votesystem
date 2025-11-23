// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Voting System with FHEVM
/// @notice A privacy-preserving voting system that uses FHEVM to encrypt votes and weights
/// @dev All votes and weights are encrypted, and results are computed in encrypted form
contract VotingSystem is SepoliaConfig {
    // Voting choice: 1 = Approve, 2 = Reject, 3 = Abstain
    struct Vote {
        euint32 choice;  // Encrypted choice (1, 2, or 3)
        euint32 weight;  // Encrypted weight (token amount)
    }
    
    // Note: All vote data is encrypted using FHEVM for privacy preservation

    // Store votes for each proposal
    mapping(uint256 => Vote[]) public votes;
    
    // Track if a user has already voted for a proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // User weight mapping - only admin can set weights
    // If weight is 0, it means the user hasn't been assigned a weight (defaults to 1)
    mapping(address => uint256) public userWeights;
    
    // Store encrypted totals for each proposal
    mapping(uint256 => euint32) public encryptedApproveTotal;
    mapping(uint256 => euint32) public encryptedRejectTotal;
    mapping(uint256 => euint32) public encryptedAbstainTotal;
    mapping(uint256 => euint32) public encryptedTotalWeight;
    
    // Proposal management
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    struct Proposal {
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }
    
    address public admin;
    
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 startTime, uint256 endTime);
    event VoteSubmitted(uint256 indexed proposalId, address indexed voter);
    event ProposalEnded(uint256 indexed proposalId);
    event UserWeightSet(address indexed user, uint256 weight);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Proposal does not exist");
        _;
    }
    
    modifier proposalActive(uint256 proposalId) {
        require(proposals[proposalId].isActive, "Proposal is not active");
        require(block.timestamp >= proposals[proposalId].startTime, "Proposal has not started");
        require(block.timestamp <= proposals[proposalId].endTime, "Proposal has ended");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /// @notice Create a new voting proposal
    /// @param description Description of the proposal
    /// @param duration Duration of the voting period in seconds
    function createProposal(string memory description, uint256 duration) external onlyAdmin {
        uint256 proposalId = proposalCount;
        proposalCount++;
        
        proposals[proposalId] = Proposal({
            description: description,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true
        });
        
        emit ProposalCreated(proposalId, description, block.timestamp, block.timestamp + duration);
    }
    
    /// @notice Set user weight (only admin)
    /// @param user The address of the user
    /// @param weight The weight to assign (0 means unassigned, will default to 1 when voting)
    function setUserWeight(address user, uint256 weight) external onlyAdmin {
        userWeights[user] = weight;
        emit UserWeightSet(user, weight);
    }
    
    /// @notice Get user weight (returns 0 if not assigned, which means default weight of 1)
    /// @param user The address of the user
    /// @return The assigned weight (0 means not assigned, defaults to 1)
    function getUserWeight(address user) external view returns (uint256) {
        return userWeights[user];
    }
    
    /// @notice Submit an encrypted vote
    /// @param proposalId The ID of the proposal
    /// @param encChoice Encrypted choice (1 = Approve, 2 = Reject, 3 = Abstain)
    /// @param choiceProof Proof for the encrypted choice
    function submitVote(
        uint256 proposalId,
        externalEuint32 encChoice,
        bytes calldata choiceProof
    ) external proposalExists(proposalId) proposalActive(proposalId) {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        // Convert external encrypted choice to internal
        euint32 encryptedChoice = FHE.fromExternal(encChoice, choiceProof);
        
        // Get user's weight: if not assigned (0), default to 1
        uint256 userWeight = userWeights[msg.sender];
        if (userWeight == 0) {
            userWeight = 1;
        }
        
        // Encrypt the weight using FHE trivial encryption
        // Since FHE.asEuint32 only works with compile-time constants, we need to use
        // a workaround: build the encrypted weight by adding encrypted 1s
        euint32 encryptedWeight = FHE.asEuint32(0);
        euint32 one = FHE.asEuint32(1);
        
        // Grant ACL permissions for the encrypted constants before using them
        // This is required because FHE.asEuint32 creates encrypted values without ACL permissions
        FHE.allowThis(encryptedWeight);
        FHE.allow(encryptedWeight, msg.sender);
        FHE.allowThis(one);
        FHE.allow(one, msg.sender);
        
        // Add encrypted 1s to build the weight (this is a workaround for variable weights)
        // Note: This approach works but is not optimal for large weights
        // For now, we'll limit to reasonable weight values (e.g., up to 1000)
        for (uint256 i = 0; i < userWeight && i < 1000; i++) {
            encryptedWeight = FHE.add(encryptedWeight, one);
            // Grant ACL for the result of each addition
            FHE.allowThis(encryptedWeight);
            FHE.allow(encryptedWeight, msg.sender);
        }
        
        // Store the vote
        votes[proposalId].push(Vote({
            choice: encryptedChoice,
            weight: encryptedWeight
        }));
        
        // Mark user as voted
        hasVoted[proposalId][msg.sender] = true;
        
        // Update encrypted totals using FHE operations
        // Check if choice is 1 (Approve) - FHE.eq returns ebool, use FHE.select to get weight or 0
        ebool isApprove = FHE.eq(encryptedChoice, FHE.asEuint32(1));
        euint32 approveContribution = FHE.select(isApprove, encryptedWeight, FHE.asEuint32(0));
        encryptedApproveTotal[proposalId] = FHE.add(encryptedApproveTotal[proposalId], approveContribution);
        
        // Check if choice is 2 (Reject)
        ebool isReject = FHE.eq(encryptedChoice, FHE.asEuint32(2));
        euint32 rejectContribution = FHE.select(isReject, encryptedWeight, FHE.asEuint32(0));
        encryptedRejectTotal[proposalId] = FHE.add(encryptedRejectTotal[proposalId], rejectContribution);
        
        // Check if choice is 3 (Abstain)
        ebool isAbstain = FHE.eq(encryptedChoice, FHE.asEuint32(3));
        euint32 abstainContribution = FHE.select(isAbstain, encryptedWeight, FHE.asEuint32(0));
        encryptedAbstainTotal[proposalId] = FHE.add(encryptedAbstainTotal[proposalId], abstainContribution);
        
        // Update total weight
        encryptedTotalWeight[proposalId] = FHE.add(encryptedTotalWeight[proposalId], encryptedWeight);
        
        // Grant ACL permissions for decryption
        FHE.allowThis(encryptedApproveTotal[proposalId]);
        FHE.allow(encryptedApproveTotal[proposalId], msg.sender);
        FHE.allowThis(encryptedRejectTotal[proposalId]);
        FHE.allow(encryptedRejectTotal[proposalId], msg.sender);
        FHE.allowThis(encryptedAbstainTotal[proposalId]);
        FHE.allow(encryptedAbstainTotal[proposalId], msg.sender);
        FHE.allowThis(encryptedTotalWeight[proposalId]);
        FHE.allow(encryptedTotalWeight[proposalId], msg.sender);
        
        emit VoteSubmitted(proposalId, msg.sender);
    }
    
    /// @notice Get encrypted approve total for a proposal
    /// @param proposalId The ID of the proposal
    /// @return The encrypted approve total
    function getEncryptedApproveTotal(uint256 proposalId) external view returns (euint32) {
        return encryptedApproveTotal[proposalId];
    }
    
    /// @notice Get encrypted reject total for a proposal
    /// @param proposalId The ID of the proposal
    /// @return The encrypted reject total
    function getEncryptedRejectTotal(uint256 proposalId) external view returns (euint32) {
        return encryptedRejectTotal[proposalId];
    }
    
    /// @notice Get encrypted abstain total for a proposal
    /// @param proposalId The ID of the proposal
    /// @return The encrypted abstain total
    function getEncryptedAbstainTotal(uint256 proposalId) external view returns (euint32) {
        return encryptedAbstainTotal[proposalId];
    }
    
    /// @notice Get encrypted total weight for a proposal
    /// @param proposalId The ID of the proposal
    /// @return The encrypted total weight
    function getEncryptedTotalWeight(uint256 proposalId) external view returns (euint32) {
        return encryptedTotalWeight[proposalId];
    }
    
    /// @notice End a proposal (only admin)
    /// @param proposalId The ID of the proposal
    function endProposal(uint256 proposalId) external onlyAdmin proposalExists(proposalId) {
        proposals[proposalId].isActive = false;
        emit ProposalEnded(proposalId);
    }
    
    /// @notice Get proposal information
    /// @param proposalId The ID of the proposal
    /// @return description Description of the proposal
    /// @return startTime Start time of the proposal
    /// @return endTime End time of the proposal
    /// @return isActive Whether the proposal is active
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        Proposal memory proposal = proposals[proposalId];
        return (proposal.description, proposal.startTime, proposal.endTime, proposal.isActive);
    }
    
    /// @notice Check if a user has voted for a proposal
    /// @param proposalId The ID of the proposal
    /// @param voter The address of the voter
    /// @return Whether the user has voted
    function checkHasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }
}

