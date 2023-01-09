import { Module, Inputs, Outputs, GlobalState } from '../rack';
import { EdgeDetector, Edge, EdgeState } from '../edge-detector';

enum Phase {
    WAIT,
    DELAY,
    ATTACK,
    HOLD,
    DECAY,
    SUSTAIN,
    RELEASE
}

const DB_MIN = -100;

function dBToAmpl(dB: number): number {
    return Math.pow(10, dB/20 /* db/10 ??? */);
}

function amplToDb(ampl: number): number {
    return 20 * Math.log10(ampl);
}

export class Envelope implements Module {
    private phase = Phase.WAIT;
    private phaseStart = 0;
    private edgeDet = new EdgeDetector();
    private edge = Edge.None;

    next(ins: Inputs, gs: GlobalState) : Outputs {
        const { gate } = ins;
        this.edge = this.edgeDet.detect(gate);
        if (this.phase === Phase.WAIT) {
            return this.wait(ins, gs);
        } else if (this.phase === Phase.DELAY) {
            return this.delay(ins, gs);
        } else if (this.phase === Phase.ATTACK) {
            return this.attack(ins, gs);
        } else if (this.phase === Phase.HOLD) {
            return this.hold(ins, gs);
        } else if (this.phase === Phase.DECAY) {
            return this.decay(ins, gs);
        } else if (this.phase === Phase.SUSTAIN) {
            return this.sustain(ins, gs);
        } else if (this.phase === Phase.RELEASE) {
            return this.release(ins, gs);
        }
        return { out: 0 }; // never
    }

    wait(_ins: Inputs, gs: GlobalState): Outputs {
        if (this.edge === Edge.Rising) {
            const t = gs.count * gs.timeDelta;
            this.setPhase(Phase.DELAY, t);
        }
        return { out: 0 };
    }

    delay(ins: Inputs, gs: GlobalState): Outputs {
        const { delay } = ins;
        const t = gs.timeDelta * gs.count;
        const dt = t - this.phaseStart;
        if (this.edge === Edge.Falling) {
            this.setPhase(Phase.RELEASE, t);
        }
        if (dt >= delay) {
            this.setPhase(Phase.ATTACK, t);
        }
        return { out: 0 };
    }

    attack(ins: Inputs, gs: GlobalState): Outputs {
        const { attack } = ins;
        const t = gs.timeDelta * gs.count;
        const dt = t - this.phaseStart;
        if (this.edge === Edge.Falling) {
            this.setPhase(Phase.RELEASE, t);
        }
        if (dt >= attack) {
            this.setPhase(Phase.HOLD, t);
        }
        const dB = DB_MIN + dt * (0 - DB_MIN) / attack;
        const ampl = dBToAmpl(dB);
        return { out: (ampl > 1 ? 1 : ampl) };
    }

    hold(ins: Inputs, gs: GlobalState): Outputs {
        const { hold } = ins;
        const t = gs.timeDelta * gs.count;
        const dt = t - this.phaseStart;
        if (this.edge === Edge.Falling) {
            this.setPhase(Phase.RELEASE, t);
        }
        if (dt >= hold) {
            this.setPhase(Phase.DECAY, t);
        }
        return { out: 1 };
    }

    decay(ins: Inputs, gs: GlobalState): Outputs {
        const { decay, sustain } = ins;
        const t = gs.timeDelta * gs.count;
        const dt = t - this.phaseStart;
        if (this.edge === Edge.Falling) {
            this.setPhase(Phase.RELEASE, t);
        }
        if (dt >= decay) {
            this.setPhase(Phase.SUSTAIN, t);
        }
        const dB = dt / decay * sustain;
        const ampl = dBToAmpl(dB);
        if (dB == 0) {
            console.log('--');
        }
        return { out: ampl };
    }

    sustain(ins: Inputs, gs: GlobalState): Outputs {
        const { sustain } = ins;
        const t = gs.timeDelta * gs.count;
        if (this.edge === Edge.Falling) {
            this.setPhase(Phase.RELEASE, t);
        }
        return { out: dBToAmpl(sustain) };
    }

    release(ins: Inputs, gs: GlobalState): Outputs {
        const { sustain, release } = ins;
        const t = gs.timeDelta * gs.count;
        const dt = t - this.phaseStart;
        if (this.edge === Edge.Rising) {
            this.setPhase(Phase.DELAY, t);
        } else if (dt >= release) {
            this.setPhase(Phase.WAIT, t);
        }
        const dB = sustain + dt / release * (DB_MIN - sustain);
        const ampl = dBToAmpl(dB);
        return { out: ampl };
    }

    setPhase(phase: Phase, time: number): void {
        this.phase = phase;
        this.phaseStart = time;
        //console.log(Phase[phase]);
    }
}
