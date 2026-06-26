/**
 * Main Entry Point — Loyalty Animation Orchestrator
 * 
 * This is the timeline controller that drives the entire animation.
 * It reads the animation sequence from states.js and coordinates:
 *   1. Circle SVG frame swapping
 *   2. Sparkle point counter animation
 *   3. Tier info card updates
 *   4. (Future) Tier reward unlocking, bundle deals, spend points
 */

import './style.css';
import { CircleAnimation } from './js/circle-animation.js';
import { CounterAnimation } from './js/counter-animation.js';
import { buildAnimationSequence, TIMING, TIER_ORDER, REWARD_UNLOCKS } from './js/states.js';

// ─── DOM References ─────────────────────────────────────────

const DOM = {
  tierName: document.getElementById('tier-name'),
  tierIcon: document.getElementById('tier-icon'),
  tierPointsLabel: document.getElementById('tier-points-label'),
  tierDivider: document.getElementById('tier-divider'),
  tierActionsContainer: document.getElementById('tier-actions-container'),
  tierInfoInner: document.getElementById('tier-info-inner'),
  sparkleStarIcon: document.getElementById('sparkle-star-icon'),
  counterNumberContainer: document.getElementById('sparkle-counter-number-container'),
  tierInfoCard: document.getElementById('tier-info-card'),
  earnSparkle: document.getElementById('earn-sparkle-content'),
};

// Helper to trigger CSS fade-up animation (for counter)
function triggerFadeUp(element) {
  if (!element) return;
  element.classList.remove('fade-up-anim');
  void element.offsetWidth; // Trigger reflow to restart animation
  element.classList.add('fade-up-anim');
}

// ─── Initialize Components ──────────────────────────────────

const circle = new CircleAnimation();
const counter = new CounterAnimation();
const sequence = buildAnimationSequence();

// ─── Precompute Absolute Timeline Timestamps ────────────────
const frameTimestamps = [];
let cumulativeTime = 0;

for (let i = 0; i < sequence.length; i++) {
  frameTimestamps.push(cumulativeTime);

  const frame = sequence[i];
  let holdDuration = TIMING.frameDuration;
  
  if (i === 0) {
    holdDuration += TIMING.startDelay;
  } else {
    const prevFrame = sequence[i - 1];
    const isTierChange = frame.isTierStart && prevFrame.tier.id !== frame.tier.id;
    if (frame.isTierStart && isTierChange) {
      holdDuration += TIMING.tierStartPause;
    }
    if (frame.isTierEnd) {
      holdDuration += TIMING.tierEndPause;
    }
  }
  cumulativeTime += holdDuration;
}

// Find milestones
const first700Index = sequence.findIndex(f => f.points === 700);
const first1000Index = sequence.findIndex(f => f.points === 1000);

const timeTo700 = first700Index !== -1 ? frameTimestamps[first700Index] : 20000;
const timeTo1000 = first1000Index !== -1 ? frameTimestamps[first1000Index] : 25000;

const REWARD_ORDER = [
  'reward-welcome',
  'reward-shipping',
  'reward-theme',
  'reward-birthday',
  'reward-saving',
  'reward-warranty',
  'reward-collections',
  'reward-chat',
  'reward-giveaway',
  'reward-vote'
];

const unlockTimes = {};
// Space first 8 cards across timeTo700, starting after a 2.0-second delay to let the animation establish
const startOffset = 2000;
const staggerIntervalTo700 = (timeTo700 - startOffset) / 7;
for (let i = 0; i < 8; i++) {
  const cardId = REWARD_ORDER[i];
  unlockTimes[cardId] = startOffset + i * staggerIntervalTo700;
}

// Space giveaway and vote collections across the remaining duration to 1000
const duration700To1000 = timeTo1000 - timeTo700;
const staggerIntervalTo1000 = duration700To1000 / 3;
unlockTimes['reward-giveaway'] = timeTo700 + 0.5 * staggerIntervalTo1000;
unlockTimes['reward-vote'] = timeTo700 + 1.5 * staggerIntervalTo1000;

