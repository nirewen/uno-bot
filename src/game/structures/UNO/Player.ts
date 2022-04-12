import Canvas from 'canvas'
import {
    MessageEmbed,
    MessageAttachment,
    MessageActionRow,
    MessageButton,
    MessageSelectMenu,
} from 'discord.js'
import type { MessagePayload, MessageOptions } from 'discord.js'
import { AbstractPlayer } from '../AbstractPlayer'
import { Card } from './Card'
import { UNO } from 'game/UNO'

const s = (n: number) => (n === 1 ? '' : 's')

export class Player extends AbstractPlayer<UNO> {
    public hand: Card[] = []
    public called = false
    public finished = false
    public immune = false

    sortHand() {
        this.hand.sort((a: Card, b: Card) => {
            return a.value > b.value ? 1 : -1
        })
    }

    getCard(id: string) {
        return this.hand.find(c => c.toString() === id)
    }

    send(content: MessageOptions) {
        this.interaction.followUp({
            ...content,
            ephemeral: true,
        })
    }

    async sendHand(turn = false) {
        this.sortHand()
        let len = this.hand.length * 56 + 64
        let canvas = Canvas.createCanvas(len, 181)
        let ctx = canvas.getContext('2d')

        for (let [i] of this.hand.entries()) {
            let card = this.hand[i]
            let image = await Canvas.loadImage(card.URL)

            ctx.drawImage(image, i * 56, 0, 120, 180)
        }

        const embed = UNO.baseEmbed
            .setDescription(
                `${turn ? 'É seu turno! ' : ''}\n` +
                    `Ao lado está a carta à mesa\n\nAqui está sua mão:` +
                    `${this.hand.map(h => `**${h}**`).join(' | ')}\n\n` +
                    `Você tem ${this.hand.length} carta${s(this.hand.length)}.`
            )
            .setFooter({
                text: 'Abaixo estão as cartas que você pode jogar. Se não quiser/puder jogar, clique Comprar',
            })
            .setThumbnail('attachment://current.png')
            .setImage('attachment://cards.png')
            .setColor('#E67E22')

        const options = this.hand
            .filter(card => this.game.isValid(card))
            .filter((i, p, a) => a.findIndex(c => c.toString() === i.toString()) === p)
            .map(o => ({
                label: o.toString(),
                value: o.toString(),
                emoji: o.emoji,
            }))

        const select = new MessageActionRow().addComponents(
            options.length > 0
                ? new MessageSelectMenu().setCustomId('played_card').addOptions(options)
                : new MessageSelectMenu()
                      .setCustomId('played_card')
                      .addOptions({
                          label: 'Nenhuma carta jogável',
                          value: 'no_cards',
                          default: true,
                      })
                      .setDisabled()
        )
        const row = new MessageActionRow().addComponents(
            new MessageButton({
                customId: 'draw',
                label: 'Comprar',
                style: options.length > 0 ? 'SECONDARY' : 'SUCCESS',
            })
        )
        const file = new MessageAttachment(canvas.toBuffer(), 'cards.png')
        const currentCard = new MessageAttachment(
            this.game.table.flipped.URL,
            'current.png'
        )

        this.send({
            embeds: [embed],
            components: [select, row],
            files: [file, currentCard],
        })
    }

    toString() {
        return this.user
    }
}
