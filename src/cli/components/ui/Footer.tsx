import React, { ReactNode } from "react";

import { Box } from "ink";

interface FooterProps {
  children: ReactNode;
}

const Footer: React.FC<FooterProps> = ({ children }) => (
  <Box borderStyle="single" borderColor="blue" paddingX={1}>
    {children}
  </Box>
);

export default Footer;
