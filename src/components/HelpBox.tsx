'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Icon } from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import '@/styles/forum.css';

interface HelpBoxProps {
    helpText: string;
}

const HelpBox: React.FC<HelpBoxProps> = ({ helpText }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [alignment, setAlignment] = useState('center');
    const helpBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isHovered && helpBoxRef.current) {
            const { left, right } = helpBoxRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            if (left < 0) {
                setAlignment('left');
            } else if (right > viewportWidth) {
                setAlignment('right')
            } else {
                setAlignment('center')
            }
        }
    }, [isHovered]);

    return (
        <Box position="relative" display="inline-block" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <Icon as={InfoOutlineIcon} boxSize={4} cursor="pointer" />
            {isHovered && (
                <Box 
                    ref={helpBoxRef}
                    className={`helpBoxOverlay ${alignment}`}
                >
                    <Text>{helpText}</Text>
                </Box>
            )}
        </Box>
    );
};

export default HelpBox