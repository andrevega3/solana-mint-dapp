import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { FungibleTokenCreateResult, FungibleTokenMintData } from "@/types/FungibleTokenMintTypes";
import { createTokenMintAndMintSupply, getOrCreateAssociatedTokenAccount, mintTokens } from "@/utils/AccountUtils";
import { useDrive } from "@/context/drive";
import { formatBytes } from "@/utils/CommonUtils";

class FungibleTokenMinterHandler {
    connection: ReturnType<typeof useConnection>['connection'];
    wallet: ReturnType<typeof useWallet>;
    drive: ReturnType<typeof useDrive>;

    constructor(
        connection: ReturnType<typeof useConnection>['connection'], 
        wallet: ReturnType<typeof useWallet>,
        drive: ReturnType<typeof useDrive>,
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.drive = drive;
    }

    async handleSubmit(formData: FungibleTokenMintData) {
        const { publicKey } = this.wallet;

        if (!publicKey) throw new WalletNotConnectedError();
        if (!this.drive) throw new Error("Drive not initialized");

        // First we create a storage account on Shadow Drive
        const newAcct = await this.drive.createStorageAccount(
            `My${formData.name}Bucket`,
            `${formatBytes(formData.imageFile.size)}`,
        )
        console.log(`New shdw account: ${newAcct.shdw_bucket}`);
        const acctKey = new PublicKey(newAcct.shdw_bucket);


        //Upload file to user's new storage account
        const uploadFile = await this.drive.uploadFile(acctKey, formData.imageFile);
        console.log(`Uploaded file: ${uploadFile}`);

        // Create JSON metadata
        const metadata: Record<string, string> = {
            name: formData.name,
            symbol: formData.symbol,
            image: uploadFile.finalized_locations[0],
            description: formData.description,
        };

        if (formData.website) metadata.website = formData.website;
        if (formData.twitter) metadata.twitter = formData.twitter;
        if (formData.telegram) metadata.telegram = formData.telegram;
        if (formData.discord) metadata.discord = formData.discord;

        const metadataJson = JSON.stringify(metadata);
        const blob = new Blob([metadataJson], { type: "application/json" });
        const metadataFile = new File([blob], "metadata.json", { type: "application/json" });

        formatBytes(metadataFile.size)

        // Upload JSON metadata file
        const uploadMetadata = await this.drive.uploadFile(acctKey, metadataFile);
        console.log(`Uploaded metadata: ${uploadMetadata}`);
        
        // Create Token Mint Account
        const createTokenResult: FungibleTokenCreateResult | null = await createTokenMintAndMintSupply(
            this.connection,
            this.wallet,
            formData,
            uploadFile.finalized_locations[0],
            uploadMetadata.finalized_locations[0],
        );

        if (!createTokenResult) throw new Error("Failed to create token mint or mint them");
        

        console.log('Token creation and minting completed successfully');
    }
}

export default FungibleTokenMinterHandler;