// ─── Reward Icons Mapping ────────────────────────────────────
const REWARD_ICONS = {
  'reward-welcome': {
    initial: '/svgs/tier-rewards/wellcomeInitial.svg',
    galaxy: '/svgs/tier-rewards/wellcomeGalaxy.svg'
  },
  'reward-shipping': {
    initial: '/svgs/tier-rewards/Free-initial.svg',
    galaxy: '/svgs/tier-rewards/Free-Galaxy (1).svg'
  },
  'reward-theme': {
    initial: '/svgs/tier-rewards/theme-Messege- initial.svg',
    galaxy: '/svgs/tier-rewards/theme-Messege- galaxy.svg'
  },
  'reward-birthday': {
    initial: '/svgs/tier-rewards/Birthday initial(2).svg',
    galaxy: '/svgs/tier-rewards/Birthday galaxy (1).svg'
  },
  'reward-saving': {
    initial: '/svgs/tier-rewards/saving(1)-initial.svg',
    galaxy: '/svgs/tier-rewards/saving(2)-galaxy.svg'
  },
  'reward-warranty': {
    initial: '/svgs/tier-rewards/2years (2) initial.svg',
    galaxy: '/svgs/tier-rewards/2years (1) galaxy.svg'
  },
  'reward-collections': {
    initial: '/svgs/tier-rewards/viewnew (1) initial.svg',
    galaxy: '/svgs/tier-rewards/view new galaxy.svg'
  },
  'reward-chat': {
    initial: '/svgs/tier-rewards/live-support (1)initial.svg',
    galaxy: '/svgs/tier-rewards/live-support (2)galaxy.svg'
  },
  'reward-giveaway': {
    initial: '/svgs/tier-rewards/free-giveway-init.svg',
    galaxy: '/svgs/tier-rewards/freegiveway-galaxy.svg'
  },
  'reward-vote': {
    initial: '/svgs/tier-rewards/viewnew (1) initial.svg',
    galaxy: '/svgs/tier-rewards/view new galaxy.svg'
  }
};

// ─── Bundle Deals Mapping and Logic ─────────────────────────
const BUNDLE_THEMES = {
  locked: 'locked-theme',
  starlight: 'starlight-theme',
  galaxy: 'galaxy-theme'
};

const BUNDLE_SVG_PATHS = {
  lock: '/svgs/bundle-deals/Property 1=Lock.svg',
  
  // Starlight outline
  st_1_out: '/svgs/bundle-deals/Property 1=- Starlight 1.png',
  st_2_out: '/svgs/bundle-deals/Property 1=- Starlight 2.png',
  st_3_out: '/svgs/bundle-deals/Property 1=- Starlight 3.png',
  st_sparkle_out: '/svgs/bundle-deals/Property 1=- Starlight 4.png',
  st_plus_out: '/svgs/bundle-deals/Property 1=- Starlight Plus.svg',
  
  // Starlight filled
  st_1_fill: '/svgs/bundle-deals/Property 1=ST 1 (1).png',
  st_2_fill: '/svgs/bundle-deals/Property 1=ST 2.png',
  st_3_fill: '/svgs/bundle-deals/Property 1=ST 3.png',
  st_sparkle_fill: '/svgs/bundle-deals/Property 1=ST 4.png',
  st_plus_fill: '/svgs/bundle-deals/Property 1=ST Plus.svg',
  
  // Galaxy outline
  gl_1_out: '/svgs/bundle-deals/Property 1=- Galaxy 1.png',
  gl_2_out: '/svgs/bundle-deals/Property 1=- Galaxy 2.png',
  gl_3_out: '/svgs/bundle-deals/Property 1=- Galaxy 3 (1).png',
  gl_sparkle_out: '/svgs/bundle-deals/Property 1=- Galaxy 4.png',
  gl_plus_out: '/svgs/bundle-deals/Property 1=- Galaxy Plus.svg',
  
  // Galaxy filled
  gl_1_fill: '/svgs/bundle-deals/Property 1=Gl 1.png',
  gl_2_fill: '/svgs/bundle-deals/Property 1=GL 2.png',
  gl_3_fill: '/svgs/bundle-deals/Property 1=GL 3.png',
  gl_sparkle_fill: '/svgs/bundle-deals/Property 1=GL 4.png',
  gl_plus_fill: '/svgs/bundle-deals/Property 1=GL Plus.svg'
};

