import { ApplicationCommandOptionData, CommandInteraction } from 'discord.js'

export default interface Command {
    name: string
    description: string
    options: ApplicationCommandOptionData[]
    guild?: string
    run(interaction: CommandInteraction): Promise<void>
}
