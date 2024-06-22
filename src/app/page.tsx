// src/app/page.tsx
"use client";

import { Box, Heading } from '@chakra-ui/react';
import ConnectButton from '@/components/ConnectButton'
import FungibleTokenMinterForum from '@/components/FungibleTokenMinterForum';

export default function Home() {
  return (
    <Box p={5}>
      <Heading>Solana Mint dApp</Heading>
      <ConnectButton />
      <FungibleTokenMinterForum />
    </Box>
  );
}
