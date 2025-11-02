"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useVotingSystem } from "@/hooks/useVotingSystem";
import { useState, useEffect } from "react";

export const VotingSystemDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const votingSystem = useVotingSystem({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // State variables
  const [voteChoice, setVoteChoice] = useState<number>(1);
  const [proposalDescription, setProposalDescription] = useState<string>("");
  const [proposalDuration, setProposalDuration] = useState<string>("1");
  const [proposalDurationUnit, setProposalDurationUnit] = useState<string>("day");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [weightUserAddress, setWeightUserAddress] = useState<string>("");
  const [weightValue, setWeightValue] = useState<string>("1");
  const [currentView, setCurrentView] = useState<'dashboard' | 'proposals' | 'create' | 'manage'>('dashboard');

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!votingSystem.contractAddress || !ethersReadonlyProvider || !ethersSigner || !votingSystem.abi || votingSystem.abi.length === 0) {
        setIsAdmin(false);
        return;
      }

      try {
        const { ethers } = await import("ethers");
        const contract = new ethers.Contract(
          votingSystem.contractAddress,
          votingSystem.abi,
          ethersReadonlyProvider
        );

        const adminAddress = await contract.admin();
        const userAddress = await ethersSigner.getAddress();
        const isUserAdmin = adminAddress.toLowerCase() === userAddress.toLowerCase();
        setIsAdmin(isUserAdmin);
      } catch (e) {
        console.error("Failed to check admin status:", e);
        setIsAdmin(false);
      }
    };

    if (votingSystem.isDeployed) {
      checkAdmin();
    } else {
      setIsAdmin(false);
    }
  }, [votingSystem.contractAddress, votingSystem.isDeployed, ethersReadonlyProvider, ethersSigner]);

  // Convert duration with unit to seconds
  const convertDurationToSeconds = (duration: string, unit: string): number => {
    const num = parseInt(duration);
    if (isNaN(num)) return 86400; // Default to 1 day if invalid
    
    switch (unit) {
      case 'second': return num;
      case 'minute': return num * 60;
      case 'hour': return num * 3600;
      case 'day': return num * 86400;
      case 'month': return num * 2592000; // 30 days
      default: return num * 86400;
    }
  };

  // Format remaining time
  const formatRemainingTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Ended";
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // Connection Screen
  if (!isConnected) {
    return (
      <div className="main-container">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card max-w-lg w-full text-center p-12">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="header-text text-4xl mb-4">Secure Voting Platform</h1>
              <p className="text-xl text-gray-600 mb-2">Privacy-Preserving Digital Democracy</p>
              <p className="text-sm text-gray-500">Powered by Zama's Fully Homomorphic Encryption</p>
            </div>
            
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-2">🔒 Your Privacy Matters</h3>
              <p className="text-sm text-gray-600">
                All votes are encrypted end-to-end. Even we can't see your individual voting choices - only aggregated results are revealed.
              </p>
            </div>

            <button
              className="btn-primary w-full text-lg py-4 text-white font-semibold"
              onClick={connect}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Connect Your Wallet to Get Started
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              We support MetaMask and other Web3 wallets
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Contract Not Deployed Screen
  if (votingSystem.isDeployed === false) {
    return (
      <div className="main-container">
        <div className="min-h-screen p-6">
          <div className="max-w-4xl mx-auto pt-20">
            <div className="card p-10 text-center">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Setup Required</h2>
                <p className="text-xl text-gray-600 mb-2">Contract Not Yet Deployed</p>
                <p className="text-gray-500">
                  The voting smart contract needs to be deployed on network (Chain ID: <span className="font-mono font-semibold">{chainId}</span>)
                </p>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">📋 Deployment Instructions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please run the following command to deploy the voting contract:
                </p>
                <div className="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm">
                  <div className="flex items-center mb-2">
                    <span className="text-blue-400">$</span>
                    <span className="ml-2">cd backend</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-400">$</span>
                    <span className="ml-2">npx hardhat deploy --network localhost</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro Tip:</strong> Make sure your local Hardhat node is running before deploying the contract.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  const renderDashboard = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="header-text text-4xl mb-4">Secure Voting Platform</h1>
        <p className="text-xl text-gray-600 mb-2">Privacy-preserving digital democracy</p>
        <p className="text-gray-500">Connected as: {accounts?.[0] ? `${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}` : "Unknown"}</p>
      </div>

      {/* Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Proposals Panel */}
        <div 
          className="card p-8 text-center cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => setCurrentView('proposals')}
        >
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Active Proposals</h3>
          <p className="text-gray-600 text-sm">View and vote on proposals</p>
          <div className="mt-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {Number(votingSystem.proposalCount)} Proposals
            </span>
          </div>
        </div>

        {/* Create New Proposal Panel - Admin Only */}
        {isAdmin && (
          <div 
            className="card p-8 text-center cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => setCurrentView('create')}
          >
            <div className="w-12 h-12 mx-auto mb-4 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Create New Proposal</h3>
            <p className="text-gray-600 text-sm">Start a new voting session</p>
            <div className="mt-4">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                Admin Only
              </span>
            </div>
          </div>
        )}

        {/* Manage Voting Weights Panel - Admin Only */}
        {isAdmin && (
          <div 
            className="card p-8 text-center cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => setCurrentView('manage')}
          >
            <div className="w-12 h-12 mx-auto mb-4 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Manage Voting Weights</h3>
            <p className="text-gray-600 text-sm">Assign voting power to users</p>
            <div className="mt-4">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                Admin Only
              </span>
            </div>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="card p-6 mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Network</p>
            <p className="font-semibold">Chain {chainId}</p>
          </div>
          <div>
            <p className="text-gray-600">Your Voting Weight</p>
            <p className="font-semibold text-blue-600">
              {votingSystem.userWeight !== undefined 
                ? (votingSystem.userWeight === BigInt(0) ? "1" : String(votingSystem.userWeight))
                : "Loading..."}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Encryption Status</p>
            <p className={`font-semibold ${fhevmStatus === "ready" ? "text-green-600" : fhevmStatus === "loading" ? "text-yellow-600" : "text-red-600"}`}>
              {fhevmStatus === "ready" ? "Ready" : fhevmStatus === "loading" ? "Loading..." : "Error"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Role</p>
            <p className="font-semibold text-purple-600">{isAdmin ? "Administrator" : "Voter"}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Proposals View
  const renderProposals = () => {
    const selectedProposal = votingSystem.selectedProposalId !== undefined ? votingSystem.proposals[votingSystem.selectedProposalId] : null;
    const isProposalActive = selectedProposal && selectedProposal.isActive && new Date() <= new Date(Number(selectedProposal.endTime) * 1000);

    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header with Back Button */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="btn-secondary mr-4 px-4 py-2 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Active Proposals</h1>
            <p className="text-gray-600">{Number(votingSystem.proposalCount)} total proposals</p>
          </div>
        </div>

        {/* Proposals List */}
        <div className="card p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Proposal List</h2>
            <button
              className="btn-primary px-4 py-2 text-sm"
              disabled={votingSystem.isRefreshing}
              onClick={votingSystem.refreshProposals}
            >
              {votingSystem.isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {votingSystem.proposals.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Proposals Yet</h3>
              <p className="text-gray-600">No proposals have been created yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {votingSystem.proposals.map((proposal, index) => {
                const isSelected = votingSystem.selectedProposalId === index;
                const isActive = proposal.isActive;
                const endTime = new Date(Number(proposal.endTime) * 1000);
                const now = new Date();
                const isExpired = now > endTime;
                const timeRemaining = isActive && !isExpired ? endTime.getTime() - now.getTime() : 0;
                
                return (
                  <div
                    key={index}
                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        votingSystem.setSelectedProposalId(undefined);
                      } else {
                        votingSystem.setSelectedProposalId(index);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center mr-4">
                          <span className="text-lg font-bold text-white">#{index}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">Proposal #{index}</h3>
                          <p className="text-sm text-gray-600">{isSelected ? "Click to deselect" : "Click to select for voting"}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`status-badge ${
                          isActive && !isExpired ? "status-success" : "status-danger"
                        }`}>
                          {isActive && !isExpired ? "Active" : "Ended"}
                        </span>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatRemainingTime(timeRemaining)}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4 text-lg">{proposal.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span></span>
                      {isSelected ? (
                        <span className="text-blue-600 font-semibold">✓ Selected • Click to deselect</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Click to select</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Voting Interface */}
        {votingSystem.selectedProposalId !== undefined && (
          <div className="card p-8 mb-8">
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Cast Your Vote</h2>
                <p className="text-gray-600">Proposal #{votingSystem.selectedProposalId} • {selectedProposal?.description}</p>
              </div>
            </div>
            
            {votingSystem.hasVoted ? (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-yellow-800 mb-2">Vote Successfully Submitted</h3>
                <p className="text-yellow-700 mb-4">
                  Your encrypted vote has been recorded on the blockchain.
                </p>
                <p className="text-sm text-yellow-600">
                  Each wallet address can only vote once per proposal. Your vote is completely private and cannot be traced back to you.
                </p>
              </div>
            ) : !isProposalActive ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-800 mb-2">Voting Period Ended</h3>
                <p className="text-red-700">
                  This proposal is no longer accepting votes. Check the results section below.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">Choose Your Vote</h3>
                  <div className="space-y-4">
                    <label className={`voting-option approve ${voteChoice === 1 ? 'selected' : ''} flex items-center cursor-pointer`}>
                      <input
                        type="radio"
                        value="1"
                        checked={voteChoice === 1}
                        onChange={() => setVoteChoice(1)}
                        className="w-5 h-5 text-green-600 mr-4 flex-shrink-0"
                      />
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-800 block">Approve</span>
                        <p className="text-sm text-gray-600">I support this proposal</p>
                      </div>
                    </label>
                    
                    <label className={`voting-option reject ${voteChoice === 2 ? 'selected' : ''} flex items-center cursor-pointer`}>
                      <input
                        type="radio"
                        value="2"
                        checked={voteChoice === 2}
                        onChange={() => setVoteChoice(2)}
                        className="w-5 h-5 text-red-600 mr-4 flex-shrink-0"
                      />
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-800 block">Reject</span>
                        <p className="text-sm text-gray-600">I oppose this proposal</p>
                      </div>
                    </label>
                    
                    <label className={`voting-option abstain ${voteChoice === 3 ? 'selected' : ''} flex items-center cursor-pointer`}>
                      <input
                        type="radio"
                        value="3"
                        checked={voteChoice === 3}
                        onChange={() => setVoteChoice(3)}
                        className="w-5 h-5 text-gray-600 mr-4 flex-shrink-0"
                      />
                      <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-800 block">Abstain</span>
                        <p className="text-sm text-gray-600">I choose not to take a position</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-blue-800">Your Voting Power</h4>
                  </div>
                  <p className="text-blue-700 mb-2">
                    <span className="text-2xl font-bold">
                      {votingSystem.userWeight !== undefined 
                        ? (votingSystem.userWeight === BigInt(0) ? "1" : String(votingSystem.userWeight))
                        : "..."}
                    </span>
                    <span className="text-sm ml-2">
                      {votingSystem.userWeight === BigInt(0) ? "(default weight)" : "(assigned weight)"}
                    </span>
                  </p>
                  <p className="text-sm text-blue-600">
                    Your vote will be weighted according to your assigned voting power. If no custom weight has been set, you'll vote with the default weight of 1.
                  </p>
                </div>
                
                <button
                  className="btn-primary w-full py-4 text-lg font-semibold"
                  disabled={!votingSystem.isDeployed || votingSystem.isSubmitting}
                  onClick={() => votingSystem.submitVote(voteChoice)}
                >
                  {votingSystem.isSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Encrypting & Submitting Your Vote...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Submit Encrypted Vote
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Dashboard */}
        {votingSystem.selectedProposalId !== undefined && (
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Voting Results</h2>
                  <p className="text-gray-600">Live encrypted tallies for Proposal #{votingSystem.selectedProposalId}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  className="btn-secondary text-sm px-4 py-2"
                  disabled={votingSystem.isRefreshing}
                  onClick={votingSystem.refreshResults}
                >
                  {votingSystem.isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                
                <button
                  className="btn-primary text-sm px-4 py-2"
                  disabled={votingSystem.isDecrypting || !votingSystem.approveHandle}
                  onClick={votingSystem.decryptResults}
                >
                  {votingSystem.isDecrypting ? "Decrypting..." : "Decrypt Results"}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Approve Votes */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-green-800">Approve</h3>
                </div>
                
                {votingSystem.clearApprove ? (
                  <div>
                    <p className="text-4xl font-bold text-green-700 mb-2">
                      {String(votingSystem.clearApprove.clear)}
                    </p>
                    <p className="text-sm text-green-600">Total weighted votes</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-green-700 mb-2 font-semibold">🔒 Encrypted</p>
                    <p className="text-xs font-mono text-green-600 break-all mb-3">
                      {votingSystem.approveHandle ? `${votingSystem.approveHandle.slice(0, 24)}...` : "No votes yet"}
                    </p>
                    <p className="text-xs text-green-600">Click decrypt to reveal</p>
                  </div>
                )}
              </div>
              
              {/* Reject Votes */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-red-800">Reject</h3>
                </div>
                
                {votingSystem.clearReject ? (
                  <div>
                    <p className="text-4xl font-bold text-red-700 mb-2">
                      {String(votingSystem.clearReject.clear)}
                    </p>
                    <p className="text-sm text-red-600">Total weighted votes</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-red-700 mb-2 font-semibold">🔒 Encrypted</p>
                    <p className="text-xs font-mono text-red-600 break-all mb-3">
                      {votingSystem.rejectHandle ? `${votingSystem.rejectHandle.slice(0, 24)}...` : "No votes yet"}
                    </p>
                    <p className="text-xs text-red-600">Click decrypt to reveal</p>
                  </div>
                )}
              </div>
              
              {/* Abstain Votes */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-800">Abstain</h3>
                </div>
                
                {votingSystem.clearAbstain ? (
                  <div>
                    <p className="text-4xl font-bold text-gray-700 mb-2">
                      {String(votingSystem.clearAbstain.clear)}
                    </p>
                    <p className="text-sm text-gray-600">Total weighted votes</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-700 mb-2 font-semibold">🔒 Encrypted</p>
                    <p className="text-xs font-mono text-gray-600 break-all mb-3">
                      {votingSystem.abstainHandle ? `${votingSystem.abstainHandle.slice(0, 24)}...` : "No votes yet"}
                    </p>
                    <p className="text-xs text-gray-600">Click decrypt to reveal</p>
                  </div>
                )}
              </div>
              
              {/* Total Weight */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-blue-800">Total Weight</h3>
                </div>
                
                {votingSystem.clearTotalWeight ? (
                  <div>
                    <p className="text-4xl font-bold text-blue-700 mb-2">
                      {String(votingSystem.clearTotalWeight.clear)}
                    </p>
                    <p className="text-sm text-blue-600">All participants</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-blue-700 mb-2 font-semibold">🔒 Encrypted</p>
                    <p className="text-xs font-mono text-blue-600 break-all mb-3">
                      {votingSystem.totalWeightHandle ? `${votingSystem.totalWeightHandle.slice(0, 24)}...` : "No votes yet"}
                    </p>
                    <p className="text-xs text-blue-600">Click decrypt to reveal</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create Proposal View
  const renderCreateProposal = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header with Back Button */}
      <div className="flex items-center mb-8">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="btn-secondary mr-4 px-4 py-2 text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Create New Proposal</h1>
          <p className="text-gray-600">Start a new voting session</p>
        </div>
      </div>

      <div className="card p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Proposal Description</label>
            <input
              type="text"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              className="input-field"
              placeholder="Describe what participants will vote on..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Voting Duration</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={proposalDuration}
                onChange={(e) => setProposalDuration(e.target.value)}
                className="input-field flex-1"
                placeholder="1"
                min="1"
              />
              <select
                value={proposalDurationUnit}
                onChange={(e) => setProposalDurationUnit(e.target.value)}
                className="input-field flex-1"
              >
                <option value="second">Seconds</option>
                <option value="minute">Minutes</option>
                <option value="hour">Hours</option>
                <option value="day">Days</option>
                <option value="month">Months</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              How long should this proposal accept votes?
            </p>
          </div>
          
          <button
            className="btn-primary w-full py-3"
            disabled={!votingSystem.isDeployed || votingSystem.isCreatingProposal || !proposalDescription || !proposalDuration}
            onClick={() => votingSystem.createProposal(proposalDescription, convertDurationToSeconds(proposalDuration, proposalDurationUnit))}
          >
            {votingSystem.isCreatingProposal ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Proposal...
              </>
            ) : (
              "Create Proposal"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Manage Weights View
  const renderManageWeights = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header with Back Button */}
      <div className="flex items-center mb-8">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="btn-secondary mr-4 px-4 py-2 text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage Voting Weights</h1>
          <p className="text-gray-600">Assign voting power to participants</p>
        </div>
      </div>

      <div className="card p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Wallet Address</label>
            <input
              type="text"
              value={weightUserAddress}
              onChange={(e) => setWeightUserAddress(e.target.value)}
              className="input-field"
              placeholder="0x1234..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Voting Weight</label>
            <input
              type="number"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="input-field"
              placeholder="1"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-2">
              Set to 0 to remove custom weight (will use default weight of 1)
            </p>
          </div>
          
          <button
            className="btn-secondary w-full py-3"
            disabled={!votingSystem.isDeployed || votingSystem.isSettingWeight || !weightUserAddress || !weightValue}
            onClick={() => votingSystem.setUserWeightForAddress(weightUserAddress, parseInt(weightValue))}
          >
            {votingSystem.isSettingWeight ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating Weight...
              </>
            ) : (
              "Update Voting Weight"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="main-container">
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'proposals' && renderProposals()}
      {currentView === 'create' && renderCreateProposal()}
      {currentView === 'manage' && renderManageWeights()}
      
      {/* Status Messages */}
      {votingSystem.message && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <div className="card p-4 border-l-4 border-blue-500">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">System Message</h4>
                <p className="text-gray-700 text-sm">{votingSystem.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
