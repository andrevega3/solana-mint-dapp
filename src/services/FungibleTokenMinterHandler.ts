import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
    Connection,
    Keypair,
    PublicKey,
    SignatureResult,
    Signer,
    SystemProgram,
    Transaction,
    TransactionSignature,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    getMint,
    getMetadataPointerState,
    getTokenMetadata,
    TYPE_SIZE,
    LENGTH_SIZE,
    createMintToInstruction
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
    pack,
    TokenMetadata,
} from "@solana/spl-token-metadata"
import { FungibleTokenCreateResult, FungibleTokenMintData } from "@/types/FungibleTokenMintTypes";
import { createTokenMintAndMintSupply, getOrCreateAssociatedTokenAccount, mintTokens } from "@/utils/AccountUtils";

class FungibleTokenMinterHandler {
    connection: ReturnType<typeof useConnection>['connection'];
    wallet: ReturnType<typeof useWallet>;

    constructor(connection: ReturnType<typeof useConnection>['connection'], wallet: ReturnType<typeof useWallet>) {
        this.connection = connection;
        this.wallet = wallet;
    }

    async handleSubmit(formData: FungibleTokenMintData) {
        const { publicKey } = this.wallet;

        if (!publicKey) throw new WalletNotConnectedError();

        // Create Token Mint Account
        const createTokenResult: FungibleTokenCreateResult | null = await createTokenMintAndMintSupply(
            this.connection,
            this.wallet,
            formData
        );

        if (!createTokenResult) throw new Error("Failed to create token mint or mint them");
        

        console.log('Token creation and minting completed successfully');
    }
}

export default FungibleTokenMinterHandler;