function updateBundleDeals(points) {
  const bundleCard = document.querySelector('.bundle-deals__content');
  const bundleLabel = document.getElementById('bundle-label');
  const bundleIcons = document.querySelectorAll('#bundle-icons .bundle-icon__img');
  
  if (!bundleCard || !bundleLabel || bundleIcons.length !== 4) return;
  
  let labelText = '';
  let themeClass = BUNDLE_THEMES.locked;
  let iconSrcs = [];
  
  if (points < 40) {
    labelText = 'LEVEL UP TO SHINY TIER';
    themeClass = BUNDLE_THEMES.locked;
    iconSrcs = [BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock];
  } else if (points < 100) {
    labelText = 'LEVEL UP TO STARLIGHT TIER';
    themeClass = BUNDLE_THEMES.locked;
    iconSrcs = [BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock, BUNDLE_SVG_PATHS.lock];
  } else if (points < 200) {
    labelText = 'UNLOCKED STARLIGHT TIER LEVEL';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_out, BUNDLE_SVG_PATHS.st_2_out, BUNDLE_SVG_PATHS.st_3_out, BUNDLE_SVG_PATHS.st_plus_out];
  } else if (points < 300) {
    labelText = 'BUY 1ST | SAVE 20%';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_fill, BUNDLE_SVG_PATHS.st_2_out, BUNDLE_SVG_PATHS.st_3_out, BUNDLE_SVG_PATHS.st_sparkle_out];
  } else if (points < 400) {
    labelText = 'BUY 2ND | SAVE 25%';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_fill, BUNDLE_SVG_PATHS.st_2_fill, BUNDLE_SVG_PATHS.st_3_out, BUNDLE_SVG_PATHS.st_plus_out];
  } else if (points < 500) {
    labelText = 'BUY 3RD | SAVE 35%';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_fill, BUNDLE_SVG_PATHS.st_2_fill, BUNDLE_SVG_PATHS.st_3_fill, BUNDLE_SVG_PATHS.st_sparkle_out];
  } else if (points < 600) {
    labelText = 'GET 1 + 1 FREE ON NEXT ORDER';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_fill, BUNDLE_SVG_PATHS.st_2_fill, BUNDLE_SVG_PATHS.st_3_fill, BUNDLE_SVG_PATHS.st_plus_fill];
  } else if (points < 700) {
    labelText = 'GET 1 + 1 FREE ON NEXT ORDER';
    themeClass = BUNDLE_THEMES.starlight;
    iconSrcs = [BUNDLE_SVG_PATHS.st_1_fill, BUNDLE_SVG_PATHS.st_2_fill, BUNDLE_SVG_PATHS.st_3_fill, BUNDLE_SVG_PATHS.st_sparkle_fill];
  } else if (points < 750) {
    labelText = 'UNLOCKED GALAXY TIER LEVEL';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_out, BUNDLE_SVG_PATHS.gl_2_out, BUNDLE_SVG_PATHS.gl_3_out, BUNDLE_SVG_PATHS.gl_plus_out];
  } else if (points < 800) {
    labelText = 'BUY 1ST | SAVE 25%';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_fill, BUNDLE_SVG_PATHS.gl_2_out, BUNDLE_SVG_PATHS.gl_3_out, BUNDLE_SVG_PATHS.gl_sparkle_out];
  } else if (points < 850) {
    labelText = 'BUY 2ND | SAVE 35%';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_fill, BUNDLE_SVG_PATHS.gl_2_fill, BUNDLE_SVG_PATHS.gl_3_out, BUNDLE_SVG_PATHS.gl_plus_out];
  } else if (points < 900) {
    labelText = 'BUY 3RD | SAVE 45%';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_fill, BUNDLE_SVG_PATHS.gl_2_fill, BUNDLE_SVG_PATHS.gl_3_fill, BUNDLE_SVG_PATHS.gl_sparkle_out];
  } else if (points < 950) {
    labelText = 'GET 1 + 1 FREE ON NEXT ORDER';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_fill, BUNDLE_SVG_PATHS.gl_2_fill, BUNDLE_SVG_PATHS.gl_3_fill, BUNDLE_SVG_PATHS.gl_plus_fill];
  } else {
    labelText = 'GET 1 + 1 FREE ON NEXT ORDER';
    themeClass = BUNDLE_THEMES.galaxy;
    iconSrcs = [BUNDLE_SVG_PATHS.gl_1_fill, BUNDLE_SVG_PATHS.gl_2_fill, BUNDLE_SVG_PATHS.gl_3_fill, BUNDLE_SVG_PATHS.gl_sparkle_fill];
  }
  
  if (bundleLabel.textContent !== labelText) {
    bundleLabel.textContent = labelText;
  }
  
  if (!bundleCard.classList.contains(themeClass)) {
    bundleCard.classList.remove(BUNDLE_THEMES.locked, BUNDLE_THEMES.starlight, BUNDLE_THEMES.galaxy);
    bundleCard.classList.add(themeClass);
  }
  
  for (let i = 0; i < 4; i++) {
    const img = bundleIcons[i];
    if (img && !decodeURIComponent(img.src).endsWith(iconSrcs[i])) {
      img.src = iconSrcs[i];
    }
  }
}

