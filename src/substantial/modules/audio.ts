import PulseAudio from 'pulseaudio2';
import { Module, Inputs, Outputs, GlobalState } from '../rack';

const DATA_SIZE = 4096;

export class Audio implements Module {
    private context = new PulseAudio();
    private player: PulseAudio.PlaybackStream;
    private data = new Float32Array(DATA_SIZE);
    private pos = 0;
    private needDrain = false;
    private t0 = Date.now();
    private outOfOnce = true;

    constructor(rate = 44100) {
        this.player = this.context.createPlaybackStream({
            channels: 1,
            format: 'F32LE',
            rate,
            latency: 20000, // can be a number > 0, microseconds
        });
        this.context.on('error', err => {
            console.log('Context error:', err);
        });
        this.player.on('error', err => {
            console.log('Player error:', err);
        });
        this.player.on('drain', () => {
            if (this.outOfOnce) {
                //console.log('DRAIN out of once');
                this.needDrain = false;
            }
        });
    }

    next(inp: Inputs, s: GlobalState): Outputs | Promise<Outputs> {
        this.data[this.pos] = inp.inp;
        this.pos++;
        if (this.pos >= DATA_SIZE) {
            this.t0 = Date.now();
            this.pos = 0;
            const buf = Buffer.from(Buffer.from(this.data.buffer));
            if (!this.needDrain) {
                //console.log('No need drain');
                this.needDrain = !this.player.write(buf);
            } else {
                //console.log('Need drain');
                return new Promise((resolve) => {
                    this.outOfOnce = false;
                    this.player.once('drain', () => {
                        this.outOfOnce = true;
                        //console.log('drain');
                        this.needDrain = !this.player.write(buf);
                        resolve({});
                    });
                });
            }
        }
        return {};
    }
}

