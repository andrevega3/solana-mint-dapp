import { useEffect, useState } from "react";
import {ShdwDrive} from "@shadow-drive/sdk"
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";

export const useDrive = (connection: Connection) => {
    const wallet = useWallet();
    const [drive, setDrive] = useState<ShdwDrive | null>(null);
    
    useEffect(() => {
        const initDrive = async () => {
            if (wallet?.publicKey) {
                const driveInstance = await new ShdwDrive(connection, wallet).init();
                setDrive(driveInstance);
            }
        };

        initDrive();
    }, [wallet?.publicKey, connection]);

    return drive;
}