// ─── Spend Points Mapping and Logic ─────────────────────────

function getSpendPointsState(tierId, circleState, points) {
  let label = 'SIGN UP TO JOIN VIP LOYALTY UNIVERSE CLUB';
  let barFrameIndex = 0; // 0 to 12
  let overlaySrc = '/svgs/spend-points/4 lock .svg';
  let isLocked = true;
  let isGalaxyTheme = false;

  if (tierId === 'S_BRILLET') {
    if (circleState === 0) {
      label = 'SIGN UP TO JOIN VIP LOYALTY UNIVERSE CLUB';
      barFrameIndex = 0;
      overlaySrc = '/svgs/spend-points/4 lock .svg';
      isLocked = true;
    } else if (circleState < 6) {
      label = 'JOINED VIP LOYALTY UNIVERSE CLUB';
      barFrameIndex = 1;
      overlaySrc = '/svgs/spend-points/4 lock .svg';
      isLocked = true;
    } else {
      label = 'LEVEL UP TO SHINY TIER';
      barFrameIndex = 2;
      overlaySrc = '/svgs/spend-points/4 lock .svg';
      isLocked = true;
    }
  } else if (tierId === 'SHINY') {
    if (circleState < 2) {
      label = 'LEVEL UP TO SHINY TIER';
      barFrameIndex = 2;
      overlaySrc = '/svgs/spend-points/3 lock.svg';
      isLocked = true;
    } else if (circleState < 4) {
      label = 'UNLOCKED SHINY TIER LEVEL';
      barFrameIndex = 3;
      overlaySrc = '/svgs/spend-points/3 lock.svg';
      isLocked = true;
    } else {
      label = 'LEVEL UP TO STARLIGHT TIER';
      barFrameIndex = 4;
      overlaySrc = '/svgs/spend-points/3 lock.svg';
      isLocked = true;
    }
  } else if (tierId === 'STARLIGHT') {
    if (circleState < 2) {
      label = 'LEVEL UP TO STARLIGHT TIER';
      barFrameIndex = 4;
      overlaySrc = '/svgs/spend-points/2 lock.svg';
      isLocked = true;
    } else if (circleState === 2) {
      label = 'UNLOCKED STARLIGHT TIER LEVEL';
      barFrameIndex = 5;
      overlaySrc = '/svgs/spend-points/2 lock.svg';
      isLocked = true;
    } else if (circleState === 3) {
      label = 'UNLOCKED STARLIGHT TIER LEVEL';
      barFrameIndex = 6;
      overlaySrc = '/svgs/spend-points/2 lock.svg';
      isLocked = true;
    } else if (circleState === 4) {
      label = 'LEVEL UP TO GALAXY TIER';
      barFrameIndex = 7;
      overlaySrc = '/svgs/spend-points/2 lock.svg';
      isLocked = true;
    } else {
      label = 'LEVEL UP TO GALAXY TIER';
      barFrameIndex = 8;
      overlaySrc = '/svgs/spend-points/2 lock.svg';
      isLocked = true;
    }
  } else if (tierId === 'GALAXY') {
    if (circleState === 0) {
      label = 'LEVEL UP TO GALAXY TIER';
      barFrameIndex = 8;
      overlaySrc = '/svgs/spend-points/1 lock.svg';
      isLocked = true;
    } else if (circleState === 1) {
      label = 'UNLOCKED GALAXY TIER LEVEL';
      barFrameIndex = 9;
      overlaySrc = '/svgs/spend-points/0 lock.svg';
      isLocked = true;
    } else if (circleState === 2 || circleState === 3) {
      label = 'COMPLETE GALAXY TIER TO UNLOCK REWARDS';
      barFrameIndex = 10;
      overlaySrc = '/svgs/spend-points/blackStar.svg';
      isLocked = true;
    } else if (circleState === 4 || circleState === 5) {
      label = 'UNLOCKED GALAXY TIER REWARDS';
      barFrameIndex = 11;
      overlaySrc = ''; // No overlay
      isLocked = false;
    } else {
      label = 'UNLOCKED GALAXY TIER REWARDS';
      barFrameIndex = 12;
      overlaySrc = ''; // No overlay
      isLocked = false;
      isGalaxyTheme = true;
    }
  } else if (tierId === 'ULTRA_GALAXY') {
    label = 'UNLOCKED GALAXY TIER REWARDS';
    barFrameIndex = 12;
    overlaySrc = ''; // No overlay
    isLocked = false;
    isGalaxyTheme = true;
  }

  return { label, barFrameIndex, overlaySrc, isLocked, isGalaxyTheme };
}

