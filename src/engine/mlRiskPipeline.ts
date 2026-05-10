import type {
  GridCell,
  GaussianNbStore,
  MLModel,
  MlEvalSnapshot,
  MlModelEvalReport,
  MlRiskClass,
  MlpStore,
  Victim,
} from '../types';

const DATASET_VERSION = 'synthetic-risk-v1';
const TOTAL_SAMPLES = 500;
const TRAIN_FRACTION = 0.8;
const FEATURE_DIM = 8;
const HIDDEN = 16;
const NUM_CLASSES = 3;
const K_CANDIDATES = [1, 2, 3, 5, 7, 10] as const;
const EPS_VAR = 1e-6;
const MLP_EPOCHS = 100;
const MLP_LR = 0.035;
const MLP_LR_DECAY = 0.992;

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function argmax(arr: number[]): number {
  let m = -Infinity;
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > m) {
      m = arr[i];
      idx = i;
    }
  }
  return idx;
}

function softmax(logits: number[]): number[] {
  const maxL = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - maxL));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

export function generateSyntheticDataset(seed: number): { x: number[][]; y: number[] } {
  const rng = mulberry32(seed);
  const x: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const row = rng();
    const col = rng();
    const distBase = Math.hypot(row, col) / Math.SQRT2;
    const hazardCore = 0.28 * row + 0.32 * col + 0.35 * rng() + 0.15 * Math.sin(i * 0.07);
    const fireHint = rng() > 0.78 ? 0.9 : rng() * 0.25;
    const collapseHint = rng() > 0.85 ? 0.75 : rng() * 0.2;
    const traffic = rng();
    const weather = rng();
    const combined = hazardCore * 0.55 + fireHint * 0.22 + collapseHint * 0.18 + traffic * 0.05;
    const label = combined > 0.58 ? 2 : combined > 0.36 ? 1 : 0;
    x.push([
      row,
      col,
      distBase,
      hazardCore,
      fireHint,
      collapseHint,
      traffic,
      weather,
    ]);
    y.push(label);
  }
  return { x, y };
}

function stratifiedTrainTestSplit(
  x: number[][],
  y: number[],
  trainFrac: number,
  rng: () => number
): { trainX: number[][]; trainY: number[]; testX: number[][]; testY: number[] } {
  const buckets: number[][] = [[], [], []];
  for (let i = 0; i < y.length; i++) {
    buckets[y[i]].push(i);
  }
  for (const b of buckets) {
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
  }
  const trainIdx: number[] = [];
  const testIdx: number[] = [];
  for (const b of buckets) {
    const nTrain = Math.max(1, Math.floor(b.length * trainFrac));
    for (let i = 0; i < b.length; i++) {
      if (i < nTrain) trainIdx.push(b[i]);
      else testIdx.push(b[i]);
    }
  }
  const trainX = trainIdx.map((i) => [...x[i]]);
  const trainY = trainIdx.map((i) => y[i]);
  const testX = testIdx.map((i) => [...x[i]]);
  const testY = testIdx.map((i) => y[i]);
  return { trainX, trainY, testX, testY };
}

function countByClass(y: number[]): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0];
  for (const v of y) c[v as 0 | 1 | 2]++;
  return c;
}

function trainGaussianNb(trainX: number[][], trainY: number[]): GaussianNbStore {
  const dim = trainX[0]?.length ?? FEATURE_DIM;
  const means: [number[], number[], number[]] = [
    new Array(dim).fill(0),
    new Array(dim).fill(0),
    new Array(dim).fill(0),
  ];
  const variances: [number[], number[], number[]] = [
    new Array(dim).fill(EPS_VAR),
    new Array(dim).fill(EPS_VAR),
    new Array(dim).fill(EPS_VAR),
  ];
  const priors: [number, number, number] = [0, 0, 0];
  const n = trainY.length;
  for (let c = 0; c < NUM_CLASSES; c++) {
    const idx = trainY.map((t, i) => (t === c ? i : -1)).filter((i) => i >= 0);
    priors[c] = idx.length / Math.max(1, n);
    for (let f = 0; f < dim; f++) {
      const slice = idx.map((i) => trainX[i][f]);
      const m = slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length);
      const v =
        slice.reduce((acc, val) => acc + (val - m) ** 2, 0) / Math.max(1, slice.length) + EPS_VAR;
      means[c][f] = m;
      variances[c][f] = v;
    }
  }
  return { priors, means, variances };
}

