import type { User, MessageComponentInteraction } from 'discord.js'

class AbstractPlayer<T> {
    public id: string

    constructor(public interaction: MessageComponentInteraction, public user: User, public game: T) {
        this.id = user.id
    }
}

export { AbstractPlayer }
