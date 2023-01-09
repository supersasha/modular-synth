import { Inputs, Outputs, GlobalState, Module } from '../rack';

export class SinOsc implements Module {
    prevFreq = 440;
    prevPhase = 0;

    next(inp: Inputs, s: GlobalState): Outputs {
        const { freq } = inp;
        const t = s.timeDelta * s.count;

        // 2*pi*(f1*t + phi1) = 2*pi*(f2*t + phi2);
        // f1*t + phi1 = f2*t + phi2
        // phi2 = (f1-f2)*t+phi1
        // phi2 = phi2 - [phi2]
        const phase0 = (this.prevFreq - freq) * t + this.prevPhase;
        const phase = phase0 - Math.floor(phase0);

        this.prevFreq = freq;
        this.prevPhase = phase;
        return {
            out: Math.sin(2 * Math.PI * (freq * t + phase))
        };
    }
}

export class SquareOsc implements Module {
    prevFreq = 0;
    prevPhase = 0;

    next(inp: Inputs, s: GlobalState): Outputs {
        const { freq } = inp;
        const t = s.timeDelta * s.count;
        const phase0 = (this.prevFreq - freq) * t + this.prevPhase;
        const phase = phase0 - Math.floor(phase0);
        this.prevFreq = freq;
        this.prevPhase = phase;

        let p = t * freq + phase;
        p = p - Math.floor(p);
        if (p < 0.5) {
            return { out: 1 };
        } else {
            return { out: -1 };
        }
    }
}

export class Step implements Module {
    next(inp: Inputs, s: GlobalState): Outputs {
        const t = s.count * s.timeDelta;
        return {
            out: t < inp.t0? inp.v0 : inp.v1
        };
    }
}

export class Amplifier implements Module {
    next(inp: Inputs, _s: GlobalState): Outputs {
        return {
            out: inp.q * inp.signal
        };
    }
}

export class OutputAccumulator {
    xs: number[] = [];
    ys: number[] = [];
    next(inp: Inputs, s: GlobalState): Outputs {
        this.xs.push(s.count * s.timeDelta);
        this.ys.push(inp.output);
        return {};
    }
    
    accumulated() {
        const { xs, ys } = this;
        return { xs, ys };
    }
}

