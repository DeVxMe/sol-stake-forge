import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import BN from "bn.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number | BN): number {
  const lamportsBN = typeof lamports === 'number' ? new BN(lamports) : lamports;
  return lamportsBN.toNumber() / LAMPORTS_PER_SOL;
}

// Convert SOL to lamports
export function solToLamports(sol: number): BN {
  return new BN(Math.floor(sol * LAMPORTS_PER_SOL));
}

// Format SOL amount for display
export function formatSol(amount: number | BN, decimals: number = 4): string {
  const solAmount = typeof amount === 'number' ? amount : lamportsToSol(amount);
  return solAmount.toFixed(decimals);
}

// Format timestamp
export function formatTimestamp(timestamp: number | BN): string {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.toNumber();
  return new Date(ts * 1000).toLocaleString();
}

// Truncate wallet address
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Calculate points earned based on staking duration
export function calculatePoints(stakedAmount: BN, lastUpdatedTime: BN): BN {
  const currentTime = new BN(Math.floor(Date.now() / 1000));
  const timeElapsed = currentTime.sub(lastUpdatedTime);
  
  // Points = staked_amount * time_elapsed_in_seconds / 86400 (1 point per SOL per day)
  const pointsEarned = stakedAmount.mul(timeElapsed).div(new BN(86400));
  
  return pointsEarned;
}