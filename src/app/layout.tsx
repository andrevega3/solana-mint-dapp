"use client"

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
          {children}
        </Chakra>
      </body>
    </html>
  );
}
