import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import * as borsh from "borsh";

// Import buffer for browser compatibility  
import { Buffer } from "buffer";
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// Program ID for the stake program
export const PROGRAM_ID = new PublicKey("6wjCHbb4fJivBCesGtUmPEdHRVKaQFa5v1KDZCXC9TGo");

// Devnet connection
export const connection = new Connection("https://api.devnet.solana.com");

// PDA seed constant
export const PDA_SEED = "user1";

// IDL for the stake program
export const IDL = {
  address: "6wjCHbb4fJivBCesGtUmPEdHRVKaQFa5v1KDZCXC9TGo",
  metadata: {
    name: "stake_program",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  instructions: [
    {
      name: "claim_points",
      discriminator: [106, 26, 99, 252, 9, 196, 78, 172],
      accounts: [
        {
          name: "user",
          writable: true,
          signer: true
        },
        {
          name: "pda_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [117, 115, 101, 114, 49]
              },
              {
                kind: "account",
                path: "user"
              }
            ]
          }
        }
      ],
      args: []
    },
    {
      name: "create_pda_account",
      discriminator: [236, 59, 195, 238, 228, 119, 205, 35],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "pda_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [117, 115, 101, 114, 49]
              },
              {
                kind: "account",
                path: "payer"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "get_points",
      discriminator: [175, 65, 116, 251, 176, 33, 167, 225],
      accounts: [
        {
          name: "user",
          signer: true
        },
        {
          name: "pda_account",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [117, 115, 101, 114, 49]
              },
              {
                kind: "account",
                path: "user"
              }
            ]
          }
        }
      ],
      args: []
    },
    {
      name: "stake",
      discriminator: [206, 176, 202, 18, 200, 209, 179, 108],
      accounts: [
        {
          name: "user",
          writable: true,
          signer: true
        },
        {
          name: "pda_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [117, 115, 101, 114, 49]
              },
              {
                kind: "account",
                path: "user"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "unstake",
      discriminator: [90, 95, 107, 42, 205, 124, 50, 225],
      accounts: [
        {
          name: "user",
          writable: true,
          signer: true
        },
        {
          name: "pda_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [117, 115, 101, 114, 49]
              },
              {
                kind: "account",
                path: "user"
              }
            ]
          }
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "StakeAccount",
      discriminator: [80, 158, 67, 124, 50, 189, 192, 255]
    }
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidAmount",
      msg: "Amount must be greater than 0"
    },
    {
      code: 6001,
      name: "InsufficientStake",
      msg: "Insufficient staked amount"
    },
    {
      code: 6002,
      name: "Unauthorized",
      msg: "Unauthorized access"
    },
    {
      code: 6003,
      name: "Overflow",
      msg: "Arithmetic overflow"
    },
    {
      code: 6004,
      name: "Underflow",
      msg: "Arithmetic underflow"
    },
    {
      code: 6005,
      name: "InvalidTimestamp",
      msg: "Invalid timestamp"
    }
  ],
  types: [
    {
      name: "StakeAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "staked_amount",
            type: "u64"
          },
          {
            name: "total_points",
            type: "u64"
          },
          {
            name: "last_updated_time",
            type: "u64"
          },
          {
            name: "bump",
            type: "u8"
          }
        ]
      }
    }
  ]
};

export interface StakeAccount {
  owner: PublicKey;
  stakedAmount: BN;
  totalPoints: BN;
  lastUpdatedTime: BN;
  bump: number;
}

// Get PDA for user
export function getUserPDA(userPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEED), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
}

// Create anchor program instance
export function createProgram(wallet: WalletContextState): Program {
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    AnchorProvider.defaultOptions()
  );
  
  return new Program(IDL as any, provider);
}

// Check if PDA account exists
export async function checkPDAExists(userPublicKey: PublicKey): Promise<boolean> {
  try {
    const [pdaAddress] = getUserPDA(userPublicKey);
    const accountInfo = await connection.getAccountInfo(pdaAddress);
    return accountInfo !== null;
  } catch (error) {
    console.error("Error checking PDA:", error);
    return false;
  }
}

// Get stake account data
export async function getStakeAccount(userPublicKey: PublicKey): Promise<StakeAccount | null> {
  try {
    const [pdaAddress] = getUserPDA(userPublicKey);
    const accountInfo = await connection.getAccountInfo(pdaAddress);
    
    if (!accountInfo) return null;
    
    // Parse account data using borsh (simplified deserialization)
    const data = accountInfo.data;
    
    // Skip the discriminator (8 bytes) and parse the account structure
    if (data.length < 8) return null;
    
    const accountData = data.slice(8);
    
    // StakeAccount structure: owner(32) + staked_amount(8) + total_points(8) + last_updated_time(8) + bump(1)
    if (accountData.length < 57) return null;
    
    const owner = new PublicKey(accountData.slice(0, 32));
    const stakedAmount = new BN(accountData.slice(32, 40), 'le');
    const totalPoints = new BN(accountData.slice(40, 48), 'le');
    const lastUpdatedTime = new BN(accountData.slice(48, 56), 'le');
    const bump = accountData[56];
    
    return {
      owner,
      stakedAmount,
      totalPoints,
      lastUpdatedTime,
      bump
    };
  } catch (error) {
    console.error("Error fetching stake account:", error);
    return null;
  }
}