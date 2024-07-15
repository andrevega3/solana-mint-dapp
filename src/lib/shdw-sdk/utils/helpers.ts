import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ShadowDriveUserStaking } from "@/lib/shdw-sdk/utils/idl";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";


export async function getStorageAccount(
    programId: anchor.web3.PublicKey,
    key: anchor.web3.PublicKey,
    accountSeed: anchor.BN
): Promise<[anchor.web3.PublicKey, number]> {
    return anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("storage-account"),
            key.toBytes(),
            accountSeed.toTwos(2).toArrayLike(Buffer, "le", 4),
        ],
        programId
    );
}

export async function getStakeAccount(
    programId: anchor.web3.PublicKey,
    storageAccount: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
    return anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake-account"), storageAccount.toBytes()],
        programId
    );
}

export async function findAssociatedTokenAddress(
    walletAddress: anchor.web3.PublicKey,
    tokenMintAddress: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                tokenMintAddress.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
    )[0];
}

export function humanSizeToBytes(input: string): number | boolean {
    const UNITS = ["kb", "mb", "gb"];
    let chunk_size = 0;
    let humanReadable = input.toLowerCase();
    let inputNumber = Number(humanReadable.slice(0, humanReadable.length - 2));
    let inputDescriptor = humanReadable.slice(
        humanReadable.length - 2,
        humanReadable.length
    );
    if (!UNITS.includes(inputDescriptor) || !inputNumber) {
        return false;
    }

    switch (inputDescriptor) {
        case "kb":
            chunk_size = 1_024;
            break;
        case "mb":
            chunk_size = 1_048_576;
            break;
        case "gb":
            chunk_size = 1_073_741_824;
            break;

        default:
            break;
    }

    return Math.ceil(inputNumber * chunk_size);
}

export async function getSimulationUnits(
    connection: anchor.web3.Connection,
    instructions: anchor.web3.TransactionInstruction[],
    payer: anchor.web3.PublicKey
): Promise<number | undefined> {
    const testInstructions = [
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 1_400_000,
        }),
        ...instructions,
    ];

    const testVersionedTxn = new anchor.web3.VersionedTransaction(
        new anchor.web3.TransactionMessage({
            instructions: testInstructions,
            payerKey: payer,
            recentBlockhash: anchor.web3.PublicKey.default.toString(),
        }).compileToV0Message()
    );

    const simulation = await connection.simulateTransaction(testVersionedTxn, {
        replaceRecentBlockhash: true,
        sigVerify: false,
    });

    if (simulation.value.err) {
        return undefined;
    }

    return simulation.value.unitsConsumed;
}

export function fileArrayToFileList(files: File[]) {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
}