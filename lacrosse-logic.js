'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// DATA — Risk dimensions (Section 2.1)
// ─────────────────────────────────────────────────────────────────────────────

const RISK_DIMENSIONS = [
  {
    id: 'impact-scope',
    label: 'Impact Scope',
    lowDesc: '1 = Single non-critical component',
    highDesc: '5 = Multiple critical business services',
  },
  {
    id: 'complexity',
    label: 'Complexity',
    lowDesc: '1 = Single config change',
    highDesc: '5 = Multi-system orchestrated deployment',
  },
  {
    id: 'reversibility',
    label: 'Reversibility',
    lowDesc: '1 = Instant automated rollback',
    highDesc: '5 = Irreversible (data migration, schema)',
  },
  {
    id: 'testing-confidence',
    label: 'Testing Confidence',
    lowDesc: '1 = Full automated test coverage',
    highDesc: '5 = No test environment available',
  },
  {
    id: 'deployment-history',
    label: 'Deployment History',
    lowDesc: '1 = Identical change succeeded 10×',
    highDesc: '5 = First-of-its-kind change',
  },
  {
    id: 'timing-sensitivity',
    label: 'Timing Sensitivity',
    lowDesc: '1 = Off-peak, low-traffic window',
    highDesc: '5 = Peak hours, month-end, launch day',
  },
  {
    id: 'dependency-count',
    label: 'Dependency Count',
    lowDesc: '1 = Zero external dependencies',
    highDesc: '5 = 5+ teams / external vendors involved',
  },
];

// Approval workflow steps verbatim from Section 4
const APPROVAL_WORKFLOWS = {
  Standard: [
    'Requester triggers pipeline',
    'Automated pre-checks (lint, test, scan)',
    'Auto-approved — change model match verified',
    'Deploy',
    'Automated validation',
    'Change record logged automatically',
  ],
  'Normal-Low': [
    'Requester submits RFC',
    'Automated risk scoring',
    'Peer review (1 reviewer, async)',
    'Approved → Scheduled in change calendar',
    'Deploy in approved window',
    'Validation',
    'Close RFC',
  ],
  'Normal-Medium': [
    'Requester submits RFC',
    'Automated risk scoring',
    'Technical review (architect or senior engineer)',
    'Change authority approval',
    'Scheduled in change calendar (with conflict check)',
    'Deploy with monitoring',
    'Validation + brief PIR',
    'Close RFC',
  ],
  'Normal-High': [
    'Requester submits RFC',
    'Automated risk scoring',
    'Technical review + security review',
    'Pre-CAB: documentation completeness check',
    'CAB review (weekly cadence or ad-hoc)',
    'Senior management sign-off',
    'Scheduled with communication plan',
    'Deploy with war-room / bridge call',
    'Validation + full PIR',
    'Close RFC',
  ],
  Emergency: [
    'Incident declared',
    'Emergency RFC created (minimal fields)',
    'ECAB approval (phone/chat, 2 approvers minimum)',
    'Implement immediately',
    'Validate service restored',
    'Retrospective RFC completion (within 48 h)',
    'Mandatory PIR',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * classifyChange
 * Implements the exact Classification Decision Tree from Section 1.3.
 *
 * Decision tree logic:
 *   Is service currently down or critically degraded?
 *   ├── YES → EMERGENCY
 *   └── NO  → Is this a pre-approved change model?
 *             ├── YES → STANDARD
 *             └── NO  → NORMAL
 *
 * @param {string} serviceDown  - "yes" | "no"
 * @param {string} preApproved  - "yes" | "no"
 * @returns {"Standard" | "Normal" | "Emergency"}
 */
function classifyChange(serviceDown, preApproved) {
  if (serviceDown === 'yes') {
    return 'Emergency';
  }
  if (preApproved === 'yes') {
    return 'Standard';
  }
  return 'Normal';
}

/**
 * assessRisk
 * Implements risk score calculation from Section 2.2.
 *
 * Formula:  composite_score = sum(dimensions) / count(dimensions)
 * Tiers:
 *   1.0 – 2.0  →  Low    (Peer review)
 *   2.1 – 3.5  →  Medium (Change authority)
 *   3.6 – 5.0  →  High   (Full CAB)
 *
 * @param {number[]} scores - Array of 7 integers, each 1–5
 * @returns {{ score: number, tier: "Low" | "Medium" | "High" }}
 */
function assessRisk(scores) {
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const score = sum / scores.length;

  let tier;
  if (score <= 2.0) {
    tier = 'Low';
  } else if (score <= 3.5) {
    tier = 'Medium';
  } else {
    tier = 'High';
  }

  return { score, tier };
}

/**
 * getApprovalPath
 * Returns the ordered approval workflow steps from Section 4
 * for the given change type and (optionally) risk tier.
 *
 * @param {"Standard" | "Normal" | "Emergency"} changeType
 * @param {"Low" | "Medium" | "High" | null} riskTier - required when changeType is "Normal"
 * @returns {string[]}
 */
function getApprovalPath(changeType, riskTier) {
  if (changeType === 'Normal') {
    return APPROVAL_WORKFLOWS[`Normal-${riskTier}`] || [];
  }
  return APPROVAL_WORKFLOWS[changeType] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Show or hide a card by ID. */
function setVisible(id, visible) {
  const el = document.getElementById(id);
  if (el) el.hidden = !visible;
}

/** Render the classification badge with appropriate colour class. */
function renderClassification(changeType) {
  const el = document.getElementById('classification-output');
  el.textContent = changeType;
  el.className = 'classification-badge';
  const map = {
    Standard: 'badge-standard',
    Normal: 'badge-normal',
    Emergency: 'badge-emergency',
  };
  el.classList.add(map[changeType]);

  const noteEl = document.getElementById('classification-note');
  const notes = {
    Standard:
      'Pre-approved change model confirmed. No per-instance approval required — proceed through the automated pipeline.',
    Normal:
      'This change requires assessment and authorization. Score the 7 risk dimensions below, then click Assess Risk.',
    Emergency:
      'Service is down. Implement immediately via the Emergency Change flow. Complete full documentation within 48 hours.',
  };
  noteEl.textContent = notes[changeType];
}

/** Render the ordered approval workflow list. */
function renderApprovalPath(steps) {
  const container = document.getElementById('approval-path-output');
  container.innerHTML = '';
  const ol = document.createElement('ol');
  steps.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
  });
  container.appendChild(ol);
}

/** Render composite score and tier badge. */
function renderRiskScore(score, tier) {
  document.getElementById('composite-score').textContent = score.toFixed(2);

  const tierEl = document.getElementById('risk-tier');
  tierEl.textContent = `Risk Tier: ${tier}`;
  tierEl.className = 'risk-tier-badge';
  const map = { Low: 'tier-low', Medium: 'tier-medium', High: 'tier-high' };
  tierEl.classList.add(map[tier]);
}

/**
 * Build the 7 risk dimension slider rows and inject them into #sliders-container.
 * Each row: [label] [range input] [value display]
 */
function buildSliders() {
  const container = document.getElementById('sliders-container');
  container.innerHTML = '';

  RISK_DIMENSIONS.forEach((dim) => {
    const row = document.createElement('div');
    row.className = 'slider-row';

    // Label (tooltip shows low/high descriptions)
    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = dim.label;
    label.title = `${dim.lowDesc}\n${dim.highDesc}`;

    // Range input
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `slider-${dim.id}`;
    slider.min = 1;
    slider.max = 5;
    slider.step = 1;
    slider.value = 3;

    // Live value display
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.id = `val-${dim.id}`;
    valueDisplay.textContent = slider.value;

    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valueDisplay);
    container.appendChild(row);
  });
}

