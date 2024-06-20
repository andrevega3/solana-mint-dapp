// src/app/page.tsx
"use client";

import { Box, Heading } from '@chakra-ui/react';
import ConnectButton from '@/components/ConnectButton'

export default function Home() {
  return (
    <Box p={5}>
      <Heading>Welcome to My Next.js App with Chakra UI</Heading>
      <ConnectButton />
    </Box>
  );
}
