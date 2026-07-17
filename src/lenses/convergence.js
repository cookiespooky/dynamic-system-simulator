export const convergenceLens = {
  id: 'convergence',
  title: 'Сходимость',
  description: 'Узлы сближают значения с соседями, сохраняя небольшой случайный дрейф.',
  nodeLabel: 'Узел',
  edgeLabel: 'Связь',
  parameters: [
    { id: 'p1', label: 'P₁' },
    { id: 'p2', label: 'P₂' },
    { id: 'p3', label: 'P₃' },
    { id: 'p4', label: 'P₄' }
  ],
  config: {
    lensId: 'convergence',
    seed: 42,
    nodeCount: 240,
    dimensions: 4,
    model: { type: 'convergence' },
    groups: [
      { count: 80, ranges: [[0.08,0.38],[0.55,0.92],[0.12,0.48],[0.25,0.72]] },
      { count: 80, ranges: [[0.35,0.72],[0.12,0.52],[0.55,0.94],[0.18,0.62]] },
      { count: 80, ranges: [[0.62,0.95],[0.38,0.82],[0.20,0.68],[0.52,0.96]] }
    ],
    rules: {
      convergence: 0.018,
      noise: 0.003,
      linkDistance: 0.24,
      linkChance: 0.16,
      rebuildEvery: 10
    },
    analysisEvery: 100
  },
  visual: {
    size: 0,
    opacity: 1,
    glow: 2,
    glowMode: 'value',
    position: { mode: 'initial' }
  },
  intervention: { defaultDimension: 0 }
};
