'use client';

import { useState } from 'react';
import { Box, Input, FormControl, FormLabel, Switch } from '@chakra-ui/react';
import HelpBox from './HelpBox';
import '@/styles/forum.css';

interface TextInputWithHelpProps {
    title: string;
    helpText: string;
    value: string;
    setValue: (value: string) => void;
    defaultValue?: string;
    showSwitch?: boolean;
}

const TextInputWithHelp: React.FC<TextInputWithHelpProps> = ({ title, helpText, value, setValue, defaultValue = "Not Applicable", showSwitch = false }) => {
    const [isAutoFill, setIsAutoFill] = useState(false);

    const handleToggleChange = () => {
        setIsAutoFill(!isAutoFill);
        if (!isAutoFill) {
            setValue(defaultValue)
        } else {
            setValue('');
        }
    };

    return (
        <FormControl className="formControl">
            <Box className="formControlLabelContainer">
                <FormLabel htmlFor={title} mb="0" className="formControlLabel">
                    {title}
                </FormLabel>
                <HelpBox helpText={helpText} />
            </Box>
            <Input
                id={title}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                isReadOnly={isAutoFill}
                placeholder={title}
                className="inputField"
            />
            {showSwitch && (
                <Switch
                    ml={2}
                    isChecked={isAutoFill}
                    onChange={handleToggleChange}
                />
            )}
        </FormControl>
    );
};

export default TextInputWithHelp;