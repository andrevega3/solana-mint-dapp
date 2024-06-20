import { extendTheme, ChakraProvider } from '@chakra-ui/react';

const theme = extendTheme({
    // Customize your theme here
});

const Chakra = ({children}) => (
    <ChakraProvider theme={theme}>
        {children}
    </ChakraProvider>
);

export default Chakra;