/* ═══════════════════════════════════════════════════════
   app.js — Flosswork Aligner Classifier
   ─────────────────────────────────────────────────────
   HOW TO EDIT:
   • Clinic name, phone, tagline  →  CONFIG.clinic
   • Scoring thresholds           →  CONFIG.scoring
   • Penalty points               →  CONFIG.scoring.penaltyPoints
   • Override rules               →  determineSeverity()
   • Pricing                      →  CONFIG.pricing
   • Severity descriptions        →  CONFIG.severityDescriptions
   • Plan features / metadata     →  CONFIG.planMeta
   • Parameter weights            →  CONFIG.weights
════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   CONFIG  ← all user-editable content lives here
════════════════════════════════════════════════════════ */
const CONFIG = {

  // ── Clinic branding ──────────────────────────────────
  clinic: {
    name:    'Flosswork Dental Clinic',   // shown in header + summary
    tagline: 'Clearly Better.',      // shown below name
    phone:   '+91-8354088822',            // shown in summary phone CTA
    logoFile:'logo.png',                  // filename in same folder as index.html
    storageKey: 'aligneriq_v3'            // localStorage key
  },

  // ── Scoring thresholds ───────────────────────────────
  scoring: {
    mildMax:     13,    // score ≤ this → Mild
    moderateMax: 19.5,  // score ≤ this → Moderate  (above = Severe)
    penaltyPoints: 2    // points added per selected penalty
  },

  // ── Parameter weights (multipliers) ─────────────────
  weights: {
    crowding:   1,
    rotation:   1.5,
    movement:   2,
    bite:       2,
    aux:        1,
    ipr:        2,
    compliance: 1
  },

  // ── Severity card short descriptions ─────────────────
  severityDescriptions: {
    mild:     'Straightforward · Good predictability · 8-10 months',
    moderate: 'Standard complexity · 1–2 refinements · 10-12 months',
    severe:   'Advanced case · Multiple stages · 12-18 months'
  },

  // ── Score banner breakdown label ─────────────────────
  scoreBannerLabel: '≤13 Mild · 13.5–19.5 Mod · ≥20 Severe',

  // ── Pricing matrix (changes per severity) ────────────
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
    }
  },

  // ── Plan card metadata (summary card features list) ──
  planMeta: {
    budget: { tier:'Plan 01',     pill:'Basic',         features:['Best for minor corrections & tight budgets','Suitable for simple alignment','Affordable treatment'] },
    ace:    { tier:'Plan 02',     pill:'Most Popular',  features:['Most popular choice for balanced results','Better precision results','Balanced value'] },
    luxe:   { tier:'Plan 03',     pill:'Premium',       features:['Best for complete smile transformation','Handles complex cases','Unlimited aligners'] },
    invis:  { tier:'Invisalign®', pill:'Gold standard', features:['Premium global system with highest precision','High accuracy & comfort','Most advanced'] }
  }
};

/* ═══════════════════════════════════════════════════════
   STATE — runtime data, never edit directly
════════════════════════════════════════════════════════ */
const S = {
  // Clinical param values (null = not yet selected)
  crowding:   null,
  rotation:   null,
  movement:   null,
  bite:       null,
  aux:        null,
  ipr:        null,
  compliance: null,

  // Predictability penalties (each adds CONFIG.scoring.penaltyPoints)
  penalties: {
    intrusion: false,
    root:      false,
    canine:    false,
    impaction: false
  },

  // Advanced auxiliaries — display only, no score impact
  auxDevices: {
    mad:  false,
    tads: false
  },

  severity:    null,   // 'mild' | 'moderate' | 'severe' | null
  plans:       [],     // ordered array of selected plan keys
  logoDataURL: null    // base64 if user uploads a custom logo
};

// Ordered list used for iteration and progress dots
const PARAMS = ['crowding','rotation','movement','bite','aux','ipr','compliance'];

