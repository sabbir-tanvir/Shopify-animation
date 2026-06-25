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
import { buildAnimationSequence, TIMING, TIER_ORDER } from './js/states.js';

// ─── DOM References ─────────────────────────────────────────

const DOM = {
  tierName: document.getElementById('tier-name'),
  tierIcon: document.getElementById('tier-icon'),
  tierPointsLabel: document.getElementById('tier-points-label'),
  tierActionPrimary: document.getElementById('tier-action-primary'),
  tierActionSecondary: document.getElementById('tier-action-secondary'),
  sparkleStarIcon: document.getElementById('sparkle-star-icon'),
  counterNumberContainer: document.getElementById('sparkle-counter-number-container'),
  tierInfoCard: document.getElementById('tier-info-card'),
  earnSparkle: document.getElementById('earn-sparkle-content'),
};

// Helper to trigger CSS fade-up animation
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

// ─── Preload All SVGs (Circles + Stars) ──────────────────────

const allCircleSvgs = sequence.map((frame) => frame.svgPath);
const allStarSvgs = sequence.map((frame) => frame.starPath);
circle.preload([...allCircleSvgs, ...allStarSvgs]);

// ─── Tier Info Updater ──────────────────────────────────────

let currentTierId = null;

function updateTierInfo(tier) {
  if (tier.id === currentTierId) return;
  currentTierId = tier.id;

  // Fade out text elements first
  DOM.tierName.style.opacity = 0;
  DOM.tierPointsLabel.style.opacity = 0;
  DOM.tierActionPrimary.style.opacity = 0;
  DOM.tierActionSecondary.style.opacity = 0;

  setTimeout(() => {
    DOM.tierName.textContent = tier.name;
    DOM.tierIcon.textContent = tier.icon;
    DOM.tierPointsLabel.textContent = `(${tier.pointsDisplay} SPARKLE POINTS)`;

    // Update action buttons
    DOM.tierActionPrimary.innerHTML = `
      <span class="tier-action__check">${tier.actions.primary.icon}</span>
      <span class="tier-action__text">${tier.actions.primary.text}</span>
    `;
    DOM.tierActionSecondary.innerHTML = `
      <span class="tier-action__text">${tier.actions.secondary.text}</span>
    `;

    // Update colors dynamically
    if (tier.colors) {
      DOM.earnSparkle.style.setProperty('--tier-bg-outer', tier.colors.bgOuter);
      DOM.earnSparkle.style.setProperty('--tier-border-outer', tier.colors.borderOuter);
      DOM.earnSparkle.style.setProperty('--tier-bg-inner', tier.colors.bgInner);
      DOM.earnSparkle.style.setProperty('--tier-border-inner', tier.colors.borderInner);
      DOM.earnSparkle.style.setProperty('--tier-bg-counter', tier.colors.bgCounter);
      DOM.earnSparkle.style.setProperty('--tier-border-counter', tier.colors.borderCounter);
      DOM.earnSparkle.style.setProperty('--tier-text', tier.colors.text);
    }

    // Fade them back in smoothly
    DOM.tierName.style.opacity = 1;
    DOM.tierPointsLabel.style.opacity = 1;
    DOM.tierActionPrimary.style.opacity = 1;
    DOM.tierActionSecondary.style.opacity = 1;
  }, 300);
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
      currentTierId = null;
      currentStarPath = null;

      const firstFrame = sequence[0];
      circle.setFrame(firstFrame.svgPath);
      counter.set(firstFrame.points);
      updateTierInfo(firstFrame.tier);
      DOM.sparkleStarIcon.src = firstFrame.starPath;
      currentStarPath = firstFrame.starPath;
      triggerFadeUp(DOM.counterNumberContainer);
      triggerFadeUp(DOM.tierInfoCard);

      timeoutId = setTimeout(playFrame, TIMING.loopPause);
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

  // 2. Update tier info (only on tier change)
  updateTierInfo(frame.tier);

  // 3. Update star SVG next to point counter
  if (frame.starPath !== currentStarPath) {
    currentStarPath = frame.starPath;
    DOM.sparkleStarIcon.src = frame.starPath;
  }

  // 4. Animate counter and info card on tier change
  if (isTierChange) {
    counter.animateTo(frame.points, TIMING.counterAnimDuration);
    triggerFadeUp(DOM.counterNumberContainer);
    triggerFadeUp(DOM.tierInfoCard);
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
  currentTierId = null;
  currentStarPath = null;

  // Set initial state
  const firstFrame = sequence[0];
  circle.setFrame(firstFrame.svgPath);
  counter.set(firstFrame.points);
  updateTierInfo(firstFrame.tier);
  DOM.sparkleStarIcon.src = firstFrame.starPath;
  currentStarPath = firstFrame.starPath;
  triggerFadeUp(DOM.counterNumberContainer);
  triggerFadeUp(DOM.tierInfoCard);

  // Begin after delay
  frameIndex = 1;
  timeoutId = setTimeout(playFrame, TIMING.startDelay + TIMING.frameDuration);
}

/**
 * Stop the animation.
 */
function stopAnimation() {
  isPlaying = false;
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
