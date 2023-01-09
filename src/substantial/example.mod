MODULE example

IMPORT SquareOsc, Amplifier FROM "./lib1"
IMPORT Oscilloscope, Audio, Audio2 FROM "../path/to/lib2"

INPUT rate DEFAULTS 44100
INPUT reset DEFAULTS 0

OUTPUT out

INSTANCE osc1 OF SquareOsc WITH
    freq = 2000
END

INSTANCE amp1 OF Amplifier WITH
    signal = osc1:out
    q      = 0.7
    EXPOSE OUTPUT out AS out
END

INSTANCE oscope1 OF Oscilloscope WITH
    val       = amp1:out
    winTime   = 0.1
    threshold = 0.0
END

INSTANCE audio OF Audio WITH
    inp = amp1:out
END