function updateSpendPoints(tierId, circleState, points) {
  const spendLabel = document.getElementById('spend-label');
  const spendOverlayLabel = document.getElementById('spend-overlay-label');
  const spendBarImg = document.getElementById('spend-bar-img');
  const spendOverlayImg = document.getElementById('spend-overlay-img');
  const spendBar = document.getElementById('spend-bar');

  if (!spendLabel || !spendOverlayLabel || !spendBarImg || !spendOverlayImg || !spendBar) return;

  const state = getSpendPointsState(tierId, circleState, points);

  // 1. Update text labels
  if (spendLabel.textContent !== state.label) {
    spendLabel.textContent = state.label;
  }
  if (spendOverlayLabel.textContent !== state.label) {
    spendOverlayLabel.textContent = state.label;
  }

  // 2. Update progress bar SVG
  const barSvgPath = state.barFrameIndex === 0
    ? '/svgs/spend-points/Frame 428.svg'
    : `/svgs/spend-points/Frame 428 (${state.barFrameIndex}).svg`;

  if (!decodeURIComponent(spendBarImg.src).endsWith(barSvgPath)) {
    spendBarImg.src = barSvgPath;
  }

  // 3. Update overlay image
  if (state.overlaySrc) {
    spendOverlayImg.style.display = 'block';
    if (!decodeURIComponent(spendOverlayImg.src).endsWith(state.overlaySrc)) {
      spendOverlayImg.src = state.overlaySrc;
    }
  } else {
    spendOverlayImg.style.display = 'none';
  }

  // 4. Update locked class on the full card (controls glass overlay & centered lock text visibility)
  if (state.isLocked) {
    spendBar.classList.add('is-locked');
  } else {
    spendBar.classList.remove('is-locked');
  }

  // 5. Update galaxy theme background class
  if (state.isGalaxyTheme) {
    spendBar.classList.add('galaxy-theme');
  } else {
    spendBar.classList.remove('galaxy-theme');
  }
}

// ─── Preload All SVGs ───────────────────────────────────────

const allCircleSvgs = sequence.map((frame) => frame.svgPath);
const allStarSvgs = sequence.map((frame) => frame.starPath);
const extraSvgs = [
  '/svgs/points%20iucons/initialcheckmark.svg',
  '/svgs/points%20iucons/change.svg',
  '/svgs/points%20iucons/galaxy-checkmark.svg',
  '/svgs/points%20iucons/title-left-icon.svg',
  '/svgs/points%20iucons/statlight.svg',
  '/svgs/points%20iucons/glaxy.svg',
  '/svgs/points iucons/initialcheckmark.svg',
  '/svgs/points iucons/change.svg',
  '/svgs/points iucons/galaxy-checkmark.svg',
  '/svgs/points iucons/title-left-icon.svg',
  '/svgs/points iucons/statlight.svg',
  '/svgs/points iucons/glaxy.svg'
];

