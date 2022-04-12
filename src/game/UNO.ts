import {
    MessageEmbed,
    MessageAttachment,
    MessageActionRow,
    MessageButton,
    MessageSelectMenu,
} from 'discord.js'
import type {
    ButtonInteraction,
    SelectMenuInteraction,
    User,
    MessagePayload,
    MessageOptions,
    MessageComponentInteraction,
    ColorResolvable,
} from 'discord.js'
import Canvas from 'canvas'
import fs from 'node:fs'

import { Card } from './structures/UNO/Card'
import { Table } from './structures/UNO/Table'
import { Game } from './structures/Game'
import { Player } from './structures/UNO/Player'
import type Bot from 'structures/Bot'
import path from 'node:path'

const s = (n: number) => (n === 1 ? '' : 's')

interface Rule {
    type: 'number' | 'boolean'
    name: string
    desc: string
    value: number | boolean
}

export class UNO extends Game {
    public deck: Card[] = []
    public table: Table
    public host: User
    public finished: Player[] = []
    public confirm = false
    public rules: { [key: string]: Rule }
    public skipStreak = 0
    public style: string = 'Default'

    constructor(public interaction: ButtonInteraction | SelectMenuInteraction) {
        super()

        this.host = interaction.user
        this.table = new Table(this)
        this.rules = {
            continueFirst: {
                type: 'boolean',
                name: 'Continuemos',
                desc: 'O jogo continua mesmo depois que o primeiro vencer, com os jogadores que restaram',
                value: true,
            },
            drawSkip: {
                type: 'boolean',
                name: 'Compra-Pula',
                desc: 'Quando comprar +2 ou +4 pula a vez de quem comprou',
                value: true,
            },
            initialCards: {
                type: 'number',
                name: 'Cartas iniciais',
                desc: 'Quantas cartas pegar de início.',
                value: 7,
            },
        }
    }

    isValid(card: Card) {
        return (
            !this.table.flipped.color ||
            card.wild ||
            card.id === this.table.flipped.id ||
            card.color === this.table.flipped.color
        )
    }

    setStyle(style: string) {
        if (this.started) return

        this.style = style
    }

    setRules(rules: string[]) {
        if (this.started) return

        for (let [name, rule] of Object.entries(this.rules).filter(
            ([_, r]) => r.type === 'boolean'
        )) {
            if (rules.includes(name)) rule.value = true
            else rule.value = false
        }
    }

    async next() {
        super.next()

        this.queue = this.queue.filter(p => !p.finished)
        this.player.sendHand(true)

        return this.player
    }

    send(content: string | MessagePayload | MessageOptions) {
        this.interaction.followUp(content)
    }

    addPlayer(interaction: MessageComponentInteraction, user: User) {
        if (this.players.has(user.id)) return null

        let player = new Player(interaction, user, this)
        this.players.set(user.id, player)
        this.queue.push(player)

        return player
    }

    removePlayer(player: Player) {
        if (!this.players.has(player.id)) return false

        this.players.sweep(p => p.id === player.id)
        this.queue.splice(
            this.queue.findIndex(p => p.id === player.id),
            1
        )

        return true
    }

    async dealAll(number: number, players = this.queue) {
        for (const [id, player] of players.entries()) {
            await this.deal(player, number)
        }
    }

    async deal(player: Player, number: number) {
        let cards: Card[] = []
        for (let i = 0; i < number; i++) {
            if (this.deck.length === 0) {
                if (this.table.discard.length === 1) break
                this.shuffleDeck()
            }
            let c = this.deck.pop()!
            cards.push(c)
            player.hand.push(c)
        }
        player.called = false
        if (cards.length > 0) {
            let len = cards.length * 56 + 64
            let canvas = Canvas.createCanvas(len, 180)
            let ctx = canvas.getContext('2d')

            for (let [i] of cards.entries()) {
                let card = cards[i]
                let image = await Canvas.loadImage(card.URL)

                ctx.drawImage(image, i * 56, 0, 120, 180)
            }

            const embed = UNO.baseEmbed.setDescription(
                `Você recebeu a${s(cards.length)} seguinte${s(cards.length)} carta${s(
                    cards.length
                )}:
                
                ${cards.map(c => `**${c}**`).join(' | ')}`
            )
            const file = new MessageAttachment(canvas.toBuffer(), 'cards.png')

            if (number > 2) embed.setImage('attachment://cards.png')
            else embed.setThumbnail('attachment://cards.png')

            player.send({
                embeds: [embed],
                files: [file],
            })
        }
    }

