// ============================================================
// TutorialUI.js — first-time guided tutorial overlay (DOM)
// ============================================================
// Shown once per device. State saved in localStorage under
// 'dvz_tutorial_done'. Completed flag is also written into
// Progression save data so it follows a logged-in user across
// devices (Progression.load/save handles it transparently).
// ============================================================

const TUTORIAL_KEY = 'dvz_tutorial_done';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Dogs vs Undead!',
    body:  'Oyong and the pack need your help. Defend against waves of undead across 10 battle levels.',
  },
  {
    title: 'Oyong Home',
    body:  'Between battles you return home. Feed, pet, and rest Oyong to keep his mood and energy up — it affects your bonus rewards.',
  },
  {
    title: 'Collection & Decor',
    body:  'Use the tabs at the bottom to browse your dog units (Collection) or furnish Oyong\'s room (Decor) with earned items.',
  },
  {
    title: 'Heading into Battle',
    body:  'Tap Play on any unlocked level. Choose your loadout — pick which dog units you\'ll bring into the fight.',
  },
  {
    title: 'Placing Units',
    body:  'In battle, tap a unit card from the bar at the bottom, then tap an empty tile on the grid to place it.',
  },
  {
    title: 'Treat Farmer Oyong',
    body:  'Treat Farmer Oyong generates treats over time — place it in a safe back row early. More treats mean more defenders!',
  },
  {
    title: 'Defend the Lane',
    body:  'Enemies march from the right. Your dogs attack automatically. Don\'t let any reach the left edge or you lose a life.',
  },
  {
    title: 'Earn Stars & Rewards',
    body:  'Complete levels to earn stars, biscuits, and collectibles. Three-star a level for the best drops. Good luck, Oyong!',
  },
];

const TutorialUI = {
  el: null,
  step: 0,
  onDone: null,

  isDone() {
    return !!localStorage.getItem(TUTORIAL_KEY);
  },

  markDone() {
    localStorage.setItem(TUTORIAL_KEY, '1');
    // Also stamp into the Progression save so future cloud syncs know.
    if (typeof Progression !== 'undefined') {
      const save = Progression.load();
      if (!save.tutorialDone) {
        save.tutorialDone = true;
        Progression.save(save);
      }
    }
  },

  // Call this after auth resolves. Pass a callback that runs when tutorial finishes/skips.
  show(onDone) {
    if (this.isDone()) { onDone && onDone(); return; }
    this.onDone = onDone || null;
    this.step = 0;
    this._inject();
    this._render();
  },

  _inject() {
    if (document.getElementById('dvz-tutorial')) return;

    const style = document.createElement('style');
    style.textContent = `
      #dvz-tutorial-backdrop {
        position: fixed; inset: 0; z-index: 1700;
        background: rgba(0,0,0,0.72);
        display: flex; align-items: center; justify-content: center;
      }
      #dvz-tutorial-card {
        position: relative;
        width: min(420px, calc(100vw - 32px));
        border-radius: 20px;
        border: 1px solid rgba(142,187,216,0.3);
        background: #0e1b2f;
        color: #f1f7ff;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        overflow: hidden;
      }
      #dvz-tutorial-header {
        padding: 20px 22px 10px;
        border-bottom: 1px solid rgba(142,187,216,0.14);
      }
      #dvz-tutorial-counter {
        font: 11px/1 Arial, sans-serif;
        color: #6a8faa;
        margin-bottom: 8px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      #dvz-tutorial-title {
        font: 700 20px/1.2 Arial Black, Arial, sans-serif;
        color: #ffe28a;
      }
      #dvz-tutorial-body {
        padding: 16px 22px 20px;
        font: 14px/1.5 Arial, sans-serif;
        color: #c8dff0;
        min-height: 64px;
      }
      #dvz-tutorial-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 22px;
        border-top: 1px solid rgba(142,187,216,0.14);
        gap: 10px;
      }
      #dvz-tutorial-skip {
        background: none; border: none;
        color: #5a7a94; font: 12px/1 Arial, sans-serif;
        cursor: pointer; padding: 4px;
      }
      #dvz-tutorial-skip:hover { color: #99bbcc; }
      #dvz-tutorial-next {
        appearance: none;
        border: 1px solid rgba(255,215,112,0.4);
        border-radius: 10px;
        background: #24486a;
        color: #fff;
        padding: 10px 20px;
        font: 700 13px/1 Arial, sans-serif;
        cursor: pointer;
      }
      #dvz-tutorial-next:hover { background: #2e5a82; }
      #dvz-tutorial-dots {
        display: flex; gap: 6px; align-items: center;
      }
      .dvz-tut-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #2a3f55; transition: background 0.15s;
      }
      .dvz-tut-dot.is-active { background: #ffe28a; }
    `;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'dvz-tutorial';
    el.innerHTML = `
      <div id="dvz-tutorial-backdrop">
        <div id="dvz-tutorial-card" role="dialog" aria-modal="true" aria-labelledby="dvz-tutorial-title">
          <div id="dvz-tutorial-header">
            <div id="dvz-tutorial-counter"></div>
            <div id="dvz-tutorial-title"></div>
          </div>
          <div id="dvz-tutorial-body"></div>
          <div id="dvz-tutorial-footer">
            <button id="dvz-tutorial-skip" type="button">Skip tutorial</button>
            <div id="dvz-tutorial-dots"></div>
            <button id="dvz-tutorial-next" type="button">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    document.getElementById('dvz-tutorial-skip').addEventListener('click', () => this._finish());
    document.getElementById('dvz-tutorial-next').addEventListener('click', () => this._next());
  },

  _render() {
    const total = TUTORIAL_STEPS.length;
    const s = TUTORIAL_STEPS[this.step];

    document.getElementById('dvz-tutorial-counter').textContent = `Step ${this.step + 1} of ${total}`;
    document.getElementById('dvz-tutorial-title').textContent = s.title;
    document.getElementById('dvz-tutorial-body').textContent = s.body;

    const nextBtn = document.getElementById('dvz-tutorial-next');
    nextBtn.textContent = this.step === total - 1 ? "Let's go!" : 'Next';

    const dots = document.getElementById('dvz-tutorial-dots');
    dots.innerHTML = TUTORIAL_STEPS.map((_, i) =>
      `<div class="dvz-tut-dot${i === this.step ? ' is-active' : ''}"></div>`
    ).join('');
  },

  _next() {
    if (this.step < TUTORIAL_STEPS.length - 1) {
      this.step++;
      this._render();
    } else {
      this._finish();
    }
  },

  _finish() {
    this.markDone();
    if (this.el) { this.el.remove(); this.el = null; }
    this.onDone && this.onDone();
  },
};
