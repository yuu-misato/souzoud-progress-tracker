/**
 * Security Utilities
 * XSS防止とセキュリティ強化のためのユーティリティ
 */

const SecurityUtils = {
  /**
   * HTMLエスケープ - XSS防止
   * @param {string} str - エスケープする文字列
   * @returns {string} エスケープされた文字列
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
  },

  /**
   * URLをサニタイズ - javascript: などの危険なプロトコルを除去
   * @param {string} url - サニタイズするURL
   * @returns {string} サニタイズされたURL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';

    const trimmedUrl = url.trim().toLowerCase();

    // 許可するプロトコル
    const allowedProtocols = ['http:', 'https:', 'mailto:'];

    try {
      const urlObj = new URL(url, window.location.origin);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return '';
      }
      return url;
    } catch {
      // 相対URLの場合
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return url;
      }
      // javascript:, data: などのスキームをブロック
      if (trimmedUrl.startsWith('javascript:') ||
          trimmedUrl.startsWith('data:') ||
          trimmedUrl.startsWith('vbscript:')) {
        return '';
      }
      return url;
    }
  },

  /**
   * パスワード強度をチェック
   * @param {string} password - チェックするパスワード
   * @returns {object} { isValid: boolean, message: string, score: number }
   */
  checkPasswordStrength(password) {
    if (!password) {
      return { isValid: false, message: 'パスワードを入力してください', score: 0 };
    }

    let score = 0;
    const messages = [];

    // 最小長チェック (8文字以上を推奨)
    if (password.length < 8) {
      messages.push('8文字以上にしてください');
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
    }

    // 数字を含む
    if (/\d/.test(password)) {
      score += 1;
    } else {
      messages.push('数字を含めてください');
    }

    // 小文字を含む
    if (/[a-z]/.test(password)) {
      score += 1;
    }

    // 大文字を含む
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      messages.push('大文字を含めることを推奨します');
    }

    // 特殊文字を含む
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    }

    const isValid = password.length >= 8 && /\d/.test(password);
    const message = messages.length > 0 ? messages[0] : '強力なパスワードです';

    return { isValid, message, score };
  },

  /**
   * 入力値のバリデーション
   * @param {string} input - バリデーションする入力
   * @param {object} rules - バリデーションルール
   * @returns {object} { isValid: boolean, message: string }
   */
  validateInput(input, rules = {}) {
    const {
      required = false,
      minLength = 0,
      maxLength = Infinity,
      pattern = null,
      type = 'text'
    } = rules;

    if (required && (!input || input.trim() === '')) {
      return { isValid: false, message: '必須項目です' };
    }

    if (input && input.length < minLength) {
      return { isValid: false, message: `${minLength}文字以上で入力してください` };
    }

    if (input && input.length > maxLength) {
      return { isValid: false, message: `${maxLength}文字以下で入力してください` };
    }

    if (type === 'email' && input) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input)) {
        return { isValid: false, message: '有効なメールアドレスを入力してください' };
      }
    }

    if (pattern && input && !pattern.test(input)) {
      return { isValid: false, message: '入力形式が正しくありません' };
    }

    return { isValid: true, message: '' };
  },

  /**
   * CSRFトークンを生成（簡易版）
   * @returns {string} CSRFトークン
   */
  generateCsrfToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * セッションの有効性をチェック
   * @param {object} session - セッションオブジェクト
   * @returns {boolean} 有効かどうか
   */
  isValidSession(session) {
    if (!session) return false;

    try {
      const sessionData = typeof session === 'string' ? JSON.parse(session) : session;

      // 必須フィールドのチェック
      if (!sessionData.email || !sessionData.id) {
        return false;
      }

      // 有効期限のチェック
      if (sessionData.expiry && sessionData.expiry <= Date.now()) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * 安全なJSON解析
   * @param {string} jsonString - 解析するJSON文字列
   * @param {any} defaultValue - パース失敗時のデフォルト値
   * @returns {any} パース結果
   */
  safeJsonParse(jsonString, defaultValue = null) {
    if (jsonString === null || jsonString === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  },

  /**
   * レート制限のチェック（簡易版）
   * @param {string} action - アクション名
   * @param {number} maxAttempts - 最大試行回数
   * @param {number} windowMs - 制限期間（ミリ秒）
   * @returns {boolean} 制限内かどうか
   */
  checkRateLimit(action, maxAttempts = 5, windowMs = 60000) {
    const key = `ratelimit_${action}`;
    const now = Date.now();

    let attempts = SecurityUtils.safeJsonParse(sessionStorage.getItem(key), []);

    // 期限切れのエントリを削除
    attempts = attempts.filter(timestamp => now - timestamp < windowMs);

    if (attempts.length >= maxAttempts) {
      return false; // レート制限に達した
    }

    attempts.push(now);
    sessionStorage.setItem(key, JSON.stringify(attempts));
    return true;
  },

  /**
   * Content Security Policy違反をログ
   * @param {SecurityPolicyViolationEvent} event - CSP違反イベント
   */
  logCspViolation(event) {
    console.warn('CSP Violation:', {
      blockedUri: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy
    });
  }
};

// CSP違反のリスナーを設定
if (typeof document !== 'undefined') {
  document.addEventListener('securitypolicyviolation', SecurityUtils.logCspViolation);
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.SecurityUtils = SecurityUtils;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityUtils;
}
