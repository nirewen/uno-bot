import type { CommandInteraction, MessageComponentInteraction } from 'discord.js'
import Bot from 'structures/Bot'
import { UNO } from 'game/UNO'

export const name = 'uno'
export const description = 'Play UNO via Discord'
export async function run(this: Bot, interaction: CommandInteraction) {
    const { embed, row } = UNO.commandMessage

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
    })
    let filter = (i: MessageComponentInteraction) => i.user.id === interaction.user.id

    const initialCollected = await interaction.channel
        ?.awaitMessageComponent({
            filter,
            idle: 30e3,
            componentType: 'BUTTON',
        })
        .catch(_e => {
            interaction.editReply({
                content: 'Essa interação expirou',
                embeds: [],
                components: [],
            })
        })

    if (initialCollected?.customId === 'new_game') {
        interaction.editReply({
            content: 'Você criou um novo jogo',
            embeds: [],
            components: [],
        })

        this.emit('unoGameCreate', initialCollected)
    }
}