    generateDeck() {
        for (let color of ['R', 'Y', 'G', 'B']) {
            this.deck.push(new Card(this.style, '0', color))
            for (let i = 1; i < 10; i++)
                for (let j = 0; j < 2; j++)
                    this.deck.push(new Card(this.style, i.toString(), color))
            for (let i = 0; i < 2; i++)
                this.deck.push(new Card(this.style, 'SKIP', color))
            for (let i = 0; i < 2; i++)
                this.deck.push(new Card(this.style, 'REVERSE', color))
            for (let i = 0; i < 2; i++) this.deck.push(new Card(this.style, '+2', color))
        }
        for (let i = 0; i < 4; i++) {
            this.deck.push(new Card(this.style, 'WILD'))
            this.deck.push(new Card(this.style, 'WILD+4'))
        }

        this.shuffleDeck()
    }

    shuffleDeck() {
        let j,
            x,
            i,
            a = [...this.deck, ...this.table.discard]
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            x = a[i]
            a[i] = a[j]
            a[j] = x
        }
        this.deck = a
        for (const card of this.deck.filter(c => c.wild)) card.color = undefined
    }

    stopGame(bot: Bot, reason: string) {
        if (reason === 'skip_streak') {
            const embed = UNO.baseEmbed.setDescription(
                `Muitos jogadores foram pulados (${this.skipStreak} vezes), então o jogo foi cancelado\n\n` +
                    `Outra partida pode ser criada (de preferência com gente mais ativa) usando **/uno** novamente.`
            )

            this.send({
                embeds: [embed],
            })
        }

        if (reason === 'terminate') {
            const embed = UNO.baseEmbed.setDescription(`O jogo foi encerrado pelo criador.
            
            Você pode criar outro usando **/uno**`)

            this.send({
                embeds: [embed],
            })
        }

        this.started = false
        bot.games.delete(this.interaction.id)
    }

    async listenPlay(bot: Bot, user: User) {
        try {
            const filter = (i: MessageComponentInteraction) => i.user.id === user.id
            const played = await this.interaction.channel?.awaitMessageComponent({
                filter,
                time: 60_000,
            })

            bot.emit('unoUserPlay', this, played)
            this.skipStreak = 0
        } catch (_e) {
            if (!this.started) return

            this.player.send({
                content:
                    'Você levou muito tempo para jogar, você foi automaticamente pulado :/',
            })
            this.skipStreak++

            if (this.skipStreak > 4) {
                return this.stopGame(bot, 'skip_streak')
            }

            await this.next()

            const { embed, file } = this.getSkippedMessage(user)

            this.send({
                embeds: [embed],
                files: [file],
            })

            this.listenPlay(bot, user)
        }
    }

    updateInitialReply() {
        const { embed, row } = this.initialMessage

        embed.fields[0].value = this.players.map(p => `${p.user}`).join('\n') || '\u200b'

        this.interaction.editReply({
            embeds: [embed],
            components: [row],
        })
    }

    static get baseEmbed() {
        return new MessageEmbed()
            .setAuthor({ name: 'UNO', iconURL: 'https://i.imgur.com/Zzs9X74.png' })
            .setColor('#E67E22')
    }

    static get commandMessage() {
        const embed = UNO.baseEmbed.setDescription(
            `Jogue UNO com seus amigos pelo Discord\n\n` +
                `Clique Novo jogo abaixo para criar uma partida`
        )
        const row = new MessageActionRow().addComponents(
            new MessageButton({
                customId: 'new_game',
                label: 'Novo jogo',
                style: 'PRIMARY',
            })
        )

        return { embed, row }
    }

    get configureMessage() {
        const rules = this.getRules()

        const embed = UNO.baseEmbed.setDescription(
            `Aqui você pode configurar a partida\n\n` +
                `Escolhe as regras e o estilo do baralho.`
        )
        const ruleSelect = new MessageActionRow().addComponents(
            new MessageSelectMenu({
                customId: 'rules',
                maxValues: rules.length,
            }).addOptions(rules)
        )
        const styleSelect = new MessageActionRow().addComponents(
            new MessageSelectMenu({ customId: 'style' }).addOptions(this.getStyles())
        )

        return { embed, rows: [ruleSelect, styleSelect] }
    }

    getPlayedMessage(user: User, extra: string) {
        const userPlayer = this.players.get(user.id)!

        const embed = UNO.baseEmbed
            .setDescription(
                `${user} jogou **${this.table.flipped}**\n` +
                    `e agora tem **${userPlayer.hand.length}** carta${s(
                        userPlayer.hand.length
                    )}.\n` +
                    `${extra}\n\n` +
                    `É a vez de ${this.player.user}!`
            )
            .setThumbnail('attachment://card.png')
            .setColor(this.table.flipped.colorCode)
        const file = new MessageAttachment(this.table.flipped.URL, 'card.png')

        return { embed, file }
    }

    getSkippedMessage(user: User) {
        const embed = UNO.baseEmbed
            .setDescription(
                `${user} foi pulado porque demorou demais para jogar\n\n` +
                    `**${this.table.flipped}** foi jogada por último.\n\n` +
                    `É o turno de ${this.player.user}!`
            )
            .setThumbnail('attachment://card.png')
            .setColor(this.table.flipped.colorCode)
        const file = new MessageAttachment(this.table.flipped.URL, 'card.png')

        return { embed, file }
    }

    getDrewCardMessage(user: User) {
        const userPlayer = this.players.get(user.id)!

        const embed = UNO.baseEmbed
            .setDescription(
                `${user} comprou uma carta\n` +
                    `e agora tem **${userPlayer.hand.length}** carta${s(
                        userPlayer.hand.length
                    )}.\n\n` +
                    `**${this.table.flipped}** foi jogada por último.\n\n` +
                    `É o turno de ${this.player.user}!`
            )
            .setThumbnail('attachment://card.png')
            .setColor(this.table.flipped.colorCode)
        const file = new MessageAttachment(this.table.flipped.URL, 'card.png')

        return { embed, file }
    }

    get gameStartedMessage() {
        let extra = ''

        if (['WILD', 'WILD+4'].includes(this.table.flipped.id))
            extra += '\n\nVocê pode jogar qualquer carta.'

        const embed = UNO.baseEmbed
            .setDescription(
                `O jogo começou com ${this.queue.length} jogadores!\n` +
                    `A carta na mesa é **${this.table.flipped}**.\n\n` +
                    `É o turno de ${this.player.user}!${extra}`
            )
            .setThumbnail('attachment://card.png')
            .setColor(this.table.flipped.colorCode as ColorResolvable)
        // const row
        const file = new MessageAttachment(this.table.flipped.URL, 'card.png')

        return { embeds: [embed], files: [file] }
    }

    get initialMessage() {
        const embed = UNO.baseEmbed
            .setDescription(
                `${this.host} criou um novo jogo!\n\n` +
                    `Se você não sabe jogar, clique \`Como jogar\` abaixo.`
            )
            .addField(
                'Jogadores (mínimo 2)',
                this.players.map(p => `${p.user}`).join('\n') || '\u200b',
                true
            )
            .setFooter({ text: 'Clique Entrar abaixo para entrar' })
        const row = new MessageActionRow().addComponents(
            new MessageButton({
                customId: 'join_game',
                label: 'Entrar',
                style: 'PRIMARY',
            }),
            new MessageButton({
                customId: 'how_to_play',
                label: 'Como jogar',
                style: 'SECONDARY',
            }),
            new MessageButton({
                customId: 'start_game',
                label: 'Iniciar',
                style: 'SUCCESS',
                disabled: this.players.size < 2,
            }),
            new MessageButton({
                customId: 'configure',
                label: 'Configurar',
                style: 'PRIMARY',
            }),
            new MessageButton({
                customId: 'cancel_game',
                label: 'Cancelar',
                style: 'DANGER',
            })
        )

        return {
            embed,
            row,
        }
    }

    get instructions() {
        const text = fs.readFileSync(path.join(__dirname, 'instructions.txt'), {
            encoding: 'utf-8',
        })
        const embed = UNO.baseEmbed.setDescription(text)

        return { embed }
    }

    get wildRow() {
        return new MessageActionRow().addComponents(
            new MessageButton({
                customId: 'red',
                label: 'Vermelho',
                style: 'SECONDARY',
                emoji: '🔴',
            }),
            new MessageButton({
                customId: 'yellow',
                label: 'Amarelo',
                style: 'SECONDARY',
                emoji: '🟡',
            }),
            new MessageButton({
                customId: 'green',
                label: 'Verde',
                style: 'SECONDARY',
                emoji: '🟢',
            }),
            new MessageButton({
                customId: 'blue',
                label: 'Azul',
                style: 'SECONDARY',
                emoji: '🔵',
            })
        )
    }

    getRules() {
        return Object.entries(this.rules)
            .filter(([_n, r]) => r.type === 'boolean')
            .map(([name, rule]) => {
                return {
                    value: name,
                    label: rule.name,
                    description: rule.desc,
                    default: rule.value as boolean,
                }
            })
    }

    getStyles() {
        const folders = fs.readdirSync(path.join(__dirname, '..', 'decks'))

        return folders.map(f => {
            let deckPath = path.join(__dirname, '..', 'decks', f, 'deck.json')
            let deckInfo = require(deckPath)

            return {
                value: f,
                label: deckInfo.name,
                description: deckInfo.description,
                default: this.style === f,
            }
        })
    }
}
