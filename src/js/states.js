/**
 * State definitions for the loyalty animation.
 * 
 * The entire animation is driven by sparkle points as the master state.
 * Each tier has circle SVG states (0-6) that animate within that tier,
 * and the sparkle point value determines which tier we're in.
 * 
 * ANIMATION SEQUENCE (over ~12 seconds):
 * - S-Brillet (0 pts): circle states 0→6
 * - Shiny (40 pts): circle states 0→6
 * - Starlight (100-700 pts): circle states 0→6
 * - Galaxy (700-1000 pts): circle states 0→6
 * - Ultra Galaxy (1000+ pts): circle states 0→3
 */

// ─── Tier Definitions ────────────────────────────────────────

export const TIERS = {
  S_BRILLET: {
    id: 'S_BRILLET',
    name: 'S-BRILLET',
    icon: '◇',
    pointThreshold: 0,
    circleStates: 7, // 0-6
    svgPrefix: 's-brillet',
    starPrefix: 'S-Brillet',
    pointsDisplay: 0,
    actions: {
      primary: { icon: '☑', text: 'Sign Up' },
      secondary: { text: '+40 Sparkle Points' },
    },
    colors: {
      bgOuter: 'rgba(255, 255, 255, 0.6)',
      borderOuter: '#E6D7CB',
      bgInner: '#FFFFFF',
      borderInner: '#FFFFFF',
      bgCounter: '#FFFFFF',
      borderCounter: '#E6D7CB',
      text: '#3D3532',
    },
  },
  SHINY: {
    id: 'SHINY',
    name: 'SHINY',
    icon: '⬡',
    pointThreshold: 40,
    circleStates: 7,
    svgPrefix: 'shiny',
    starPrefix: 'Shiny',
    pointsDisplay: 40,
    actions: {
      primary: { icon: '☑', text: 'Follow us on Instagram' },
      secondary: { text: '+50 Sparkle Points' },
    },
    colors: {
      bgOuter: 'rgba(255, 255, 255, 0.6)',
      borderOuter: '#DADADA',
      bgInner: '#FFFFFF',
      borderInner: '#FFFFFF',
      bgCounter: '#FFFFFF',
      borderCounter: '#DADADA',
      text: '#3D3532',
    },
  },
  STARLIGHT: {
    id: 'STARLIGHT',
    name: 'STARLIGHT',
    icon: '☆',
    pointThreshold: 100,
    circleStates: 7,
    svgPrefix: 'starlight',
    starPrefix: 'Starlight',
    pointsDisplay: 100,
    actions: {
      primary: { icon: '●', text: 'Purchase Items' },
      secondary: { text: '+125 Sparkle Points' },
    },
    colors: {
      bgOuter: 'rgba(255, 255, 255, 0.6)',
      borderOuter: '#F4E3D4',
      bgInner: '#FFFFFF',
      borderInner: '#FFFFFF',
      bgCounter: '#FFFFFF',
      borderCounter: '#F4E3D4',
      text: '#3D3532',
    },
  },
  GALAXY: {
    id: 'GALAXY',
    name: 'GALAXY',
    icon: '✧',
    pointThreshold: 700,
    circleStates: 7,
    svgPrefix: 'galaxy',
    starPrefix: 'Galaxy',
    pointsDisplay: 700,
    actions: {
      primary: { icon: '●', text: 'Purchase Items' },
      secondary: { text: '+300 Sparkle Points' },
    },
    colors: {
      bgOuter: 'rgba(255, 255, 255, 0.6)',
      borderOuter: '#2E253A',
      bgInner: '#FFFFFF',
      borderInner: '#2E253A',
      bgCounter: '#FFFFFF',
      borderCounter: '#2E253A',
      text: '#3D3532',
    },
  },
  ULTRA_GALAXY: {
    id: 'ULTRA_GALAXY',
    name: 'ULTRA GALAXY',
    icon: '★',
    pointThreshold: 1000,
    circleStates: 4, // 0-3 (the small ~10KB circle-only versions)
    svgPrefix: 'ultra-galaxy',
    starPrefix: 'Variant18',
    pointsDisplay: 1000,
    actions: {
      primary: { icon: '●', text: 'Purchase Items' },
      secondary: { text: '+500 Sparkle Points' },
    },
    colors: {
      bgOuter: 'rgba(255, 255, 255, 0.6)',
      borderOuter: '#D6C2B3',
      bgInner: '#FFFFFF',
      borderInner: '#FFFFFF',
      bgCounter: '#FFFFFF',
      borderCounter: '#D6C2B3',
      text: '#3D3532',
    },
  },
};

