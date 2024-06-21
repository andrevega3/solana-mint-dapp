"use client";

import { Button } from '@chakra-ui/react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styles from './ConnectButton.module.css'
const ConnectButton = () => (
    <WalletMultiButton/>
);

export default ConnectButton