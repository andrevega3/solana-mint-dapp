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
    createMintToInstruction, 
    setAuthority,
    AuthorityType,
    setAuthorityInstructionData,
    createSetAuthorityInstruction
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
    createUpdateAuthorityInstruction,
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
import { getUpdateAsUpdateAuthorityV2InstructionDataSerializer, updateAsUpdateAuthorityV2 } from '@metaplex-foundation/mpl-token-metadata';

export async function createTokenMintAndMintSupply(
    connection: Connection,
    wallet: WalletContextState,
    formData: FungibleTokenMintData,
    imageUri: string,
    jsonUri: string,
    authority: PublicKey,
    priorityFee: number = 10000
): Promise<FungibleTokenCreateAndMintResult | null> {

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
            publicKey,
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

        const setMintAuthorityInstruction = createSetAuthorityInstruction(
            mint,
            publicKey,
            AuthorityType.MintTokens,
            authority,
            undefined,
            TOKEN_2022_PROGRAM_ID
        )

        const setUpdateAuthorityInstruction = createUpdateAuthorityInstruction(
            {
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                oldAuthority: publicKey,
                newAuthority: authority
            }
        )

        const setFreezeAuthorityInstruction = createSetAuthorityInstruction(
            mint,
            publicKey,
            AuthorityType.FreezeAccount,
            authority,
            undefined,
            TOKEN_2022_PROGRAM_ID
        )

        const transaction = new Transaction().add(
            computePriceIx,
            createAccountInstruction,
            initializeMetadataPointerInstruction,
            initializeMintInstruction,
            initializeMetadataInstruction,
            updateFieldInstruction,
            assocaitedTokenAccountInstruction,
            mintToInstruction,
            setMintAuthorityInstruction,
            setFreezeAuthorityInstruction,
            setUpdateAuthorityInstruction,
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight}
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection,
            {
                minContextSlot,
                signers: [mintKeypair]
            }
        );

        const confirmedSignature = await connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature
        });

        // TODO: Figure out how to get signature string from SignatureResult
        console.log(
            '\nCreateMintAccount:',
            `https://solana.fm/tx/${confirmedSignature.value}?cluster=devnet-solana`
        );

        const mintInfo = await getMint(
            connection,
            mint,
            'confirmed',
            TOKEN_2022_PROGRAM_ID
        );

        const metaDataPointer = getMetadataPointerState(mintInfo);
        console.log(
            '\nMetadata Pointer:',
            JSON.stringify(metaDataPointer, null, 2)
        );

        const onChainMetadata = await getTokenMetadata(
            connection,
            mint
        );
        console.log(
            '\nMetadata:',
            JSON.stringify(onChainMetadata, null, 2)
        );

        fungibleTokenCreateResult = {
            signature: confirmedSignature.value,
            mintKeyPair: mintKeypair,
            mint: mint,
            updateAuthority: updateAuthority
        }

        // const setAuthoritySignature = await setAuthority(
        //     connection,
        //     wallet,
        //     mint,
        //     wallet.publicKey,
        //     AuthorityType.MintTokens,
        //     new PublicKey("5iyGddeWDy8u47horo7AEyJwWWcLYJ54Bp92HHyw4MkE")
        // )

    } catch (error) {
        console.log(`Create Token Mint Transaction Failed: ${error}`);
    }

    return fungibleTokenCreateResult;
}
