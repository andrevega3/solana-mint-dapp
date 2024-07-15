'use client';

import { ChangeEvent, useState } from 'react';
import { Box, Button, Input } from '@chakra-ui/react'
import TextInputWithHelp from './TextInputWithHelp';
import '@/styles/forum.css';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import FungibleTokenMinterHandler from '@/handlers/FungibleTokenMinterHandler';
import { FungibleTokenMintData } from '@/types/FungibleTokenMintTypes';
import { useDrive } from '@/context/drive';
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT!, "confirmed");

const FungibleTokenMinterForum = () => {
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('')
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [twitter, setTwitter] = useState('');
    const [telegram, setTelegram] = useState('');
    const [discord, setDiscord] = useState('');
    const [supply, setSupply] = useState('');
    const [decimals, setDecimals] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    // TODO: Need to replace setMetaDataJSON input with direct despcription 
    //       and any other relevant field input like website or twitter link.
    
    const wallet = useWallet();
    const drive = useDrive(connection);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setImageFile(event.target.files[0]);
        }
    };

    const validateForm = (formData: FungibleTokenMintData) => {
        if (!Number.isInteger(Number(formData.decimals))) {
            alert('Decimal input must be an integer');
            return false;
        }
        if (!Number.isInteger(Number(formData.supply))) {
            alert('Supply input must be an integer');
            return false;
        }
        if (!imageFile) {
            alert('Please upload an image.');
            return false;
        }
        return true;
    }

    const handleSubmit = async () => {
        const formData: FungibleTokenMintData = { 
            name, 
            symbol,
            description,
            supply, 
            decimals,
            website,
            twitter,
            telegram,
            discord,
            imageFile: imageFile as File 
        };
        // const testFormData: FungibleTokenMintData = {
        //     name: "TestMyMint",
        //     imageUri: "https://arweave.net/beGAyeIzjV_UkyjFtxbkZyi_YqfOBWayiQ0B6wqWygY",
        //     symbol: "TEST",
        //     metadataJsonUri: "https://arweave.net/ZgmUJiwoRnSpM54FSI_ja_e1c7_AiKzXEVTrcfO6t3A",
        //     supply: "10000",
        //     decimals: "2"
        // }
        if (validateForm(formData)) {
            const fungibleTokenMinterHanlder = new FungibleTokenMinterHandler(connection, wallet, drive);
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
                title="symbol"
                helpText="This is the token index, often used to find the token on exchanges or explorers."
                value={symbol}
                setValue={setSymbol}
            />
            <TextInputWithHelp
                title="Description"
                helpText="A brief description of the token and its purpose."
                value={description}
                setValue={setDescription}
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
            <Box mt={4}>
                <label>Upload Image:</label>
                <Input type="file" accept="image/*" onChange={handleFileChange} required />
            </Box>
            <TextInputWithHelp
                title="Website"
                helpText="The official website of the token or the project behind it."
                value={website}
                setValue={setWebsite}
            />
            <TextInputWithHelp
                title="Twitter"
                helpText="The official Twitter account of the token or the project behind it."
                value={twitter}
                setValue={setTwitter}
            />
            <TextInputWithHelp
                title="Telegram"
                helpText="The official Telegram group of the token or the project behind it."
                value={telegram}
                setValue={setTelegram}
            />
            <TextInputWithHelp
                title="Discord"
                helpText="The official Discord server of the token or the project behind it."
                value={discord}
                setValue={setDiscord}
            />
            <Button colorScheme="teal" mt={4} onClick={handleSubmit}>Submit</Button>
        </Box>
    );
};

export default FungibleTokenMinterForum;