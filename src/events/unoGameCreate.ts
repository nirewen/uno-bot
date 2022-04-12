import type { ButtonInteraction, MessageComponentInteraction } from 'discord.js'
import type Bot from 'structures/Bot'
import { UNO } from 'game/UNO'

export async function run(this: Bot, interaction: ButtonInteraction) {
    let game = new UNO(interaction)
    this.games.set(interaction.id, game)

    const { embed, row } = game.initialMessage

    const gameCreatedMessage = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
    })
    let filter = (i: MessageComponentInteraction) =>
        i.message.id === gameCreatedMessage.id

    const createdCollector = interaction.channel?.createMessageComponentCollector({
        filter,
        componentType: 'BUTTON',
    })

    createdCollector?.on('collect', (i: MessageComponentInteraction) => {
        this.emit('unoUserAction', game, i)
    })
}
