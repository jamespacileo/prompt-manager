import { Box, BoxProps } from "ink";

import React from "react";

interface ContentWrapperProps extends BoxProps {
  borderColor?: string;
  children: React.ReactNode;
}

const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  borderColor = "blue",
  ...props
}) => {
  return (
    <Box
      // borderStyle="round"
      // borderTop={true}
      flexDirection="column"
      // borderColor={borderColor}
      padding={1}
      {...props}
    >
      {children}
    </Box>
  );
};

export default ContentWrapper;
