import { Module, Inputs, Outputs } from '../rack';
import { EdgeDetector, EdgeState } from '../edge-detector';

export class Triggered implements Module {
    private edge = new EdgeDetector();

    next(ins: Inputs): Outputs {
        const { val } = ins;
        this.edge.detect(val);
        if (this.edge.getState() == EdgeState.High) {
            return { out: 1 };
        }
        return { out: -1 };
    }
}
