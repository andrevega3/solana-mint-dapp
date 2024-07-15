import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, Connection } from "@solana/web3.js";
import { FungibleTokenMintData } from "@/types/FungibleTokenMintTypes";
import { createTokenMintAndMintSupply } from "@/utils/AccountUtils";
import { useDrive } from "@/context/drive";
import { formatBytes } from "@/utils/CommonUtils";
import { CreateStorageResponse, UserInfo } from "@shadow-drive/sdk";
import { fileArrayToFileList, findAssociatedTokenAddress, getStakeAccount, getStorageAccount, humanSizeToBytes } from "@/lib/shdw-sdk/utils/helpers";
import { PROGRAM_ID } from "@/lib/shdw-sdk/types/programId";
import { BN } from "@coral-xyz/anchor";
import { SHDW_DRIVE_ENDPOINT, tokenMint, uploader } from "@/lib/shdw-sdk/utils/common";
import { initializeAccount2 } from "@/lib/shdw-sdk/types/instructions/initializeAccount2";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fetch from "cross-fetch";

class FungibleTokenMinterHandler {
    connection: Connection;
    wallet: ReturnType<typeof useWallet>;
    drive: ReturnType<typeof useDrive>;

    constructor(
        connection: Connection, 
        wallet: ReturnType<typeof useWallet>,
        drive: ReturnType<typeof useDrive>,
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.drive = drive;
    }

    async handleSubmit(formData: FungibleTokenMintData) {
        const { publicKey, signMessage, sendTransaction, signAllTransactions } = this.wallet;

        if (!publicKey) throw new WalletNotConnectedError();
        if (!this.drive) throw new Error("Drive not initialized");
        if (!signMessage || !signAllTransactions) throw new Error("No sign message method available");

        let userInfoAccount = await UserInfo.fetch(this.connection, this.drive.userInfo);
        let accountSeed = new BN(0);
        if (userInfoAccount !== null) {
            accountSeed = new BN(userInfoAccount.accountCounter);
        }

        let storageAccount = (
            await getStorageAccount(
                PROGRAM_ID,
                publicKey,
                accountSeed
            )
        )[0];

        let stakeAccount = (await getStakeAccount(PROGRAM_ID, storageAccount))[0];

        let ownerAta = await findAssociatedTokenAddress(
            publicKey,
            tokenMint
        );

        const size = formatBytes(formData.imageFile.size);

        let storageInputAsBytes = humanSizeToBytes(size);
        if (storageInputAsBytes === false) {
            return Promise.reject(
                new Error(
                    `${size} is not a valid input for size. Please use a string like '1KB', '1MB', '1GB'.`
                )
            );
        }

        let storageRequested = new BN(storageInputAsBytes.toString()); // 2^30 B <==> 1GB

        const initializeAccountIx2 = initializeAccount2(
            {
                identifier: `My${formData.name}Bucket`,
                storage: storageRequested,
            },
            {
                storageConfig: this.drive.storageConfigPDA,
                userInfo: this.drive.userInfo,
                storageAccount,
                stakeAccount,
                tokenMint,
                owner1: publicKey,
                uploader: uploader,
                owner1TokenAccount: ownerAta,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            }
        );

        const imageUrl = `https://shdw-drive.genesysgo.net/${storageAccount}/${encodeURIComponent(formData.imageFile.name)}`;

        const metadata: Record<string, string> = {
            name: formData.name,
            symbol: formData.symbol,
            image: imageUrl,
            description: formData.description,
        };

        if (formData.website) metadata.website = formData.website;
        if (formData.twitter) metadata.twitter = formData.twitter;
        if (formData.telegram) metadata.telegram = formData.telegram;
        if (formData.discord) metadata.discord = formData.discord;

        const metadataJson = JSON.stringify(metadata);
        const blob = new Blob([metadataJson], { type: "application/json" });
        const metadataFile = new File([blob], "metadata.json", { type: "application/json" });

        const metadataUrl = `https://shdw-drive.genesysgo.net/${storageAccount}/${encodeURIComponent(metadataFile.name)}`;

        const createTokenTransaction = await createTokenMintAndMintSupply(
            this.connection,
            this.wallet,
            formData,
            imageUrl,
            metadataUrl,
        );

        if (!createTokenTransaction) throw new Error("Failed to compose create token transaction");

        // Split the transactions
        const initStorageTransaction = new Transaction().add(initializeAccountIx2);
        const tokenTransaction = createTokenTransaction;

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight}
        } = await this.connection.getLatestBlockhashAndContext();

        initStorageTransaction.recentBlockhash = blockhash;
        initStorageTransaction.feePayer = publicKey;

        // tokenTransaction.recentBlockhash = blockhash;
        // tokenTransaction.feePayer = publicKey;

        const signedTransactions = await signAllTransactions([initStorageTransaction, tokenTransaction]);

        const signedTx = signedTransactions[0];
        const serializedTxn = signedTx.serialize({ requireAllSignatures: false });
        // Send and confirm the transactions
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7200000);
        const createStorageResponse = await fetch(
            `${SHDW_DRIVE_ENDPOINT}/storage-account`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    transaction: Buffer.from(
                        serializedTxn.toJSON().data
                    ).toString("base64"),
                }),
                signal: controller.signal,
            }
        );
        if (!createStorageResponse.ok) {
            return Promise.reject(
                new Error(`Server response status code: ${
                    createStorageResponse.status
                } \n
		Server response status message: ${(await createStorageResponse.json()).error}`)
            );
        }
        const responseJson =
            (await createStorageResponse.json()) as CreateStorageResponse;

        console.log`CreateStorageResponse: ${responseJson}`

        const signature1 = await this.connection.sendRawTransaction(signedTransactions[1].serialize());
        const confirmedSignature1 = await this.connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature: signature1
        });

        console.log(`CreateToken: ${confirmedSignature1.context}`)

        console.log("Transactions confirmed");

        const fileList = fileArrayToFileList([formData.imageFile, metadataFile]);

        const uploadFiles = await this.drive.uploadMultipleFiles(storageAccount, fileList, 2)

        console.log(`Uploaded files: ${uploadFiles}`);

        console.log('Token creation and minting completed successfully');
    }
}

export default FungibleTokenMinterHandler;
