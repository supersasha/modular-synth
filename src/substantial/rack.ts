import { SinOsc, Amplifier } from './modules/modules';
import { SquareOsc } from './modules/square-osc';
import { Audio } from './modules/audio';
import { Oscilloscope } from './modules/oscilloscope';
import { SincFilter } from './modules/sinc-filter';
//import { Triggered } from './modules/triggered';
import { Envelope } from './modules/envelope';
import { Sequencer } from './modules/sequencer';
import { sleep } from './timer';

export interface ModularSpec {
    modules: ModuleDescriptor[];
}

export interface ModuleDescriptor {
    name: string;
    module: Module;
    inputs: {
        [name: string]: ShortInputDescriptor;
    };
    outputs: string[];
}

export type ShortInputDescriptor = number | string;

export interface InputsDescriptor {
    [name: string]: InputDescriptor;
}

interface ConstantInputDescriptor {
    constant: number;
}

interface ModuleOutputInputDescriptor {
    module: string;
    output: string;
}

export type InputDescriptor = ConstantInputDescriptor | ModuleOutputInputDescriptor;

export interface Module {
    next(inp: Inputs, state: GlobalState): Outputs | Promise<Outputs>;
    onRequest?(...args: any[]): any;
}

export interface Inputs {
    [name: string]: number;
}

export interface Outputs {
    [name: string]: number;
}

export interface GlobalState {
    timeDelta: number; // TODO: change to rate = 1/timeDelta
    count: number; // integer
}

export interface Modules {
    [moduleName: string]: {
        mod: Module;
        outputs: Outputs;
        inputsDesc: InputsDescriptor;
    };
}

function expandInputDescriptor(id: ShortInputDescriptor): InputDescriptor {
    if (typeof id === 'string') {
        const [module, output] = id.split(':');
        return { module, output };
    }
    return { constant: id };
}

class Rack {
    spec: ModularSpec;
    state: GlobalState;
    modules: Modules = {};
    isStopped = true;
    isPaused = false;
    stepsPerRun = 128;
    sleepMs = 5;

    constructor(spec: ModularSpec, rate = 44100) {
        this.spec = spec;
        this.state = {
            count: 0,
            timeDelta: 1/rate,
        };
        for (const m of this.spec.modules) {
            this.modules[m.name] = {
                mod: m.module,
                outputs: {},
                inputsDesc: Object.entries(m.inputs).reduce((acc, [k, v]) => {
                    acc[k] = expandInputDescriptor(v);
                    return acc;
                }, {} as InputsDescriptor),
            };
        }
    }

    getModule(name: string): Module {
        return this.modules[name].mod;
    }