/* ═══════════════════════════════════════════════════════
   DOM REFERENCES — cached once on load
════════════════════════════════════════════════════════ */
const DOM = {
  // Score banner
  scoreDisplay:   document.getElementById('score-display'),
  categoryBadge:  document.getElementById('category-badge'),
  scoreBreakdown: document.getElementById('score-breakdown'),
  ctaChip:        document.getElementById('cta-chip'),

  // Main severity card
  severityResult: document.getElementById('severity-result'),
  sevTag:         document.getElementById('sev-tag'),
  sevTitle:       document.getElementById('sev-title'),
  sevDesc:        document.getElementById('sev-desc'),
  sevScoreNum:    document.getElementById('sev-score-num'),

  // Progress bar
  progressLabel:  document.getElementById('progress-label'),
  progDots:       PARAMS.map((_, i) => document.getElementById('pd' + i)),

  // Treatment option price elements
  txBudgetLabel:  document.getElementById('tx-budget-plan'),
  txAceLabel:     document.getElementById('tx-ace-plan'),
  txLuxeLabel:   document.getElementById('tx-luxe-plan'),
  txInvisLabel:   document.getElementById('tx-invis-plan'),

  // Summary modal
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
  scSevNum:       document.getElementById('sc-sev-num'),
  scTxGrid:       document.getElementById('sc-tx-grid'),
  scAuxTags:      document.getElementById('sc-aux-tags'),
  btnShare:       document.getElementById('btn-share')
};

/* ═══════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */

// Capitalise first letter of a string
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Maps a raw score to a severity category string */
function scoreToCategory(score) {
  if (score <= CONFIG.scoring.mildMax)     return 'mild';
  if (score <= CONFIG.scoring.moderateMax) return 'moderate';
  return 'severe';
}

/* ═══════════════════════════════════════════════════════
   SCORING ENGINE
════════════════════════════════════════════════════════ */

/** Weighted sum of all param values + penalty points */
function calculateScore() {
  const base         = PARAMS.reduce((sum, p) => sum + (S[p] * CONFIG.weights[p]), 0);
  const penaltyCount = Object.values(S.penalties).filter(Boolean).length;
  return base + (penaltyCount * CONFIG.scoring.penaltyPoints);
}

/**
 * Override rules applied on top of the numeric score:
 *   ipr=3  (Extraction)       → always Severe
 *   bite=3 (Class II/III)     → always Severe
 *   aux=3  (Elastics/TAD)     → minimum Moderate
 */
function determineSeverity(score) {
  if (S.ipr === 3 || S.bite === 3) return 'severe';
  if (S.aux === 3) {
    const base = scoreToCategory(score);
    return base === 'mild' ? 'moderate' : base;
  }
  return scoreToCategory(score);
}

/* ═══════════════════════════════════════════════════════
   UI UPDATERS
════════════════════════════════════════════════════════ */

/** Fills the score banner after all params are complete */
function updateScoreBanner(score, cat) {
  DOM.scoreDisplay.textContent   = score;
  DOM.scoreBreakdown.textContent = CONFIG.scoreBannerLabel;
  DOM.ctaChip.textContent        = `Score: ${score} · ${cap(cat)}`;
  DOM.categoryBadge.textContent  = cap(cat);
  DOM.categoryBadge.className    = `score-category ${cat}`;
}

/** Resets score banner when params are incomplete */
function clearScoreBanner() {
  DOM.scoreDisplay.textContent   = '—';
  DOM.categoryBadge.textContent  = 'Incomplete';
  DOM.categoryBadge.className    = 'score-category';
  DOM.scoreBreakdown.textContent = 'Fill all parameters';
  DOM.ctaChip.textContent        = 'Score: —';
}

/** Updates the main-page severity result card */
function updateSeverityCard(cat, score) {
  DOM.severityResult.className = `severity-card${cat ? ' ' + cat : ''}`;
  if (!cat) {
    DOM.sevTag.textContent      = 'Awaiting Score';
    DOM.sevTitle.textContent    = '—';
    DOM.sevDesc.textContent     = 'Complete all 7 parameters to classify';
    DOM.sevScoreNum.textContent = '—';
    return;
  }
  DOM.sevTag.textContent      = 'Case Severity';
  DOM.sevTitle.textContent    = cap(cat);
  DOM.sevDesc.textContent     = CONFIG.severityDescriptions[cat];
  DOM.sevScoreNum.textContent = score;
}

