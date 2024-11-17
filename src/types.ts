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