const rewardSvgs = Object.values(REWARD_ICONS).flatMap(icons => [icons.initial, icons.galaxy]);
rewardSvgs.push('/svgs/tier-rewards/locked.svg');

const spendPointsSvgs = [
  '/svgs/spend-points/horigontal-Line.svg',
  '/svgs/spend-points/4 lock .svg',
  '/svgs/spend-points/3 lock.svg',
  '/svgs/spend-points/2 lock.svg',
  '/svgs/spend-points/1 lock.svg',
  '/svgs/spend-points/0 lock.svg',
  '/svgs/spend-points/blackStar.svg',
  '/svgs/spend-points/Frame 428.svg',
  '/svgs/spend-points/Frame 428 (1).svg',
  '/svgs/spend-points/Frame 428 (2).svg',
  '/svgs/spend-points/Frame 428 (3).svg',
  '/svgs/spend-points/Frame 428 (4).svg',
  '/svgs/spend-points/Frame 428 (5).svg',
  '/svgs/spend-points/Frame 428 (6).svg',
  '/svgs/spend-points/Frame 428 (7).svg',
  '/svgs/spend-points/Frame 428 (8).svg',
  '/svgs/spend-points/Frame 428 (9).svg',
  '/svgs/spend-points/Frame 428 (10).svg',
  '/svgs/spend-points/Frame 428 (11).svg',
  '/svgs/spend-points/Frame 428 (12).svg'
];

circle.preload([...allCircleSvgs, ...allStarSvgs, ...extraSvgs, ...rewardSvgs, ...Object.values(BUNDLE_SVG_PATHS), ...spendPointsSvgs]);

// ─── Update Reward Cards By Time ─────────────────────────────
let cycleStartTime = 0;
let isAnimationActive = false;
let rafId = null;

function updateRewardCardsByTime(elapsed) {
  const currentPoints = counter.currentValue;

  for (const cardId of REWARD_ORDER) {
    const cardEl = document.getElementById(cardId);
    if (!cardEl) continue;

    const imgEl = cardEl.querySelector('.reward-card__lock');
    const unlockTime = unlockTimes[cardId];

    if (elapsed >= unlockTime) {
      cardEl.classList.remove('locked');
      if (currentPoints < 700) {
        cardEl.classList.add('unlocked-initial');
        cardEl.classList.remove('unlocked-galaxy');
        if (imgEl && !decodeURIComponent(imgEl.src).endsWith(REWARD_ICONS[cardId].initial)) {
          imgEl.src = REWARD_ICONS[cardId].initial;
        }
      } else {
        cardEl.classList.add('unlocked-galaxy');
        cardEl.classList.remove('unlocked-initial');
        if (imgEl && !decodeURIComponent(imgEl.src).endsWith(REWARD_ICONS[cardId].galaxy)) {
          imgEl.src = REWARD_ICONS[cardId].galaxy;
        }
      }
    } else {
      cardEl.classList.add('locked');
      cardEl.classList.remove('unlocked-initial', 'unlocked-galaxy');
      if (imgEl && !decodeURIComponent(imgEl.src).endsWith('/svgs/tier-rewards/locked.svg')) {
        imgEl.src = '/svgs/tier-rewards/locked.svg';
      }
    }
  }
}

function tick() {
  if (!isAnimationActive) return;
  const elapsed = performance.now() - cycleStartTime;
  updateRewardCardsByTime(elapsed);
  rafId = requestAnimationFrame(tick);
}

