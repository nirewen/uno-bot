import { Message } from 'discord.js'
import type {
    ButtonInteraction,
    MessageComponentInteraction,
    SelectMenuInteraction,
    MessageEmbed,
} from 'discord.js'
import type Bot from 'structures/Bot'
import { UNO } from 'game/UNO'
import { Card } from 'game/structures/UNO/Card'

export async function run(
    this: Bot,
    game: UNO,
    interaction: SelectMenuInteraction | ButtonInteraction
) {
    if (interaction.isSelectMenu()) {
        const value = interaction.values.join('_')
        let card = game.player.getCard(value)

        if (!card) return

        if (!game.isValid(card)) return

        if (value.startsWith('WILD')) {
            let embed = UNO.baseEmbed.setDescription(
                'Como você jogou um curinga, você pode escolher a cor!'
            )
            let row = game.wildRow
            let oldEmbed = interaction.message.embeds[0] as MessageEmbed

            oldEmbed.setImage('attachment://cards.png')

            interaction.update({
                embeds: [oldEmbed, embed],
                components: [row],
            })

            const filter = (i: MessageComponentInteraction) =>
                i.user.id === game.player.id
            const wildColor = await interaction.channel?.awaitMessageComponent({
                filter,
                componentType: 'BUTTON',
            })

            card.color = Card.parseColor(wildColor?.customId!)

            wildColor?.update({})
        } else {
            if (!interaction.replied) interaction.update({})
        }

        game.table.discard.push(card)
        game.player.hand.splice(game.player.hand.indexOf(card), 1)
        let pref = ''

        if (game.player.hand.length === 0) {
            game.finished.push(game.player)
            game.player.finished = true
            pref = `${game.player.user} não tem mais cartas! Terminou no **Rank #${game.finished.length}**! :tada:\n\n`
            if (game.queue.length === 2 || !game.rules.continueFirst.value) {
                game.finished.push(game.queue[1])
                pref += 'O jogo acabou. Obrigado por jogar! Aqui está o placar:\n'

                for (let [i] of game.finished.entries())
                    pref += `${i + 1}. **${game.finished[i].user}**\n`

                this.games.delete(game.interaction.id)

                return
            }

            game.send(pref)
        }
        let extra = ''

        switch (card.id) {
            case 'REVERSE':
                if (game.queue.length >= 2) {
                    let player = game.queue.shift()!

                    game.queue.reverse()
                    game.queue.unshift(player)
                    extra = `Os turnos agora estão em ordem reversa! `
                }
                break
            case 'SKIP':
                game.queue.push(game.queue.shift()!)
                extra = `Foi mal, ${game.player.user}! Pulou a vez! `
                break
            case '+2':
                let amount = 2

                await game.deal(game.queue[1], amount)
                extra = `${game.queue[1].user} compra ${amount} cartas! `

                if (game.rules.drawSkip.value === true) {
                    extra += ' Ah, e pula a vez!'
                    game.queue.push(game.queue.shift()!)
                }
                break
            case 'WILD':
                extra = `A cor agora é **${card.colorName}**! `
                break
            case 'WILD+4': {
                await game.deal(game.queue[1], 4)

                extra = `${game.queue[1].user} compra 4 cartas! A cor agora é **${card.colorName}**! `

                if (game.rules.drawSkip.value === true) {
                    extra += ' Ah, e pula a vez!'
                    game.queue.push(game.queue.shift()!)
                }
                break
            }
        }
        let { player } = game

        if (player.hand.length === 1) {
            player.immune = true

            let filter = (m: Message) => m.content.toUpperCase().startsWith('UNO')

            let collector = interaction.channel?.createMessageCollector({
                filter,
                max: 1,
                time: 10_000,
            })

            collector?.on('collect', (m: Message) => {
                if (m.author.id === player.id)
                    game.send({
                        content: `UNO!\n\n${player.user} só tem uma carta!`,
                    })
                else {
                    game.send({
                        content: `${m.author} disse UNO antes de ${player.user}\n${player.user} compra duas cartas...`,
                    })

                    game.deal(player, 2)
                }
            })

            collector?.on('end', _reason => {
                player.immune = false
            })
        }

        await game.next()

        const { embed, file } = game.getPlayedMessage(interaction.user, extra)

        game.send({
            embeds: [embed],
            files: [file],
        })

        game.listenPlay(this, game.player.user)
    }

    if (interaction.customId === 'draw') {
        let { player } = game

        interaction.update({})

        game.deal(player, 1)

        await game.next()

        const { embed, file } = game.getDrewCardMessage(interaction.user)

        game.send({
            embeds: [embed],
            files: [file],
        })

        game.listenPlay(this, game.player.user)
    }
}
