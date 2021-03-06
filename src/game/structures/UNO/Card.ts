import type { ColorResolvable } from 'discord.js'

class Card {
    public wild: boolean
    public angle: number

    constructor(public deck: string, public id: string, public color?: string) {
        this.id = id
        this.wild = !this.color
        this.angle = Math.PI * Math.random()
    }

    static parseColor(color: string) {
        switch ((color || '').toLowerCase()) {
            case 'vermelho':
            case 'red':
            case 'r':
                color = 'R'
                break
            case 'amarelo':
            case 'yellow':
            case 'y':
                color = 'Y'
                break
            case 'verde':
            case 'green':
            case 'g':
                color = 'G'
                break
            case 'azul':
            case 'blue':
            case 'b':
                color = 'B'
                break
            default:
                color = ''
                break
        }
        return color
    }

    get colorName() {
        return {
            R: 'Vermelho',
            Y: 'Amarelo',
            G: 'Verde',
            B: 'Azul',
        }[this.color!]
    }

    get emoji() {
        return (
            {
                R: '🔴',
                Y: '🟡',
                G: '🟢',
                B: '🔵',
            }[this.color!] || '⚫'
        )
    }

    get colorCode() {
        return ({
            R: '#ff5555',
            Y: '#ffaa00',
            G: '#55aa55',
            B: '#5555ff',
        }[this.color!] || '#080808') as ColorResolvable
    }

    get URL() {
        return `src/decks/${this.deck}/${this.color || ''}${this.id}.png`
    }

    get value() {
        let val = 0
        switch (this.color) {
            case 'R':
                val += 100000
                break
            case 'Y':
                val += 10000
                break
            case 'G':
                val += 1000
                break
            case 'B':
                val += 100
                break
            default:
                val += 1000000
                break
        }
        switch (this.id) {
            case 'SKIP':
                val += 10
                break
            case 'REVERSE':
                val += 11
                break
            case '+2':
                val += 12
                break
            case 'WILD':
                val += 13
                break
            case 'WILD+4':
                val += 14
                break
            default:
                val += parseInt(this.id)
                break
        }
        return val
    }

    toString() {
        if (this.color) return this.colorName + ' ' + this.id
        else return this.id
    }
}

export { Card }
