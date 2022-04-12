import Canvas from 'canvas'
import { UNO } from 'game/UNO'
import { Card } from './Card'
// import { CanvasUtils } from '../../../utils/CanvasUtils'

export class Table {
    public discard: Card[] = []

    constructor(public game: UNO) {}

    get flipped() {
        return this.discard[this.discard.length - 1]
    }

    async render() {
        let canvas = Canvas.createCanvas(300, 300)
        let ctx = canvas.getContext('2d')
        let a = (Math.PI * 2) / this.game.queue.length
        let r = canvas.width / 2 - (canvas.width / 2) * 0.2
        let d = r * 2
        let imgw = 0.15 * canvas.width
        let imgr = imgw / 2

        // draw table with wood pattern
        // ctx.drawImage(CanvasUtils.polygon(await Canvas.loadImage('https://i.imgur.com/2YkeeWL.jpg'), canvas.width, 0), canvas.width / 10, canvas.height / 10, d, d)

        ctx.translate(canvas.width / 2, canvas.height / 2)

        // draw players and players' decks
        for (let [i] of this.game.queue.entries()) {
            let img = await Canvas.loadImage(
                this.game.queue[i].user.avatarURL({ format: 'png', size: 2048 })!
            )
            let x = r * Math.cos(a * i)
            let y = r * Math.sin(a * i)

            ctx.save()
            this.round(ctx, x - imgr - 3, y - imgr - 3, imgw + 6, imgw + 6, 13)
            ctx.fillStyle = i === 0 ? '#E67E22' : '#2ECC71'
            ctx.clip()
            ctx.fillRect(x - imgr - 3, y - imgr - 3, imgw + 6, imgw + 6)
            ctx.restore()

            ctx.save()
            this.round(ctx, x - imgr, y - imgr, imgw, imgw, 10)
            ctx.clip()
            ctx.drawImage(img, x - imgr, y - imgr, imgw, imgw)
            ctx.restore()

            let card = new Card(this.game.style, 'BACK')
            img = await Canvas.loadImage(card.URL)

            for (let cards = 0; cards < this.game.queue[i].hand.length; cards++) {
                ctx.save()
                let angle = Math.PI / this.game.queue[i].hand.length
                ctx.translate(x, y + imgr)
                ctx.rotate(-(Math.PI / 4))
                ctx.rotate(Math.PI + angle * cards)
                ctx.drawImage(img, 0, 0, 14, 22)
                ctx.restore()
            }
        }

        // draw discard deck
        for (let card of this.discard.slice(-10)) {
            let img = await Canvas.loadImage(card.URL)
            ctx.save()
            ctx.rotate(card.angle)
            ctx.drawImage(
                img,
                -img.width / 8,
                -img.height / 8,
                img.width / 4,
                img.height / 4
            )
            ctx.restore()
        }

        return canvas
    }

    round(
        ctx: Canvas.CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
    }
}
