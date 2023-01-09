export enum Edge {
    Rising = 1,
    Falling = -1,
    None = 0
}

export enum EdgeState {
    High = 1,
    Low = -1,
    Undefined = 0
}

const PINS = 5;

export class EdgeDetector {
    private history: number[] = [0, 0, 0, 0, 0];
    private pos = 0;
    private state: EdgeState = EdgeState.Undefined;

    detect(val: number): Edge {
        if (this.pos >= PINS) {
            this.pos = 0;
        }
        const diff = val - this.history[this.pos];
        this.history[this.pos] = val;
        this.pos++;
        if (diff > 0.5 && this.state !== EdgeState.High) {
            this.state = EdgeState.High;
            return Edge.Rising;
        }
        if (diff < -0.5 && this.state !== EdgeState.Low) {
            this.state = EdgeState.Low;
            return Edge.Falling;
        }
        return Edge.None;
    }

    getState(): EdgeState {
        return this.state;
    }
}