    async go(steps: number): Promise<void> {
        for (let i = 0; i < steps; i++) {
            for (const name of Object.keys(this.modules)) {
                const mod = this.modules[name];
                const inputs: Inputs = {};
                for (const idname of Object.keys(mod.inputsDesc)) {
                    const id = mod.inputsDesc[idname];
                    try {
                        if (id.constant !== undefined) {
                            inputs[idname] = id.constant;
                        } else {
                            inputs[idname] = this.modules[id.module].outputs[id.output];
                        }
                    } catch (err) {
                        console.log(`Error in '${idname}', module ${id.module}, output: ${id.output}`);
                        throw err;
                    }
                }
                let res = mod.mod.next(inputs, this.state);
                if (res instanceof Promise) {
                    mod.outputs = await res;
                } else {
                    mod.outputs = res;
                }
            }
            this.state.count++;
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    // TODO: deprecated, remove
    // Instead introduce reset input for modules
    stop() {
        //this.isStopped = true;
    }

    async run() {
        if (!this.isStopped) {
            return;
        }
        this.isStopped = false;
        while (!this.isStopped) {
            if (!this.isPaused) {
                await this.go(this.stepsPerRun);
                await sleep(1);
            } else {
                await sleep(50);
            }
        }
        this.state.count = 0;
    }

    async ipcHandler(_event: Electron.IpcMainInvokeEvent, command: string, ...args: any[]) {
        if (command === 'start') {
            console.log('starting rack...');
            this.run();
            console.log('rack started');
        } else if (command === 'stop') {
            console.log('stopping rack...');
            this.stop();
            console.log('rack stopped');
        } else if (command === 'pause') {
            this.pause();
        } else if (command === 'resume') {
            this.resume();
        } else if (command === 'module') {
            const [name, ...args1] = args;
            const mod = this.getModule(name);
            if (mod.onRequest) {
                const res = await mod.onRequest(...args1);
                return res;
            }
        }
    }
}

const RATE = 44100;

/*
const spec: ModularSpec = {
    modules: [{
        name: 'osc1',
        module: new SinOsc(),
        inputs: {
            freq: 0.1,
        },
        outputs: ['out'],
    }, {
        name: 'amp1',
        module: new Amplifier(),
        inputs: {
            q: 5000,
            signal: 'osc1:out'
        },
        outputs: ['out']
    }, {
        name: 'osc2',
        module: new SinOsc(),
        inputs: {
            freq: 'amp1:out',
        },
        outputs: [ 'out' ],
    }, {
        name: 'flt1',
        module: new SincFilter(),
        inputs: {
            fc: 15000,
            val: 'osc2:out'
        },
        outputs: [ 'out' ],
    }, {
        name: 'oscope1',
        module: new Oscilloscope(),
        inputs: {
            val: 'flt1:out',
            winTime: 0.01,
            threshold: 0,
        },
        outputs: [],
    }, {
        name: 'trg1',
        module: new Triggered(),
        inputs: {
            val: 'flt1:out'
        },
        outputs: [ 'out' ],
    }, {
        name: 'oscope2',
        module: new Oscilloscope(),
        inputs: {
            val: 'trg1:out',
            winTime: 0.01,
            threshold: 0,
        },
        outputs: [],
    }, {
        name: 'audio1',
        module: new Audio(RATE),
        inputs: {
            inp: 'flt1:out'
        },
        outputs: []
    }]
};
*/

const rushE = `
    e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16 |
    e/16 e/16 e/16 e/16  e/16 f/16 e/16 d+/16  e/8 a/8 5c/4 |
    5d/16 5d/16 5d/16 5d/16  5d/16 5c/16 b/16 5d/16  5c/16 5c/16 5c/16 5c/16  5c/16 b/16 a/16 5c/16 |
    b/16 b/16 b/16 b/16  f+/8 b/8 g+/2 |
    e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16  e/16 e/16 e/16 e/16 |
    e/16 f/16 e/16 d+/16  e/8 a/16 5c/16  5e/8 5a/8 6c/4 |
    6d/16 6c/16 5b/16 6d/16  6c/16 5b/16 5a/16 6c/16  5b/16 5a/16 5g+/16 5b/16  5a/16 5e/16 5c/16 a/16 |
    5f/16 5e/16 5d/16 5c/16  b/16 a/16 g+/16 b/16  a/2
`;

const seq1 = `
    3e/4 3a/4 4c/4 3a/4 |
    3f/4 3a/4 3e/4 3a/4 |
    3d/4 3a/4 3c/4 3a/4 |
    2b/4 3g+/4 3a/2
`;

const spec: ModularSpec = {
    modules: [{
        name: 'seq1',
        module: new Sequencer(rushE),
        inputs: {},
        outputs: ['gate', 'freq'],
    }, {
        name: 'env1',
        module: new Envelope(),
        inputs: {
            gate: 'seq1:gate',
            delay: 0,
            attack: 0.03,
            hold: 0,
            decay: 0.1,
            sustain: -10,
            release: 0.9
        },
        outputs: [ 'out' ]
    }, {
        name: 'osc1',
        module: new SquareOsc(),
        inputs: {
            freq: 'seq1:freq',
        },
        outputs: [ 'out' ]
    }, {
        name: 'amp1',
        module: new Amplifier(),
        inputs: {
            signal: 'osc1:out',
            q: 'env1:out'
        },
        outputs: [ 'out' ],
    }, {
        name: 'flt1',
        module: new SincFilter(),
        inputs: {
            fc: 10000,
            val: 'amp1:out',
        },
        outputs: [ 'out' ]
    }, {
        name: 'amp2',
        module: new Amplifier(),
        inputs: {
            signal: 'amp1:out',
            q: 0.7
        },
        outputs: [ 'out' ],
    }, {
        name: 'oscope1',
        module: new Oscilloscope(),
        inputs: {
            val: 'amp2:out',
            winTime: 0.1,
            threshold: 0.0,
        },
        outputs: [],
    }, {
        name: 'audio',
        module: new Audio(RATE),
        inputs: {
            inp: 'amp2:out',
        },
        outputs: []
    }]
};

const spec1: ModularSpec = {
    modules: [{
        name: 'osc1',
        module: new SquareOsc(),
        inputs: {
            freq: 2000
        },
        outputs: ['out'],
    }, {
        name: 'amp1',
        module: new Amplifier(),
        inputs: {
            signal: 'osc1:out',
            q: 0.7
        },
        outputs: [ 'out' ],
    }, {
        name: 'oscope1',
        module: new Oscilloscope(),
        inputs: {
            val: 'amp1:out',
            winTime: 0.1,
            threshold: 0.0,
        },
        outputs: [],
    }, {
        name: 'audio',
        module: new Audio(RATE),
        inputs: {
            inp: 'amp1:out',
        },
        outputs: []
    }]
};

export const rack = new Rack(spec, RATE);

