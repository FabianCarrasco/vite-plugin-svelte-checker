import type {ErrorPayload, Plugin, ViteDevServer} from "vite";
import { type ChildProcessWithoutNullStreams } from "child_process";
import { SvelteMessage, Options } from "./types";
import { errorCodeFrame } from "./codeFrame";
import stripAnsi from "strip-ansi";
import {createChecker} from "./checker";

export function svelteChecker(options: Options): Plugin {
    let worker: ChildProcessWithoutNullStreams
    let payloads: ErrorPayload[] = []

    return {
        name: 'vite-plugin-svelte-checker',
        apply: 'serve',

        configResolved(config) {

            const originalError = config.logger.error
            const originalInfo = config.logger.hasErrorLogged

            config.logger.hasErrorLogged = (error: any) => {
                if (error.name === 'CompileError' && error.plugin === 'vite-plugin-svelte') {
                    return true
                }

                return originalInfo.call(config.logger, error)
            }

            config.logger.error = ((msg, options) => {
                const errorMessage = stripAnsi(msg.toLowerCase())
                if (errorMessage.includes('plugin: vite-plugin-svelte') || errorMessage.includes('plugin: \'vite-plugin-svelte\'')) {
                    return;
                }

                originalError.call(config.logger, msg, options)
            })
        },

        async configureServer(server: ViteDevServer) {
            const originalSend = server.ws.send.bind(server.ws)

            server.ws.send = function(payload: any) {
                if (payload.err?.name === 'CompileError' && payload.err?.plugin === 'vite-plugin-svelte') {
                    return
                }

                originalSend.call(this, payload)
            }

            worker = createChecker(options)

            worker.stdout.on('data', async (dataBuffer: Buffer) => {
                let data = dataBuffer.toString().trim()
                let messages = data.split('\n')
                let newPayloads: ErrorPayload[] = []

                const promises = messages.map(async (message) => {
                    try {
                        let [timestamp, ...messageBody] = message.split(' ')
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
                                        column: svelteMessage.start.character,
                                    },
                                    filename: svelteMessage.filename,
                                    frame: await errorCodeFrame(
                                        svelteMessage.filename,
                                        svelteMessage.start,
                                        svelteMessage.end,
                                        svelteMessage.message,
                                        options.cli && typeof options.cli !== 'boolean' ?
                                            options.cli.theme
                                            : undefined
                                    ),
                                    plugin: 'vite-plugin-svelte-checker',
                                },
                            }

                            newPayloads.push(payload)
                        }
                    } catch (e: any) {
                        server.config.logger.error(e.message)
                    }
                })

                await Promise.all(promises)

                payloads = newPayloads

                payloads.forEach(payload => {
                    if (options.cli == null
                    || (typeof options.cli === 'boolean' && options.cli)
                    || (typeof options.cli !== 'boolean' && options.cli.enabled)) {
                        server.config.logger.error(
                            `${payload.err.message}:${payload.err.loc?.line}:${payload.err.loc?.column} - ${payload.err.message}\n${payload.err.frame}`,
                            {timestamp: true}
                        )
                    }
                })

                if (payloads.length > 0) {
                    server.ws.send({
                        ...payloads[0],
                        err: {
                            ...payloads[0].err,
                            frame: payloads[0].err.frame && stripAnsi(payloads[0].err.frame),
                        },
                    })
                } else {
                    server.ws.send({type: 'full-reload'})
                }
            })

            server.ws.on('connection', () => {
                if (payloads.length > 0 && (options.overlay || options.overlay == null)) {
                    server.ws.send({
                        ...payloads[0],
                        err: {
                            ...payloads[0].err,
                            frame: payloads[0].err.frame && stripAnsi(payloads[0].err.frame),
                        },
                    })
                }

            })
        },

    }
}
