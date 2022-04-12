import { Collection } from 'discord.js'
import { Player } from './UNO/Player'

class Game {
    public players = new Collection<string, Player>()
    public queue: Player[] = []
    public started = false

    get player() {
        return this.queue[0]
    }

    async next() {
        this.queue.push(this.queue.shift()!)
        return this.player
    }
}

export { Game }
