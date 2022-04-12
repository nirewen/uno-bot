type EventRunner = (...args: any) => void

class Event {
    public ran = 0

    constructor(public name: string, public run: EventRunner) {}
}

export default Event