// Ordered list of tiers for sequential iteration
export const TIER_ORDER = [
  TIERS.S_BRILLET,
  TIERS.SHINY,
  TIERS.STARLIGHT,
  TIERS.GALAXY,
  TIERS.ULTRA_GALAXY,
];


// ─── Animation Timeline ─────────────────────────────────────

/**
 * Build the full animation sequence — an array of keyframes.
 * Each keyframe defines: which circle SVG to show, the sparkle point value,
 * the tier info, and how long to hold that frame.
 */
export function buildAnimationSequence() {
  const sequence = [];

  for (const tier of TIER_ORDER) {
    for (let state = 0; state < tier.circleStates; state++) {
      let starPath = '';
      if (tier.id === 'ULTRA_GALAXY') {
        starPath = `/svgs/tire-starstep/Property 1=Variant18.svg`;
      } else {
        // Map 7 circle states to 4 star steps:
        // state 0, 1 -> step 1
        // state 2, 3 -> step 2
        // state 4, 5 -> step 3
        // state 6 -> step 4
        let step = 1;
        if (state === 2 || state === 3) step = 2;
        else if (state === 4 || state === 5) step = 3;
        else if (state === 6) step = 4;

        starPath = `/svgs/tire-starstep/Property 1=${tier.starPrefix} ${step}.svg`;
      }

      sequence.push({
        tier,
        circleState: state,
        svgPath: `/svgs/circles/${tier.svgPrefix}-${state}.svg`,
        starPath,
        points: tier.pointsDisplay,
        // First frame of a new tier gets a longer hold + transition flag
        isTierStart: state === 0,
        // Last frame of a tier gets a brief pause
        isTierEnd: state === tier.circleStates - 1,
      });
    }
  }

  return sequence;
}


// ─── Timing Configuration ────────────────────────────────────

export const TIMING = {
  /** Duration for each circle frame within a tier (ms) */
  frameDuration: 1000,

  /** Extra pause on the first frame of a new tier (ms) */
  tierStartPause: 1200,

  /** Extra pause on the last frame before transitioning to next tier (ms) */
  tierEndPause: 1200,

  /** Duration of the counter animation between tiers (ms) */
  counterAnimDuration: 2000,

  /** CSS crossfade transition duration (ms) — matches --transition-normal */
  crossfadeDuration: 800,

  /** Delay before the entire animation starts (ms) */
  startDelay: 500,

  /** Whether the animation should loop */
  loop: true,

  /** Pause between loops (ms) */
  loopPause: 2000,
};


// ─── Tier Reward Unlock Thresholds ───────────────────────────
// These map sparkle point values to which rewards unlock.
// Placeholder — will be populated once you share reward SVGs.

export const REWARD_UNLOCKS = {
  'reward-welcome':    40,   // Unlocks at Shiny tier
  'reward-shipping':   40,
  'reward-theme':      40,
  'reward-birthday':   100,  // Unlocks at Starlight tier
  'reward-saving':     100,
  'reward-warranty':   700,  // Unlocks at Galaxy tier
  'reward-collections': 700,
  'reward-chat':       700,
  'reward-giveaway':   1000, // Unlocks at Ultra Galaxy tier
  'reward-vote':       1000,
};
