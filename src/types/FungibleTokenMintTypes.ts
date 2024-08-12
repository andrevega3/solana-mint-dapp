import { Keypair, PublicKey, SignatureResult } from "@solana/web3.js";

export interface FungibleTokenMintData {
    name: string;
    symbol: string;
    description: string;
    supply: string;
    decimals: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    imageFile: File;
    authority?: string;
  }

export interface FungibleTokenCreateResult {
  signature: SignatureResult,
  mintKeyPair: Keypair,
  mint: PublicKey,
  updateAuthority: PublicKey
}