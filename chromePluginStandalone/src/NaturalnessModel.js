const Sequence = require('./Sequence.js').Sequence;
const NgramSuccessorModel = require('./NgramSuccessorModel.js').NgramSuccessorModel

const PROBA_OF_UNKNOWN = 0; //0.000001;
const DEPTH = 3;

class NaturalnessModel {
    constructor(depth, probaOfUnknown) {
        this.ngramMap = new Map();
        this.depth = depth || DEPTH;
        this.probaOfUnknown = probaOfUnknown || PROBA_OF_UNKNOWN;
    }

    crossEntropy(sequence) {
        checkSequenceType(sequence);
        if (sequence.eventList.length === 0) return this.probaOfUnknown;
        let probabilitySum = 0;
        for (let index = 0; index < sequence.eventList.length; index++) {
            let currentElement = sequence.eventList[index];
            let currentNgram = sequence.getNgram(index, this.depth);
            let modelProba = this.getProbability(currentNgram, currentElement);
            let proba;
            if (modelProba === 0) {
                proba = this.probaOfUnknown;
            } else {
                proba = modelProba * (1 - this.probaOfUnknown);
            }
            probabilitySum = probabilitySum + Math.log2(proba);
        }
        return -(probabilitySum / sequence.eventList.length);
    }

    learn(sequence) {
        checkSequenceType(sequence);
        for (let index = 0; index < sequence.eventList.length; index++) {
            let ngram = sequence.getNgram(index, this.depth);
            let ngramSuccessor = this.ngramMap.get(ngram.key);
            if (ngramSuccessor === undefined) {
                ngramSuccessor = new NgramSuccessorModel();
                this.ngramMap.set(ngram.key, ngramSuccessor);           
            }
            ngramSuccessor.learn(sequence.eventList[index]);
        }
    }

    getNgramSuccessorModel(ngram) {
        return this.ngramMap.get(ngram.key);
    }
}

function checkSequenceType(sequence) {
    if (!(sequence instanceof Sequence)) {
        throw 'sequence is not a Sequence';
    }
}

module.exports.NaturalnessModel = NaturalnessModel;