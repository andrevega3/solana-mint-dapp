import { Keypair, PublicKey, SignatureResult } from "@solana/web3.js";

export interface FungibleTokenMintData {
    name: string;
    imageUri: string;
    symbol: string;
    metadataJsonUri: string;
    supply: string;
    decimals: string;
  }

export interface FungibleTokenCreateResult {
  signature: SignatureResult,
  mintKeyPair: Keypair,
  mint: PublicKey,
  updateAuthority: PublicKey
}