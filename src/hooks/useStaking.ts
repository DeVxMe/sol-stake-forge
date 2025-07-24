import { useState, useEffect, useCallback } from "react";
import BN from "bn.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import {
  createProgram,
  getUserPDA,
  checkPDAExists,
  getStakeAccount,
  StakeAccount,
  PROGRAM_ID,
} from "@/lib/anchor";
import { useToast } from "@/hooks/use-toast";

// Helper to get platform Keypair from env
function getPlatformKeypair(): Keypair {
  const secret = import.meta.env.VITE_PLATFORM_PRIVATE_KEY;
  if (!secret) throw new Error("Platform private key not set in env");
  const secretArr = JSON.parse(secret);
  return Keypair.fromSecretKey(Uint8Array.from(secretArr));
}

function getPlatformPubkey(): PublicKey {
  return getPlatformKeypair().publicKey;
}

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
      const balanceLamports = await connection.getBalance(publicKey);
      setBalance(balanceLamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet balance",
        variant: "destructive",
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
        variant: "destructive",
      });
    }
  }, [publicKey, toast]);

  // Create PDA account
  const createPdaAccount = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const program = createProgram({
        publicKey,
        signTransaction,
        sendTransaction,
      } as any);
      const [pdaAddress] = getUserPDA(publicKey);

      const tx = await program.methods
        .createPdaAccount()
        .accounts({
          payer: publicKey,
          pdaAccount: pdaAddress,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      let signedTx = tx;
      if (signTransaction) {
        signedTx = await signTransaction(tx);
      }

      const rawTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(rawTx);
      await connection.confirmTransaction(signature, "confirmed");

      toast({
        title: "Success",
        description: "Account created successfully",
      });
      setPdaExists(true);
      return true;
    } catch (error: any) {
      console.error("Error creating PDA:", error);
      toast({
        title: "Error",
        description: `Failed to create account: ${error.message}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, signTransaction, connection, toast]);

  // Stake SOL
  const stake = useCallback(
    async (amount: number) => {
      if (loading) {
        toast({
          title: "Please wait",
          description: "Transaction in progress",
          variant: "destructive",
        });
        return;
      }

      if (!publicKey || !sendTransaction) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        });
        return;
      }

      if (amount <= 0) {
        toast({
          title: "Error",
          description: "Amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        if (!pdaExists) {
          const created = await createPdaAccount();
          if (!created) return;
        }

        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const walletBalanceLamports = await connection.getBalance(publicKey);
        const feeBuffer = 10000; // ~0.00001 SOL

        if (walletBalanceLamports < lamports + feeBuffer) {
          toast({
            title: "Error",
            description: "Insufficient balance (including fee buffer)",
            variant: "destructive",
          });
          return;
        }

        const program = createProgram({
          publicKey,
          signTransaction,
          sendTransaction,
        } as any);
        const [pdaAddress] = getUserPDA(publicKey);

        const platformPubkey = getPlatformPubkey();
        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: platformPubkey,
          lamports,
        });

        const stakeIx = await program.methods
          .stake(new BN(lamports.toString()))
          .accounts({
            user: publicKey,
            pdaAccount: pdaAddress,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        const tx = new Transaction();
        tx.feePayer = publicKey;
        tx.add(transferIx);
        tx.add(stakeIx);

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        let signedTx = tx;
        if (signTransaction) {
          signedTx = await signTransaction(tx);
        }

        const rawTx = signedTx.serialize();
        const signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
        });
        await connection.confirmTransaction(signature, "confirmed");

        toast({
          title: "Success",
          description: `Successfully staked ${amount} SOL`,
        });

        await fetchBalance();
        await fetchStakeAccount();
      } catch (error: any) {
        console.error("Error staking:", error);
        if (typeof error.getLogs === "function") {
          const logs = await error.getLogs();
          console.error("Transaction simulation logs:", logs);
        }
        toast({
          title: "Error",
          description: `Staking failed: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      publicKey,
      sendTransaction,
      signTransaction,
      pdaExists,
      createPdaAccount,
      connection,
      toast,
      fetchBalance,
      fetchStakeAccount,
    ]
  );

  // Unstake SOL
  const unstake = useCallback(
    async (amount: number) => {
      if (loading) {
        toast({
          title: "Please wait",
          description: "Transaction in progress",
          variant: "destructive",
        });
        return;
      }

      if (!publicKey || !sendTransaction) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        });
        return;
      }

      if (!stakeAccount) {
        toast({
          title: "Error",
          description: "No stake account found",
          variant: "destructive",
        });
        return;
      }

      if (amount <= 0) {
        toast({
          title: "Error",
          description: "Amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const stakedLamports = stakeAccount.stakedAmount.toNumber
        ? stakeAccount.stakedAmount.toNumber()
        : Number(stakeAccount.stakedAmount);

      if (lamports > stakedLamports) {
        toast({
          title: "Error",
          description: "Cannot unstake more than currently staked amount",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const program = createProgram({
          publicKey,
          signTransaction,
          sendTransaction,
        } as any);
        const [pdaAddress] = getUserPDA(publicKey);

        const tx = await program.methods
          .unstake(new BN(lamports.toString()))
          .accounts({
            user: publicKey,
            pdaAccount: pdaAddress,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        let signedTx = tx;
        if (signTransaction) {
          signedTx = await signTransaction(tx);
        }

        const rawTx = signedTx.serialize();
        const signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
        });
        await connection.confirmTransaction(signature, "confirmed");

        toast({
          title: "Success",
          description: `Successfully unstaked ${amount} SOL`,
        });

        await fetchBalance();
        await fetchStakeAccount();
      } catch (error: any) {
        console.error("Error unstaking:", error);
        if (typeof error.getLogs === "function") {
          const logs = await error.getLogs();
          console.error("Transaction simulation logs:", logs);
        }
        toast({
          title: "Error",
          description: `Unstaking failed: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      publicKey,
      sendTransaction,
      signTransaction,
      stakeAccount,
      connection,
      toast,
      fetchBalance,
      fetchStakeAccount,
    ]
  );

  // Claim points
  const claimPoints = useCallback(
    async () => {
      if (loading) {
        toast({
          title: "Please wait",
          description: "Transaction in progress",
          variant: "destructive",
        });
        return;
      }

      if (!publicKey || !sendTransaction) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        });
        return;
      }

      if (
        !stakeAccount ||
        !stakeAccount.totalPoints ||
        Number(stakeAccount.totalPoints) === 0
      ) {
        toast({
          title: "Error",
          description: "No points to claim",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const program = createProgram({
          publicKey,
          signTransaction,
          sendTransaction,
        } as any);
        const [pdaAddress] = getUserPDA(publicKey);

        const tx = await program.methods
          .claimPoints()
          .accounts({
            user: publicKey,
            pdaAccount: pdaAddress,
          })
          .transaction();

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        let signedTx = tx;
        if (signTransaction) {
          signedTx = await signTransaction(tx);
        }

        const rawTx = signedTx.serialize();
        const signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
        });
        await connection.confirmTransaction(signature, "confirmed");

        toast({
          title: "Success",
          description: `Successfully claimed ${stakeAccount.totalPoints.toString()} points`,
        });

        await fetchStakeAccount();
      } catch (error: any) {
        console.error("Error claiming points:", error);
        if (typeof error.getLogs === "function") {
          const logs = await error.getLogs();
          console.error("Transaction simulation logs:", logs);
        }
        toast({
          title: "Error",
          description: `Claiming failed: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      publicKey,
      sendTransaction,
      signTransaction,
      stakeAccount,
      connection,
      toast,
      fetchStakeAccount,
    ]
  );

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      fetchStakeAccount();

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
    },
  };
};