/** Read the current value of every slider and return as number[]. */
function readSliderValues() {
  return RISK_DIMENSIONS.map((dim) => {
    const el = document.getElementById(`slider-${dim.id}`);
    return el ? parseInt(el.value, 10) : 3;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Form submit — classifies the change and branches the UI:
 *   • Standard / Emergency → show classification + approval path + checklist
 *   • Normal               → show classification + risk sliders
 */
document.getElementById('change-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const serviceDown = document.querySelector('input[name="service-down"]:checked')?.value;
  const preApproved = document.querySelector('input[name="pre-approved"]:checked')?.value;

  if (!serviceDown || !preApproved) {
    alert('Please answer both yes/no questions before submitting.');
    return;
  }

  const changeType = classifyChange(serviceDown, preApproved);

  // Always show the results section and classification card
  setVisible('results-section', true);
  renderClassification(changeType);

  if (changeType === 'Normal') {
    // Show sliders; hide score/approval/checklist until Assess Risk is clicked
    buildSliders();
    setVisible('risk-sliders-card', true);
    setVisible('risk-score-card', false);
    setVisible('approval-card', false);
    setVisible('checklist-card', false);
  } else {
    // Standard or Emergency: no risk scoring needed
    setVisible('risk-sliders-card', false);
    setVisible('risk-score-card', false);

    const steps = getApprovalPath(changeType, null);
    renderApprovalPath(steps);
    setVisible('approval-card', true);
    setVisible('checklist-card', true);
  }

  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
});

/**
 * Assess Risk button (Normal changes only) — reads slider values,
 * calls assessRisk(), then shows score, tier, approval path, and checklist.
 */
document.getElementById('assess-risk-btn').addEventListener('click', () => {
  const scores = readSliderValues();
  const { score, tier } = assessRisk(scores);

  renderRiskScore(score, tier);
  setVisible('risk-score-card', true);

  const steps = getApprovalPath('Normal', tier);
  renderApprovalPath(steps);
  setVisible('approval-card', true);
  setVisible('checklist-card', true);

  document.getElementById('risk-score-card').scrollIntoView({ behavior: 'smooth' });
});
