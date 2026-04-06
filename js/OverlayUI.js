// ============================================================
// OverlayUI.js — auth + leaderboard DOM overlays
// ============================================================

const OverlayUI = {
  initialized: false,
  authMode: 'login',
  toastTimer: null,
  menuOpen: false,

  init() {
    if (this.initialized) {
      this.updateChip();
      return;
    }

    this.initialized = true;

    // Account chip + dropdown
    this.accountChip    = document.getElementById('dvz-account-chip');
    this.chipDot        = document.getElementById('dvz-chip-dot');
    this.chipName       = document.getElementById('dvz-chip-name');
    this.accountMenu    = document.getElementById('dvz-account-menu');
    this.menuStatus     = document.getElementById('dvz-menu-status');
    this.loginButton    = document.getElementById('dvz-login-open');
    this.registerButton = document.getElementById('dvz-register-open');
    this.logoutButton   = document.getElementById('dvz-logout-open');
    this.leaderboardButton = document.getElementById('dvz-leaderboard-open');

    // Auth modal
    this.backdrop    = document.getElementById('dvz-modal-backdrop');
    this.authModal   = document.getElementById('dvz-auth-modal');
    this.leaderboardModal = document.getElementById('dvz-leaderboard-modal');
    this.authTitle   = document.getElementById('dvz-auth-title');
    this.authForm    = document.getElementById('dvz-auth-form');
    this.authError   = document.getElementById('dvz-auth-error');
    this.authUsername = document.getElementById('dvz-auth-username');
    this.authPassword = document.getElementById('dvz-auth-password');
    this.authConfirmField = document.getElementById('dvz-auth-confirm-field');
    this.authPasswordConfirmation = document.getElementById('dvz-auth-password-confirmation');
    this.authSubmit  = document.getElementById('dvz-auth-submit');
    this.authLoginTab    = document.getElementById('dvz-auth-tab-login');
    this.authRegisterTab = document.getElementById('dvz-auth-tab-register');

    this.leaderboardMessage = document.getElementById('dvz-leaderboard-message');
    this.leaderboardBody    = document.getElementById('dvz-leaderboard-body');
    this.toast = document.getElementById('dvz-toast');

    // Chip toggle
    this.accountChip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Close menu on outside click
    document.addEventListener('click', () => this.closeMenu());

    // Prevent menu click from bubbling to document (so it doesn't close itself)
    this.accountMenu.addEventListener('click', (e) => e.stopPropagation());

    this.loginButton.addEventListener('click', () => {
      this.closeMenu();
      this.openAuth('login');
    });
    this.registerButton.addEventListener('click', () => {
      this.closeMenu();
      this.openAuth('register');
    });
    this.logoutButton.addEventListener('click', async () => {
      this.closeMenu();
      await AuthService.logout();
      this.updateChip();
      this.showToast('Signed out. Guest mode stays available.', 'info');
    });
    this.leaderboardButton.addEventListener('click', () => {
      this.closeMenu();
      this.openLeaderboard();
    });

    this.backdrop.addEventListener('click', () => this.closeAllModals());
    document.getElementById('dvz-auth-close').addEventListener('click', () => this.closeAuth());
    document.getElementById('dvz-auth-guest').addEventListener('click', () => {
      this.closeAuth();
      this.showToast('Continuing in guest mode.', 'info');
    });
    this.authLoginTab.addEventListener('click', () => this.setAuthMode('login'));
    this.authRegisterTab.addEventListener('click', () => this.setAuthMode('register'));
    this.authSubmit.addEventListener('click', () => this.submitAuth());
    this.authForm.addEventListener('submit', event => {
      event.preventDefault();
      this.submitAuth();
    });

    document.getElementById('dvz-leaderboard-close').addEventListener('click', () => this.closeLeaderboard());
    document.getElementById('dvz-leaderboard-refresh').addEventListener('click', () => this.loadLeaderboard());

    window.addEventListener('dvz-auth-changed', () => this.updateChip());
    window.addEventListener('dvz-cloud-status', event => {
      const msg = event.detail?.message || '';
      if (this.menuStatus) this.menuStatus.textContent = msg || this._defaultStatusText();
    });

    this.setAuthMode('login');
    this.updateChip();
  },

  _defaultStatusText() {
    return AuthService.isAuthenticated()
      ? 'Cloud save and leaderboard are enabled.'
      : 'Local save only. Login is optional.';
  },

  toggleMenu() {
    if (this.menuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  },

  openMenu() {
    this.menuOpen = true;
    this.accountMenu.classList.remove('dvz-hidden');
  },

  closeMenu() {
    this.menuOpen = false;
    this.accountMenu.classList.add('dvz-hidden');
  },

  updateChip() {
    const isLoggedIn = AuthService.isAuthenticated();
    const user = AuthService.getCurrentUser();

    this.chipDot.className = isLoggedIn ? 'is-online' : 'is-guest';
    this.chipName.textContent = isLoggedIn ? user.username : 'Guest';

    if (this.menuStatus) {
      this.menuStatus.textContent = this._defaultStatusText();
    }

    // Show/hide login vs logout actions
    this.loginButton.classList.toggle('dvz-hidden', isLoggedIn);
    this.registerButton.classList.toggle('dvz-hidden', isLoggedIn);
    this.logoutButton.classList.toggle('dvz-hidden', !isLoggedIn);
  },

  // ── Auth modal ──────────────────────────────────────────────

  setAuthMode(mode) {
    this.authMode = mode === 'register' ? 'register' : 'login';
    this.authLoginTab.classList.toggle('is-active', this.authMode === 'login');
    this.authRegisterTab.classList.toggle('is-active', this.authMode === 'register');
    this.authConfirmField.classList.toggle('dvz-hidden', this.authMode !== 'register');
    this.authPasswordConfirmation.required = this.authMode === 'register';
    this.authPassword.setAttribute('autocomplete', this.authMode === 'register' ? 'new-password' : 'current-password');
    this.authTitle.textContent = this.authMode === 'register' ? 'Create account' : 'Login';
    this.authSubmit.textContent = this.authMode === 'register' ? 'Register' : 'Login';
    this.authError.textContent = '';
  },

  openAuth(mode = 'login') {
    this.setAuthMode(mode);
    this.authForm.reset();
    this.authError.textContent = '';
    this.backdrop.classList.remove('dvz-hidden');
    this.authModal.classList.remove('dvz-hidden');
    this.leaderboardModal.classList.add('dvz-hidden');
    window.setTimeout(() => this.authUsername.focus(), 20);
  },

  closeAuth() {
    this.authModal.classList.add('dvz-hidden');
    if (this.leaderboardModal.classList.contains('dvz-hidden')) {
      this.backdrop.classList.add('dvz-hidden');
    }
  },

  async submitAuth() {
    const username = this.authUsername.value.trim();
    const password = this.authPassword.value;
    const passwordConfirmation = this.authPasswordConfirmation.value;

    if (!username) { this.authError.textContent = 'Username is required.'; return; }
    if (!password || password.length < 6) { this.authError.textContent = 'Password must be at least 6 characters.'; return; }
    if (this.authMode === 'register' && password !== passwordConfirmation) {
      this.authError.textContent = 'Passwords do not match.'; return;
    }

    this.authSubmit.disabled = true;
    this.authError.textContent = '';

    try {
      const result = this.authMode === 'register'
        ? await AuthService.register(username, password, passwordConfirmation)
        : await AuthService.login(username, password);

      this.closeAuth();
      this.updateChip();
      this.showToast(`${result.message} ${result.user.username} is now online.`, 'success');

      if (result.mergeError) {
        this.showToast(`Login worked, but cloud merge failed: ${result.mergeError.message}`, 'warn');
      }
    } catch (error) {
      this.authError.textContent = ApiClient.getErrorMessage(error.data, error.status || 500);
    } finally {
      this.authSubmit.disabled = false;
    }
  },

  // ── Leaderboard modal ──────────────────────────────────────

  async openLeaderboard() {
    this.backdrop.classList.remove('dvz-hidden');
    this.leaderboardModal.classList.remove('dvz-hidden');
    this.authModal.classList.add('dvz-hidden');
    await this.loadLeaderboard();
  },

  closeLeaderboard() {
    this.leaderboardModal.classList.add('dvz-hidden');
    if (this.authModal.classList.contains('dvz-hidden')) {
      this.backdrop.classList.add('dvz-hidden');
    }
  },

  closeAllModals() {
    this.closeAuth();
    this.closeLeaderboard();
  },

  async loadLeaderboard() {
    this.leaderboardMessage.textContent = 'Loading leaderboard...';
    this.leaderboardBody.innerHTML = '';

    try {
      const rows = await CloudService.fetchLeaderboard();
      if (!rows.length) {
        this.leaderboardMessage.textContent = 'No online scores yet. Be the first to submit.';
        return;
      }

      this.leaderboardMessage.textContent = '';
      const currentUser = AuthService.getCurrentUser();
      this.leaderboardBody.innerHTML = rows.map((entry, index) => {
        const isCurrentUser = currentUser && currentUser.username === entry.username;
        return `
          <tr class="${isCurrentUser ? 'is-current-user' : ''}">
            <td>${index + 1}</td>
            <td>${entry.username}</td>
            <td>${entry.highest_level}</td>
            <td>${entry.total_stars}</td>
            <td>${entry.score}</td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      this.leaderboardMessage.textContent = error.message || 'Failed to load leaderboard.';
    }
  },

  // ── Toast ──────────────────────────────────────────────────

  showToast(message, kind = 'info') {
    clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.remove('dvz-hidden');

    const borderColor = kind === 'success'
      ? 'rgba(68, 221, 136, 0.45)'
      : kind === 'warn'
        ? 'rgba(255, 215, 112, 0.45)'
        : kind === 'error'
          ? 'rgba(255, 130, 130, 0.45)'
          : 'rgba(142, 187, 216, 0.32)';

    this.toast.style.borderColor = borderColor;
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.add('dvz-hidden');
    }, 3200);
  },
};
