import { Module, Inputs, Outputs, GlobalState } from '../rack';

const KERNEL_HALF_SIZE = 400;
const KERNEL_SIZE = 2 * KERNEL_HALF_SIZE + 1;

function sinc(t: number): number {
    if (t === 0) {
        return 1;
    }
    const a = Math.PI * t;
    return Math.sin(a) / a;
}

export class SincFilter implements Module {
    fc = 0;
    kernel: Float64Array;
    history: Float64Array;
    pos = 0;

    constructor() {
        this.kernel = new Float64Array(KERNEL_SIZE);
        this.kernel.fill(0);
        this.history = new Float64Array(KERNEL_SIZE);
        this.history.fill(0);
    }

    next(inp: Inputs, s: GlobalState): Outputs {
        const { fc, val } = inp;
        if (this.fc != fc) {
            this.updateKernel(fc, s.timeDelta);
        }
        this.history[this.pos] = val;
        this.pos++;
        if (this.pos >= KERNEL_SIZE) {
            this.pos = 0;
        }
        let out = 0;
        for (let i = 0; i < KERNEL_SIZE; i++) {
            let idx = this.pos - i;
            if (idx < 0) {
                idx += KERNEL_SIZE;
            }
            out += this.kernel[i] * this.history[idx];
        }
        return { out };
    }

    updateKernel(fc: number, dt: number) {
        this.fc = fc;
        const fc1 = 2 * fc * dt;
        const wf = [];

        // Blackmann-Nuttall window
        const k = 2*Math.PI/KERNEL_SIZE;
        for (let i = 0; i < KERNEL_SIZE; i++) {
            const x = 0.3635819 -
                        0.4891775 * Math.cos(k*i) +
                        0.1365995 * Math.cos(2*k*i) -
                        0.0106411 * Math.cos(3*k*i);
            wf.push(x);
        }

        for (let i = -KERNEL_HALF_SIZE; i <= KERNEL_HALF_SIZE; i++) {
            this.kernel[i + KERNEL_HALF_SIZE] = fc1 * sinc(fc1 * i) * wf[i + KERNEL_HALF_SIZE];
        }
    }
}

/*
export class SincFilter implements Module {
    fc = 0;
    kernel: number[] = [];
    history: number[];
    pos = 0;

    constructor() {
        this.history = new Array(KERNEL_SIZE);
        this.history.fill(0);
    }

    next(inp: Inputs, s: GlobalState): Outputs {
        const { fc, val } = inp;
        if (this.fc != fc) {
            this.updateKernel(fc, s.timeDelta);
        }
        this.history[this.pos] = val;
        this.pos++;
        if (this.pos >= KERNEL_SIZE) {
            this.pos = 0;
        }
        let out = 0;
        for (let i = 0; i < KERNEL_SIZE; i++) {
            let idx = this.pos - i;
            if (idx < 0) {
                idx += KERNEL_SIZE;
            }
            out += this.kernel[i] * this.history[idx];
        }
        return { out };
    }

    updateKernel(fc: number, dt: number) {
        this.fc = fc;
        const fc1 = 2 * fc * dt;
        for (let i = -KERNEL_HALF_SIZE; i <= KERNEL_HALF_SIZE; i++) {
            this.kernel.push(fc1 * sinc(fc1 * i));
        }
    }
}
*/