// Hook up dynamic reward unlocking to the counter (for scrub/debug manual controls)
counter.onUpdate = (val) => {
  updateBundleDeals(val);
  
  const firstFrameIndex = sequence.findIndex(f => f.points >= val);
  const matchedFrame = firstFrameIndex !== -1 ? sequence[firstFrameIndex] : sequence[sequence.length - 1];
  if (matchedFrame) {
    updateSpendPoints(matchedFrame.tier.id, matchedFrame.circleState, matchedFrame.points);
  }

  if (!isAnimationActive) {
    const mockElapsed = firstFrameIndex !== -1 ? frameTimestamps[firstFrameIndex] : 0;
    updateRewardCardsByTime(mockElapsed);
  }
};

// ─── Actions Card Updater ────────────────────────────────────

let currentCardStateStr = '';

function updateCard(cardState, tierColors) {
  const cardStateStr = JSON.stringify(cardState);
  if (cardStateStr === currentCardStateStr) {
    if (tierColors) {
      applyTierColors(tierColors);
    }
    return;
  }
  currentCardStateStr = cardStateStr;

  // Trigger smooth fade-out and slide-down transition
  DOM.tierInfoInner.classList.remove('visible');

  // Wait 300ms for fade-out, then update content
  setTimeout(() => {
    // 1. Update Title and Icon
    DOM.tierName.textContent = cardState.badgeName;
    DOM.tierIcon.src = cardState.badgeIconPath;

    // 2. Update Points label text and completed classes
    DOM.tierPointsLabel.textContent = cardState.pointsLabel;
    
    // Reset points class
    DOM.tierPointsLabel.className = 'tier-points-label';
    if (cardState.pointsCompleted) {
      if (cardState.dividerClass === 'galaxy-divider') {
        DOM.tierPointsLabel.classList.add('title-points-completed-galaxy');
      } else {
        DOM.tierPointsLabel.classList.add('title-points-completed');
      }
    }

    // 3. Update Divider Class
    DOM.tierDivider.className = 'tier-info__divider';
    if (cardState.dividerClass) {
      DOM.tierDivider.classList.add(cardState.dividerClass);
    }

    // 4. Update Dynamic Actions Rows
    const isGalaxy = cardState.dividerClass === 'galaxy-divider';
    DOM.tierActionsContainer.innerHTML = cardState.actions.map(action => {
      let textClass = action.isCompleted 
        ? (isGalaxy ? 'text-gradient-completed-galaxy' : 'text-gradient-completed')
        : '';
      
      if (cardState.pointsCompleted) {
        textClass += ' action-text-completed';
      }

      return `
        <div class="tier-action-row">
          <div class="tier-action-left">
            <img class="tier-action__check-img" src="${action.checkIconPath}" alt="Check" />
            <span class="tier-action__text ${textClass}">${action.text}</span>
          </div>
          <div class="tier-action-right">
            <span class="tier-action__points-text ${textClass}">${action.points}</span>
          </div>
        </div>
      `;
    }).join('');

    // Apply tier colors (border, shadow, background of the outer card)
    if (tierColors) {
      applyTierColors(tierColors);
    }

    // 5. Trigger slide-up and fade-in
    DOM.tierInfoInner.classList.add('visible');
  }, 300);
}

function applyTierColors(colors) {
  DOM.earnSparkle.style.setProperty('--tier-bg-outer', colors.bgOuter);
  DOM.earnSparkle.style.setProperty('--tier-border-outer', colors.borderOuter);
  DOM.earnSparkle.style.setProperty('--tier-bg-inner', colors.bgInner);
  DOM.earnSparkle.style.setProperty('--tier-border-inner', colors.borderInner);
  DOM.earnSparkle.style.setProperty('--tier-bg-counter', colors.bgCounter);
  DOM.earnSparkle.style.setProperty('--tier-border-counter', colors.borderCounter);
  DOM.earnSparkle.style.setProperty('--tier-text', colors.text);
}

// ─── Animation Controller ───────────────────────────────────

let frameIndex = 0;
let isPlaying = false;
let timeoutId = null;
let currentStarPath = null;

/**
 * Play one frame, then schedule the next.
 */
