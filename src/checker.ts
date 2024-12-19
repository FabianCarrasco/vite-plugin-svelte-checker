import {spawn} from "child_process";
import {Options} from "./types";

export function createChecker(opts: Options) {
    let args: string[] = [
        'svelte-check',
        '--watch',
        '--output',
        'machine-verbose',
        '--threshold',
        opts.ignoreWarnings ? 'error' : 'warning',
    ]

    let typescript = opts.typescript ?? true

    if (typeof typescript === 'boolean') {
        if (!typescript) {
            args.push('--no-tsconfig')
        }
    } else {
        args.push(`--tsconfig ${typescript.tsConfigPath}`)
    }

    return spawn(getRuntime(), args, { stdio: 'pipe', shell: true })
}

function getRuntime() {
    if (process.versions.bun) {
        return 'bunx'
    } else {
        return 'npx'
    }
}