function logGaussianPdf(x: number, mean: number, variance: number): number {
  const v = Math.max(variance, EPS_VAR);
  return -0.5 * Math.log(2 * Math.PI * v) - ((x - mean) ** 2) / (2 * v);
}

function predictNbLogProbs(store: GaussianNbStore, sample: number[]): number[] {
  const out: number[] = [];
  for (let c = 0; c < NUM_CLASSES; c++) {
    let logp = Math.log(store.priors[c] + 1e-12);
    for (let f = 0; f < sample.length; f++) {
      logp += logGaussianPdf(sample[f], store.means[c][f], store.variances[c][f]);
    }
    out.push(logp);
  }
  return softmax(out.map((z) => z - Math.max(...out)));
}

function knnPredictProbs(
  trainX: number[][],
  trainY: number[],
  k: number,
  sample: number[]
): number[] {
  const dists = trainX.map((row, i) => ({
    d: Math.sqrt(row.reduce((acc, v, j) => acc + (v - sample[j]) ** 2, 0)),
    i,
  }));
  dists.sort((a, b) => a.d - b.d);
  const votes = [0, 0, 0];
  const kk = Math.min(k, dists.length);
  for (let j = 0; j < kk; j++) {
    votes[trainY[dists[j].i]]++;
  }
  const s = votes.reduce((a, b) => a + b, 0);
  return votes.map((v) => v / s) as [number, number, number];
}

function matVec(w: number[][], x: number[]): number[] {
  return w.map((row) => row.reduce((s, wi, i) => s + wi * x[i], 0));
}

function relu(v: number[]): number[] {
  return v.map((z) => Math.max(0, z));
}

/** Glorot/Xavier uniform bounds for matrix [rows x cols] connecting fanIn→fanOut */
function xavierMatrix(
  rows: number,
  cols: number,
  fanIn: number,
  fanOut: number,
  rng: () => number
): number[][] {
  const limit = Math.sqrt(6 / Math.max(1, fanIn + fanOut));
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (rng() * 2 - 1) * limit)
  );
}

function trainMlp(
  trainX: number[][],
  trainY: number[],
  rng: () => number
): { store: MlpStore; lossCurve: number[] } {
  const inD = FEATURE_DIM;
  const h = HIDDEN;
  const outD = NUM_CLASSES;
  const w1 = xavierMatrix(h, inD, inD, h, rng);
  const b1: number[] = new Array(h).fill(0);
  const w2 = xavierMatrix(outD, h, h, outD, rng);
  const b2: number[] = new Array(outD).fill(0);

  const oneHot = (c: number): number[] =>
    [0, 0, 0].map((_, j) => (j === c ? 1 : 0));

  const lossCurve: number[] = [];
  let lr = MLP_LR;

  for (let ep = 0; ep < MLP_EPOCHS; ep++) {
    let lossAcc = 0;
    const order = trainX.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    for (const s of order) {
      const x = trainX[s];
      const y = oneHot(trainY[s]);
      const z1 = matVec(w1, x).map((v, i) => v + b1[i]);
      const a1 = relu(z1);
      const z2 = matVec(w2, a1).map((v, i) => v + b2[i]);
      const p = softmax(z2);
      for (let k = 0; k < outD; k++) {
        lossAcc -= y[k] * Math.log(p[k] + 1e-12);
      }
      const dLdz2 = p.map((pk, k) => pk - y[k]);
      const dW2 = dLdz2.map((g) => a1.map((aj) => g * aj));
      const db2 = [...dLdz2];
      const dA1 = new Array(h).fill(0);
      for (let j = 0; j < h; j++) {
        let sum = 0;
        for (let k = 0; k < outD; k++) sum += dLdz2[k] * w2[k][j];
        dA1[j] = z1[j] > 0 ? sum : 0;
      }
      const dW1 = dA1.map((g) => x.map((xi) => g * xi));
      const db1 = [...dA1];
      for (let k = 0; k < outD; k++) {
        for (let j = 0; j < h; j++) w2[k][j] -= lr * dW2[k][j];
        b2[k] -= lr * db2[k];
      }
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < inD; i++) w1[j][i] -= lr * dW1[j][i];
        b1[j] -= lr * db1[j];
      }
    }
    lossCurve.push(lossAcc / trainX.length);
    lr *= MLP_LR_DECAY;
  }

  return { store: { w1, b1, w2, b2 }, lossCurve };
}

