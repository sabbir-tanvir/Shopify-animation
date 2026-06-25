/**
 * Circle Animation Component
 * 
 * Handles the SVG circle frame-swapping animation.
 * Uses two <img> elements for crossfade transitions:
 *   - circle-svg-current: the visible frame
 *   - circle-svg-next: preloaded next frame (fades in on swap)
 */

export class CircleAnimation {
  constructor() {
    this.currentEl = document.getElementById('circle-svg-current');
    this.nextEl = document.getElementById('circle-svg-next');
    this.frameEl = document.getElementById('circle-frame');

    this.currentSrc = '';
    this._preloadCache = new Map();
  }

  /**
   * Preload an array of SVG paths so they're cached by the browser.
   * Call this before starting the animation for smooth playback.
   */
  preload(svgPaths) {
    for (const path of svgPaths) {
      if (!this._preloadCache.has(path)) {
        const img = new Image();
        img.src = path;
        this._preloadCache.set(path, img);
      }
    }
  }

  /**
   * Show a specific circle SVG frame.
   * Uses crossfade: load into the hidden img, then swap active class.
   * 
   * @param {string} svgPath - Path to the SVG file
   * @param {boolean} isTierTransition - If true, adds a flash effect
   */
  showFrame(svgPath, isTierTransition = false) {
    if (svgPath === this.currentSrc) return;

    // Load the new frame into the hidden element
    this.nextEl.src = svgPath;

    // Wait for it to load, then crossfade
    const onLoad = () => {
      this.nextEl.removeEventListener('load', onLoad);

      // Swap active states (CSS handles the opacity transition)
      this.currentEl.classList.remove('circle-svg--active');
      this.nextEl.classList.add('circle-svg--active');

      // Swap references so "current" is always the visible one
      const temp = this.currentEl;
      this.currentEl = this.nextEl;
      this.nextEl = temp;

      this.currentSrc = svgPath;
    };

    // If already cached, onload fires synchronously or near-instantly
    if (this.nextEl.complete && this.nextEl.src.endsWith(svgPath.split('/').pop())) {
      onLoad();
    } else {
      this.nextEl.addEventListener('load', onLoad);
    }

    // Tier transition flash effect
    if (isTierTransition) {
      this.frameEl.classList.add('tier-transition');
      setTimeout(() => {
        this.frameEl.classList.remove('tier-transition');
      }, 600);
    }
  }

  /**
   * Immediately set a frame without transition (for initial state).
   */
  setFrame(svgPath) {
    this.currentEl.src = svgPath;
    this.currentEl.classList.add('circle-svg--active');
    this.nextEl.classList.remove('circle-svg--active');
    this.currentSrc = svgPath;
  }
}
