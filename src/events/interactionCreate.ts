import { Interaction } from 'discord.js'
import Bot from 'structures/Bot'

export function run(this: Bot, interaction: Interaction) {
    if (!interaction) return

    const guild = interaction.guild?.name
    const user = interaction.user.username

    if (interaction.isCommand()) {
        const { commandName } = interaction

        this.commands.get(commandName)!.run(interaction)

        this.logger.logCommand(guild, user, commandName)
    }
}
