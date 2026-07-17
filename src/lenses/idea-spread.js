export const ideaSpreadLens = {
  id: 'idea-spread',
  title: 'Распространение идеи',
  description: 'Люди сближаются с близкими позициями, отталкиваются от слишком далёких и перестраивают сеть контактов.',
  nodeLabel: 'Человек',
  edgeLabel: 'Контакт',
  parameters: [
    { id: 'susceptibility', label: 'Восприимчивость' },
    { id: 'activity', label: 'Активность' },
    { id: 'trust', label: 'Доверие' },
    { id: 'conviction', label: 'Убеждённость' },
    { id: 'resistance', label: 'Сопротивление' },
    { id: 'influence', label: 'Влияние' }
  ],
  config: {
    lensId: 'idea-spread',
    seed: 137,
    nodeCount: 240,
    dimensions: 6,
    model: { type: 'ideaSpread' },
    groups: [
      { count: 80, ranges: [[0.35,0.75],[0.55,0.90],[0.45,0.85],[0.72,0.98],[0.35,0.75],[0.25,0.75]] },
      { count: 80, ranges: [[0.55,0.95],[0.25,0.65],[0.40,0.85],[0.35,0.65],[0.15,0.50],[0.15,0.55]] },
      { count: 80, ranges: [[0.25,0.70],[0.45,0.85],[0.30,0.75],[0.02,0.28],[0.55,0.95],[0.20,0.70]] }
    ],
    rules: {
      baseLinkChance: 0.045,
      sameGroupMultiplier: 2.2,
      crossGroupMultiplier: 0.45,
      rebuildEvery: 8,
      attractionThreshold: 0.25,
      repulsionThreshold: 0.62,
      mediumInfluence: 0.15,
      influenceRate: 0.085,
      repulsionRate: 0.65,
      noise: 0.0015,
      activityRecovery: 0.025,
      activityFatigue: 0.035,
      trustAdaptation: 0.012,
      influenceGrowth: 0.012,
      influenceDecay: 0.004,
      resistanceAdaptation: 0.003
    },
    analysisEvery: 50
  },
  visual: {
    size: 5,
    opacity: 1,
    glow: 3,
    glowMode: 'extremity',
    position: { mode: 'parameters', x: 3, y: 1, spreadX: 560, spreadY: 430, jitter: 0.16 }
  },
  intervention: { defaultDimension: 3 }
};