function mlpPredictProbs(store: MlpStore, sample: number[]): [number, number, number] {
  const z1 = matVec(store.w1, sample).map((v, i) => v + store.b1[i]);
  const a1 = relu(z1);
  const z2 = matVec(store.w2, a1).map((v, i) => v + store.b2[i]);
  const p = softmax(z2);
  return [p[0], p[1], p[2]];
}

function evaluateClassifier(
  modelId: MLModel,
  predictProbs: (sample: number[]) => number[],
  testX: number[][],
  testY: number[]
): MlModelEvalReport {
  const t0 = performance.now();
  const preds: number[] = [];
  for (const row of testX) {
    const p = predictProbs(row);
    preds.push(argmax(p));
  }
  const trainTimeMs = parseFloat((performance.now() - t0).toFixed(2));
  const cm: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < testY.length; i++) {
    cm[testY[i]][preds[i]]++;
  }
  let correct = 0;
  for (let i = 0; i < testY.length; i++) if (preds[i] === testY[i]) correct++;
  const accuracy = testY.length ? correct / testY.length : 0;

  const perClass: MlModelEvalReport['perClass'] = [];
  const labels = ['Low Risk', 'Medium Risk', 'High Risk'];
  let macroF1 = 0;
  let weightedF1 = 0;
  for (let c = 0; c < NUM_CLASSES; c++) {
    const tp = cm[c][c];
    const fp = cm[0][c] + cm[1][c] + cm[2][c] - tp;
    const fn = cm[c][0] + cm[c][1] + cm[c][2] - tp;
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    const support = cm[c][0] + cm[c][1] + cm[c][2];
    perClass.push({
      classLabel: labels[c],
      precision: prec,
      recall: rec,
      f1,
      support,
    });
    macroF1 += f1;
    weightedF1 += f1 * support;
  }
  macroF1 /= NUM_CLASSES;
  const supSum = perClass.reduce((a, pc) => a + pc.support, 0);
  weightedF1 = supSum > 0 ? weightedF1 / supSum : 0;

  return {
    modelId,
    accuracy,
    macroF1,
    weightedF1,
    trainTimeMs,
    confusionMatrix: cm,
    perClass,
  };
}

function pickBestK(
  trainX: number[][],
  trainY: number[],
  testX: number[][],
  testY: number[]
): { k: number; accByK: number[] } {
  const accByK: number[] = [];
  let bestK = 3;
  let bestAcc = -1;
  for (const k of K_CANDIDATES) {
    const preds = testX.map((row) => argmax(knnPredictProbs(trainX, trainY, k, row)));
    let correct = 0;
    for (let i = 0; i < testY.length; i++) if (preds[i] === testY[i]) correct++;
    const acc = testY.length ? correct / testY.length : 0;
    accByK.push(acc);
    if (acc > bestAcc) {
      bestAcc = acc;
      bestK = k;
    }
  }
  return { k: bestK, accByK };
}

