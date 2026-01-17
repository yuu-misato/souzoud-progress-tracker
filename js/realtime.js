/**
 * Realtime Notification & Sharing System
 * リアルタイム通知と感動共有システム
 */

const RealtimeSystem = {
  // ポーリング間隔（ミリ秒）
  POLL_INTERVAL: 30000,

  // 最後の更新日時を追跡
  lastUpdates: {},

  // ポーリングタイマー
  pollTimer: null,

  // 通知履歴
  notificationHistory: [],

  /**
   * HTMLエスケープ - XSS防止
   * @param {string} str - エスケープする文字列
   * @returns {string} エスケープされた文字列
   */
  escapeHtml(str) {
    if (typeof SecurityUtils !== 'undefined') {
      return SecurityUtils.escapeHtml(str);
    }
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  /**
   * 初期化
   */
  init(projectId) {
    this.currentProjectId = projectId;
    this.injectStyles();
    this.showRealtimeIndicator();
    this.startPolling();
  },

  /**
   * スタイルを注入
   */
  injectStyles() {
    if (document.getElementById('realtime-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'realtime-styles';
    styles.textContent = `
      /* リアルタイムインジケーター */
      .realtime-indicator {
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: var(--color-success);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 100;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
      }

      .realtime-indicator.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .realtime-dot {
        width: 8px;
        height: 8px;
        background: var(--color-success);
        border-radius: 50%;
        animation: pulse-dot 2s ease-in-out infinite;
      }

      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }

      /* 更新通知パネル */
      .update-notification {
        position: fixed;
        top: 70px;
        right: 20px;
        background: white;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 20px;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
        box-shadow: var(--shadow-xl);
        z-index: 1000;
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .update-notification.show {
        transform: translateX(0);
      }

      .update-notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);
      }

      .update-notification-title {
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .update-notification-close {
        background: none;
        border: none;
        font-size: 20px;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      }

      .update-notification-close:hover {
        color: var(--color-text);
      }

      .update-item {
        padding: 12px;
        background: #f8fafc;
        border-radius: 12px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .update-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .update-item-icon {
        font-size: 20px;
      }

      .update-item-title {
        font-weight: 600;
        font-size: 14px;
        flex: 1;
      }

      .update-item-time {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .update-item-description {
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }

      /* 新着バッジ */
      .update-badge {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        margin-left: 8px;
      }

      /* リアクションシステム */
      .reaction-panel {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px;
        margin-top: 20px;
      }

      .reaction-panel-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 12px;
        color: var(--color-text-secondary);
      }

      .reaction-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .reaction-btn {
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .reaction-btn:hover {
        background: #f1f5f9;
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }

      .reaction-btn.active {
        background: rgba(99, 102, 241, 0.1);
        border-color: var(--color-primary);
      }

      .reaction-btn.animating {
        animation: reaction-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes reaction-pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }

      .reaction-count {
        font-weight: 600;
        color: var(--color-text-secondary);
        font-size: 12px;
      }

      /* 共有メッセージ */
      .share-message-panel {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px;
        margin-top: 16px;
      }

      .share-message-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .share-message-input {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        font-size: 14px;
        resize: none;
        font-family: inherit;
        margin-bottom: 12px;
      }

      .share-message-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      .share-message-btn {
        background: var(--gradient-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .share-message-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md), var(--shadow-glow);
      }

      /* メッセージ履歴 */
      .message-history {
        margin-top: 16px;
        max-height: 200px;
        overflow-y: auto;
      }

      .message-item {
        padding: 12px;
        background: #f8fafc;
        border-radius: 12px;
        margin-bottom: 10px;
      }

      .message-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .message-item-author {
        font-weight: 600;
        font-size: 13px;
      }

      .message-item-time {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .message-item-content {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }

      /* 進捗更新アラート */
      .progress-alert {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: white;
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        box-shadow: var(--shadow-xl);
        z-index: 10001;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .progress-alert.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .progress-alert-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .progress-alert-backdrop.show {
        opacity: 1;
      }

      .progress-alert-icon {
        font-size: 64px;
        margin-bottom: 16px;
        animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes bounce-in {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      .progress-alert-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .progress-alert-subtitle {
        font-size: 16px;
        color: var(--color-text-secondary);
        margin-bottom: 24px;
      }

      .progress-alert-btn {
        background: var(--gradient-primary);
        color: white;
        border: none;
        padding: 12px 32px;
        border-radius: 25px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .progress-alert-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg), var(--shadow-glow);
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * リアルタイムインジケーターを表示
   */
  showRealtimeIndicator() {
    const existing = document.querySelector('.realtime-indicator');
    if (existing) return;

    const indicator = document.createElement('div');
    indicator.className = 'realtime-indicator';
    indicator.innerHTML = `
      <span class="realtime-dot"></span>
      <span>リアルタイム更新中</span>
    `;
    document.body.appendChild(indicator);

    setTimeout(() => indicator.classList.add('visible'), 100);
  },

  /**
   * ポーリングを開始
   */
  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    this.pollTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.POLL_INTERVAL);

    // 初回チェック
    this.checkForUpdates();
  },

  /**
   * ポーリングを停止
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  /**
   * 更新をチェック
   */
  async checkForUpdates() {
    if (!this.currentProjectId) return;

    try {
      const project = await DataManager.getProject(this.currentProjectId);
      if (!project) return;

      const lastUpdate = this.lastUpdates[this.currentProjectId];
      const currentUpdate = project.updatedAt || project.updated_at;

      if (lastUpdate && lastUpdate !== currentUpdate) {
        this.handleUpdate(project);
      }

      this.lastUpdates[this.currentProjectId] = currentUpdate;
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  },

  /**
   * 更新を処理
   */
  handleUpdate(project) {
    // 完了したステップを検出
    const completedSteps = project.steps.filter(s => s.status === 'completed');
    const previousCompletedCount = this.previousCompletedCount || 0;

    if (completedSteps.length > previousCompletedCount) {
      const newlyCompleted = project.steps.find(
        (s, i) => s.status === 'completed' && i === completedSteps.length - 1
      );

      if (newlyCompleted) {
        this.showProgressAlert(newlyCompleted.name, project);
      }
    }

    this.previousCompletedCount = completedSteps.length;

    // 進捗率を計算してマイルストーンチェック
    const progress = DataManager.getProgressPercentage(project);
    if (typeof CelebrationSystem !== 'undefined') {
      CelebrationSystem.checkMilestones(progress, project.name);
    }
  },

  /**
   * 進捗更新アラートを表示
   */
  showProgressAlert(stepName, project) {
    // 背景を作成
    const backdrop = document.createElement('div');
    backdrop.className = 'progress-alert-backdrop';
    document.body.appendChild(backdrop);

    // アラートを作成
    const alert = document.createElement('div');
    alert.className = 'progress-alert';
    alert.innerHTML = `
      <div class="progress-alert-icon">✨</div>
      <h2 class="progress-alert-title">進捗が更新されました!</h2>
      <p class="progress-alert-subtitle">「${this.escapeHtml(stepName)}」が完了しました</p>
      <button class="progress-alert-btn" onclick="RealtimeSystem.closeProgressAlert()">
        確認する
      </button>
    `;
    document.body.appendChild(alert);

    // アニメーション
    setTimeout(() => {
      backdrop.classList.add('show');
      alert.classList.add('show');
    }, 100);

    // 紙吹雪エフェクト
    if (typeof CelebrationSystem !== 'undefined') {
      CelebrationSystem.launchConfetti({ count: 50 });
    }
  },

  /**
   * 進捗アラートを閉じる
   */
  closeProgressAlert() {
    const alert = document.querySelector('.progress-alert');
    const backdrop = document.querySelector('.progress-alert-backdrop');

    if (alert) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }
    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 300);
    }
  },

  /**
   * リアクションパネルをレンダリング
   */
  renderReactionPanel(containerId, projectId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const reactions = this.getReactions(projectId);

    const html = `
      <div class="reaction-panel">
        <div class="reaction-panel-title">このプロジェクトへの応援</div>
        <div class="reaction-buttons">
          ${this.renderReactionButtons(reactions, projectId)}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * リアクションボタンをレンダリング
   */
  renderReactionButtons(reactions, projectId) {
    const reactionTypes = [
      { type: 'like', emoji: '👍', label: 'いいね' },
      { type: 'love', emoji: '❤️', label: '素敵' },
      { type: 'celebrate', emoji: '🎉', label: '祝福' },
      { type: 'fire', emoji: '🔥', label: '最高' },
      { type: 'star', emoji: '⭐', label: 'スター' }
    ];

    return reactionTypes.map(r => {
      const count = reactions[r.type] || 0;
      const active = this.hasReacted(projectId, r.type);

      return `
        <button class="reaction-btn ${active ? 'active' : ''}"
          onclick="RealtimeSystem.toggleReaction('${projectId}', '${r.type}', this)"
          title="${r.label}">
          <span>${r.emoji}</span>
          <span class="reaction-count">${count}</span>
        </button>
      `;
    }).join('');
  },

  /**
   * リアクションを取得（localStorage使用）
   */
  getReactions(projectId) {
    const key = `reactions_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  },

  /**
   * リアクション済みかチェック
   */
  hasReacted(projectId, type) {
    const key = `user_reactions_${projectId}`;
    const stored = localStorage.getItem(key);
    const userReactions = stored ? JSON.parse(stored) : [];
    return userReactions.includes(type);
  },

  /**
   * リアクションをトグル
   */
  toggleReaction(projectId, type, button) {
    const reactionsKey = `reactions_${projectId}`;
    const userKey = `user_reactions_${projectId}`;

    const reactions = this.getReactions(projectId);
    const userReactions = JSON.parse(localStorage.getItem(userKey) || '[]');

    // アニメーション
    button.classList.add('animating');
    setTimeout(() => button.classList.remove('animating'), 400);

    if (userReactions.includes(type)) {
      // リアクション解除
      reactions[type] = Math.max(0, (reactions[type] || 0) - 1);
      const index = userReactions.indexOf(type);
      userReactions.splice(index, 1);
      button.classList.remove('active');
    } else {
      // リアクション追加
      reactions[type] = (reactions[type] || 0) + 1;
      userReactions.push(type);
      button.classList.add('active');

      // 紙吹雪エフェクト
      if (typeof CelebrationSystem !== 'undefined') {
        const rect = button.getBoundingClientRect();
        CelebrationSystem.sparkleAt(rect.left + rect.width / 2, rect.top);
      }
    }

    // 保存
    localStorage.setItem(reactionsKey, JSON.stringify(reactions));
    localStorage.setItem(userKey, JSON.stringify(userReactions));

    // カウント更新
    const countEl = button.querySelector('.reaction-count');
    if (countEl) {
      countEl.textContent = reactions[type] || 0;
    }
  },

  /**
   * 共有メッセージパネルをレンダリング
   */
  renderShareMessagePanel(containerId, projectId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const messages = this.getMessages(projectId);

    const html = `
      <div class="share-message-panel">
        <div class="share-message-title">
          💬 メッセージを残す
        </div>
        <textarea class="share-message-input" id="share-message-input"
          placeholder="プロジェクトへのコメントや応援メッセージ..." rows="3"></textarea>
        <button class="share-message-btn" onclick="RealtimeSystem.submitMessage('${projectId}')">
          送信する
        </button>

        ${messages.length > 0 ? `
          <div class="message-history">
            ${messages.map(m => `
              <div class="message-item">
                <div class="message-item-header">
                  <span class="message-item-author">${this.escapeHtml(m.author)}</span>
                  <span class="message-item-time">${this.formatMessageTime(m.timestamp)}</span>
                </div>
                <div class="message-item-content">${this.escapeHtml(m.content)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * メッセージを取得
   */
  getMessages(projectId) {
    const key = `messages_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * メッセージを送信
   */
  submitMessage(projectId) {
    const input = document.getElementById('share-message-input');
    const content = input?.value.trim();

    if (!content) return;

    const messages = this.getMessages(projectId);
    const session = JSON.parse(localStorage.getItem('client_session') || '{}');

    messages.unshift({
      id: Date.now().toString(),
      author: session.name || 'ゲスト',
      content: content,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem(`messages_${projectId}`, JSON.stringify(messages));

    // パネルを再レンダリング
    const container = input.closest('.share-message-panel').parentElement;
    this.renderShareMessagePanel(container.id, projectId);

    // トースト
    if (typeof CelebrationSystem !== 'undefined') {
      CelebrationSystem.showCelebrationToast('メッセージを送信しました!', '💬');
    }
  },

  /**
   * メッセージ時間をフォーマット
   */
  formatMessageTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'たった今';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '時間前';
    return date.toLocaleDateString('ja-JP');
  },

  /**
   * 更新通知を追加
   */
  addNotification(notification) {
    this.notificationHistory.unshift({
      ...notification,
      timestamp: new Date().toISOString()
    });

    // 最大20件保持
    if (this.notificationHistory.length > 20) {
      this.notificationHistory.pop();
    }
  },

  /**
   * 更新通知パネルを表示
   */
  showNotificationPanel() {
    const existing = document.querySelector('.update-notification');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'update-notification';
    panel.innerHTML = `
      <div class="update-notification-header">
        <div class="update-notification-title">
          🔔 更新履歴
          ${this.notificationHistory.length > 0 ? `<span class="update-badge">${this.notificationHistory.length}</span>` : ''}
        </div>
        <button class="update-notification-close" onclick="this.closest('.update-notification').remove()">
          ×
        </button>
      </div>
      <div class="update-notification-list">
        ${this.notificationHistory.length > 0 ? this.notificationHistory.map(n => `
          <div class="update-item">
            <div class="update-item-header">
              <span class="update-item-icon">${this.escapeHtml(n.icon) || '📌'}</span>
              <span class="update-item-title">${this.escapeHtml(n.title)}</span>
              <span class="update-item-time">${this.formatMessageTime(n.timestamp)}</span>
            </div>
            <div class="update-item-description">${this.escapeHtml(n.description)}</div>
          </div>
        `).join('') : '<p style="color: var(--color-text-muted); text-align: center;">更新履歴はありません</p>'}
      </div>
    `;

    document.body.appendChild(panel);
    setTimeout(() => panel.classList.add('show'), 100);
  }
};

// グローバルに公開
window.RealtimeSystem = RealtimeSystem;
