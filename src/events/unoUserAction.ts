import { MessageButton, MessageComponentInteraction } from 'discord.js'
import type { ButtonInteraction } from 'discord.js'
import type Bot from 'structures/Bot'
import { UNO } from 'game/UNO'
import { Card } from 'game/structures/UNO/Card'

export async function run(this: Bot, game: UNO, interaction: ButtonInteraction) {
    const { embed, row } = game.initialMessage

    if (interaction.customId === 'join_game') {
        const thisPlayer = game.addPlayer(interaction, interaction.user)

        if (thisPlayer === null) return

        await interaction.update({})

        game.updateInitialReply()
    }

    if (interaction.customId === 'how_to_play') {
        let { embed } = game.instructions

        interaction.reply({
            embeds: [embed],
            ephemeral: true,
        })
    }

    if (interaction.user.id === game.interaction.user.id) {
        if (interaction.customId === 'configure') {
            const { embed, rows } = game.configureMessage

            interaction.reply({
                embeds: [embed],
                components: rows,
                ephemeral: true,
            })

            const filter = (i: MessageComponentInteraction) =>
                i.user.id === interaction.user.id && !game.started
            const collector = interaction.channel?.createMessageComponentCollector({
                filter,
                componentType: 'SELECT_MENU',
                time: 30_000,
            })

            collector?.on('collect', (i: MessageComponentInteraction) => {
                this.emit('unoAdminConfigure', game, i)
            })

            collector?.on('stop', (_reason: string) => {
                interaction.editReply({
                    content: 'Essa interação expirou',
                    embeds: [],
                    components: [],
                })
            })
        }

        if (interaction.customId === 'start_game') {
            let buttons = row.spliceComponents(
                2,
                3,
                new MessageButton({
                    customId: 'table',
                    label: 'Mesa',
                    style: 'SECONDARY',
                }),
                new MessageButton({
                    customId: 'terminate',
                    label: 'Encerrar',
                    style: 'DANGER',
                })
            )
            buttons.components[0].setDisabled()

            await interaction.update({})

            game.interaction.editReply({
                embeds: [embed],
                components: [buttons],
            })

            game.generateDeck()

            game.interaction = interaction

            await game.dealAll(game.rules.initialCards.value as number)

            game.table.discard.push(game.deck.pop()!)
            game.started = true

            game.send(game.gameStartedMessage)

            game.player.sendHand(true)
            game.listenPlay(this, game.player.user)
        }

        if (interaction.customId === 'cancel_game') {
            let buttons = row.spliceComponents(2, 3)
            buttons.components[0].setDisabled()

            game.interaction.editReply({
                embeds: [embed],
                components: [buttons],
            })

            interaction.update({})
        }

        if (interaction.customId === 'terminate') {
            game.stopGame(this, 'terminate')

            interaction.update({})
        }
    }
}
