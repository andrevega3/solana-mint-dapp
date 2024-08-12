import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, Connection, PublicKey } from "@solana/web3.js";
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
import { createGenericFile, generateSigner, percentAmount, Signer, Umi } from "@metaplex-foundation/umi";
import { createAndMint, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";

class FungibleTokenMinterHandler {
    connection: Connection;
    wallet: ReturnType<typeof useWallet>;
    drive: ReturnType<typeof useDrive>;
    umi: Umi;

    constructor(
        connection: Connection, 
        wallet: ReturnType<typeof useWallet>,
        drive: ReturnType<typeof useDrive>,
        umi: Umi
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.drive = drive;
        this.umi = umi;
    }

    async fileToUint8Array(file: File): Promise<Uint8Array> {
        const arrayBuffer = await file.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    async handleSubmit(formData: FungibleTokenMintData) {
        const { publicKey, signMessage, sendTransaction, signAllTransactions } = this.wallet;

        if (!publicKey) throw new WalletNotConnectedError();
        if (!this.drive) throw new Error("Drive not initialized");
        if (!signMessage || !signAllTransactions) throw new Error("No sign message method available");
        
        // Convert image to generic file.
        const fileUint8Array = await this.fileToUint8Array(formData.imageFile);
        const generic_file = await createGenericFile(fileUint8Array, formData.imageFile.name);

        // Upload image
        const [imageUri] = await this.umi.uploader.upload([generic_file], {
            onProgress: (percent: number) => {
                console.log(`${percent * 100}% uploaded...`)
            }
        });

        console.log("Your image URI: ", imageUri);

        const metadata: Record<string, string> = {
            name: formData.name,
            symbol: formData.symbol,
            image: imageUri,
            description: formData.description,
        };

        let authority: PublicKey | null = this.wallet.publicKey;
        if (formData.website) metadata.website = formData.website;
        if (formData.twitter) metadata.twitter = formData.twitter;
        if (formData.telegram) metadata.telegram = formData.telegram;
        if (formData.discord) metadata.discord = formData.discord;
        if (formData.authority) authority = new PublicKey(formData.authority);

        const metadataUri = await this.umi.uploader.uploadJson(metadata);

        // const mint = generateSigner(this.umi);

        // const mint_tx = createAndMint(this.umi, {
        //     mint,
        //     authority: this.umi.identity,
        //     name: metadata.name,
        //     symbol: metadata.symbol,
        //     uri: metadata.uri,
        //     sellerFeeBasisPoints: percentAmount(0),
        //     decimals: parseInt(formData.decimals),
        //     amount: parseInt(formData.supply),
        //     tokenOwner: this.umi.identity.publicKey,
        //     tokenStandard: TokenStandard.Fungible,
        // }).sendAndConfirm(this.umi)

        // console.log(`Success! ${mint_tx}`)

        await createTokenMintAndMintSupply(
            this.connection,
            this.wallet,
            formData,
            imageUri,
            metadataUri,
            authority as PublicKey
        );
    }
}

export default FungibleTokenMinterHandler;
