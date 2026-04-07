// ============================================================
// ApiConfig.js — environment-aware Laravel API base URL config
// ============================================================

(function initializeDvzApiConfig(global) {
  const LOCAL_API_BASE = 'http://dogs-vs-undead.test/backend/public/api';
  const PRODUCTION_API_BASE = 'https://api.dogsvsundead.com/api';

  const hostname = String(global.location?.hostname || '').toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'dogs-vs-undead.test' ||
    hostname.endsWith('.test');

  const manualOverride = typeof global.DVZ_API_BASE_URL === 'string' && global.DVZ_API_BASE_URL.trim()
    ? global.DVZ_API_BASE_URL.trim()
    : null;

  const apiBaseUrl = manualOverride || (isLocal ? LOCAL_API_BASE : PRODUCTION_API_BASE);

  global.DVZ_API_CONFIG = Object.freeze({
    hostname,
    isLocal,
    apiBaseUrl,
    localApiBase: LOCAL_API_BASE,
    productionApiBase: PRODUCTION_API_BASE,
  });

  global.DVZ_API_BASE_URL = apiBaseUrl;
})(window);
