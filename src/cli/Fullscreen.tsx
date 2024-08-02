import { BoxProps, Box, render, RenderOptions } from "ink";
import { useState, useEffect, PropsWithChildren } from "react";
import { logger } from "../utils/logger";

function useStdoutDimensions(): [number, number] {
    const { columns, rows } = process.stdout;
    const [size, setSize] = useState({ columns, rows });
    useEffect(() => {
        function onResize() {
            const { columns, rows } = process.stdout;
            setSize({ columns, rows });
        }
        process.stdout.on("resize", onResize);
        return () => {
            process.stdout.off("resize", onResize);
        };
    }, []);
    return [size.columns, size.rows];
}

const FullScreen: React.FC<PropsWithChildren<BoxProps>> = ({ children, ...styles }) => {
    const [columns, rows] = useStdoutDimensions();
    return <Box width={columns} height={rows} {...styles}>{children}</Box>;
}


export const renderFullScreen = async (element: React.ReactNode, options?: RenderOptions) => {
    process.stdout.write('\x1b[?1049h');
    const { waitUntilExit, clear } = render(<FullScreen>{element}</FullScreen>);

    const cleanup = () => {
        clear();
        logger.info("Exiting gracefully...");
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    try {
        await waitUntilExit();
        process.stdout.write('\x1b[?1049l')
    } finally {
        cleanup();
    }
}