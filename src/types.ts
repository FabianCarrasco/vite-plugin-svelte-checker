import { BundledTheme } from "shiki";

export interface SvelteMessage {
    type: string;
    filename: string;
    start: {
        line: number;
        character: number;
    };
    end: {
        line: number;
        character: number;
    };
    message: string;
    code: number;
    source: string | undefined;
}

export interface Options {
    typescript?: | {
        tsConfigPath: string
    } | boolean,
    cli?: {
        enabled?: boolean,
        theme?: BundledTheme
    } | boolean,
    overlay?: boolean,
    ignoreWarnings?: boolean,
}
