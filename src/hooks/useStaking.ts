import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { 
  createProgram, 
  getUserPDA, 
  checkPDAExists, 
  getStakeAccount, 
  StakeAccount,
  PROGRAM_ID 
} from "@/lib/anchor";
import { solToLamports } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import BN from "bn.js";

export const useStaking = () => {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: "Failed to fetch wallet balance",
        variant: "destructive"
      });
    }
  }, [publicKey, connection, toast]);

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
      toast({
        title: "Error",
        description: "Failed to fetch stake account",
        variant: "destructive"
      });
    }
  }, [publicKey, toast]);

  // Create PDA account
  const createPdaAccount = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Error", 
        description: "Wallet not connected",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    try {
      const program = createProgram({ publicKey, signTransaction, sendTransaction } as any);
      const [pdaAddress, bump] = getUserPDA(publicKey);
      
      console.log("Creating PDA account:", pdaAddress.toString());
      
      const tx = await program.methods
        .createPdaAccount()
        .accounts({
          payer: publicKey,
          pdaAccount: pdaAddress,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      console.log("PDA creation signature:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Success",
        description: "Account created successfully"
      });
      
      setPdaExists(true);
      return true;
    } catch (error: any) {
      console.error("Error creating PDA:", error);
      toast({
        title: "Error",
        description: `Failed to create account: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, toast]);

  // Stake SOL
  const stake = useCallback(async (amount: number) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Error",
        description: "Wallet not connected", 
        variant: "destructive"
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "Error", 
        description: "Insufficient balance",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Ensure PDA exists
      if (!pdaExists) {
        const created = await createPdaAccount();
        if (!created) return;
      }

      const program = createProgram({ publicKey, signTransaction, sendTransaction } as any);
      const [pdaAddress] = getUserPDA(publicKey);
      
      // Convert to lamports
      const lamports = solToLamports(amount);
      
      console.log("Staking amount:", amount, "SOL (", lamports.toString(), "lamports)");
      
      const tx = await program.methods
        .stake(lamports)
        .accounts({
          user: publicKey,
          pdaAccount: pdaAddress,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      console.log("Stake signature:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Success",
        description: `Successfully staked ${amount} SOL`
      });
      
      // Refresh data
      await fetchBalance();
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error staking:", error);
      
      // Handle specific errors
      if (error.message.includes("6000")) {
        toast({
          title: "Error",
          description: "Amount must be greater than 0",
          variant: "destructive"
        });
      } else if (error.message.includes("6001")) {
        toast({
          title: "Error", 
          description: "Insufficient staked amount",
          variant: "destructive"
        });
      } else if (error.message.includes("6002")) {
        toast({
          title: "Error",
          description: "Unauthorized access", 
          variant: "destructive"
        });
      } else if (error.message.includes("6003")) {
        toast({
          title: "Error",
          description: "Arithmetic overflow",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: `Staking failed: ${error.message}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, balance, pdaExists, createPdaAccount, fetchBalance, fetchStakeAccount, connection, toast]);

  // Unstake SOL
  const unstake = useCallback(async (amount: number) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    if (!stakeAccount) {
      toast({
        title: "Error",
        description: "No stake account found", 
        variant: "destructive"
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const program = createProgram({ publicKey, signTransaction, sendTransaction } as any);
      const [pdaAddress] = getUserPDA(publicKey);
      
      // Convert to lamports for the transaction
      const lamports = solToLamports(amount);
      
      console.log("Unstaking amount:", amount, "SOL (", lamports.toString(), "lamports)");
      
      const tx = await program.methods
        .unstake(lamports)
        .accounts({
          user: publicKey,
          pdaAccount: pdaAddress,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      console.log("Unstake signature:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Success",
        description: `Successfully unstaked ${amount} SOL`
      });
      
      // Refresh data
      await fetchBalance();
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error unstaking:", error);
      
      // Handle specific errors
      if (error.message.includes("6001")) {
        toast({
          title: "Error",
          description: "Insufficient staked amount",
          variant: "destructive"
        });
      } else if (error.message.includes("6004")) {
        toast({
          title: "Error", 
          description: "Arithmetic underflow",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: `Unstaking failed: ${error.message}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, stakeAccount, fetchBalance, fetchStakeAccount, connection, toast]);

  // Claim points
  const claimPoints = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive"
      });
      return;
    }

    if (!stakeAccount || stakeAccount.totalPoints.eq(new BN(0))) {
      toast({
        title: "Error",
        description: "No points to claim",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const program = createProgram({ publicKey, signTransaction, sendTransaction } as any);
      const [pdaAddress] = getUserPDA(publicKey);
      
      console.log("Claiming points:", stakeAccount.totalPoints.toString());
      
      const tx = await program.methods
        .claimPoints()
        .accounts({
          user: publicKey,
          pdaAccount: pdaAddress,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      console.log("Claim signature:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Success",
        description: `Successfully claimed ${stakeAccount.totalPoints.toString()} points`
      });
      
      // Refresh data
      await fetchStakeAccount();
    } catch (error: any) {
      console.error("Error claiming points:", error);
      toast({
        title: "Error",
        description: `Claiming failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, stakeAccount, fetchStakeAccount, connection, toast]);

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      fetchStakeAccount();
      
      // Auto-refresh every 10 seconds when wallet is connected
      const interval = setInterval(() => {
        fetchBalance();
        fetchStakeAccount();
      }, 10000);
      
      return () => clearInterval(interval);
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