/** Updates prices on all 4 treatment option cards */
function updatePrices(cat) {
  const planKeys = ['budget', 'ace', 'luxe', 'invis'];
  if (!cat) {
    planKeys.forEach(p => {
      const el = document.getElementById('txp-' + p);
      if (el) { el.textContent = 'Score case first'; el.className = 'tx-price placeholder'; }
    });
    if (DOM.txBudgetLabel) DOM.txBudgetLabel.textContent = '—';
    if (DOM.txAceLabel) DOM.txAceLabel.textContent = '—';
    if (DOM.txLuxeLabel) DOM.txLuxeLabel.textContent = '—';
    if (DOM.txInvisLabel) DOM.txInvisLabel.textContent = '—';
    return;
  }
  const m = CONFIG.pricing[cat];
  planKeys.forEach(p => {
    const el = document.getElementById('txp-' + p);
    if (el) { el.textContent = m[p].price; el.className = 'tx-price'; }
  });
  if (DOM.txBudgetLabel) DOM.txBudgetLabel.textContent = 'Basic';
  if (DOM.txAceLabel) DOM.txAceLabel.textContent = 'Most Popular';
  if (DOM.txLuxeLabel) DOM.txLuxeLabel.textContent = 'Premium';
  if (DOM.txInvisLabel) DOM.txInvisLabel.textContent = m.invis.plan;
}

/** Fills/clears the 7 progress dots */
function updateProgress(filledCount) {
  DOM.progDots.forEach((dot, i) => {
    if (dot) dot.classList.toggle('done', i < filledCount);
  });
  DOM.progressLabel.textContent = `${filledCount} of 7 parameters selected`;
}

/** Syncs selected state and order numbers on treatment cards */
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

/* ═══════════════════════════════════════════════════════
   RECALCULATE — master update, called after any change
════════════════════════════════════════════════════════ */
function recalculate() {
  const filled = PARAMS.filter(p => S[p] !== null);
  updateProgress(filled.length);

  if (filled.length < 7) {
    clearScoreBanner();
    updateSeverityCard(null, null);
    updatePrices(null);
    S.severity = null;
    return;
  }

  const score = calculateScore();
  const cat   = determineSeverity(score);
  const sr    = Math.round(score * 10) / 10;

  S.severity = cat;
  updateScoreBanner(sr, cat);
  updateSeverityCard(cat, sr);
  updatePrices(cat);
}

/* ═══════════════════════════════════════════════════════
   EVENT HANDLERS
════════════════════════════════════════════════════════ */

/** Segmented button tap */
function selectParam(param, val, btn) {
  S[param] = val;
  btn.closest('.seg-group').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pc-' + param)?.classList.add('selected');
  recalculate();
  persistState();
}

/** Penalty chip tap */
function togglePenalty(key, el) {
  S.penalties[key] = !S.penalties[key];
  el.classList.toggle('active', S.penalties[key]);
  recalculate();
  persistState();
}

/** Advanced auxiliary chip tap */
function toggleAux(key, el) {
  S.auxDevices[key] = !S.auxDevices[key];
  el.classList.toggle('active', S.auxDevices[key]);
  persistState();
}

/** Treatment option card tap */
function togglePlan(key) {
  const idx = S.plans.indexOf(key);
  if (idx === -1) S.plans.push(key);
  else S.plans.splice(idx, 1);
  renderPlanCards();
  persistState();
}

/** Clinic logo file upload (kept for backward compat, not triggered by UI currently) */
function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    S.logoDataURL = ev.target.result;
    const img = document.getElementById('clinic-logo-img');
    if (img) { img.src = S.logoDataURL; img.style.display = 'block'; }
    const ph  = document.getElementById('clinic-logo-ph');
    if (ph)  ph.style.display = 'none';
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

