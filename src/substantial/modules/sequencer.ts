import { Module, Inputs, Outputs, GlobalState } from '../rack';

type Accidental = 'sharp' | 'flat' | 'natural';

interface Note {
    note: number; // 0-11
    accidental?: Accidental;
    octave: number; // 0-...-4-...
    duration: number; // relative to whole: 1/4 for quarter, 1 for the whole
}

// a of 4 octave = 440 Hz
const SQRT_12_2 = Math.pow(2, 1/12);

function freqOfNote(n: Note): number {
    let k = n.note;
    if (n.accidental === 'sharp') {
        k++;
    } else if (n.accidental === 'flat') {
        k--;
    }
    k += 12 * (n.octave - 5) - 9;
    return 440 * Math.pow(SQRT_12_2, k);
}

interface Measure {
    notes: Note[];
}

interface Sequence {
    measures: Measure[];
}

const NOTE_RE = /^(\d)?([a-gA-G])(\+|-|=)?\/(1|2|4|8|16|32|64|128|256)(\.{0,1})$/;

const NOTE_TO_NUMBER: { [k: string]: number } = { a: 9, b: 11, c: 0, d: 2, e: 4, f: 5, g: 7 };

const ACCIDENTALS: { [k: string]: Accidental } = { '+': 'sharp', '-': 'flat', '=': 'natural' };

function parseNote(strNote: string): Note {
    // 5a#/4 - is the La dies of the 5th octave, quater of the whole note
    // '+' - sharp | '-' - flat | '=' - natural
    const m = strNote.match(NOTE_RE);
    if (!m) {
        throw new Error(`Invalid note expression: '${strNote}'`);
    }
    const [_all, oct, not, acc, dur, duralt] = m;
    const note: number = NOTE_TO_NUMBER[not.toLowerCase()];
    const octave = oct ? parseInt(oct) : 4;
    const accidental = ACCIDENTALS[acc];
    let duration = 1 / parseInt(dur);
    if (duralt) {
        duration * 1.5;
    }
    return {
        note,
        accidental,
        octave,
        duration
    };
}

function parseSequence(strSeq: string): Sequence {
    const measures = strSeq
        .split('|')
        .map(s => s.trim())
        .map(s => ({ notes: s.split(/\s+/).map(sn => parseNote(sn)) }))
    ;
    return { measures };
}

export class Sequencer implements Module {
    private bpm = 120;
    private gateFraction = 0.5; // 0..1

    private nMeasure = 0;
    private nNote = 0;
    private startedNoteTime = 0;
    private seq: Sequence;
    private freq;

    constructor(strSeq: string) {
        this.seq = parseSequence(strSeq);
        this.freq = freqOfNote(this.getNote());
    }

    next(_inp: Inputs, s: GlobalState): Outputs {
        // ouputs:
        // - gate
        // - freq
        const t = s.count * s.timeDelta;
        const dt = t - this.startedNoteTime;
        const dur = this.getNote().duration * 60 * 4 / this.bpm;
        if (dt < this.gateFraction * dur) {
            return {
                freq: this.freq,
                gate: 1
            };
        } else if (dt < dur) {
            return {
                freq: this.freq,
                gate: 0
            };
        } else {
            this.nextNote(t);
            return {
                freq: this.freq,
                gate: 1
            }
        }
    }

    private nextNote(time: number) {
        this.nNote++;
        if (this.getMeasure().notes.length <= this.nNote) {
            this.nMeasure++;
            this.nNote = 0;
            if (this.seq.measures.length <= this.nMeasure) {
                this.nMeasure = 0;
            }
        }
        this.freq = freqOfNote(this.getNote());
        this.startedNoteTime = time;
    }

    private getMeasure(): Measure {
        return this.seq.measures[this.nMeasure];
    }

    private getNote(): Note {
        return this.getMeasure().notes[this.nNote];
    }
}
