import type {ErrorPayload, Plugin, ViteDevServer} from "vite";
import {spawn, type ChildProcessWithoutNullStreams } from "child_process";
import {SvelteMessage} from "./types";
import {errorCodeFrame} from "./codeFrame";

export function svelteChecker(): Plugin {
    let worker: ChildProcessWithoutNullStreams

    return {
        name: 'vite-plugin-svelte-checker',
        apply: 'serve',

        configureServer(server: ViteDevServer) {
            server.httpServer?.once('listening', () => {
                worker = spawn('npx', ['svelte-check', '--output', 'machine-verbose', '--watch'], {
                    stdio: 'pipe',
                    shell: true
                })

                worker.stdout.on('data', (dataBuffer: Buffer) => {
                    let data = dataBuffer.toString().trim()
                    let messages = data.split('\n')
                    messages.forEach(async (message) => {
                        try {
                            let [timestamp, ...messageBody] = data.split(' ')
                            let messagePayload = messageBody.join(' ')
                            if (messagePayload.startsWith('{')) {
                                let svelteMessage = JSON.parse(messagePayload) as SvelteMessage
                                let payload: ErrorPayload = {
                                    type: 'error',
                                    err: {
                                        message: svelteMessage.message,
                                        stack: '',
                                        loc: {
                                            file: svelteMessage.filename,
                                            line: svelteMessage.start.line,
                                            column: svelteMessage.start.character
                                        },
                                        filename: svelteMessage.filename,
                                        frame: await errorCodeFrame(
                                            svelteMessage.filename,
                                            svelteMessage.start,
                                            svelteMessage.end,
                                            svelteMessage.message
                                        )
                                    }
                                }

                                server.ws.send(payload)
                                server.config.logger.error(
                                    `${svelteMessage.filename}:${svelteMessage.start.line}:${svelteMessage.start.character} - ${svelteMessage.message}\n${payload.err.frame}`,
                                    {timestamp: true}
                                )
                            }
                        } catch (e: any) {
                            server.config.logger.error(e.message)
                        }
                    })

                })
            })
        }
    }
}