/** Populates all fields in the summary card before opening */
function populateSummaryCard() {
  const pName = document.getElementById('patient-name')?.value.trim() || 'Patient';
  const age   = document.getElementById('patient-age')?.value  || '—';
  const sex   = document.getElementById('patient-sex')?.value  || '—';
  const cat   = S.severity;
  const score = DOM.scoreDisplay.textContent;

  // Clinic branding (from CONFIG)
  DOM.scClinicName.textContent = CONFIG.clinic.name;
  DOM.scClinicTag.textContent  = CONFIG.clinic.tagline;
  DOM.scDate.textContent = new Date().toLocaleDateString('en-IN', {
    day:'numeric', month:'short', year:'numeric'
  });

  // Logo — uploaded image takes priority, else logo.png, else placeholder
  DOM.scLogoPh.textContent   = CONFIG.clinic.name.charAt(0).toUpperCase();
  DOM.scLogoPh.style.display = 'none';
  DOM.scLogoImg.src          = S.logoDataURL || CONFIG.clinic.logoFile;
  DOM.scLogoImg.style.display = 'block';
  DOM.scLogoImg.onerror = () => {
    DOM.scLogoImg.style.display = 'none';
    DOM.scLogoPh.style.display  = 'block';
  };

  // Patient
  DOM.scPatientName.textContent = pName;
  DOM.scPatientMeta.textContent = `Age ${age} · ${sex}`;

  // Severity pill
  DOM.scSevPill.textContent = cat ? cap(cat) : '—';
  DOM.scSevPill.className   = `sc-sev-pill ${cat || 'default'}`;

  // Severity card
  DOM.scSeverityCard.className = `sc-severity-card${cat ? ' ' + cat : ''}`;
  DOM.scSevTag.textContent     = cat ? 'Case Severity' : 'Awaiting Score';
  DOM.scSevTitle.textContent   = cat ? cap(cat) : '—';
  DOM.scSevDesc.textContent    = cat ? CONFIG.severityDescriptions[cat] : 'Complete all parameters to classify';
  DOM.scSevNum.textContent     = (cat && score !== '—') ? score : '—';

  renderSummaryPlans(cat);
  renderSummaryAuxTags();

  // Phone CTA (from CONFIG)
  const phoneCta = document.querySelector('.sc-phone-cta');
  if (phoneCta) phoneCta.textContent = `📞 Call Clinic: ${CONFIG.clinic.phone}`;
}

