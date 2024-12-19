import fs from 'fs/promises'
import { SvelteMessage } from "./types";
import chalk from "chalk";
import { codeToANSI } from '@shikijs/cli';
import { BuiltinLanguage, BundledTheme } from 'shiki';

export const errorCodeFrame = async (
    file: string,
    start: SvelteMessage['start'],
    end: SvelteMessage['end'],
    message: string,
    theme: BundledTheme = 'nord'
) => {
    let fileExtension: BuiltinLanguage = 'svelte'

    if (file.endsWith('.ts')) {
        fileExtension = 'typescript'
    } else if (file.endsWith('.js')) {
        fileExtension = 'javascript'
    }

    const fileContent = await fs.readFile(file, 'utf-8')
    const highlighted = await codeToANSI(fileContent, fileExtension, theme)
    const lines = highlighted.split('\n')
    const contextStart = Math.max(0, start.line - 2)
    const contextEnd = Math.min(lines.length, end.line + 3)
    const error = chalk.red

    let frameContent = error('Error in ') + chalk.blue(file) + '\n'
    frameContent += error(message) + '\n'
    frameContent += chalk.gray('-').repeat(50) + '\n'
    for (let i = contextStart; i < contextEnd; i++) {
        if (i == start.line) {
            frameContent += error((i + 1).toString().padStart(5)) + chalk.gray(' | ') + lines[i] + '\n'
            frameContent += ` ${' '.repeat(5)}${chalk.gray('|')}${' '.repeat(start.character)} ${error('^').repeat(end.character - start.character)} \n`
        } else {
            frameContent += chalk.gray((i + 1).toString().padStart(5)) + chalk.gray(' | ') + lines[i] + '\n'
        }
    }
    frameContent += chalk.gray('-').repeat(50) + '\n'
    return frameContent
}
