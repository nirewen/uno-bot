import Discord, { Collection } from 'discord.js'
import type { ApplicationCommand } from 'discord.js'

import fs from 'node:fs/promises'
import path from 'path'
import Event from './Event'
import Logger from './Logger'
import Command from 'types/Command'
import { UNO } from 'game/UNO'

class Bot extends Discord.Client {
    commands = new Map<string, Command>()
    events = new Map<string, Event>()
    logger = new Logger()
    games = new Collection<string, UNO>()

    constructor() {
        super({
            intents: ['GUILDS', 'GUILD_MESSAGES'],
        })
    }

    async loadEvents() {
        const files = await fs.readdir(path.join(__dirname, '..', 'events'))

        for (let file of files) {
            let [name] = file.split('.')
            let { run } = await import(path.join(__dirname, '..', 'events', file))

            this.events.set(name, new Event(name, run))

            this.on(name, function (this: Bot) {
                this.events.get(name)!.run.call(this, ...arguments)
                this.events.get(name)!.ran++
            })
        }
    }

    async loadCommands() {
        if (!this.application?.owner) await this.application?.fetch()

        await this.application?.commands.fetch()

        const commands = await fs.readdir(path.join(__dirname, '..', 'commands'))

        for (let file of commands) {
            let command: Command = await import(
                path.join(__dirname, '..', 'commands', file)
            )
            let cmd: ApplicationCommand

            if (process.argv.includes('--deploy')) {
                cmd = await this.application?.commands.create(command, command.guild)!
            } else {
                cmd = this.application?.commands.cache.find(c => c.name === command.name)!
            }

            command.run = command.run.bind(this)

            this.commands.set(command.name, command)
        }
    }

    login(token: string): any {
        this.logger.logBold('Logando...', 'green')

        super.login(token).catch(error => {
            this.logger.error(error, 'LOGIN ERROR')
        })
    }

    static async start() {
        const bot = new Bot()

        try {
            await bot.loadEvents()
            await bot.login(process.env.TOKEN!)

            bot.once('ready', () => bot.loadCommands())
        } catch (e: unknown) {
            bot.logger.error(e as string, 'START ERROR')
        }
    }
}

export default Bot
