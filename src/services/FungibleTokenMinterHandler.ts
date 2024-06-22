import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
    Connection,
    Keypair,
    PublicKey,
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
    LENGTH_SIZE
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
    pack,
    TokenMetadata,
} from "@solana/spl-token-metadata"
import { WalletSigner } from "@/types/SolanaTypes";
import { FungibleTokenMintData } from "@/types/FungibleTokenMintData";

class FungibleTokenMinterHandler {
    connection: ReturnType<typeof useConnection>['connection'];
    wallet: ReturnType<typeof useWallet>;

    constructor(connection: ReturnType<typeof useConnection>['connection'], wallet: ReturnType<typeof useWallet>) {
        this.connection = connection;
        this.wallet = wallet;
    }

    async handleSubmit(formData: FungibleTokenMintData) {
        // let signature: TransactionSignature | undefined = undefined;

        try {
            const { publicKey, sendTransaction} = this.wallet;

            if (!publicKey) throw new WalletNotConnectedError();


            const connection = this.connection;

            // let transaction: Transaction;

            // // Transaction signature returned from sent transaction
            // let transactionSignature: string;

            const mintKeypair = Keypair.generate();
            const mint = mintKeypair.publicKey;
            const decimals = parseInt(formData.decimals);
            const mintAuthority = publicKey;
            const updateAuthority = publicKey;

            const tokenMetadata: TokenMetadata = {
                updateAuthority: updateAuthority,
                mint: mint,
                name: formData.name,
                symbol: formData.symbol,
                uri: formData.metadataJsonUri,
                additionalMetadata: [['image', formData.imageUri]],
            };

            const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
            const metadataLen = pack(tokenMetadata).length;
            const mintLen = getMintLen([ExtensionType.MetadataPointer]);

            const lamports = await this.connection.getMinimumBalanceForRentExemption(
                mintLen + metadataExtension + metadataLen
            );

            const createAccountInstruction = SystemProgram.createAccount({
                fromPubkey: this.wallet.publicKey as PublicKey,
                newAccountPubkey: mint,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            });

            const initializeMetadataPointerInstruction = 
                createInitializeMetadataPointerInstruction(
                    mint,
                    updateAuthority,
                    mint,
                    TOKEN_2022_PROGRAM_ID
                );
            
            const initializeMintInstruction = createInitializeMintInstruction(
                mint,
                decimals,
                mintAuthority,
                null,
                TOKEN_2022_PROGRAM_ID
            );

            const initializeMetadataInstruction = createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: updateAuthority,
                mint: mint,
                mintAuthority: mintAuthority,
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                uri: tokenMetadata.uri,
            });

            const updateFieldInstruction = createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: updateAuthority,
                field: tokenMetadata.additionalMetadata[0][0],
                value: tokenMetadata.additionalMetadata[0][1],
            });

            const transaction = new Transaction().add(
                createAccountInstruction,
                initializeMetadataPointerInstruction,
                initializeMintInstruction,
                initializeMetadataInstruction,
                updateFieldInstruction
            );

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext();
    
            const signature = await sendTransaction(transaction, connection, { minContextSlot,
                signers: [mintKeypair]
             });
    
             
            const confirmedSignature = await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

            console.log(
                '\nCreate Mint Account:',
                `https://solana.fm/tx/${confirmedSignature}?cluser=devnet-solana`
            );

            const mintInfo = await getMint(
                this.connection,
                mint,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );

            const metaDataPointer = getMetadataPointerState(mintInfo);
            console.log('\nMetadata Pointer:', JSON.stringify(metaDataPointer, null, 2));

            const onChainMetadata = await getTokenMetadata(
                this.connection,
                mint
            );
            console.log('\nMetadata:', JSON.stringify(onChainMetadata, null, 2));
        } catch (error) {
            // Handle error
            console.error(`Transaction failed! ${error}`);
        }
    }
}

export default FungibleTokenMinterHandler;