/** Builds the plan cards grid in the summary */
function renderSummaryPlans(cat) {
  if (S.plans.length === 0) {
    DOM.scTxGrid.innerHTML = '<div class="sc-no-plans" style="grid-column:1/-1">No plans selected</div>';
    return;
  }
  const m = cat ? CONFIG.pricing[cat] : null;
  DOM.scTxGrid.innerHTML = S.plans.map((p, i) => {
    const isInvis   = p === 'invis';
    const isAce     = p === 'ace';
    const isLuxe    = p === 'luxe';
    const meta      = CONFIG.planMeta[p];
    const label     = m ? m[p].label : cap(p);
    const price     = m ? m[p].price : '—';
    const cardClass = ['sc-tx-card', isAce ? 'ace' : '', isInvis ? 'invis' : '', isLuxe ? 'luxe' : ''].filter(Boolean).join(' ');
    // First plan gets "Recommended" ribbon; others get order number
    const badge = i === 0
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

/** Shows aux device tags in summary (only if any selected) */
function renderSummaryAuxTags() {
  const active = [];
  if (S.auxDevices.mad)      active.push('MAD Device');
  if (S.auxDevices.tads)     active.push('TADs');
  if (S.penalties.impaction) active.push('Impaction');
  if (active.length) {
    DOM.scAuxTags.style.display = 'flex';
    DOM.scAuxTags.innerHTML = active.map(a => `<span class="sc-aux-tag">⚙️ ${a}</span>`).join('');
  } else {
    DOM.scAuxTags.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════
   SHARE / DOWNLOAD
════════════════════════════════════════════════════════ */

/**
 * Captures #summary-card as PNG via html2canvas.
 * Uses Web Share API on mobile; falls back to download.
 */
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
    const blob  = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const pName = (document.getElementById('patient-name')?.value.trim() || 'case').replace(/\s+/g, '-');
    const fileName = `FlossworkDental-${pName}.png`;
    const file  = new File([blob], fileName, { type: 'image/png' });

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
function resetAll() {
  // Clear state
  PARAMS.forEach(k => S[k] = null);
  Object.keys(S.penalties).forEach(k  => S.penalties[k]  = false);
  Object.keys(S.auxDevices).forEach(k => S.auxDevices[k] = false);
  S.severity    = null;
  S.plans       = [];
  S.logoDataURL = null;

  // Clear UI selections
  document.querySelectorAll('.seg-btn').forEach(b    => b.classList.remove('active'));
  document.querySelectorAll('.param-card').forEach(c  => c.classList.remove('selected'));
  document.querySelectorAll('.penalty-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.aux-chip').forEach(c    => c.classList.remove('active'));
  document.querySelectorAll('.tx-card').forEach(c     => c.classList.remove('selected'));

  // Clear patient fields
  ['patient-name', 'patient-age', 'patient-sex'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Restore logo.png (don't hide on reset)
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
   PERSISTENCE — save/load state via localStorage
════════════════════════════════════════════════════════ */
function persistState() {
  try {
    localStorage.setItem(CONFIG.clinic.storageKey, JSON.stringify({
      params:      Object.fromEntries(PARAMS.map(p => [p, S[p]])),
      penalties:   { ...S.penalties },
      auxDevices:  { ...S.auxDevices },
      plans:       [ ...S.plans ],
      logoDataURL: S.logoDataURL,
      patient: {
        name: document.getElementById('patient-name')?.value || '',
        age:  document.getElementById('patient-age')?.value  || '',
        sex:  document.getElementById('patient-sex')?.value  || ''
      }
    }));
  } catch (_) { /* storage full — silently ignore */ }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(CONFIG.clinic.storageKey);
    if (!raw) return;
    const d = JSON.parse(raw);

    // Params
    if (d.params) {
      PARAMS.forEach(p => {
        if (!d.params[p]) return;
        S[p] = d.params[p];
        const card = document.getElementById('pc-' + p);
        const btn  = card?.querySelector(`.seg-btn[data-val="${d.params[p]}"]`);
        if (btn) { btn.classList.add('active'); card.classList.add('selected'); }
      });
    }

    // Penalties
    if (d.penalties) {
      Object.keys(d.penalties).forEach(k => {
        if (!(k in S.penalties)) return;
        S.penalties[k] = d.penalties[k];
        if (d.penalties[k]) document.getElementById('pen-' + k)?.classList.add('active');
      });
    }

    // Aux devices
    if (d.auxDevices) {
      Object.keys(d.auxDevices).forEach(k => {
        if (!(k in S.auxDevices)) return;
        S.auxDevices[k] = d.auxDevices[k];
        if (d.auxDevices[k]) document.getElementById('aux-' + k)?.classList.add('active');
      });
    }

    // Plans
    if (Array.isArray(d.plans)) {
      S.plans = [...d.plans];
      renderPlanCards();
    }

    // Uploaded logo
    if (d.logoDataURL) {
      S.logoDataURL = d.logoDataURL;
      const img = document.getElementById('clinic-logo-img');
      const ph  = document.getElementById('clinic-logo-ph');
      if (img) { img.src = d.logoDataURL; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
    }

    // Patient fields
    if (d.patient) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      set('patient-name', d.patient.name);
      set('patient-age',  d.patient.age);
      set('patient-sex',  d.patient.sex);
    }
  } catch (_) { /* corrupted data — silently ignore */ }
}

/* ═══════════════════════════════════════════════════════
   INIT — runs once DOM is ready
════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {

  // Load logo.png for header
  const headerLogo = document.getElementById('clinic-logo-img');
  const headerPh   = document.getElementById('clinic-logo-ph');
  if (headerLogo) {
    headerLogo.src = CONFIG.clinic.logoFile;
    headerLogo.style.display = 'block';
    headerLogo.onerror = () => { headerLogo.style.display = 'none'; };
    if (headerPh) headerPh.style.display = 'none';
  }

  // Restore persisted session
  loadPersistedState();
  recalculate();

  // Auto-save when patient fields change
  ['patient-name', 'patient-age', 'patient-sex'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input',  persistState);
    el?.addEventListener('change', persistState);
  });
});
