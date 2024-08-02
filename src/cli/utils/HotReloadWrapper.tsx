// ... existing code ...

import { Box } from "ink";
import { useState, useEffect, ReactNode } from "react";

declare const module: {
    hot?: {
        accept: (callback: () => void) => void;
    };
};

interface HotReloadWrapperProps {
    children: ReactNode;
}

export const HotReloadWrapper: React.FC<HotReloadWrapperProps> = ({ children }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        if (module.hot) {
            const tick = () => setTick(t => t + 1);
            module.hot.accept(tick);
        }
    }, []);

    return <Box>{children}</Box>;
};
