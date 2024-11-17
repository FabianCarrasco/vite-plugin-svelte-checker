import fs from 'fs/promises'
import {SvelteMessage} from "./types";
import chalk from "chalk";

export const errorCodeFrame = async (
    file: string,
    start: SvelteMessage['start'],
    end: SvelteMessage['end'],
    message: string
) => {
    const fileContent = await fs.readFile(file, 'utf-8')
    const lines = fileContent.split('\n')
    const contextStart = Math.max(0, start.line - 2)
    const contextEnd = Math.min(lines.length, end.line + 3)
    const error = chalk.red

    let frameContent = 'Error in ' + file + '\n'
    frameContent += message + '\n'
    frameContent += '-'.repeat(50) + '\n'
    for (let i = contextStart; i < contextEnd; i++) {
        frameContent += (i + 1).toString().padStart(5) + ' | ' + lines[i] + '\n'
        if (i == start.line) {
            frameContent += ` ${' '.repeat(5)}|${' '.repeat(start.character)} ${'^'.repeat(end.character - start.character)} \n`
        }
    }
    frameContent += '-'.repeat(50) + '\n'
    return frameContent
}