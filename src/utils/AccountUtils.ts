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

export async function createTokenMintAndMintSupply(
    connection: Connection,
    wallet: WalletContextState,
    formData: FungibleTokenMintData
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
            uri: formData.metadataJsonUri,
            additionalMetadata: [['image', formData.imageUri]]
        };

        const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
        const metadataLen = pack(tokenMetadata).length;
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);

        const lamports = await connection.getMinimumBalanceForRentExemption(
            mintLen + metadataExtension + metadataLen
        );

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

    } catch (error) {
        console.log(`Create Token Mint Failed: ${error}`);
    }

    return fungibleTokenCreateResult;
}

export async function mintTokens(
    connection: Connection,
    wallet: WalletContextState,
    formData: FungibleTokenMintData,
    payer: PublicKey,
    mint: PublicKey,
    mintAuthority: PublicKey,
    recipient: PublicKey,
): Promise<SignatureResult | null> {
    let signatureResult: SignatureResult | null = null

    try{
        const { sendTransaction } = wallet;

        const supply = parseInt(formData.supply);
        const decimals = parseInt(formData.decimals);

        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            payer,
            mint,
            recipient
        );

        const mintToInstruction = createMintToInstruction(
            mint,
            recipientTokenAccount.address,
            mintAuthority,
            BigInt(supply *(10 ** decimals)),
            [],
            TOKEN_2022_PROGRAM_ID
        );

        const transaction = new Transaction().add(
            mintToInstruction
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection,
            {
                minContextSlot
            }
        );

        const confirmedSignature = await connection.confirmTransaction(
            {
                blockhash,
                lastValidBlockHeight,
                signature
            }
        );

        console.log(
            '\nMint Tokens:',
            `https://solana.fm/tx/${confirmedSignature.value}?cluster=devnet-solana`
        );

        signatureResult = confirmedSignature.value
    } catch (error) {

    }

    return signatureResult;
}

export async function getOrCreateAssociatedTokenAccount(
    connection: Connection,
    wallet: WalletContextState,
    publicKey: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = false,
    commitment?: Commitment,
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<Account> {
    const associatedToken = getAssociatedTokenAddressSync(
        mint,
        owner,
        allowOwnerOffCurve,
        programId,
        associatedTokenProgramId
    );

    // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
    // Sadly we can't do this atomically.
    let account: Account;
    try {
        account = await getAccount(connection, associatedToken, commitment, programId);
    } catch (error: unknown) {
        // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
        // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
        // TokenInvalidAccountOwnerError in this code path.
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            // As this isn't atomic, it's possible others can create associated accounts meanwhile.
            try {
                const { sendTransaction} = wallet;

                const transaction = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        associatedToken,
                        owner,
                        mint,
                        programId,
                        associatedTokenProgramId
                    )
                );

                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await connection.getLatestBlockhashAndContext();
                const signature = await sendTransaction(transaction, connection, { minContextSlot,
                    signers: []
                 });
                 const confirmedSignature = await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
            } catch (error: unknown) {
                // Ignore all errors; for now there is no API-compatible way to selectively ignore the expected
                // instruction error if the associated account exists already.
            }

            // Now this should always succeed
            account = await getAccount(connection, associatedToken, commitment, programId);
        } else {
            throw error;
        }
    }

    if (!account.mint.equals(mint)) throw new TokenInvalidMintError();
    if (!account.owner.equals(owner)) throw new TokenInvalidOwnerError();

    return account;
}