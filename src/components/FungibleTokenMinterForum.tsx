'use client';

import { useState } from 'react';
import { Box, Button } from '@chakra-ui/react'
import TextInputWithHelp from './TextInputWithHelp';
import '@/styles/forum.css';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { connect } from 'http2';
import FungibleTokenMinterHandler from '@/services/FungibleTokenMinterHandler';
import { FungibleTokenMintData } from '@/types/FungibleTokenMintData';


const FungibleTokenMinterForum = () => {
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [symbol, setSymbol] = useState('')
    const [metadataJsonUri, setMetaDataJsonUri] = useState('');
    const [supply, setSupply] = useState('');
    const [decimals, setDecimals] = useState('');

    // TODO: Need to replace input "imageUri" with upload button that utilizes 
    //       shadow storage
    // TODO: Need to replace setMetaDataJSON input with direct despcription 
    //       and any other relevant field input like website or twitter link.
    
    const { connection } = useConnection();
    const wallet = useWallet();

    const validateForm = (formData: FungibleTokenMintData) => {
        if (!Number.isInteger(Number(formData.decimals))) {
            alert('Decimal input must be an integer');
            return false;
        }
        return true;
    }

    const handleSubmit = async () => {
        const formData: FungibleTokenMintData = { name, imageUri, symbol, metadataJsonUri, supply, decimals };
        // const testFormData: FungibleTokenMintData = {
        //     name: "TestMyMint",
        //     imageUri: "https://arweave.net/beGAyeIzjV_UkyjFtxbkZyi_YqfOBWayiQ0B6wqWygY",
        //     symbol: "TEST",
        //     metadataJsonUri: "https://arweave.net/ZgmUJiwoRnSpM54FSI_ja_e1c7_AiKzXEVTrcfO6t3A",
        //     supply: "10000",
        //     decimals: "2"
        // }
        if (validateForm(formData)) {
            const fungibleTokenMinterHanlder = new FungibleTokenMinterHandler(connection, wallet);
            await fungibleTokenMinterHanlder.handleSubmit(formData);
        }
    }
    
    return (
        <Box p={{ base: 4, md: 6 }}>
            <TextInputWithHelp
                title="Name"
                helpText="The name of the token, most likely the name of the brand or product behind the token."
                value={name}
                setValue={setName}
            />
            <TextInputWithHelp
                title="ImageURI"
                helpText="The image URI used as an icon for the token for on-chain explorers or wallets. This should be a link to the image hosted on a on-chain or off-chain cloud service."
                value={imageUri}
                setValue={setImageUri}
            />
            <TextInputWithHelp
                title="symbol"
                helpText="This is the token index, often used to find the token on exchanges or explorers."
                value={symbol}
                setValue={setSymbol}
            />
            <TextInputWithHelp
                title="Metadata JSON URI"
                helpText="This value is the link to the corresponding off-chain or on-chain JSON file specifying further metadata."
                value={metadataJsonUri}
                setValue={setMetaDataJsonUri}
            />
            <TextInputWithHelp
                title="Supply"
                helpText="This is the total supply of the tokens you are minting."
                value={supply}
                setValue={setSupply}
            />
            <TextInputWithHelp
                title="Decimals"
                helpText="Decimals determine the number of decimal places the token can be divided into. When considering what to set these to, consider the supply of your token. If your token has a lower supply, allowing more decimal places is important as it allows more fractional units to be traded or held."
                value={decimals}
                setValue={setDecimals}
            />
            <Button colorScheme="teal" mt={4} onClick={handleSubmit}>Submit</Button>
        </Box>
    );
};

export default FungibleTokenMinterForum;