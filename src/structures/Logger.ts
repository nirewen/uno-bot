import chalk from 'chalk'
import { format } from 'date-fns'

class Logger {
    commandColor: string

    constructor(commandColor = 'white') {
        this.commandColor = commandColor
    }

    set color(value: string) {
        this.commandColor = value
    }

    get timestamp() {
        return `[${format(new Date(), 'dd/MM/y HH:mm:ss')}] `
    }

    log(text: string, color: string) {
        return console.log(this.timestamp + (color ? chalk.keyword(color)(text) : text))
    }

    logWithBackground(text: string, background: string, color: string) {
        return console.log(
            this.timestamp +
                (color ? chalk.bgKeyword(background).keyword(color)(text) : chalk.keyword(background)(text))
        )
    }

    logBold(text: string, color: string) {
        return console.log(this.timestamp + (color ? chalk.bold.keyword(color)(text) : chalk.bold(text)))
    }

    logWithUnderline(text: string, color: string) {
        return console.log(this.timestamp + (color ? chalk.underline.keyword(color)(text) : chalk.underline(text)))
    }

    logWithHeader(headerText: string, headerBackground: string, headerColor: string, text: string, color?: string) {
        return console.log(
            this.timestamp + chalk.bgKeyword(headerBackground).keyword(headerColor || 'white')(` ${headerText} `),
            color ? chalk.keyword(color)(text) : text
        )
    }

    logCommand(guildName: string | undefined, userName: string, commandName: string) {
        if (guildName)
            return console.log(
                this.timestamp +
                    `${chalk.bold.magenta(guildName)} >> ${chalk.bold.green(userName)} ${
                        this.commandColor === undefined
                            ? commandName
                            : chalk.bgMagenta.bold.keyword(this.commandColor)(` /${commandName} `)
                    }`
            )
        return console.log(
            this.timestamp +
                `${chalk.bold.green(userName)} > ${
                    this.commandColor === undefined ? commandName : chalk.bold.keyword(this.commandColor)(commandName)
                }`
        )
    }

    warn(text: string, wText = 'AVISO') {
        return console.log(this.timestamp + `${chalk.bgYellow.white(` ${wText} `)} ${text}`)
    }

    error(text: string, eText = 'ERRO') {
        return console.log(this.timestamp + `${chalk.bgRed.white(` ${eText} `)} ${text}`)
    }

    debug(text: string, dText = 'DEBUG') {
        return console.log(this.timestamp + `${chalk.bgBlue.white(` ${dText} `)} ${text}`)
    }
}

export default Logger
