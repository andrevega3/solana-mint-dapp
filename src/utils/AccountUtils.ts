import { 
    ASSOCIATED_TOKEN_PROGRAM_ID, 
    Account, 
    TOKEN_PROGRAM_ID, 
    TokenAccountNotFoundError, 
    TokenInvalidAccountOwnerError, 
    TokenInvalidMintError, 
    TokenInvalidOwnerError, 
    createAssociatedTokenAccountInstruction, 
    getAccount, 
    getAssociatedTokenAddressSync,
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
} from '@solana/spl-token';
import { 
    Transaction,
    Commitment, 
    ConfirmOptions, 
    Connection, 
    Keypair, 
    PublicKey,
    SystemProgram, 
    SignatureResult
} from '@solana/web3.js';
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    pack,
    TokenMetadata
} from "@solana/spl-token-metadata";
import { 
    FungibleTokenCreateResult as FungibleTokenCreateAndMintResult, 
    FungibleTokenMintData
} from '@/types/FungibleTokenMintTypes';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { web3 } from "@coral-xyz/anchor";
import { getSimulationUnits } from '@/lib/shdw-sdk/utils/helpers';

export async function createTokenMintAndMintSupply(
    connection: Connection,
    wallet: WalletContextState,
    formData: FungibleTokenMintData,
    imageUri: string,
    jsonUri: string,
    priorityFee: number = 100000
): Promise<Transaction | null> {

    let fungibleTokenCreateResult: FungibleTokenCreateAndMintResult | null = null;

    try {
        const { publicKey, sendTransaction } = wallet;

        if (!publicKey) throw new WalletNotConnectedError();

        const mintKeypair = Keypair.generate();
        const mint = mintKeypair.publicKey;
        const decimals = parseInt(formData.decimals);
        const mintAuthority = publicKey;
        const updateAuthority = publicKey;
        const supply = parseInt(formData.supply);

        const tokenMetadata: TokenMetadata = {
            updateAuthority: updateAuthority,
            mint: mint,
            name: formData.name,
            symbol: formData.symbol,
            uri: jsonUri,
            additionalMetadata: [['image', imageUri]]
        };

        const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
        const metadataLen = pack(tokenMetadata).length;
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);

        const lamports = await connection.getMinimumBalanceForRentExemption(
            mintLen + metadataExtension + metadataLen
        );


        const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: Math.ceil(priorityFee),
        });

        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: wallet.publicKey as PublicKey,
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

        const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
            mint,
            publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
        );

        const assocaitedTokenAccountInstruction = createAssociatedTokenAccountInstruction(
            publicKey,
            associatedTokenAccountAddress,
            publicKey,
            mint,
            TOKEN_2022_PROGRAM_ID
        );

        const mintToInstruction = createMintToInstruction(
            mint,
            associatedTokenAccountAddress,
            mintAuthority,
            BigInt(supply *(10 ** decimals)),
            [],
            TOKEN_2022_PROGRAM_ID
        );

        const transaction = new Transaction().add(
            computePriceIx,
            createAccountInstruction,
            initializeMetadataPointerInstruction,
            initializeMintInstruction,
            initializeMetadataInstruction,
            updateFieldInstruction,
            assocaitedTokenAccountInstruction,
            mintToInstruction
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight}
        } = await connection.getLatestBlockhashAndContext();

        const [units, blockHashInfo] = await Promise.all([
            getSimulationUnits(
                connection,
                [computePriceIx, ...transaction.instructions],
                publicKey
            ),
            connection,
        ]);

        if (units !== undefined) {
            transaction.instructions.unshift(web3.ComputeBudgetProgram.setComputeUnitLimit({ units }));
        }

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        transaction.sign(mintKeypair)

        return transaction;

    } catch (error) {
        console.log(`Create Token Mint Transaction Failed: ${error}`);
    }

    return fungibleTokenCreateResult;
}