function playFrame() {
  if (frameIndex >= sequence.length) {
    if (TIMING.loop) {
      // Reset and loop
      frameIndex = 0;
      currentCardStateStr = '';
      currentStarPath = null;

      const firstFrame = sequence[0];
      circle.setFrame(firstFrame.svgPath);
      counter.set(firstFrame.points);
      updateCard(firstFrame.cardState, firstFrame.tier.colors);
      updateBundleDeals(firstFrame.points);
      updateSpendPoints(firstFrame.tier.id, firstFrame.circleState, firstFrame.points);
      DOM.sparkleStarIcon.src = firstFrame.starPath;
      currentStarPath = firstFrame.starPath;
      triggerFadeUp(DOM.counterNumberContainer);

      // Lock everything immediately during loop pause
      isAnimationActive = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      updateRewardCardsByTime(0);

      timeoutId = setTimeout(() => {
        // Resume tick loop when animation restarts
        cycleStartTime = performance.now();
        isAnimationActive = true;
        rafId = requestAnimationFrame(tick);
        
        playFrame();
      }, TIMING.loopPause);
      return;
    }
    isPlaying = false;
    return;
  }

  const frame = sequence[frameIndex];
  const prevFrame = frameIndex > 0 ? sequence[frameIndex - 1] : null;
  const isTierChange = frame.isTierStart && prevFrame && prevFrame.tier.id !== frame.tier.id;

  // 1. Update circle SVG
  circle.showFrame(frame.svgPath, isTierChange);

  // 2. Update card content and layout
  updateCard(frame.cardState, frame.tier.colors);

  // 3. Update spend points progress bar and overlays
  updateSpendPoints(frame.tier.id, frame.circleState, frame.points);

  // 4. Update star SVG next to point counter
  if (frame.starPath !== currentStarPath) {
    currentStarPath = frame.starPath;
    DOM.sparkleStarIcon.src = frame.starPath;
  }

  // 4. Animate counter on points change
  const isPointsChange = prevFrame && prevFrame.points !== frame.points;
  if (isPointsChange) {
    counter.animateTo(frame.points, TIMING.counterAnimDuration);
    triggerFadeUp(DOM.counterNumberContainer);
  }

  // Calculate hold duration for this frame
  let holdDuration = TIMING.frameDuration;
  if (frame.isTierStart && isTierChange) {
    holdDuration += TIMING.tierStartPause;
  }
  if (frame.isTierEnd) {
    holdDuration += TIMING.tierEndPause;
  }

  // Schedule next frame
  frameIndex++;
  timeoutId = setTimeout(playFrame, holdDuration);
}

/**
 * Start the animation.
 */
function startAnimation() {
  if (isPlaying) return;
  isPlaying = true;
  frameIndex = 0;
  currentCardStateStr = '';
  currentStarPath = null;

  // Set initial state
  const firstFrame = sequence[0];
  circle.setFrame(firstFrame.svgPath);
  counter.set(firstFrame.points);
  updateCard(firstFrame.cardState, firstFrame.tier.colors);
  updateBundleDeals(firstFrame.points);
  updateSpendPoints(firstFrame.tier.id, firstFrame.circleState, firstFrame.points);
  DOM.sparkleStarIcon.src = firstFrame.starPath;
  currentStarPath = firstFrame.starPath;
  triggerFadeUp(DOM.counterNumberContainer);

  // Start the tick loop
  cycleStartTime = performance.now();
  isAnimationActive = true;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);

  // Begin after delay
  frameIndex = 1;
  timeoutId = setTimeout(playFrame, TIMING.startDelay + TIMING.frameDuration);
}

/**
 * Stop the animation.
 */
function stopAnimation() {
  isPlaying = false;
  isAnimationActive = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

// ─── Start on DOM Ready ─────────────────────────────────────

// Start the animation when the page loads
startAnimation();

// Expose controls to the console for debugging
window.__loyaltyAnimation = {
  start: startAnimation,
  stop: stopAnimation,
  sequence,
  getFrame: () => frameIndex,
};

console.log(
  '%c✦ S-Brillet Loyalty Animation ✦',
  'color: #947863; font-size: 14px; font-weight: bold;'
);
console.log(
  'Debug controls: window.__loyaltyAnimation.start() / .stop()'
);
console.log(
  `Total frames: ${sequence.length} | Tiers: ${TIER_ORDER.map(t => t.name).join(' → ')}`
);
