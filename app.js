/* ═══════════════════════════════════════════════════════
   app.js — Flosswork Aligner Classifier
   ALIGNER SYSTEM V7.7 — Evidence-Calibrated Engine
   ─────────────────────────────────────────────────────
   HOW TO EDIT:
   • Clinic name, phone, tagline  →  CONFIG.clinic
   • Pricing                      →  CONFIG.pricing
   • Severity descriptions        →  CONFIG.severityDescriptions
   • Plan features / metadata     →  CONFIG.planMeta
   • Engine constants             →  CONSTANTS (below CONFIG)
════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   CONFIG  ← all user-editable content lives here
════════════════════════════════════════════════════════ */
const CONFIG = {

  // ── Supabase credentials ──────────────────────────────
  supabase: {
    url:    'https://cmujaicgmxcnmhcdztgy.supabase.co',
    anonKey:'sb_publishable_1pulatc1YX5B2gGjjk72Kw_8je1zmr9'
  },

  // ── Clinic branding ──────────────────────────────────
  clinic: {
    name:       'Flosswork Dental Clinic',
    tagline:    'Clearly Better.',
    phone:      '+91-8354088822',
    logoFile:   'logo.png',
    storageKey: 'aligneriq_v77'
  },

  // ── Severity card short descriptions ─────────────────
  severityDescriptions: {
    mild:     'Straightforward · Good predictability',
    moderate: 'Standard complexity · 1–2 refinements',
    severe:   'Advanced case · Multiple stages',
    advanced: 'High complexity · Staged treatment'
  },

  // ── Score banner label ────────────────────────────────
  scoreBannerLabel: '0–25 Mild · 26–50 Moderate · 51–75 Complex · 76–100 Advanced',

  // ── Pricing matrix (per severity) ────────────────────
  pricing: {
    mild: {
      budget: { label:'Budget',     price:'From ₹50,000' },
      ace:    { label:'Ace',        price:'From ₹60,000' },
      luxe:   { label:'Luxe',       price:'From ₹90,000' },
      invis:  { label:'Invisalign', price:'₹1,08,000 / ₹1,20,000 / ₹1,50,000', plan:'Gold standard' }
    },
    moderate: {
      budget: { label:'Budget',     price:'₹80,000 – ₹1,20,000' },
      ace:    { label:'Ace',        price:'₹1,00,000 – ₹1,80,000' },
      luxe:   { label:'Luxe',       price:'₹1,50,000 – ₹2,80,000' },
      invis:  { label:'Invisalign', price:'₹2,00,000 – ₹3,50,000', plan:'Gold standard' }
    },
    severe: {
      budget: { label:'Budget',     price:'₹1,00,000 – ₹1,50,000' },
      ace:    { label:'Ace',        price:'₹1,50,000 – ₹2,20,000' },
      luxe:   { label:'Luxe',       price:'₹2,00,000 – ₹3,50,000+' },
      invis:  { label:'Invisalign', price:'₹3,00,000 – ₹5,00,000+', plan:'Gold standard' }
    },
    advanced: {
      budget: { label:'Budget',     price:'₹1,20,000 – ₹1,80,000' },
      ace:    { label:'Ace',        price:'₹1,80,000 – ₹2,50,000' },
      luxe:   { label:'Luxe',       price:'₹2,50,000 – ₹4,00,000+' },
      invis:  { label:'Invisalign', price:'₹4,00,000 – ₹6,00,000+', plan:'Gold standard' }
    }
  },

  // ── Plan card metadata ────────────────────────────────
  planMeta: {
    budget: { tier:'Plan 01',     pill:'Basic',         features:['Best for minor corrections & tight budgets','Suitable for simple alignment','Affordable treatment'] },
    ace:    { tier:'Plan 02',     pill:'Most Popular',  features:['Most popular choice for balanced results','Better precision results','Balanced value'] },
    luxe:   { tier:'Plan 03',     pill:'Premium',       features:['Best for complete smile transformation','Handles complex cases','Unlimited aligners'] },
    invis:  { tier:'Invisalign®', pill:'Gold standard', features:['Premium global system with highest precision','High accuracy & comfort','Most advanced'] }
  }
};

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE CONSTANTS
   Central repository — no magic numbers in logic below
════════════════════════════════════════════════════════ */
const CONSTANTS = {

  // Normalization divisor: converts 1–3 scale → 0, 0.5, 1.0
  NORMALIZATION_DIVISOR: 2,

  // Movement difficulty coefficients (biomechanical cost per unit)
  MOVEMENTS: {
    TIPPING:           1,
    TRANSLATION:       2,
    AP_CORRECTION:     2.5,
    EXPANSION:         4,
    TORQUE_ROOT_CTRL:  5,
    ROTATION_MODERATE: 4,
    ROTATION_SEVERE:   7,
    INTRUSION:         7,
    EXTRUSION:         8,
    SURGICAL_ERUPTION: 9
  },

  // MDS normalization and category thresholds
  MDS: {
    NORMALIZATION_FACTOR: 60,
    MAX: 100,
    CATEGORIES: { MILD: 25, MODERATE: 50, COMPLEX: 75 }
  },

  // Crowding density escalation additions
  CROWDING_ESCALATION: {
    LEVEL_1_MDS: 2,
    LEVEL_2: { MDS: 5,  RLS: 3 },
    LEVEL_3: { MDS: 10, RLS: 6, BDS: 4 }
  },

  // Interaction penalty additions
  INTERACTION: {
    CROWDING_ROTATION:       4,
    OPENBITE_CROSSBITE_RLS:  6,
    DEEPBITE_RETROCLINATION: 5,
    ROOTCONTROL_CROWDING:    5,
    POOR_COMPLIANCE_COMPLEX: 6,
    MULTIPLE_SEVERE_DOMAINS: 12
  },

  // Biological Stability Score penalties (subtracted from 100)
  BSS: {
    BASE: 100,
    PENALTIES: {
      SEVERE_ROTATION:    10,
      SEVERE_DEEPBITE:    10,
      SEVERE_OPENBITE:    30,
      SEVERE_CROSSBITE:   20,
      ROOT_CTRL_SEVERE:   20,
      POOR_COMPLIANCE:    25
    }
  },

  // Refinement Likelihood Score additions
  RLS: {
    ROTATION_MODERATE: 15,
    ROTATION_SEVERE:   35,
    DEEPBITE:          25,
    OPENBITE:          40,
    CROSSBITE:         22,
    ROOT_CTRL:         30,
    POOR_COMPLIANCE:   30
  },

  // Tracking Sensitivity Index multipliers
  TSI: {
    OPEN_BITE:   12,
    ROTATION:    10,
    ROOT_CTRL:   10,
    CROSSBITE:   8,
    COMPLIANCE:  10
  },

  // Aligner count estimation
  ALIGNERS: {
    BASE_RANGES: {
      SIMPLE:      { min: 10, max: 18 },
      ROTATION:    { min: 20, max: 32 },
      DEEP_BITE:   { min: 24, max: 40 },
      OPEN_BITE:   { min: 30, max: 50 },
      MIXED_SEVERE:{ min: 40, max: 70 }
    },
    MDS_MULTIPLIER: 0.18,
    RLS_MULTIPLIER: 0.12
  },

  // Retention score thresholds
  RETENTION: {
    LEVEL_1: 25,
    LEVEL_2: 55
  }
};

/* ═══════════════════════════════════════════════════════
   DEBUG MODE — set true to see engine logs in console
════════════════════════════════════════════════════════ */
const DEBUG_MODE = false;
function debugLog(label, value) {
  if (DEBUG_MODE) console.log(`[V7.7] ${label}:`, value);
}

/* ═══════════════════════════════════════════════════════
   STATE — runtime data, never edit directly
════════════════════════════════════════════════════════ */
const S = {
  // V7.7 clinical parameters (null = not yet selected)
  upperCrowding:       null,
  lowerCrowding:       null,
  upperSpacing:        null,
  lowerSpacing:        null,
  rotationSeverity:    null,
  incisorPosition:     null,
  molarRelationship:   null,
  deepBite:            null,
  openBite:            null,
  crossbite:           null,
  midlineDeviation:    null,
  eruptionComplexity:  null,
  complianceExpectation: null,

  severity:          null,
  severityPlus:      false,
  plans:             [],
  logoDataURL:       null,
  lastResult:        null,
  caseSaved:         false,
  caseId:            null,    // Supabase row id after save
  conversionStatus:  'fresh',  // default status for every new case
  provider:          '',       // 'toothsi' | 'flosswork' | 'off-site' | ''
  internalNote:      '',       // clinician notes (not shared in summary)
  lastSyncedAt:      null      // timestamp of last successful sync
};

const CONVERSION_STATUSES = [
  { value: 'fresh',          label: 'Fresh',          color: '#0891b2' },
  { value: 'in-pipeline',    label: 'In-pipeline',    color: '#6366f1' },
  { value: 'needs-time',     label: 'Needs time',     color: '#9333ea' },
  { value: 'budget-issue',   label: 'Budget issue',   color: '#d97706' },
  { value: 'not-responding', label: 'Not responding', color: '#dc2626' },
  { value: 'declined',       label: 'Declined',       color: '#6b7280' },
  { value: 'converted',      label: 'Converted',      color: '#22a25a' },
];

// Auxiliary user selection state
let selectedAux = [];

// Ordered param list — drives progress dots and completion check
const PARAMS = [
  'upperCrowding','lowerCrowding','upperSpacing','lowerSpacing',
  'rotationSeverity','incisorPosition','molarRelationship',
  'deepBite','openBite','crossbite',
  'midlineDeviation','eruptionComplexity','complianceExpectation'
];

/* ═══════════════════════════════════════════════════════
   DOM REFERENCES — cached once on load
════════════════════════════════════════════════════════ */
const DOM = {
  scoreDisplay:   document.getElementById('score-display'),
  categoryBadge:  document.getElementById('category-badge'),
  ctaChip:        document.getElementById('cta-chip'),

  severityResult: document.getElementById('severity-result'),
  sevTag:         document.getElementById('sev-tag'),
  sevTitle:       document.getElementById('sev-title'),
  sevDesc:        document.getElementById('sev-desc'),
  // sevScoreNum removed — score bubble removed from severity card

  progressLabel:  document.getElementById('progress-label'),
  progDots:       PARAMS.map((_, i) => document.getElementById(`pd${i}`)),

  txBudgetLabel:  document.getElementById('tx-budget-plan'),
  txAceLabel:     document.getElementById('tx-ace-plan'),
  txLuxeLabel:    document.getElementById('tx-luxe-plan'),
  txInvisLabel:   document.getElementById('tx-invis-plan'),

  // treatmentInfo replaced by patient-output / clinician-output divs

  summaryModal:   document.getElementById('summary-modal'),
  scClinicName:   document.getElementById('sc-clinic-name'),
  scClinicTag:    document.getElementById('sc-clinic-tag'),
  scDate:         document.getElementById('sc-date'),
  scLogoPh:       document.getElementById('sc-logo-ph'),
  scLogoImg:      document.getElementById('sc-logo-img'),
  scPatientName:  document.getElementById('sc-patient-name'),
  scPatientMeta:  document.getElementById('sc-patient-meta'),
  scSevPill:      document.getElementById('sc-sev-pill'),
  scSeverityCard: document.getElementById('sc-severity-card'),
  scSevTag:       document.getElementById('sc-sev-tag'),
  scSevTitle:     document.getElementById('sc-sev-title'),
  scSevDesc:      document.getElementById('sc-sev-desc'),
  scTxGrid:       document.getElementById('sc-tx-grid'),
  btnShare:       document.getElementById('btn-share')
};

