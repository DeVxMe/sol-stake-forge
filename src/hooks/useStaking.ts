import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { 
  createProgram, 
  getUserPDA, 
  checkPDAExists, 
  getStakeAccount, 
  StakeAccount 
} from "@/lib/anchor";
import { solToLamports } from "@/lib/utils";
import toast from "react-hot-toast";
import BN from "bn.js";

export const useStaking = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [stakeAccount, setStakeAccount] = useState<StakeAccount | null>(null);
  const [pdaExists, setPdaExists] = useState(false);

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch wallet balance");
    }
  }, [publicKey, connection]);

  // Fetch stake account data
  const fetchStakeAccount = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const exists = await checkPDAExists(publicKey);
      setPdaExists(exists);
      
      if (exists) {
        const account = await getStakeAccount(publicKey);
        setStakeAccount(account);
      } else {
        setStakeAccount(null);
      }
    } catch (error) {
      console.error("Error fetching stake account:", error);
      toast.error("Failed to fetch stake account");
    }
  }, [publicKey]);

  // Create PDA account
  const createPdaAccount = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      toast.error("Wallet not connected");
      return false;
    }

    setLoading(true);
    try {
      // This is a simplified version - in a real implementation,
      // you would use the actual Anchor program to create the PDA
      const [pdaAddress, bump] = getUserPDA(publicKey);
      
      // Mock transaction creation
      toast.success("PDA account would be created here");
      setPdaExists(true);
      return true;
    } catch (error: any) {
      console.error("Error creating PDA:", error);
      toast.error(`Failed to create account: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction]);

  // Stake SOL
  const stake = useCallback(async (amount: number) => {
    if (!publicKey || !signTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      // Ensure PDA exists
      if (!pdaExists) {
        const created = await createPdaAccount();
        if (!created) return;
      }

      // Convert to lamports
      const lamports = solToLamports(amount);
      
      // Mock staking transaction
      toast.success(`Successfully staked ${amount} SOL`);
      
      // Refresh data
      await fetchBalance();
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error staking:", error);
      
      // Handle specific errors
      if (error.message.includes("6000")) {
        toast.error("Amount must be greater than 0");
      } else if (error.message.includes("6001")) {
        toast.error("Insufficient staked amount");
      } else if (error.message.includes("6002")) {
        toast.error("Unauthorized access");
      } else if (error.message.includes("6003")) {
        toast.error("Arithmetic overflow");
      } else {
        toast.error(`Staking failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, balance, pdaExists, createPdaAccount, fetchBalance, fetchStakeAccount]);

  // Unstake SOL
  const unstake = useCallback(async (amount: number) => {
    if (!publicKey || !signTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    if (!stakeAccount) {
      toast.error("No stake account found");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      // Convert to lamports for comparison
      const lamports = solToLamports(amount);
      
      // Mock unstaking transaction
      toast.success(`Successfully unstaked ${amount} SOL`);
      
      // Refresh data
      await fetchBalance();
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error unstaking:", error);
      
      // Handle specific errors
      if (error.message.includes("6001")) {
        toast.error("Insufficient staked amount");
      } else if (error.message.includes("6004")) {
        toast.error("Arithmetic underflow");
      } else {
        toast.error(`Unstaking failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, stakeAccount, fetchBalance, fetchStakeAccount]);

  // Claim points
  const claimPoints = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    if (!stakeAccount || stakeAccount.totalPoints.eq(new BN(0))) {
      toast.error("No points to claim");
      return;
    }

    setLoading(true);
    try {
      // Mock claiming transaction
      toast.success(`Successfully claimed ${stakeAccount.totalPoints.toString()} points`);
      
      // Refresh data
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error claiming points:", error);
      toast.error(`Claiming failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, stakeAccount, fetchStakeAccount]);

  // Initial data fetch
  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      fetchStakeAccount();
    } else {
      setBalance(0);
      setStakeAccount(null);
      setPdaExists(false);
    }
  }, [publicKey, fetchBalance, fetchStakeAccount]);

  return {
    loading,
    balance,
    stakeAccount,
    pdaExists,
    stake,
    unstake,
    claimPoints,
    refresh: () => {
      fetchBalance();
      fetchStakeAccount();
    }
  };
};