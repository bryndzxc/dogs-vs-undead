// ============================================================
// AuthService.js — lightweight auth/session state
// ============================================================

const AUTH_TOKEN_KEY = 'dvz_auth_token';
const AUTH_USER_KEY = 'dvz_auth_user';

const AuthService = {
  token: localStorage.getItem(AUTH_TOKEN_KEY) || null,
  currentUser: null,

  _persistSession() {
    if (this.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, this.token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    if (this.currentUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  },

  _emitAuthChange() {
    window.dispatchEvent(new CustomEvent('dvz-auth-changed', {
      detail: { user: this.currentUser },
    }));
  },

  _setSession(token, user) {
    this.token = token || null;
    this.currentUser = user || null;
    this._persistSession();
    this._emitAuthChange();
  },

  clearSession() {
    this._setSession(null, null);
  },

  getToken() {
    return this.token;
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isAuthenticated() {
    return !!(this.token && this.currentUser);
  },

  getDisplayName() {
    return this.currentUser?.username || 'Guest';
  },

  async initialize() {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser && !this.currentUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch (_error) {
        this.currentUser = null;
      }
    }

    if (!this.token) {
      this.clearSession();
      return null;
    }

    try {
      const response = await ApiClient.request('me', {
        token: this.token,
      });
      const user = response?.user || response;
      this._setSession(this.token, user);
      return user;
    } catch (_error) {
      this.clearSession();
      return null;
    }
  },

  async _handleAuthSuccess(response, successMessage) {
    const user = response?.user || null;
    const token = response?.token || null;
    if (!token || !user) {
      throw new Error('The server did not return a valid session.');
    }

    this._setSession(token, user);

    let mergeError = null;
    try {
      await CloudService.mergeLocalWithCloud();
    } catch (error) {
      mergeError = error;
    }

    return {
      user: this.currentUser,
      message: successMessage,
      mergeError,
    };
  },

  async register(username, password, passwordConfirmation) {
    const response = await ApiClient.request('register', {
      method: 'POST',
      body: {
        username,
        password,
        password_confirmation: passwordConfirmation,
      },
    });

    return this._handleAuthSuccess(response, 'Account created.');
  },

  async login(username, password) {
    const response = await ApiClient.request('login', {
      method: 'POST',
      body: { username, password },
    });

    return this._handleAuthSuccess(response, 'Logged in.');
  },

  async logout() {
    const token = this.token;
    try {
      if (token) {
        await ApiClient.request('logout', {
          method: 'POST',
          token,
        });
      }
    } catch (_error) {
      // Local logout should still work even if the API is unreachable.
    } finally {
      this.clearSession();
    }
  },
};
