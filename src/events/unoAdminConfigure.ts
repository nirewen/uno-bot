import type { SelectMenuInteraction } from 'discord.js'
import type Bot from 'structures/Bot'
import { UNO } from 'game/UNO'

export async function run(this: Bot, game: UNO, interaction: SelectMenuInteraction) {
    const { values } = interaction

    if (interaction.customId === 'rules') {
        game.setRules(values)
    }
    if (interaction.customId === 'style') {
        let style = values.join('_')

        game.setStyle(style)
    }

    const { embed, rows } = game.configureMessage

    interaction.update({
        embeds: [embed],
        components: rows,
    })
}