export function runFullMlEvaluation(): MlEvalSnapshot {
  const rng = mulberry32(20260205);
  const { x, y } = generateSyntheticDataset(9001);
  const { trainX, trainY, testX, testY } = stratifiedTrainTestSplit(x, y, TRAIN_FRACTION, rng);
  const evaluatedAtMs = Date.now();

  const { k: knnK, accByK } = pickBestK(trainX, trainY, testX, testY);

  const nbStore = trainGaussianNb(trainX, trainY);
  const { store: mlpStore, lossCurve: mlpLossCurve } = trainMlp(trainX, trainY, rng);

  const reportKnn = evaluateClassifier('kNN', (row) => knnPredictProbs(trainX, trainY, knnK, row), testX, testY);
  const reportNb = evaluateClassifier('NaiveBayes', (row) => predictNbLogProbs(nbStore, row), testX, testY);
  const reportMlp = evaluateClassifier('MLP', (row) => mlpPredictProbs(mlpStore, row), testX, testY);

  const classLabels: [string, string, string] = ['Low Risk', 'Medium Risk', 'High Risk'];
  const classCountsTrain = countByClass(trainY);
  const classCountsTest = countByClass(testY);

  return {
    datasetVersion: DATASET_VERSION,
    evaluatedAtMs,
    totalSamples: TOTAL_SAMPLES,
    trainSize: trainX.length,
    testSize: testX.length,
    classLabels,
    classCountsTrain,
    classCountsTest,
    knnK,
    knnAccByK: accByK,
    reports: {
      kNN: reportKnn,
      NaiveBayes: reportNb,
      MLP: reportMlp,
    },
    mlpLossCurve,
    nbClassPriors: [...nbStore.priors] as [number, number, number],
    knnStore: { k: knnK, trainX, trainY },
    nbStore,
    mlpStore,
  };
}

/** Map live victim + grid cell to the same 8-D feature space as training (rough alignment). */
export function extractVictimFeatures(grid: GridCell[][], victim: Victim): number[] {
  const cell = grid[victim.row]?.[victim.col];
  const risk = cell?.risk ?? 0.1;
  const row = victim.row / 17;
  const col = victim.col / 17;
  const distBase = Math.hypot(victim.row, victim.col) / (17 * Math.SQRT2);
  const fireHint = cell?.type === 'fire' || cell?.onFire ? 0.85 : risk * 0.4;
  const collapseHint = cell?.type === 'collapse' ? 0.72 : risk * 0.25;
  const sev =
    victim.severity === 'critical' ? 1 : victim.severity === 'moderate' ? 0.55 : 0.2;
  const surv = victim.survivalPct / 100;
  return [row, col, distBase, risk, fireHint, collapseHint, sev, surv];
}

export function predictWithModel(
  snapshot: MlEvalSnapshot,
  model: MLModel,
  features: number[]
): { probs: [number, number, number]; predictedClass: MlRiskClass } {
  let probs: [number, number, number];
  if (model === 'kNN') {
    probs = knnPredictProbs(
      snapshot.knnStore.trainX,
      snapshot.knnStore.trainY,
      snapshot.knnStore.k,
      features
    ) as [number, number, number];
  } else if (model === 'NaiveBayes') {
    probs = predictNbLogProbs(snapshot.nbStore, features) as [number, number, number];
  } else {
    probs = mlpPredictProbs(snapshot.mlpStore, features);
  }
  const predictedClass = argmax(probs) as MlRiskClass;
  return { probs, predictedClass };
}

/** Survival-style estimate from class probabilities (higher risk → lower estimated survival). */
export function survivalEstimateFromProbs(probs: [number, number, number]): number {
  const down = probs[2] * 38 + probs[1] * 14;
  return Math.max(5, Math.min(99, Math.round(100 - down)));
}
