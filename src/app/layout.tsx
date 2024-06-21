"use client"

import { WalletConnectionProvider } from "@/context/wallet";
import Chakra from "@/lib/chakra";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/src/app/favicon.ico" />
      </head>
      <body>
        <Chakra>
          <WalletConnectionProvider>
            {children}
          </WalletConnectionProvider>
        </Chakra>
      </body>
    </html>
  );
}
