// ============================================================
// ApiClient.js — lightweight fetch wrapper for the Laravel API
// ============================================================

window.DVZ_API_BASE_URL = window.DVZ_API_BASE_URL || 'backend/public/api';

const ApiClient = {
  getBaseUrl() {
    return String(window.DVZ_API_BASE_URL || 'backend/public/api').replace(/\/+$/, '');
  },

  _buildUrl(path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    return new URL(`${this.getBaseUrl()}/${cleanPath}`, window.location.href).toString();
  },

  async request(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let body;
    if (typeof options.body !== 'undefined') {
      if (options.rawBody) {
        body = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(this._buildUrl(path), {
      method: options.method || 'GET',
      headers,
      body,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const error = new Error(this.getErrorMessage(data, response.status));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  getErrorMessage(data, status) {
    if (data && typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    if (data && data.errors && typeof data.errors === 'object') {
      const lines = Object.values(data.errors)
        .flat()
        .filter(Boolean)
        .map(String);
      if (lines.length > 0) return lines[0];
    }

    return `Request failed (${status}).`;
  },
};