/* ═══════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Normalize a 1–3 level to 0 / 0.5 / 1.0 */
function normalizeSeverity(level) {
  return (level - 1) / CONSTANTS.NORMALIZATION_DIVISOR;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToNearestEven(num) {
  return Math.round(num / 2) * 2;
}

/** Map initial aligner count to UI severity string */
function alignersToSeverity(initial) {
  if (initial <= 25) return 'mild';
  if (initial <= 45) return 'moderate';
  return 'severe';
}

/** Returns display label with optional "+" when totalMax crosses the next tier */
function severityLabel(cat, plus) {
  return cap(cat) + (plus ? '+' : '');
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 1a: CROWDING / SPACING RESOLVER
   ─────────────────────────────────────────────────────
   PURPOSE:
   Prevent simultaneous crowding and spacing in the
   same arch.

   RULE:
   If both values are > 1, retain only the more severe
   discrepancy.

   LEVELS:
   1 = mild / negligible
   2 = moderate
   3 = severe
════════════════════════════════════════════════════════ */
function resolveCrowdingSpacing(crowding, spacing) {

  // No conflict — at least one value is negligible
  if (crowding <= 1 || spacing <= 1) {
    return { crowding, spacing };
  }

  // Crowding dominates
  if (crowding > spacing) {
    return { crowding, spacing: 1 };
  }

  // Spacing dominates
  if (spacing > crowding) {
    return { crowding: 1, spacing };
  }

  // Equal severity conflict:
  // Prioritize crowding — aligner biomechanics behave
  // more complexly with crowding than spacing.
  return { crowding, spacing: 1 };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 1b: FULL CROWDING/SPACING VALIDATION
   Runs resolveCrowdingSpacing independently per arch
════════════════════════════════════════════════════════ */
function validateCrowdingSpacing(inputs) {

  const upper = resolveCrowdingSpacing(inputs.upperCrowding, inputs.upperSpacing);
  const lower = resolveCrowdingSpacing(inputs.lowerCrowding, inputs.lowerSpacing);

  return {
    upperCrowding: upper.crowding,
    upperSpacing:  upper.spacing,
    lowerCrowding: lower.crowding,
    lowerSpacing:  lower.spacing
  };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 1: FULL INPUT VALIDATION
   Calls arch validator, bite conflict resolver,
   and severe domain counter in sequence
════════════════════════════════════════════════════════ */
function validateInputs(data) {
  const d = { ...data };

  // ── Rule 1: Crowding / spacing arch conflict ──────────
  // Delegates to the modular validateCrowdingSpacing()
  // which calls validateArchDiscrepancy() per arch
  const archResult = validateCrowdingSpacing(d);
  d.upperCrowding = archResult.upperCrowding;
  d.upperSpacing  = archResult.upperSpacing;
  d.lowerCrowding = archResult.lowerCrowding;
  d.lowerSpacing  = archResult.lowerSpacing;

  // ── Rule 2: Deep bite / open bite conflict ────────────
  // Both cannot be clinically significant simultaneously.
  // Retain the more severe; reduce the other by one level.
  if (d.deepBite >= 2 && d.openBite >= 2) {
    d.deepBite >= d.openBite
      ? (d.openBite -= 1)
      : (d.deepBite -= 1);
  }

  // ── Rule 3: Severe domain count ───────────────────────
  // Count only the 13 clinical params (not computed fields).
  // Used by ceiling compression and interaction penalties.
  const CLINICAL_KEYS = [
    'upperCrowding','lowerCrowding','upperSpacing','lowerSpacing',
    'rotationSeverity','incisorPosition','molarRelationship',
    'deepBite','openBite','crossbite',
    'midlineDeviation','eruptionComplexity','complianceExpectation'
  ];
  d.severeDomainCount = CLINICAL_KEYS.filter(k => d[k] === 3).length;

  debugLog('Validated Inputs', d);
  return d;
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 2: CEILING COMPRESSION
   Applied ONLY to escalation additions, not base movement
════════════════════════════════════════════════════════ */
function applyCeilingCompression(value, severeDomainCount) {
  return severeDomainCount >= 3 ? value * 0.6 : value;
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 3: MOVEMENT BURDEN (MDS base)
   Weighted sum of normalized severity × movement coefficient
════════════════════════════════════════════════════════ */
function calculateMovementBurden(d) {
  const M = CONSTANTS.MOVEMENTS;
  let score = 0;

  // Crowding (translation cost per arch)
  score += normalizeSeverity(d.upperCrowding) * M.TRANSLATION;
  score += normalizeSeverity(d.lowerCrowding) * M.TRANSLATION;

  // Spacing (expansion cost per arch)
  score += normalizeSeverity(d.upperSpacing)  * M.EXPANSION;
  score += normalizeSeverity(d.lowerSpacing)  * M.EXPANSION;

  // Rotation — step function (moderate vs severe coefficient)
  if (d.rotationSeverity === 2) score += M.ROTATION_MODERATE;
  if (d.rotationSeverity === 3) score += M.ROTATION_SEVERE;

  // Incisor/root control torque
  if (d.incisorPosition >= 2) {
    score += normalizeSeverity(d.incisorPosition) * M.TORQUE_ROOT_CTRL;
  }

  // Molar / AP correction
  score += normalizeSeverity(d.molarRelationship) * M.AP_CORRECTION;

  // Deep bite — intrusion mechanics
  if (d.deepBite >= 2) {
    score += normalizeSeverity(d.deepBite) * M.INTRUSION;
  }

  // Open bite — extrusion mechanics
  if (d.openBite >= 2) {
    score += normalizeSeverity(d.openBite) * M.EXTRUSION;
  }

  // Crossbite — expansion mechanics
  if (d.crossbite >= 2) {
    score += normalizeSeverity(d.crossbite) * M.EXPANSION;
  }

  // Eruption — surgical level
  if (d.eruptionComplexity === 3) score += M.SURGICAL_ERUPTION;

  debugLog('Movement Burden (raw)', score);
  return score;
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 4: CROWDING DENSITY ESCALATION
   Bilateral crowding compounds difficulty non-linearly
════════════════════════════════════════════════════════ */
function calculateCrowdingEscalation(d) {
  const CE = CONSTANTS.CROWDING_ESCALATION;
  let mds = 0, rls = 0, bds = 0;
  const upper = d.upperCrowding, lower = d.lowerCrowding;

  // Levels are EXCLUSIVE — only the highest tier that applies fires.
  // Level 3 → both arches severe
  if (upper === 3 && lower === 3) {
    mds += CE.LEVEL_3.MDS;
    rls += CE.LEVEL_3.RLS;
    bds += CE.LEVEL_3.BDS;
  }
  // Level 2 → both arches moderate or higher (but not both severe)
  else if (upper >= 2 && lower >= 2) {
    mds += CE.LEVEL_2.MDS;
    rls += CE.LEVEL_2.RLS;
  }
  // Level 1 → only one arch is moderate or higher
  else if ((upper >= 2 && lower < 2) || (lower >= 2 && upper < 2)) {
    mds += CE.LEVEL_1_MDS;
  }

  // Apply ceiling compression to escalation additions
  mds = applyCeilingCompression(mds, d.severeDomainCount);
  rls = applyCeilingCompression(rls, d.severeDomainCount);
  bds = applyCeilingCompression(bds, d.severeDomainCount);

  debugLog('Crowding Escalation', { mds, rls, bds });
  return { mds, rls, bds };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 5: INTERACTION PENALTIES
   Co-occurring conditions compound difficulty
════════════════════════════════════════════════════════ */
function calculateInteractionPenalties(d, currentMDS) {
  const IP = CONSTANTS.INTERACTION;
  let mds = 0, rls = 0, globalBurden = 0;
  const maxCrowding = Math.max(d.upperCrowding, d.lowerCrowding);

  // Crowding + rotation both moderate or worse
  if (maxCrowding >= 2 && d.rotationSeverity >= 2) mds += IP.CROWDING_ROTATION;

  // Open bite + crossbite both moderate or worse
  if (d.openBite >= 2 && d.crossbite >= 2) rls += IP.OPENBITE_CROSSBITE_RLS;

  // Deep bite + retroclination
  if (d.deepBite >= 2 && d.incisorPosition === 3) mds += IP.DEEPBITE_RETROCLINATION;

  // Root control severe + crowding moderate or worse
  if (d.incisorPosition === 3 && maxCrowding >= 2) mds += IP.ROOTCONTROL_CROWDING;

  // Poor compliance on already complex case
  if (d.complianceExpectation === 3 && currentMDS > 50) rls += IP.POOR_COMPLIANCE_COMPLEX;

  // Multiple severe domains — global burden
  if (d.severeDomainCount >= 3) globalBurden += IP.MULTIPLE_SEVERE_DOMAINS;

  // Apply ceiling compression to all interaction additions
  mds          = applyCeilingCompression(mds,          d.severeDomainCount);
  rls          = applyCeilingCompression(rls,          d.severeDomainCount);
  globalBurden = applyCeilingCompression(globalBurden, d.severeDomainCount);

  debugLog('Interaction Penalties', { mds, rls, globalBurden });
  return { mds, rls, globalBurden };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 6: MECHANICAL DIFFICULTY SCORE
   Aggregates movement burden + escalation + interaction
   then normalises to 0–100
════════════════════════════════════════════════════════ */
function calculateMDS(d) {
  const movementBurden  = calculateMovementBurden(d);
  const crowdingEsc     = calculateCrowdingEscalation(d);

  // First pass MDS — normalize to 0–100 so the poor-compliance
  // threshold check (currentMDS > 50) operates on the same scale
  // the spec intends, not raw units.
  const preMDSRaw        = movementBurden + crowdingEsc.mds;
  const preMDSNormalized = clamp((preMDSRaw / CONSTANTS.MDS.NORMALIZATION_FACTOR) * 100, 0, CONSTANTS.MDS.MAX);

  const interaction = calculateInteractionPenalties(d, preMDSNormalized);

  const rawMDS = movementBurden + crowdingEsc.mds + interaction.mds + interaction.globalBurden;

  // Normalize to 0–100, cap at 100
  const normalizedMDS = clamp((rawMDS / CONSTANTS.MDS.NORMALIZATION_FACTOR) * 100, 0, CONSTANTS.MDS.MAX);

  debugLog('MDS (raw)', rawMDS);
  debugLog('MDS (normalized)', normalizedMDS);

  return {
    normalized:     Math.round(normalizedMDS),
    raw:            rawMDS,
    crowdingRLS:    crowdingEsc.rls,
    crowdingBDS:    crowdingEsc.bds,
    interactionRLS: interaction.rls
  };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 7: BIOLOGICAL STABILITY SCORE
   Starts at 100; penalties subtracted per risk factor
════════════════════════════════════════════════════════ */
function calculateBSS(d) {
  const P = CONSTANTS.BSS.PENALTIES;
  let bss = CONSTANTS.BSS.BASE;

  if (d.rotationSeverity  === 3) bss -= P.SEVERE_ROTATION;
  if (d.deepBite          === 3) bss -= P.SEVERE_DEEPBITE;
  if (d.openBite          === 3) bss -= P.SEVERE_OPENBITE;
  if (d.crossbite         === 3) bss -= P.SEVERE_CROSSBITE;
  if (d.incisorPosition   === 3) bss -= P.ROOT_CTRL_SEVERE;
  if (d.complianceExpectation === 3) bss -= P.POOR_COMPLIANCE;

  bss = clamp(bss, 0, 100);
  debugLog('BSS', bss);

  let label;
  if (bss >= 80)      label = 'Stable';
  else if (bss >= 60) label = 'Moderately Stable';
  else if (bss >= 40) label = 'Reduced Stability';
  else                label = 'Highly Unstable';

  return { score: bss, label };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 8: REFINEMENT LIKELIHOOD SCORE
   Higher = more likely to need additional aligner stages
════════════════════════════════════════════════════════ */
function calculateRLS(d, crowdingRLS, interactionRLS) {
  const R = CONSTANTS.RLS;
  let rls = 0;

  if (d.rotationSeverity  === 2) rls += R.ROTATION_MODERATE;
  if (d.rotationSeverity  === 3) rls += R.ROTATION_SEVERE;
  if (d.deepBite          >= 2) rls += R.DEEPBITE;
  if (d.openBite          >= 2) rls += R.OPENBITE;
  if (d.crossbite         >= 2) rls += R.CROSSBITE;
  if (d.incisorPosition   === 3) rls += R.ROOT_CTRL;
  if (d.complianceExpectation === 3) rls += R.POOR_COMPLIANCE;

  // Add crowding escalation and interaction RLS contributions
  rls += crowdingRLS + interactionRLS;

  debugLog('RLS', rls);

  let label;
  if (rls <= 20)      label = 'Low';
  else if (rls <= 45) label = 'Moderate';
  else if (rls <= 70) label = 'High';
  else                label = 'Multi-stage likely';

  return { score: rls, label };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 9: TRACKING SENSITIVITY INDEX
   Predicts how closely the case will track planned movement
════════════════════════════════════════════════════════ */
function calculateTSI(d) {
  const T = CONSTANTS.TSI;

  // Each factor uses normalized severity (0 / 0.5 / 1.0)
  const tsi =
    (normalizeSeverity(d.openBite)              * T.OPEN_BITE)  +
    (normalizeSeverity(d.rotationSeverity)       * T.ROTATION)   +
    (normalizeSeverity(d.incisorPosition)        * T.ROOT_CTRL)  +
    (normalizeSeverity(d.crossbite)              * T.CROSSBITE)  +
    (normalizeSeverity(d.complianceExpectation)  * T.COMPLIANCE);

  debugLog('TSI', tsi);

  let label;
  if (tsi <= 20)      label = 'Low';
  else if (tsi <= 40) label = 'Moderate';
  else if (tsi <= 60) label = 'High';
  else                label = 'Very High';

  return { score: Math.round(tsi), label };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 10: PRIMARY ARCHETYPE
   Identifies the dominant clinical challenge driving complexity
════════════════════════════════════════════════════════ */
function determineArchetype(d) {
  // Priority hierarchy per spec
  if (d.openBite          >= 2) return 'Open Bite Dominant';
  if (d.deepBite          >= 2) return 'Deep Bite Dominant';
  if (d.incisorPosition   === 3) return 'Root-Control Dominant';
  if (d.rotationSeverity  >= 2) return 'Rotation Dominant';
  if (d.eruptionComplexity === 3) return 'Eruption-Assisted';
  if (d.crossbite         >= 2) return 'Expansion Dominant';
  if (d.molarRelationship >= 2) return 'Sagittal Correction Dominant';
  const maxSpacing = Math.max(d.upperSpacing, d.lowerSpacing);
  if (maxSpacing >= 2) return 'Spacing Dominant';
  const maxCrowding = Math.max(d.upperCrowding, d.lowerCrowding);
  if (d.severeDomainCount >= 3 || maxCrowding === 3) return 'Mixed High-Complexity';
  return 'Simple Alignment';
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 11: ALIGNER PREDICTION
   Selects base range from archetype, adds MDS/RLS drivers
════════════════════════════════════════════════════════ */
function calculateAligners(archetype, mds, rls) {
  const BR = CONSTANTS.ALIGNERS.BASE_RANGES;
  const MM = CONSTANTS.ALIGNERS.MDS_MULTIPLIER;
  const RM = CONSTANTS.ALIGNERS.RLS_MULTIPLIER;

  // Pick base range from archetype
  let baseMin, baseMax;
  if (archetype === 'Open Bite Dominant') {
    ({ min: baseMin, max: baseMax } = BR.OPEN_BITE);
  } else if (archetype === 'Deep Bite Dominant') {
    ({ min: baseMin, max: baseMax } = BR.DEEP_BITE);
  } else if (archetype === 'Rotation Dominant' || archetype === 'Root-Control Dominant') {
    ({ min: baseMin, max: baseMax } = BR.ROTATION);
  } else if (archetype === 'Mixed High-Complexity' || archetype === 'Eruption-Assisted') {
    ({ min: baseMin, max: baseMax } = BR.MIXED_SEVERE);
  } else {
    ({ min: baseMin, max: baseMax } = BR.SIMPLE);
  }

  // Formula: initialAligners = baseMid + (MDS × 0.18) + (RLS × 0.12)
  const baseMid     = (baseMin + baseMax) / 2;
  const initial     = Math.round(baseMid + (mds * MM) + (rls * RM));
  const initialEven = roundToNearestEven(initial);

  // Additional aligners based on RLS category
  let addMin, addMax;
  if (rls <= 20)      { addMin = 0;  addMax = 8;  }
  else if (rls <= 45) { addMin = 8;  addMax = 16; }
  else if (rls <= 70) { addMin = 16; addMax = 32; }
  else                { addMin = 32; addMax = 60; }

  const totalMin = initialEven;
  const totalMax = roundToNearestEven(initialEven + addMax);

  debugLog('Aligners', { initialEven, totalMin, totalMax });
  return { initial: initialEven, totalMin, totalMax };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 12: DURATION ENGINE
   Fixed protocol: 10 days per aligner + refinement/tracking delays
════════════════════════════════════════════════════════ */
function calculateDuration(aligners, rlsLabel, tsiLabel) {
  const DAYS_PER_ALIGNER = 10;

  // Lower limit: initial aligners at fixed protocol
  const lowerDays   = aligners.initial * DAYS_PER_ALIGNER;
  const lowerMonths = Math.round(lowerDays / 30);

  // Tracking delay by TSI category
  let trackingDelayMin, trackingDelayMax;
  switch (tsiLabel) {
    case 'Very High': trackingDelayMin = 4; trackingDelayMax = 8;  break;
    case 'High':      trackingDelayMin = 2; trackingDelayMax = 4;  break;
    case 'Moderate':  trackingDelayMin = 1; trackingDelayMax = 1;  break;
    default:          trackingDelayMin = 0; trackingDelayMax = 0;
  }

  // Refinement delay by RLS category
  let refinementDelayMin, refinementDelayMax;
  switch (rlsLabel) {
    case 'Multi-stage likely': refinementDelayMin = 8;  refinementDelayMax = 14; break;
    case 'High':               refinementDelayMin = 4;  refinementDelayMax = 8;  break;
    case 'Moderate':           refinementDelayMin = 2;  refinementDelayMax = 4;  break;
    default:                   refinementDelayMin = 0;  refinementDelayMax = 2;
  }

  const upperMonths = lowerMonths + refinementDelayMax + trackingDelayMax;
  const lowerFinal  = lowerMonths + refinementDelayMin + trackingDelayMin;

  debugLog('Duration', { lowerFinal, upperMonths });
  return {
    lowerMonths: lowerFinal,
    upperMonths,
    refinementDelay: `${refinementDelayMin}–${refinementDelayMax} months`,
    trackingDelay:   `${trackingDelayMin}–${trackingDelayMax} months`
  };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 13: RETENTION ENGINE
   Determines retention protocol level
════════════════════════════════════════════════════════ */
function calculateRetention(bss, rls) {
  // Instability proxy = inverse of BSS + RLS burden
  const instabilityScore = (100 - bss) + (rls * 0.3);

  let level, fullTime, nightTime;
  if (instabilityScore <= CONSTANTS.RETENTION.LEVEL_1) {
    level = 1;
    fullTime  = '6 months';
    nightTime = 'Indefinite nightly';
  } else if (instabilityScore <= CONSTANTS.RETENTION.LEVEL_2) {
    level = 2;
    fullTime  = '12 months';
    nightTime = 'Indefinite nightly';
  } else {
    level = 3;
    fullTime  = '12+ months';
    nightTime = 'Indefinite nightly + periodic review';
  }

  debugLog('Retention', { instabilityScore, level });
  return { level, fullTime, nightTime, instabilityScore: Math.round(instabilityScore) };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 14: CONFIDENCE ENGINE
   Predicts treatment predictability from RLS, TSI, BSS
════════════════════════════════════════════════════════ */
function calculateConfidence(rls, tsi, bss) {
  const instabilityPenalty = 100 - bss;
  const confidence = clamp(
    100 - (rls * 0.4) - (tsi * 0.3) - (instabilityPenalty * 0.3),
    5, 100
  );

  let label;
  if (confidence >= 80)      label = 'High Predictability';
  else if (confidence >= 60) label = 'Moderate Predictability';
  else if (confidence >= 40) label = 'Controlled Complexity';
  else                       label = 'Advanced Staged Treatment';

  debugLog('Confidence', confidence);
  return { score: Math.round(confidence), label };
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 15: AUXILIARY ENGINE
   Evidence-based auxiliary predictions per parameter state
════════════════════════════════════════════════════════ */
function calculateAuxiliaries(d) {
  const aux = ['IPR'];
  const maxCrowding = Math.max(d.upperCrowding, d.lowerCrowding);
  if (d.rotationSeverity >= 2) aux.push('Rotation attachments');
  if (d.deepBite        >= 2) aux.push('Bite ramps');
  if (d.openBite        >= 2) aux.push('Elastics');
  if (d.crossbite       >= 2) aux.push('Crossbite elastics');
  if (d.incisorPosition >= 2) aux.push('Power ridges');
  if (d.eruptionComplexity >= 2) aux.push('Guided eruption');
  if (d.eruptionComplexity === 3) aux.push('Surgical exposure');

  return [...new Set(aux)];
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MODULE 16: EXPLAINABILITY ENGINE
   Returns top 2 complexity drivers for clinician output
════════════════════════════════════════════════════════ */
function generateExplainability(d, mds, rls, tsi, bss) {
  // Score each potential contributor
  const contributors = [
    { name: 'Severe rotational burden',      score: d.rotationSeverity  === 3 ? 35 : d.rotationSeverity === 2 ? 15 : 0 },
    { name: 'Root-control mechanics',        score: d.incisorPosition   === 3 ? 30 : d.incisorPosition  === 2 ? 10 : 0 },
    { name: 'Open bite complexity',          score: d.openBite          === 3 ? 40 : d.openBite         === 2 ? 20 : 0 },
    { name: 'Deep bite intrusion demand',    score: d.deepBite          === 3 ? 25 : d.deepBite         === 2 ? 12 : 0 },
    { name: 'Crossbite expansion burden',    score: d.crossbite         === 3 ? 20 : d.crossbite        === 2 ? 10 : 0 },
    { name: 'Bilateral crowding density',    score: (d.upperCrowding >= 2 && d.lowerCrowding >= 2) ? 18 : 0 },
    { name: 'Sagittal AP correction',        score: d.molarRelationship === 3 ? 20 : d.molarRelationship === 2 ? 10 : 0 },
    { name: 'Eruption / surgical mechanics', score: d.eruptionComplexity === 3 ? 30 : 0 },
    { name: 'Poor compliance risk',          score: d.complianceExpectation === 3 ? 25 : 0 },
    { name: 'Multiple severe co-domains',    score: d.severeDomainCount >= 3 ? 20 : 0 }
  ];

  // Sort descending, take top 2 non-zero
  const top2 = contributors
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(c => c.name);

  return top2.length > 0
    ? top2
    : ['Standard complexity — no dominant single driver'];
}

/* ═══════════════════════════════════════════════════════
   V7.7 ENGINE — MASTER RUNNER
   Calls all modules in sequence, returns complete result
════════════════════════════════════════════════════════ */
function runV77Engine() {
  // Build raw input object from state
  const rawInput = {
    upperCrowding:        S.upperCrowding,
    lowerCrowding:        S.lowerCrowding,
    upperSpacing:         S.upperSpacing,
    lowerSpacing:         S.lowerSpacing,
    rotationSeverity:     S.rotationSeverity,
    incisorPosition:      S.incisorPosition,
    molarRelationship:    S.molarRelationship,
    deepBite:             S.deepBite,
    openBite:             S.openBite,
    crossbite:            S.crossbite,
    midlineDeviation:     S.midlineDeviation,
    eruptionComplexity:   S.eruptionComplexity,
    complianceExpectation:S.complianceExpectation
  };

  // Step 1 — Validate and normalise inputs
  const d = validateInputs(rawInput);

  // Step 2 — MDS (includes movement burden + crowding escalation + interactions)
  const mdsResult  = calculateMDS(d);

  // Step 3 — BSS, RLS, TSI
  const bssResult  = calculateBSS(d);
  const rlsResult  = calculateRLS(d, mdsResult.crowdingRLS, mdsResult.interactionRLS);
  const tsiResult  = calculateTSI(d);

  // Step 4 — Archetype
  const archetype  = determineArchetype(d);

  // Step 5 — Aligner prediction
  const aligners   = calculateAligners(archetype, mdsResult.normalized, rlsResult.score);

  // Step 6 — Severity classification (based on initial aligners)
  const severity     = alignersToSeverity(aligners.initial);
  const severityPlus =
    (severity === 'mild'     && aligners.totalMax >= 26) ||
    (severity === 'moderate' && aligners.totalMax >= 46);

  // Step 7 — Duration
  const duration   = calculateDuration(aligners, rlsResult.label, tsiResult.label);

  // Step 8 — Retention
  const retention  = calculateRetention(bssResult.score, rlsResult.score);

  // Step 9 — Confidence
  const confidence = calculateConfidence(rlsResult.score, tsiResult.score, bssResult.score);

  // Step 10 — Auxiliaries
  const auxiliaries = calculateAuxiliaries(d);

  // Step 11 — Explainability
  const explainability = generateExplainability(
    d, mdsResult.normalized, rlsResult.score, tsiResult.score, bssResult.score
  );

  const result = {
    severity,
    severityPlus,
    mds:          mdsResult.normalized,
    bss:          bssResult,
    rls:          rlsResult,
    tsi:          tsiResult,
    archetype,
    aligners,
    duration,
    retention,
    confidence,
    auxiliaries,
    explainability,
    validatedInputs: d
  };

  debugLog('Full V7.7 Result', result);
  return result;
}

/* ═══════════════════════════════════════════════════════
   UI UPDATERS
════════════════════════════════════════════════════════ */

function updateScoreBanner(mds, severity) {
  const patientName = document.getElementById('patient-name')?.value.trim() || '—';
  DOM.scoreDisplay.textContent   = patientName;
  DOM.ctaChip.textContent        = severityLabel(severity, S.severityPlus);
  DOM.categoryBadge.textContent  = severityLabel(severity, S.severityPlus);
  DOM.categoryBadge.className    = `score-category ${severity === 'advanced' ? 'severe' : severity}`;
}

function clearScoreBanner() {
  const patientName = document.getElementById('patient-name')?.value.trim() || '—';
  DOM.scoreDisplay.textContent   = patientName || '—';
  DOM.categoryBadge.textContent  = 'Incomplete';
  DOM.categoryBadge.className    = 'score-category';
  DOM.ctaChip.textContent        = '—';
}

function updateSeverityCard(cat) {
  // Map 'advanced' to 'severe' for CSS class (same visual weight)
  const cssClass = cat === 'advanced' ? 'severe' : cat;
  DOM.severityResult.className = `severity-card${cat ? ' ' + cssClass : ''}`;
  if (!cat) {
    DOM.sevTag.textContent   = 'Awaiting Score';
    DOM.sevTitle.textContent = '—';
    DOM.sevDesc.textContent  = `Complete all ${PARAMS.length} parameters to classify`;
    const po = document.getElementById('patient-output');
    const co = document.getElementById('clinician-output');
    if (po) po.style.display = 'none';
    if (co) co.style.display = 'none';
    return;
  }
  DOM.sevTag.textContent   = 'Case Severity';
  DOM.sevTitle.textContent = severityLabel(cat, S.severityPlus);
  DOM.sevDesc.textContent  = CONFIG.severityDescriptions[cat] || '';
}

function updatePrices(cat) {
  const planKeys = ['budget', 'ace', 'luxe', 'invis'];
  // Fall back 'advanced' → 'severe' for pricing if not defined separately
  const pricingCat = CONFIG.pricing[cat] ? cat : 'severe';

  if (!cat) {
    planKeys.forEach(p => {
      const el = document.getElementById('txp-' + p);
      if (el) { el.textContent = 'Score case first'; el.className = 'tx-price placeholder'; }
    });
    if (DOM.txBudgetLabel) DOM.txBudgetLabel.textContent = '—';
    if (DOM.txAceLabel)    DOM.txAceLabel.textContent    = '—';
    if (DOM.txLuxeLabel)   DOM.txLuxeLabel.textContent   = '—';
    if (DOM.txInvisLabel)  DOM.txInvisLabel.textContent  = '—';
    return;
  }
  const m = CONFIG.pricing[pricingCat];
  planKeys.forEach(p => {
    const el = document.getElementById('txp-' + p);
    if (el) { el.textContent = m[p].price; el.className = 'tx-price'; }
  });
  if (DOM.txBudgetLabel) DOM.txBudgetLabel.textContent = 'Basic';
  if (DOM.txAceLabel)    DOM.txAceLabel.textContent    = 'Most Popular';
  if (DOM.txLuxeLabel)   DOM.txLuxeLabel.textContent   = 'Premium';
  if (DOM.txInvisLabel)  DOM.txInvisLabel.textContent  = m.invis.plan;
}

function updateProgress(filledCount) {
  DOM.progDots.forEach((dot, i) => {
    if (dot) dot.classList.toggle('done', i < filledCount);
  });
  DOM.progressLabel.textContent = `${filledCount} of ${PARAMS.length} parameters selected`;
}

function renderPlanCards() {
  ['budget', 'ace', 'luxe', 'invis'].forEach(k => {
    const card = document.getElementById('tx-' + k);
    const ind  = document.getElementById('txi-' + k);
    if (!card || !ind) return;
    const idx = S.plans.indexOf(k);
    if (idx !== -1) {
      card.classList.add('selected');
      ind.textContent = idx + 1;
    } else {
      card.classList.remove('selected');
      ind.textContent = '✓';
    }
  });
}

/* ─────────────────────────────────────────────
   PATIENT OUTPUT — shown on home page
   Plain-language outputs the patient sees:
   severity, aligners, duration, auxiliaries
───────────────────────────────────────────── */
function renderPatientOutput(result) {
  const el = document.getElementById('patient-output');
  if (!el) return;
  const { aligners, duration, auxiliaries, confidence } = result;
  const cat = result.severity;
  const cssClass = cat === 'advanced' ? 'severe' : cat;

  el.style.display = 'block';
  el.innerHTML = `
    <div class="section-label" style="margin-top:4px">Patient Summary</div>
    <div class="card" style="padding:16px 18px">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">

        <div style="padding:10px 0;border-bottom:1px solid var(--border-light)">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px">Estimated Aligners</div>
          <div style="font-size:22px;font-family:'DM Serif Display',serif;letter-spacing:-.5px;color:var(--text-primary)">${aligners.totalMin}–${aligners.totalMax}</div>
        </div>

        <div style="padding:10px 0 10px 16px;border-bottom:1px solid var(--border-light);border-left:1px solid var(--border-light)">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px">Estimated Duration</div>
          <div style="font-size:22px;font-family:'DM Serif Display',serif;letter-spacing:-.5px;color:var(--text-primary)">${duration.lowerMonths}–${duration.upperMonths} <span style="font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500">months</span></div>
        </div>

        <div style="padding:10px 0 0">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px">Predictability</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">${confidence.score}%</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1px">${confidence.label}</div>
        </div>

        <div style="padding:10px 0 0;padding-left:16px;border-left:1px solid var(--border-light)">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px">Retention</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">Level ${result.retention.level}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1px">${result.retention.fullTime} full-time</div>
        </div>

      </div>

      ${auxiliaries.length > 0 ? `
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-light)">
          <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:8px">Auxiliaries</div>
          <div class="aux-pill-container">
            ${auxiliaries.map(a => `<div class="aux-pill">${a}</div>`).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
  updateAuxUI();
}

/* ─────────────────────────────────────────────
   CLINICIAN OUTPUT — shown on home page
   Full A–G engine outputs for the clinician
───────────────────────────────────────────── */
function renderClinicianOutput(result) {
  const el = document.getElementById('clinician-output');
  if (!el) return;
  const { mds, bss, rls, tsi, archetype, aligners, duration, retention, confidence, explainability } = result;

  // Reusable row builder
  const row = (label, value) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--border-light)">
      <div style="font-size:11.5px;color:var(--text-secondary)">${label}</div>
      <div style="font-size:11.5px;font-weight:600;color:var(--text-primary);text-align:right;max-width:60%">${value}</div>
    </div>`;

  // Badge pill builder
  const pill = (text, color) =>
    `<span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:3px 9px;border-radius:20px;background:${color}20;color:${color};border:1px solid ${color}30">${text}</span>`;

  const bssColor  = bss.score >= 80 ? 'var(--mild)' : bss.score >= 60 ? 'var(--moderate)' : 'var(--severe)';
  const rlsColor  = rls.score <= 20 ? 'var(--mild)' : rls.score <= 45 ? 'var(--moderate)' : 'var(--severe)';
  const tsiColor  = tsi.score <= 20 ? 'var(--mild)' : tsi.score <= 40 ? 'var(--moderate)' : 'var(--severe)';
  const confColor = confidence.score >= 80 ? 'var(--mild)' : confidence.score >= 60 ? 'var(--moderate)' : 'var(--severe)';

  el.style.display = 'block';
  el.innerHTML = `
    <div class="section-label" style="margin-top:4px">Clinician Report</div>

    <!-- G: Complexity Drivers — shown first -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">A · Complexity Drivers</div>
      ${explainability.map(d => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-light)">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>
          <div style="font-size:11.5px;color:var(--text-primary)">${d}</div>
        </div>`).join('')}
    </div>

    <!-- B: Case Overview -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">B · Case Overview</div>
      ${row('Primary Archetype', archetype)}
      ${row('Mechanical Difficulty (MDS)', `${mds} / 100`)}
      ${row('Confidence', `${confidence.score}% &nbsp;${pill(confidence.label, confColor)}`)}
    </div>

    <!-- C: Biologic & Treatment Behaviour -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">C · Biologic &amp; Treatment Behaviour</div>
      ${row('Biological Stability (BSS)', `${bss.score} &nbsp;${pill(bss.label, bssColor)}`)}
      ${row('Tracking Sensitivity (TSI)', `${tsi.score} &nbsp;${pill(tsi.label, tsiColor)}`)}
      ${row('Refinement Likelihood (RLS)', `${rls.score} &nbsp;${pill(rls.label, rlsColor)}`)}
    </div>

    <!-- D: Aligner Burden -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">D · Aligner Burden</div>
      ${row('Initial aligners', aligners.initial)}
      ${row('Total (incl. optimization)', `${aligners.totalMin}–${aligners.totalMax}`)}
    </div>

    <!-- E: Duration Analysis -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">E · Duration Analysis</div>
      ${row('Lower limit', `${duration.lowerMonths} months`)}
      ${row('Upper limit', `${duration.upperMonths} months`)}
      ${row('Refinement delay', duration.refinementDelay)}
      ${row('Tracking delay', duration.trackingDelay)}
    </div>

    <!-- F: Auxiliaries & Mechanics -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">F · Auxiliaries &amp; Mechanics</div>
      <div class="aux-pill-container" style="margin-top:2px">
        ${result.auxiliaries.length > 0
          ? result.auxiliaries.map(a => `<div class="aux-pill">${a}</div>`).join('')
          : '<span style="font-size:11px;color:var(--text-tertiary)">None predicted</span>'
        }
      </div>
    </div>

    <!-- G: Retention -->
    <div class="card" style="padding:16px 18px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:10px">G · Retention Protocol</div>
      ${row('Protocol level', `Level ${retention.level}`)}
      ${row('Full-time wear', retention.fullTime)}
      ${row('Night-time wear', retention.nightTime)}
    </div>

  `;
  updateAuxUI();
}

/* ═══════════════════════════════════════════════════════
   RECALCULATE — master update, called after any change
════════════════════════════════════════════════════════ */
function recalculate() {
  const filled = PARAMS.filter(p => S[p] !== null);
  updateProgress(filled.length);

  if (filled.length < PARAMS.length) {
    clearScoreBanner();
    updateSeverityCard(null);
    updatePrices(null);
    S.severity   = null;
    S.lastResult = null;
    return;
  }

  const result     = runV77Engine();
  S.severity       = result.severity;
  S.severityPlus   = result.severityPlus;
  S.lastResult     = result;
  S.caseSaved      = false;

  updateScoreBanner(result.mds, result.severity);
  updateSeverityCard(result.severity);
  updatePrices(result.severity);
  renderPatientOutput(result);
  renderClinicianOutput(result);

  setSaveBadge('Not Saved', 'not-saved');
}

/* ═══════════════════════════════════════════════════════
   AUXILIARY TOGGLE
════════════════════════════════════════════════════════ */
function toggleSuggestedAux(aux) {
  const idx = selectedAux.indexOf(aux);
  idx > -1 ? selectedAux.splice(idx, 1) : selectedAux.push(aux);
  updateAuxUI();
  persistState();
}

function updateAuxUI() {
  document.querySelectorAll('.aux-pill').forEach(el => {
    const val = el.textContent.trim();
    el.classList.toggle('active', selectedAux.includes(val));
  });
}

/* ═══════════════════════════════════════════════════════
   EVENT HANDLERS
════════════════════════════════════════════════════════ */
// Crowding/spacing mutual exclusivity map — per arch.
// When either side is selected > 1, its counterpart on
// the same arch is immediately cleared to null in state
// and deselected in the UI.
const CROWDING_SPACING_PAIRS = {
  upperCrowding: 'upperSpacing',
  upperSpacing:  'upperCrowding',
  lowerCrowding: 'lowerSpacing',
  lowerSpacing:  'lowerCrowding'
};

function selectParam(param, val, btn) {
  S[param] = val;

  // Activate the tapped button, clear siblings
  btn.closest('.seg-group').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pc-' + param)?.classList.add('selected');

  // ── Crowding / spacing UI enforcement ────────────────
  // If this param is one of the four arch-paired params
  // and the selected value is > 1, immediately reset the
  // counterpart on the same arch so both can never be
  // simultaneously active in the UI or state.
  const counterpart = CROWDING_SPACING_PAIRS[param];
  if (counterpart && val > 1) {
    // Clear state
    S[counterpart] = null;
    // Deactivate all buttons on the counterpart card
    const counterCard = document.getElementById('pc-' + counterpart);
    if (counterCard) {
      counterCard.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      counterCard.classList.remove('selected');
    }
  }

  recalculate();
  persistState();
}

function togglePlan(key) {
  const idx = S.plans.indexOf(key);
  idx === -1 ? S.plans.push(key) : S.plans.splice(idx, 1);
  renderPlanCards();
  persistState();
}

function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    S.logoDataURL = ev.target.result;
    const img = document.getElementById('clinic-logo-img');
    if (img) { img.src = S.logoDataURL; img.style.display = 'block'; }
    const ph = document.getElementById('clinic-logo-ph');
    if (ph) ph.style.display = 'none';
    persistState();
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════════════════════════════════════
   SUMMARY MODAL
════════════════════════════════════════════════════════ */
function openSummary() {
  populateSummaryCard();
  DOM.summaryModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  DOM.summaryModal.classList.remove('open');
  document.body.style.overflow = '';
}

function handleModalOverlayClick(e) {
  if (e.target === DOM.summaryModal) closeModal();
}

/** Builds the full A–G clinician summary inside the modal */
function populateSummaryCard() {
  const pName    = document.getElementById('patient-name')?.value.trim() || 'Patient';
  const age      = document.getElementById('patient-age')?.value  || '—';
  const sex      = document.getElementById('patient-sex')?.value  || '—';
  const whatsapp = document.getElementById('patient-whatsapp')?.value.trim() || '';
  const cat   = S.severity;
  const r     = S.lastResult;

  // Clinic branding
  DOM.scClinicName.textContent = CONFIG.clinic.name;
  DOM.scClinicTag.textContent  = CONFIG.clinic.tagline;
  DOM.scDate.textContent = new Date().toLocaleDateString('en-IN', {
    day:'numeric', month:'short', year:'numeric'
  });

  // Logo
  DOM.scLogoPh.textContent    = CONFIG.clinic.name.charAt(0).toUpperCase();
  DOM.scLogoPh.style.display  = 'none';
  DOM.scLogoImg.src            = S.logoDataURL || CONFIG.clinic.logoFile;
  DOM.scLogoImg.style.display  = 'block';
  DOM.scLogoImg.onerror = () => {
    DOM.scLogoImg.style.display = 'none';
    DOM.scLogoPh.style.display  = 'block';
  };

  // Patient
  DOM.scPatientName.textContent = pName;
  const metaParts = [`Age ${age}`, sex];
  if (whatsapp) metaParts.push(`📱 ${whatsapp}`);
  DOM.scPatientMeta.textContent = metaParts.join(' · ');

  // Severity pill
  DOM.scSevPill.textContent = cat ? severityLabel(cat, S.severityPlus) : '—';
  DOM.scSevPill.className   = `sc-sev-pill ${cat === 'advanced' ? 'severe' : (cat || 'default')}`;

  // Severity card
  const cssClass = cat === 'advanced' ? 'severe' : cat;
  DOM.scSeverityCard.className = `sc-severity-card${cat ? ' ' + cssClass : ''}`;
  DOM.scSevTag.textContent     = cat ? 'Case Severity' : 'Awaiting Score';
  DOM.scSevTitle.textContent   = cat ? severityLabel(cat, S.severityPlus) : '—';
  DOM.scSevDesc.textContent    = cat ? CONFIG.severityDescriptions[cat] : 'Complete all parameters to classify';

  // Patient summary panel
  const scPatientSummary = document.getElementById('sc-patient-summary');
  if (scPatientSummary) {
    if (cat && r) {
      const { aligners, duration, confidence, retention, auxiliaries } = r;
      scPatientSummary.innerHTML = `
        <div class="sc-section-lbl" style="margin-top:12px">Patient Summary</div>
        <div style="background:var(--surface2);border-radius:12px;padding:14px 14px 10px;border:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0">
            <div style="padding:6px 0 6px">
              <div style="font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:3px">Aligners</div>
              <div style="font-size:20px;font-family:'DM Serif Display',serif;letter-spacing:-.5px;color:var(--text-primary)">${aligners.totalMin}–${aligners.totalMax}</div>
            </div>
            <div style="padding:6px 0 6px 14px;border-left:1px solid var(--border-light)">
              <div style="font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:3px">Duration</div>
              <div style="font-size:20px;font-family:'DM Serif Display',serif;letter-spacing:-.5px;color:var(--text-primary)">${duration.lowerMonths}–${duration.upperMonths} <span style="font-size:12px;font-family:'DM Sans',sans-serif;font-weight:500">mo</span></div>
            </div>
            <div style="padding:6px 0 6px 14px;border-left:1px solid var(--border-light)">
              <div style="font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:3px">Retention</div>
              <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Level ${retention.level} · ${retention.fullTime}</div>
            </div>
          </div>
          ${auxiliaries.length > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light)">
              <div style="font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:6px">Auxiliaries</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px">
                ${auxiliaries.map(a => `<span class="sc-aux-tag">${a}</span>`).join('')}
              </div>
            </div>` : ''}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light)">
            <div style="font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:6px">Facilities</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:12px">
              <span style="padding:4px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px">✓ Easy EMI</span>
              <span style="padding:4px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px">✓ Free Oral Care Kit</span>
            </div>
          </div>
        </div>`;
      scPatientSummary.style.display = 'block';
    } else {
      scPatientSummary.style.display = 'none';
    }
  }

  // Treatment plans grid
  renderSummaryPlans(cat);

  // Clinician report — kept off in share summary (patient-facing card only)
  const txEstimate = document.getElementById('sc-tx-estimate');
  if (txEstimate) txEstimate.style.display = 'none';

  // Phone CTA
  const phoneCta = document.querySelector('.sc-phone-cta');
  if (phoneCta) {
    phoneCta.style.justifyContent = 'center';
    phoneCta.innerHTML = `<div style="text-align:center"><span style="color:#fff;font-size:13px;font-weight:600">Call Now · </span><span style="color:#fff;font-size:16px;font-weight:600">${CONFIG.clinic.phone}</span></div>`;
    phoneCta.href = `tel:${CONFIG.clinic.phone}`;
  }
}

/** Renders all 7 V7.7 clinician output sections (A–G) */
function buildClinicianReport(r) {
  const tag = (label, value, color) =>
    `<span class="sc-aux-tag" style="${color ? 'color:' + color + ';border-color:' + color + '20' : ''}">${label}: <strong>${value}</strong></span>`;

  // Section A — Case Overview
  const sectionA = `
    <div class="sc-section-lbl" style="margin-top:14px">B · Case Overview</div>
    <div class="sc-aux-tags">
      ${tag('Archetype',   r.archetype)}
      ${tag('MDS',         r.mds + ' / 100')}
      ${tag('Confidence',  r.confidence.score + '% · ' + r.confidence.label)}
    </div>`;

  // Section B — Biologic & Treatment Behaviour
  const sectionB = `
    <div class="sc-section-lbl" style="margin-top:12px">C · Biologic &amp; Treatment Behaviour</div>
    <div class="sc-aux-tags">
      ${tag('Stability',    r.bss.score + ' · ' + r.bss.label)}
      ${tag('Tracking',     r.tsi.score + ' · ' + r.tsi.label)}
      ${tag('Refinement',   r.rls.score + ' · ' + r.rls.label)}
    </div>`;

  // Section C — Aligner Burden
  const sectionC = `
    <div class="sc-section-lbl" style="margin-top:12px">D · Aligner Burden</div>
    <div class="sc-aux-tags">
      ${tag('Initial aligners',     r.aligners.initial)}
      ${tag('Total (with opt.)',     r.aligners.totalMin + '–' + r.aligners.totalMax)}
    </div>`;

  // Section D — Duration Analysis
  const sectionD = `
    <div class="sc-section-lbl" style="margin-top:12px">E · Duration Analysis</div>
    <div class="sc-aux-tags">
      ${tag('Lower limit',          r.duration.lowerMonths + ' months')}
      ${tag('Upper limit',          r.duration.upperMonths + ' months')}
      ${tag('Refinement delay',     r.duration.refinementDelay)}
      ${tag('Tracking delay',       r.duration.trackingDelay)}
    </div>`;

  // Section E — Auxiliaries & Mechanics
  const auxTags = r.auxiliaries.length > 0
    ? r.auxiliaries.map(a => `<span class="sc-aux-tag">${a}</span>`).join('')
    : '<span class="sc-aux-tag">None predicted</span>';

  const sectionE = `
    <div class="sc-section-lbl" style="margin-top:12px">F · Auxiliaries &amp; Mechanics</div>
    <div class="sc-aux-tags">${auxTags}</div>`;

  // Section F — Retention
  const sectionF = `
    <div class="sc-section-lbl" style="margin-top:12px">G · Retention Protocol</div>
    <div class="sc-aux-tags">
      ${tag('Level',      'Level ' + r.retention.level)}
      ${tag('Full-time',  r.retention.fullTime)}
      ${tag('Night-time', r.retention.nightTime)}
    </div>`;

  // Section G — Explainability
  const drivers = r.explainability.map(d =>
    `<div style="font-size:11px;padding:4px 0;display:flex;align-items:center;gap:6px">
       <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;display:inline-block"></span>
       ${d}
     </div>`
  ).join('');

  const sectionG = `
    <div class="sc-section-lbl" style="margin-top:12px">A · Complexity Drivers</div>
    <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
      ${drivers}
    </div>`;

  return sectionG + sectionA + sectionB + sectionC + sectionD + sectionE + sectionF;
}

/** Builds the plan cards grid in the summary */
function renderSummaryPlans(cat) {
  if (S.plans.length === 0) {
    DOM.scTxGrid.innerHTML = '<div class="sc-no-plans" style="grid-column:1/-1">No plans selected</div>';
    return;
  }
  const pricingCat = (cat && CONFIG.pricing[cat]) ? cat : 'severe';
  const m = CONFIG.pricing[pricingCat];

  DOM.scTxGrid.innerHTML = S.plans.map((p, i) => {
    const meta      = CONFIG.planMeta[p];
    const label     = m[p].label;
    const price     = m[p].price;
    const isInvis   = p === 'invis';
    const isAce     = p === 'ace';
    const isLuxe    = p === 'luxe';
    const cardClass = ['sc-tx-card', isAce ? 'ace' : '', isInvis ? 'invis' : '', isLuxe ? 'luxe' : ''].filter(Boolean).join(' ');
    const badge     = i === 0
      ? '<div class="sc-tx-recommended">★ Recommended</div>'
      : `<div class="sc-tx-num">${i + 1}</div>`;
    const feats = meta.features.map(f => `<li>${f}</li>`).join('');
    return `<div class="${cardClass}">
      ${badge}
      <div class="sc-tx-tier" style="margin-top:${i === 0 ? '16px' : '0'}">${meta.tier}</div>
      <div class="sc-tx-name">${label}</div>
      <div class="sc-tx-price">${price}</div>
      <div class="sc-tx-pill sc-tx-pill-${p}">${meta.pill}</div>
      <ul class="sc-tx-features">${feats}</ul>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   PDF EXPORT
════════════════════════════════════════════════════════ */
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const source = document.getElementById('summary-card');

  // Clone off-screen so overflow/scroll constraints don't clip html2canvas
  const clone = source.cloneNode(true);
  clone.style.cssText = `
    position:absolute; left:-9999px; top:0;
    width:${source.offsetWidth || 420}px;
    background:#fff; border-radius:0; overflow:visible;
  `;
  document.body.appendChild(clone);

  let canvas;
  try {
    canvas = await html2canvas(clone, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff'
    });
  } finally {
    document.body.removeChild(clone);
  }

  const imgData  = canvas.toDataURL('image/png');
  const margin   = 8;
  const pdfWidth = 180;

  const contentW  = pdfWidth - margin * 2;
  const ratio     = contentW / canvas.width;
  const imgW      = contentW;
  const imgH      = canvas.height * ratio;
  const pdfHeight = imgH + margin * 2;

  const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
  pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

  const patientName = document.getElementById('patient-name')?.value || 'Patient';
  pdf.save(`${patientName}_Aligner_Report.pdf`);
}

function shareWhatsApp() {
  const rawPhone = (document.getElementById('patient-whatsapp')?.value || '').trim();
  if (!rawPhone) {
    alert('No WhatsApp number found. Please enter the patient\'s number in Patient Details.');
    return;
  }
  // Strip all non-digit characters; add country code 91 if not present
  let phone = rawPhone.replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;

  const patientName = (document.getElementById('patient-name')?.value || 'Patient').trim();
  const cat  = S.severity;
  const r    = S.lastResult;

  let msg = `Hi ${patientName},\n\nHere is a summary of your aligner consultation at ${CONFIG.clinic.name}.\n`;
  if (cat && r) {
    msg += `\nCase Severity: ${cap(cat)} (MDS ${r.mds}/100)`;
    msg += `\nEstimated Aligners: ${r.aligners.totalMin}–${r.aligners.totalMax}`;
    msg += `\nEstimated Duration: ${r.duration.lowerMonths}–${r.duration.upperMonths} months`;
    msg += `\nPredictability: ${r.confidence.score}% · ${r.confidence.label}`;
  }
  msg += `\n\nFor any queries, call us at ${CONFIG.clinic.phone}.\n\nTeam ${CONFIG.clinic.name}`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ═══════════════════════════════════════════════════════
   SHARE / DOWNLOAD
════════════════════════════════════════════════════════ */
async function shareOrDownload() {
  const card  = document.getElementById('summary-card');
  const btn   = DOM.btnShare;
  const label = btn.innerHTML;
  btn.innerHTML = 'Generating…';
  btn.disabled  = true;

  try {
    const canvas = await html2canvas(card, {
      scale: 3, useCORS: true, backgroundColor: '#F5F4F1', logging: false
    });
    const blob     = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const pName    = (document.getElementById('patient-name')?.value.trim() || 'case').replace(/\s+/g, '-');
    const fileName = `FlossworkDental-${pName}.png`;
    const file     = new File([blob], fileName, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `Case Summary — ${pName}`, files: [file] });
    } else {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (e) {
    if (e.name !== 'AbortError') alert('Could not share. Try screenshotting manually.');
  }

  btn.innerHTML = label;
  btn.disabled  = false;
}

/* ═══════════════════════════════════════════════════════
   RESET
════════════════════════════════════════════════════════ */
async function resetAll() {
  if (currentUser && S.lastResult && !S.caseSaved) {
    const choice = confirm('This case is not saved. Save before resetting?');
    if (choice) {
      await saveCase();
    }
  }
  PARAMS.forEach(k => S[k] = null);
  selectedAux  = [];
  S.severity     = null;
  S.severityPlus = false;
  S.plans            = [];
  S.logoDataURL      = null;
  S.lastResult       = null;
  S.caseSaved        = false;
  S.caseId           = null;
  S.conversionStatus = 'fresh';
  S.provider         = '';
  S.internalNote     = '';

  // Reset dropdowns
  const dropdown = document.getElementById('conversion-status-select');
  if (dropdown) dropdown.value = 'fresh';
  const providerDropdown = document.getElementById('provider-select');
  if (providerDropdown) providerDropdown.value = '';

  document.querySelectorAll('.save-badge').forEach(b => { b.style.display = 'none'; });

  document.querySelectorAll('.seg-btn').forEach(b   => b.classList.remove('active'));
  document.querySelectorAll('.param-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.tx-card').forEach(c    => c.classList.remove('selected'));

  ['patient-name', 'patient-age', 'patient-sex', 'patient-whatsapp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const noteEl = document.getElementById('internal-note');
  if (noteEl) noteEl.value = '';

  const logoImg = document.getElementById('clinic-logo-img');
  const logoPh  = document.getElementById('clinic-logo-ph');
  if (logoImg) {
    logoImg.src = CONFIG.clinic.logoFile;
    logoImg.style.display = 'block';
    logoImg.onerror = () => {
      logoImg.style.display = 'none';
      if (logoPh) logoPh.style.display = 'block';
    };
  }
  if (logoPh) logoPh.style.display = 'none';

  recalculate();
  renderPlanCards();
  localStorage.removeItem(CONFIG.clinic.storageKey);
}

/* ═══════════════════════════════════════════════════════
   PERSISTENCE
════════════════════════════════════════════════════════ */
function persistState() {
  try {
    localStorage.setItem(CONFIG.clinic.storageKey, JSON.stringify({
      params:      Object.fromEntries(PARAMS.map(p => [p, S[p]])),
      selectedAux: [...selectedAux],
      plans:       [...S.plans],
      logoDataURL: S.logoDataURL,
      provider:    S.provider || '',
      internalNote: document.getElementById('internal-note')?.value || '',
      conversionStatus: S.conversionStatus || 'fresh',
      patient: {
        name:      document.getElementById('patient-name')?.value || '',
        age:       document.getElementById('patient-age')?.value  || '',
        sex:       document.getElementById('patient-sex')?.value  || '',
        whatsapp:  document.getElementById('patient-whatsapp')?.value || ''
      }
    }));
  } catch (_) { /* storage full — silently ignore */ }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(CONFIG.clinic.storageKey);
    if (!raw) return;
    const d = JSON.parse(raw);

    if (d.params) {
      PARAMS.forEach(p => {
        if (!d.params[p]) return;
        S[p] = d.params[p];
        const card = document.getElementById('pc-' + p);
        const btn  = card?.querySelector(`.seg-btn[data-val="${d.params[p]}"]`);
        if (btn) { btn.classList.add('active'); card.classList.add('selected'); }
      });

      // Enforce crowding/spacing mutual exclusivity on restore.
      // If persisted data has both sides of an arch set > 1
      // (e.g. from a pre-V7.7 session), clear the counterpart
      // from state and UI so the invariant is always upheld.
      [
        ['upperCrowding', 'upperSpacing'],
        ['lowerCrowding', 'lowerSpacing']
      ].forEach(([crowding, spacing]) => {
        const cv = S[crowding], sv = S[spacing];
        if (cv > 1 && sv > 1) {
          // Engine rule: crowding wins on equal, spacing loses
          const clearParam = cv >= sv ? spacing : crowding;
          S[clearParam] = null;
          const clearCard = document.getElementById('pc-' + clearParam);
          if (clearCard) {
            clearCard.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            clearCard.classList.remove('selected');
          }
        }
      });
    }

    if (Array.isArray(d.selectedAux)) selectedAux = [...d.selectedAux];

    if (Array.isArray(d.plans)) {
      S.plans = [...d.plans];
      renderPlanCards();
    }

    if (d.logoDataURL) {
      S.logoDataURL = d.logoDataURL;
      const img = document.getElementById('clinic-logo-img');
      const ph  = document.getElementById('clinic-logo-ph');
      if (img) { img.src = d.logoDataURL; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
    }

    if (d.patient) {
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      set('patient-name',      d.patient.name);
      set('patient-age',       d.patient.age);
      set('patient-sex',       d.patient.sex);
      set('patient-whatsapp',  d.patient.whatsapp);
    }

    // Load provider
    if (!S.provider) S.provider = d.provider || '';
    const providerDropdown = document.getElementById('provider-select');
    if (providerDropdown) providerDropdown.value = S.provider;

    // Load internal note
    if (!S.internalNote) {
      const noteEl = document.getElementById('internal-note');
      if (noteEl) noteEl.value = d.internalNote || '';
    }

    // Load conversion status (only on initial hydration)
    if (!S.conversionStatus || S.conversionStatus === 'fresh') {
      S.conversionStatus = d.conversionStatus || 'fresh';
      const dropdown = document.getElementById('conversion-status-select');
      if (dropdown) dropdown.value = S.conversionStatus;
    }
  } catch (_) { /* corrupted data — silently ignore */ }
}

/* ═══════════════════════════════════════════════════════
   SUPABASE CLIENT
   Initialised lazily from CONFIG.supabase
════════════════════════════════════════════════════════ */
let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const { createClient } = supabase; // from CDN global
  _supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
  return _supabase;
}

/* ═══════════════════════════════════════════════════════
   AUTH STATE
════════════════════════════════════════════════════════ */
let currentUser  = null;
let authMode     = 'signin'; // 'signin' | 'signup'

async function initAuth() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) { currentUser = session.user; showApp(); }
  else showAuthScreen();

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) showApp();
    else showAuthScreen();
  });
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display  = 'flex';
  document.getElementById('app-wrapper').style.display  = 'none';
  document.getElementById('past-cases-panel').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('app-wrapper').style.display  = 'block';
  renderUserChip();
  subscribeToRealtimeCases();
}

function renderUserChip() {
  const chip = document.getElementById('user-chip');
  if (!chip || !currentUser) return;
  chip.textContent = (currentUser.email || '').split('@')[0];
}

function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  const isSignUp = authMode === 'signup';
  document.getElementById('btn-auth-submit').textContent    = isSignUp ? 'Create Account' : 'Sign In';
  document.getElementById('auth-sub').textContent           = isSignUp ? 'Create your account' : 'Flosswork Dental Clinic · Sign in to continue';
  document.getElementById('auth-toggle-text').textContent   = isSignUp ? 'Already have an account?' : "Don't have an account?";
  document.querySelector('.auth-toggle-btn').textContent    = isSignUp ? 'Sign In' : 'Sign Up';
  setAuthError('');
}

function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = msg ? 'block' : 'none';
}

async function handleForgotPassword() {
  const email = document.getElementById('auth-email')?.value.trim();
  if (!email) { setAuthError('Enter your email address first.'); return; }
  setAuthError('');
  setAuthSuccess('');

  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });

  if (error) setAuthError(error.message);
  else setAuthSuccess('✓ Password reset email sent — check your inbox.');
}

async function handleAuthSubmit() {
  const sb       = getSupabase();
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const btn      = document.getElementById('btn-auth-submit');

  if (!email || !password) { setAuthError('Please enter both email and password.'); return; }
  if (password.length < 6) { setAuthError('Password must be at least 6 characters.'); return; }

  btn.disabled  = true;
  btn.textContent = authMode === 'signup' ? 'Creating account…' : 'Signing in…';
  setAuthError('');

  let error;
  if (authMode === 'signup') {
    ({ error } = await sb.auth.signUp({ email, password }));
    if (!error) {
      setAuthError('');
      // Auto sign in after signup
      ({ error } = await sb.auth.signInWithPassword({ email, password }));
    }
  } else {
    ({ error } = await sb.auth.signInWithPassword({ email, password }));
  }

  if (error) {
    setAuthError(error.message);
    btn.disabled    = false;
    btn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
  }
}

async function signOut() {
  await getSupabase().auth.signOut();
}

/* ═══════════════════════════════════════════════════════
   SUPABASE — SAVE CASE
════════════════════════════════════════════════════════ */
async function saveCase() {
  if (!currentUser) return;
  if (!S.lastResult) return;

  const sb = getSupabase();
  const patientName     = document.getElementById('patient-name')?.value.trim() || '';
  const patientAge      = document.getElementById('patient-age')?.value  || null;
  const patientSex      = document.getElementById('patient-sex')?.value  || null;
  const patientWhatsapp = document.getElementById('patient-whatsapp')?.value.trim() || null;
  const r = S.lastResult;

  const payload = {
    user_id:        currentUser.id,
    patient_name:   patientName,
    patient_age:    patientAge ? parseInt(patientAge) : null,
    patient_sex:    patientSex,
    patient_whatsapp: patientWhatsapp,
    severity:       r.severity,
    mds_score:      r.mds,
    bss_score:      r.bss.score,
    bss_label:      r.bss.label,
    rls_score:      r.rls.score,
    rls_label:      r.rls.label,
    tsi_score:      r.tsi.score,
    tsi_label:      r.tsi.label,
    archetype:      r.archetype,
    aligners_min:   r.aligners.totalMin,
    aligners_max:   r.aligners.totalMax,
    duration_low:   r.duration.lowerMonths,
    duration_high:  r.duration.upperMonths,
    confidence:     r.confidence.score,
    confidence_label: r.confidence.label,
    retention_level: r.retention.level,
    auxiliaries:    r.auxiliaries,
    selected_plans:     S.plans,
    params:             Object.fromEntries(PARAMS.map(p => [p, S[p]])),
    explainability:     r.explainability,
    conversion_status:  S.conversionStatus || 'fresh',
    provider:           S.provider || null,
    internal_note:      document.getElementById('internal-note')?.value.trim() || null
  };

  console.log('SAVE PAYLOAD', { conversion_status: payload.conversion_status, provider: payload.provider, internal_note: payload.internal_note });
  setSaveBadge('Saving…', 'saving');

  try {
    if (S.caseId) {
      const { error } = await sb.from('cases').update(payload).eq('id', S.caseId).eq('user_id', currentUser.id);
      if (error) throw error;
      S.caseSaved = true;
      S.lastSyncedAt = new Date().toISOString();
      console.log('CASE UPDATED', { id: S.caseId, conversion_status: payload.conversion_status });
      setSaveBadge('✓ Saved', 'saved');
      clearPendingSync();
    } else {
      const { data: inserted, error } = await sb.from('cases').insert(payload).select('id').single();
      if (error) throw error;
      S.caseSaved = true;
      if (inserted) S.caseId = inserted.id;
      S.lastSyncedAt = new Date().toISOString();
      console.log('CASE SAVED', { id: inserted.id, conversion_status: payload.conversion_status });
      setSaveBadge('✓ Saved', 'saved');
      clearPendingSync();
    }
  } catch (error) {
    console.error('SAVE ERROR', error);
    setSaveBadge('Save failed', 'error');
    storePendingSync(payload);
    setTimeout(() => setSaveBadge('Not Saved', 'not-saved'), 3000);
  }
}

function setSaveBadge(text, state) {
  document.querySelectorAll('.save-badge').forEach(b => {
    b.textContent   = text;
    b.className     = 'save-badge ' + state;
    b.style.display = 'inline-block';
  });
  const saveBtn = document.getElementById('btn-save-case');
  if (saveBtn) {
    if (state === 'saved') {
      saveBtn.textContent = '✓ Saved';
      saveBtn.classList.add('saved');
      saveBtn.disabled = true;
    } else if (state === 'saving') {
      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;
    } else {
      saveBtn.textContent = 'Save';
      saveBtn.classList.remove('saved');
      saveBtn.disabled = false;
    }
  }
}

function storePendingSync(payload) {
  try {
    const pending = { payload, caseId: S.caseId };
    localStorage.setItem('pending_case_sync', JSON.stringify(pending));
    console.log('SYNC QUEUED', { caseId: S.caseId });
  } catch (_) {}
}

function clearPendingSync() {
  localStorage.removeItem('pending_case_sync');
}

async function retryPendingSync() {
  try {
    const raw = localStorage.getItem('pending_case_sync');
    if (!raw || !currentUser) return;
    const { payload, caseId } = JSON.parse(raw);
    console.log('SYNC RETRY', { caseId });

    const sb = getSupabase();
    if (caseId) {
      const { error } = await sb.from('cases').update(payload).eq('id', caseId).eq('user_id', currentUser.id);
      if (error) throw error;
      S.caseId = caseId;
    } else {
      const { data: inserted, error } = await sb.from('cases').insert(payload).select('id').single();
      if (error) throw error;
      if (inserted) S.caseId = inserted.id;
    }
    S.lastSyncedAt = new Date().toISOString();
    clearPendingSync();
    console.log('SYNC SUCCESS', { id: caseId });
    setSaveBadge('✓ Synced', 'saved');
  } catch (error) {
    console.error('SYNC RETRY FAILED', error);
  }
}

function setConversionStatus(value) {
  S.conversionStatus = value || 'fresh';
  console.log('SET CONVERSION STATUS', value);

  // Update dropdown
  const dropdown = document.getElementById('conversion-status-select');
  if (dropdown) dropdown.value = value || '';

  // DB update (non-blocking)
  if (S.caseId && currentUser) {
    getSupabase()
      .from('cases')
      .update({ conversion_status: value || 'fresh' })
      .eq('id', S.caseId)
      .then(function(res) {
        console.log('CONVERSION STATUS UPDATED', value);
        var rec = pcData.find(function(c) { return c.id === S.caseId; });
        if (rec) rec.conversion_status = value || 'fresh';
      })
      .catch(e => console.error('CONVERSION UPDATE ERROR', e));
  }
}

function setProvider(value) {
  S.provider = value || '';
  console.log('SET PROVIDER', value);

  const dropdown = document.getElementById('provider-select');
  if (dropdown) dropdown.value = value || '';

  if (S.caseId && currentUser) {
    getSupabase()
      .from('cases')
      .update({ provider: value || null })
      .eq('id', S.caseId)
      .then(res => {
        console.log('PROVIDER UPDATED', value);
        var rec = pcData.find(c => c.id === S.caseId);
        if (rec) rec.provider = value || null;
      })
      .catch(e => console.error('PROVIDER UPDATE ERROR', e));
  }
}

/* ═══════════════════════════════════════════════════════
   SUPABASE — REALTIME SYNC
════════════════════════════════════════════════════════ */
let realtimeChannel = null;

function subscribeToRealtimeCases() {
  if (!currentUser || realtimeChannel) return;
  const sb = getSupabase();
  realtimeChannel = sb
    .channel('cases_' + currentUser.id)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cases',
        filter: 'user_id=eq.' + currentUser.id
      },
      handleRealtimeUpdate
    )
    .subscribe();
}

function handleRealtimeUpdate(payload) {
  if (payload.eventType === 'UPDATE' && payload.new) {
    const updated = payload.new;
    const idx = pcData.findIndex(c => c.id === updated.id);
    if (idx >= 0) {
      pcData[idx] = { ...pcData[idx], ...updated };
      if (S.caseId === updated.id && S.lastSyncedAt) {
        const remoteUpdatedAt = new Date(updated.updated_at).getTime();
        const localUpdatedAt = new Date(S.lastSyncedAt).getTime();
        if (remoteUpdatedAt > localUpdatedAt) {
          console.log('REMOTE UPDATE DETECTED', { caseId: updated.id });
          renderPastCasesList();
        } else {
          console.warn('STALE REMOTE UPDATE BLOCKED', { caseId: updated.id });
        }
      }
    }
  }
}

function unsubscribeRealtimeCases() {
  if (realtimeChannel) {
    getSupabase().removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

/* ═══════════════════════════════════════════════════════
   SUPABASE — PAST CASES PANEL
════════════════════════════════════════════════════════ */
let pcData        = [];   // cached past cases
let pcSortMode    = 'date'; // 'date' | 'name'
let pcFilterStatus = '';    // '' = all
let pcSelectedCase = null;  // currently selected case in tags bar

async function openPastCases() {
  const panel = document.getElementById('past-cases-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Reset filter
  pcFilterStatus = '';
  const filterSel = document.getElementById('pc-filter-select');
  if (filterSel) filterSel.value = '';

  const list = document.getElementById('past-cases-list');
  list.innerHTML = '<div class="pc-loading">Loading cases…</div>';

  if (!currentUser) {
    list.innerHTML = '<div class="pc-empty">Please sign in to view past cases.</div>';
    return;
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from('cases')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    list.innerHTML = `<div class="pc-empty">Error: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<div class="pc-empty">No cases saved yet. Complete a case and view its summary to save it.</div>';
    return;
  }

  pcData = data;
  renderPastCasesList();
}

function sortPastCases(mode) {
  pcSortMode = mode;
  document.getElementById('pc-sort-date').classList.toggle('active', mode === 'date');
  document.getElementById('pc-sort-name').classList.toggle('active', mode === 'name');
  renderPastCasesList();
}

function filterPastCases(status) {
  pcFilterStatus = status;
  renderPastCasesList();
}

function renderPastCasesList() {
  const list = document.getElementById('past-cases-list');
  if (!list || !pcData.length) return;

  let filtered = pcData;
  if (pcFilterStatus) {
    filtered = pcData.filter(c => (c.conversion_status || '') === pcFilterStatus);
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="pc-empty">No cases match this filter.</div>';
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    if (pcSortMode === 'name') return (a.patient_name || '').localeCompare(b.patient_name || '');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  list.innerHTML = sorted.map(c => {
    const date     = new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const sevClass = c.severity === 'advanced' ? 'severe' : (c.severity || 'default');
    const cJson    = JSON.stringify(c).replace(/"/g, '&quot;');
    const st       = CONVERSION_STATUSES.find(s => s.value === c.conversion_status);
    const statusBadge = st
      ? `<span class="pc-status-pill" style="background:${st.color}20;color:${st.color};border:1px solid ${st.color}40">${st.label}</span>`
      : '';
    return `
      <div class="pc-card" id="pc-card-${c.id}" onclick="loadCase(${cJson})">
        <div class="pc-card-top">
          <div>
            <div class="pc-name">${c.patient_name || 'Unnamed Patient'}</div>
            <div class="pc-meta">${c.patient_age ? c.patient_age + ' yrs · ' : ''}${c.patient_sex || ''} · ${date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:7px;flex-shrink:0">
            <div class="pc-sev-pill ${sevClass}">${c.severity ? c.severity.charAt(0).toUpperCase() + c.severity.slice(1) : '—'}</div>
            ${statusBadge}
            <button class="pc-share" title="Clinician Report PDF" onclick="shareCasePDF(${cJson}, event)">Clinician</button>
            <button class="pc-delete" title="Delete case" onclick="deleteCase('${c.id}', event)">✕</button>
          </div>
        </div>
        <div class="pc-scores">
          <span>MDS <strong>${c.mds_score}</strong></span>
          <span>Aligners <strong>${c.aligners_min}–${c.aligners_max}</strong></span>
          <span>Duration <strong>${c.duration_low}–${c.duration_high} mo</strong></span>
        </div>
        ${(c.provider) ? `<div style="margin-top:8px;font-size:11px"><span style="padding:3px 8px;background:var(--surface2);border-radius:4px;color:var(--text-secondary)">Provider: ${c.provider}</span></div>` : ''}
      </div>`;
  }).join('');
}

async function shareCasePDF(c, event) {
  event.stopPropagation();
  const btn = event.currentTarget;
  btn.textContent = '…';
  btn.disabled    = true;

  // Load case into state and recompute
  if (c.params) PARAMS.forEach(p => { S[p] = c.params[p] ?? null; });
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('patient-name',     c.patient_name);
  setVal('patient-age',      c.patient_age);
  setVal('patient-sex',      c.patient_sex);
  setVal('patient-whatsapp', c.patient_whatsapp);
  S.plans = Array.isArray(c.selected_plans) ? [...c.selected_plans] : [];
  recalculate();
  S.caseSaved = true;
  setSaveBadge('✓ Saved', 'saved');

  const r = S.lastResult;
  if (!r) { btn.textContent = 'Clinician'; btn.disabled = false; return; }

  // Build dedicated off-screen clinician report element
  const el = buildClinicianPDFElement(c, r);
  document.body.appendChild(el);

  try {
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData  = canvas.toDataURL('image/png');
    const margin   = 8;
    const pdfWidth = 180;
    const contentW = pdfWidth - margin * 2;
    const ratio    = contentW / canvas.width;
    const imgH     = canvas.height * ratio;
    const pdf      = new jsPDF('p', 'mm', [pdfWidth, imgH + margin * 2]);
    pdf.addImage(imgData, 'PNG', margin, margin, contentW, imgH);
    pdf.save(`${c.patient_name || 'Patient'}_Clinician_Report.pdf`);
  } finally {
    document.body.removeChild(el);
    btn.textContent = 'Clinician';
    btn.disabled    = false;
  }
}

function buildClinicianPDFElement(c, r) {
  const { mds, bss, rls, tsi, archetype, aligners, duration, retention, confidence, explainability, auxiliaries, severity } = r;
  const sevLabel = severityLabel(severity, S.severityPlus);
  const date     = new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

  const row = (label, value) =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
       <span style="font-size:11px;color:#666">${label}</span>
       <span style="font-size:11px;font-weight:600;color:#111;text-align:right;max-width:55%">${value}</span>
     </div>`;

  const card = (title, body) =>
    `<div style="background:#f9f8f6;border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid #e8e6e0">
       <div style="font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;margin-bottom:8px">${title}</div>
       ${body}
     </div>`;

  const pill = (text, color) =>
    `<span style="display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:${color}20;color:${color};border:1px solid ${color}30;margin:2px 3px 2px 0">${text}</span>`;

  const bssColor  = bss.score >= 80 ? '#22a25a' : bss.score >= 60 ? '#d97706' : '#dc2626';
  const rlsColor  = rls.score <= 20 ? '#22a25a' : rls.score <= 45 ? '#d97706' : '#dc2626';
  const tsiColor  = tsi.score <= 20 ? '#22a25a' : tsi.score <= 40 ? '#d97706' : '#dc2626';
  const confColor = confidence.score >= 80 ? '#22a25a' : confidence.score >= 60 ? '#d97706' : '#dc2626';

  const html = `
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #111">
      <div>
        <div style="font-size:16px;font-weight:700;letter-spacing:-.3px">${CONFIG.clinic.name}</div>
        <div style="font-size:10px;color:#888;margin-top:1px">${CONFIG.clinic.tagline} · AlignerIQ Clinician Report</div>
      </div>
      <div style="font-size:10px;color:#888">${date}</div>
    </div>

    <!-- Patient row -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div>
        <div style="font-size:18px;font-weight:700;letter-spacing:-.3px">${c.patient_name || 'Unnamed Patient'}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${c.patient_age ? c.patient_age + ' yrs · ' : ''}${c.patient_sex || ''}${c.patient_whatsapp ? ' · ' + c.patient_whatsapp : ''}</div>
      </div>
      <div style="font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;background:#111;color:#fff">${sevLabel}</div>
    </div>

    <!-- A: Complexity Drivers -->
    ${card('A · Complexity Drivers',
      explainability.map(d =>
        `<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid #eee">
           <div style="width:5px;height:5px;border-radius:50%;background:#6366f1;flex-shrink:0"></div>
           <div style="font-size:11px;color:#111">${d}</div>
         </div>`
      ).join('')
    )}

    <!-- B: Patient Output -->
    ${card('B · Patient Summary',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
         <div style="padding:6px 0 8px;border-bottom:1px solid #eee">
           <div style="font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#888;margin-bottom:3px">Aligners</div>
           <div style="font-size:18px;font-weight:700;color:#111">${aligners.totalMin}–${aligners.totalMax}</div>
         </div>
         <div style="padding:6px 0 8px 12px;border-bottom:1px solid #eee;border-left:1px solid #eee">
           <div style="font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#888;margin-bottom:3px">Duration</div>
           <div style="font-size:18px;font-weight:700;color:#111">${duration.lowerMonths}–${duration.upperMonths} <span style="font-size:11px;font-weight:500">mo</span></div>
         </div>
         <div style="padding:8px 0 0">
           <div style="font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#888;margin-bottom:2px">Predictability</div>
           <div style="font-size:12px;font-weight:600;color:#111">${confidence.score}% · ${confidence.label}</div>
         </div>
         <div style="padding:8px 0 0;padding-left:12px;border-left:1px solid #eee">
           <div style="font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#888;margin-bottom:2px">Retention</div>
           <div style="font-size:12px;font-weight:600;color:#111">Level ${retention.level} · ${retention.fullTime}</div>
         </div>
       </div>
       ${auxiliaries.length > 0 ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #eee">
         <div style="font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#888;margin-bottom:5px">Auxiliaries</div>
         <div>${auxiliaries.map(a => `<span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px;background:#f0eeff;color:#6366f1;border:1px solid #e0deff;margin:2px 3px 2px 0">${a}</span>`).join('')}</div>
       </div>` : ''}`
    )}

    <!-- C: Case Overview -->
    ${card('C · Case Overview',
      row('Primary Archetype', archetype) +
      row('Mechanical Difficulty (MDS)', `${mds} / 100`) +
      row('Confidence', `${confidence.score}% &nbsp;${pill(confidence.label, confColor)}`)
    )}

    <!-- D: Biologic & Treatment Behaviour -->
    ${card('D · Biologic &amp; Treatment Behaviour',
      row('Biological Stability (BSS)', `${bss.score} &nbsp;${pill(bss.label, bssColor)}`) +
      row('Tracking Sensitivity (TSI)', `${tsi.score} &nbsp;${pill(tsi.label, tsiColor)}`) +
      row('Refinement Likelihood (RLS)', `${rls.score} &nbsp;${pill(rls.label, rlsColor)}`)
    )}

    <!-- E: Aligner Burden -->
    ${card('E · Aligner Burden',
      row('Initial aligners', aligners.initial) +
      row('Total (incl. optimisation)', `${aligners.totalMin}–${aligners.totalMax}`)
    )}

    <!-- F: Duration Analysis -->
    ${card('F · Duration Analysis',
      row('Lower limit', `${duration.lowerMonths} months`) +
      row('Upper limit', `${duration.upperMonths} months`) +
      row('Refinement delay', duration.refinementDelay) +
      row('Tracking delay', duration.trackingDelay)
    )}

    <!-- G: Retention Protocol -->
    ${card('G · Retention Protocol',
      row('Protocol level', `Level ${retention.level}`) +
      row('Full-time wear', retention.fullTime) +
      row('Night-time wear', retention.nightTime)
    )}

    <a href="tel:${CONFIG.clinic.phone}" style="display:block;margin-top:14px;padding:12px;background:linear-gradient(135deg, #1a1916, #2a2925);border-radius:10px;text-decoration:none;cursor:pointer;text-align:center">
      <span style="color:#fff;font-size:12px;font-weight:600">Call Now · </span><span style="color:#fff;font-size:16px;font-weight:700">${CONFIG.clinic.phone}</span>
    </a>

    <div style="font-size:9px;color:#aaa;text-align:center;margin-top:8px;padding-top:8px;border-top:1px solid #eee">
      ⚕️ For clinical use only. Final plan may vary after full records. · ${CONFIG.clinic.name} · AlignerIQ
    </div>`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;width:540px;background:#fff;padding:24px;box-sizing:border-box;font-family:"DM Sans",sans-serif;';
  wrapper.innerHTML = html;
  return wrapper;
}

function closePastCases() {
  const panel = document.getElementById('past-cases-panel');
  if (panel) panel.style.display = 'none';
  pcSelectedCase = null;
  document.body.style.overflow = '';
}

async function deleteCase(id, event) {
  event.stopPropagation();
  if (!confirm('Delete this case? This cannot be undone.')) return;

  const sb = getSupabase();
  const { error } = await sb.from('cases').delete().eq('id', id).eq('user_id', currentUser.id);

  if (error) {
    alert('Delete failed: ' + error.message);
    return;
  }

  pcData = pcData.filter(c => c.id !== id);
  if (pcData.length === 0) {
    document.getElementById('past-cases-list').innerHTML =
      '<div class="pc-empty">No cases saved yet. Complete a case and view its summary to save it.</div>';
  } else {
    renderPastCasesList();
  }
}

function loadCase(c) {
  // Restore all params from the saved case
  if (c.params) {
    PARAMS.forEach(p => {
      S[p] = c.params[p] ?? null;
      const card = document.getElementById('pc-' + p);
      if (!card) return;
      card.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      card.classList.remove('selected');
      if (S[p]) {
        const btn = card.querySelector(`.seg-btn[data-val="${S[p]}"]`);
        if (btn) { btn.classList.add('active'); card.classList.add('selected'); }
      }
    });
  }

  // Restore patient details
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('patient-name', c.patient_name);
  setVal('patient-age',  c.patient_age);
  setVal('patient-sex',  c.patient_sex);
  setVal('patient-whatsapp', c.patient_whatsapp);
  setVal('internal-note', c.internal_note || '');

  // Restore plans
  S.plans = Array.isArray(c.selected_plans) ? [...c.selected_plans] : [];
  renderPlanCards();

  // Restore conversion status and provider
  S.caseId           = c.id;
  S.conversionStatus = c.conversion_status || 'fresh';
  S.provider         = c.provider || '';
  const dropdown = document.getElementById('conversion-status-select');
  if (dropdown) dropdown.value = S.conversionStatus;
  const providerDropdown = document.getElementById('provider-select');
  if (providerDropdown) providerDropdown.value = S.provider;

  console.log('LOADED CASE', { caseId: c.id, conversion_status: c.conversion_status, provider: c.provider, internal_note: c.internal_note });

  pcSelectedCase = c;

  closePastCases();
  recalculate();

  // Mark as already saved — it was loaded from DB
  S.caseSaved = true;
  setSaveBadge('✓ Saved', 'saved');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {
  // Initialise input-page save badge
  const mainBadge = document.getElementById('save-badge-main');
  if (mainBadge) { mainBadge.textContent = 'Not Saved'; mainBadge.className = 'save-badge not-saved'; }

  const headerLogo = document.getElementById('clinic-logo-img');
  const headerPh   = document.getElementById('clinic-logo-ph');
  if (headerLogo) {
    headerLogo.src = CONFIG.clinic.logoFile;
    headerLogo.style.display = 'block';
    headerLogo.onerror = () => { headerLogo.style.display = 'none'; };
    if (headerPh) headerPh.style.display = 'none';
  }

  loadPersistedState();
  recalculate();

  ['patient-name', 'patient-age', 'patient-sex', 'patient-whatsapp', 'internal-note', 'conversion-status-select'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input',  persistState);
    el?.addEventListener('change', persistState);
  });

  // Offline retry
  window.addEventListener('online', retryPendingSync);

  // Boot Supabase auth
  initAuth();
});
