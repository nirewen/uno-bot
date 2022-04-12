import Bot from 'structures/Bot'

export function run(this: Bot) {
    let guilds = this.guilds.cache.size

    this.logger.logWithHeader('PRONTO', 'green', 'white', `SERVERS: ${guilds}`)
}
