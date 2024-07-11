// src/app/page.tsx
"use client";

import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import ConnectButton from '@/components/ConnectButton'
import FungibleTokenMinterForum from '@/components/FungibleTokenMinterForum';

const Home: React.FC = () => {
  return (
    <Box p={5}>
      <Heading>Solana Mint dApp</Heading>
      <ConnectButton />
      <FungibleTokenMinterForum />
    </Box>
  );
};

export default Home;
