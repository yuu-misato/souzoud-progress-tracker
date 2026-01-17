/**
 * Celebration & Emotional Effects System
 * 感動的な演出とお祝いエフェクトを提供するモジュール
 */

const CelebrationSystem = {
  // パーティクルエフェクト用のコンテナ
  container: null,

  /**
   * 初期化
   */
  init() {
    this.createContainer();
    this.injectStyles();
  },

  /**
   * エフェクト用コンテナを作成
   */
  createContainer() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'celebration-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  },

  /**
   * スタイルを注入
   */
  injectStyles() {
    if (document.getElementById('celebration-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'celebration-styles';
    styles.textContent = `
      /* 紙吹雪パーティクル */
      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        z-index: 10000;
        pointer-events: none;
      }

      .confetti-piece {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 2px;
        animation: confetti-fall linear forwards;
      }

      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotateZ(0deg) rotateY(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotateZ(720deg) rotateY(720deg);
          opacity: 0;
        }
      }

      /* 花火エフェクト */
      .firework {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
      }

      .firework-particle {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        animation: firework-explode ease-out forwards;
      }

      @keyframes firework-explode {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      /* 星キラキラエフェクト */
      .sparkle {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        animation: sparkle-burst 0.6s ease-out forwards;
      }

      @keyframes sparkle-burst {
        0% {
          transform: scale(0) rotate(0deg);
          opacity: 1;
        }
        50% {
          transform: scale(1.2) rotate(180deg);
          opacity: 1;
        }
        100% {
          transform: scale(0.8) rotate(360deg);
          opacity: 0;
        }
      }

      /* 完了祝福モーダル */
      .celebration-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        animation: modal-fade-in 0.5s ease-out forwards;
      }

      @keyframes modal-fade-in {
        to { opacity: 1; }
      }

      .celebration-content {
        text-align: center;
        color: white;
        transform: scale(0.8);
        animation: celebration-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }

      @keyframes celebration-pop {
        to { transform: scale(1); }
      }

      .celebration-icon {
        font-size: 120px;
        margin-bottom: 24px;
        animation: celebration-bounce 0.8s ease-in-out infinite;
      }

      @keyframes celebration-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }

      .celebration-title {
        font-size: 48px;
        font-weight: 700;
        margin-bottom: 16px;
        background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 50%, #6366f1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 2s linear infinite;
      }

      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      .celebration-subtitle {
        font-size: 24px;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 32px;
      }

      .celebration-stats {
        display: flex;
        justify-content: center;
        gap: 40px;
        margin-bottom: 40px;
      }

      .celebration-stat {
        text-align: center;
      }

      .celebration-stat-value {
        font-size: 36px;
        font-weight: 700;
        color: #ffd700;
      }

      .celebration-stat-label {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .celebration-close {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      }

      .celebration-close:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
      }

      /* ステップ完了アニメーション */
      .step-complete-animation {
        animation: step-complete 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes step-complete {
        0% { transform: scale(1); }
        25% { transform: scale(1.3); }
        50% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      /* 進捗バー輝きエフェクト */
      .progress-glow {
        position: relative;
        overflow: hidden;
      }

      .progress-glow::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.4) 50%,
          transparent 100%
        );
        animation: progress-shine 2s ease-in-out infinite;
      }

      @keyframes progress-shine {
        0% { left: -100%; }
        100% { left: 200%; }
      }

      /* マイルストーン達成バッジ */
      .milestone-badge {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        z-index: 10000;
        transform: translateX(120%);
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .milestone-badge.show {
        transform: translateX(0);
      }

      .milestone-badge-icon {
        font-size: 24px;
        animation: badge-pulse 1s ease-in-out infinite;
      }

      @keyframes badge-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }

      /* タイムライン進行アニメーション */
      .timeline-progress-line {
        position: absolute;
        left: 12px;
        top: 0;
        width: 2px;
        background: linear-gradient(to bottom, var(--color-success) 0%, var(--color-primary) 100%);
        transition: height 0.5s ease-out;
      }

      /* プロジェクトカード入場アニメーション */
      .project-card-enter {
        opacity: 0;
        transform: translateY(30px);
        animation: card-enter 0.5s ease-out forwards;
      }

      @keyframes card-enter {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* 数字カウントアップアニメーション */
      .count-up {
        display: inline-block;
      }

      /* 祝福メッセージトースト */
      .celebration-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        color: white;
        padding: 16px 32px;
        border-radius: 50px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .celebration-toast.show {
        transform: translateX(-50%) translateY(0);
      }

      /* リアルタイム更新インジケーター */
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

      /* プロジェクトストーリータイムライン */
      .story-timeline {
        position: relative;
        padding: 40px 0;
      }

      .story-item {
        position: relative;
        padding-left: 60px;
        padding-bottom: 40px;
        opacity: 0;
        transform: translateX(-20px);
        animation: story-enter 0.5s ease-out forwards;
      }

      .story-item::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: linear-gradient(to bottom, var(--color-primary) 0%, var(--color-border) 100%);
      }

      .story-item:last-child::before {
        display: none;
      }

      @keyframes story-enter {
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .story-date {
        position: absolute;
        left: 0;
        top: 0;
        width: 40px;
        height: 40px;
        background: var(--gradient-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 600;
        z-index: 1;
      }

      .story-content {
        background: white;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: var(--shadow-md);
      }

      .story-title {
        font-weight: 600;
        margin-bottom: 8px;
      }

      .story-description {
        color: var(--color-text-secondary);
        font-size: 14px;
      }

      /* 感情共有リアクション */
      .reaction-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
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
      }

      .reaction-btn.active {
        background: rgba(99, 102, 241, 0.1);
        border-color: var(--color-primary);
      }

      .reaction-count {
        font-weight: 600;
        color: var(--color-text-secondary);
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * 紙吹雪エフェクトを発動
   */
  launchConfetti(options = {}) {
    const {
      count = 150,
      duration = 4000,
      colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ffd700']
    } = options;

    this.init();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-20px';

        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 10 + 5) + 'px';
        piece.style.height = (Math.random() * 10 + 5) + 'px';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';

        confetti.appendChild(piece);
        this.container.appendChild(confetti);

        setTimeout(() => confetti.remove(), duration);
      }, Math.random() * 500);
    }
  },

  /**
   * 花火エフェクトを発動
   */
  launchFireworks(options = {}) {
    const {
      count = 5,
      colors = ['#ffd700', '#ff6b6b', '#6366f1', '#10b981']
    } = options;

    this.init();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createFirework(
          Math.random() * (window.innerWidth - 200) + 100,
          Math.random() * (window.innerHeight * 0.5) + 50,
          colors
        );
      }, i * 300);
    }
  },

  createFirework(x, y, colors) {
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = x + 'px';
    firework.style.top = y + 'px';

    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];

      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = Math.random() * 80 + 60;
      const endX = Math.cos(angle) * velocity;
      const endY = Math.sin(angle) * velocity;

      particle.style.animation = `firework-explode 1s ease-out forwards`;
      particle.style.setProperty('--end-x', endX + 'px');
      particle.style.setProperty('--end-y', endY + 'px');

      // カスタムtransformをアニメーション内で使用
      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${endX}px, ${endY}px) scale(0.3)`, opacity: 0 }
      ], {
        duration: 1000,
        easing: 'ease-out',
        fill: 'forwards'
      });

      firework.appendChild(particle);
    }

    this.container.appendChild(firework);
    setTimeout(() => firework.remove(), 1500);
  },

  /**
   * キラキラエフェクトを発動
   */
  sparkleAt(x, y, options = {}) {
    const {
      count = 8,
      colors = ['#ffd700', '#ff6b6b', '#6366f1']
    } = options;

    this.init();

    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
      sparkle.style.top = (y + (Math.random() - 0.5) * 40) + 'px';
      sparkle.style.color = colors[Math.floor(Math.random() * colors.length)];
      sparkle.innerHTML = '✦';
      sparkle.style.fontSize = (Math.random() * 16 + 12) + 'px';
      sparkle.style.animationDelay = (Math.random() * 0.2) + 's';

      this.container.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 800);
    }
  },

  /**
   * プロジェクト完了祝福モーダルを表示
   */
  showCompletionCelebration(projectData = {}) {
    const {
      projectName = 'プロジェクト',
      totalDays = 0,
      stepsCompleted = 0,
      teamMembers = []
    } = projectData;

    this.init();

    // 背景効果
    this.launchConfetti({ count: 200 });
    setTimeout(() => this.launchFireworks({ count: 3 }), 500);

    const modal = document.createElement('div');
    modal.className = 'celebration-modal';
    modal.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h1 class="celebration-title">プロジェクト完了!</h1>
        <p class="celebration-subtitle">${projectName}</p>
        <div class="celebration-stats">
          <div class="celebration-stat">
            <div class="celebration-stat-value">${totalDays}</div>
            <div class="celebration-stat-label">制作日数</div>
          </div>
          <div class="celebration-stat">
            <div class="celebration-stat-value">${stepsCompleted}</div>
            <div class="celebration-stat-label">完了ステップ</div>
          </div>
        </div>
        <button class="celebration-close" onclick="this.closest('.celebration-modal').remove()">
          閉じる
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // 追加の花火
    const interval = setInterval(() => {
      if (!document.body.contains(modal)) {
        clearInterval(interval);
        return;
      }
      this.launchFireworks({ count: 2 });
    }, 2000);
  },

  /**
   * ステップ完了を祝う
   */
  celebrateStepComplete(element, stepName) {
    // 要素にアニメーションを追加
    element.classList.add('step-complete-animation');

    // キラキラエフェクト
    const rect = element.getBoundingClientRect();
    this.sparkleAt(rect.left + rect.width / 2, rect.top + rect.height / 2);

    // トーストメッセージ
    this.showCelebrationToast(`${stepName}が完了しました!`, '✅');

    setTimeout(() => {
      element.classList.remove('step-complete-animation');
    }, 600);
  },

  /**
   * マイルストーン達成バッジを表示
   */
  showMilestoneBadge(message, icon = '🏆') {
    const existing = document.querySelector('.milestone-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.className = 'milestone-badge';
    badge.innerHTML = `
      <span class="milestone-badge-icon">${icon}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(badge);

    setTimeout(() => badge.classList.add('show'), 100);
    setTimeout(() => {
      badge.classList.remove('show');
      setTimeout(() => badge.remove(), 500);
    }, 5000);
  },

  /**
   * 祝福トーストを表示
   */
  showCelebrationToast(message, icon = '🎉') {
    const existing = document.querySelector('.celebration-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'celebration-toast';
    toast.innerHTML = `
      <span>${icon}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  },

  /**
   * 進捗率に応じたマイルストーンチェック
   */
  checkMilestones(progress, projectName) {
    const milestones = [
      { threshold: 25, message: '25%達成!', icon: '🌟' },
      { threshold: 50, message: '折り返し地点!', icon: '🎯' },
      { threshold: 75, message: '75%達成!', icon: '🚀' },
      { threshold: 100, message: 'プロジェクト完了!', icon: '🎉' }
    ];

    const milestone = milestones.find(m => m.threshold === progress);
    if (milestone) {
      this.showMilestoneBadge(`${projectName}: ${milestone.message}`, milestone.icon);

      if (progress === 100) {
        setTimeout(() => {
          this.showCompletionCelebration({ projectName });
        }, 1000);
      } else if (progress === 50) {
        this.launchConfetti({ count: 50 });
      }
    }
  },

  /**
   * 数字カウントアップアニメーション
   */
  countUp(element, endValue, duration = 1000) {
    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (endValue - start) * eased);

      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  },

  /**
   * プロジェクトカードに入場アニメーションを追加
   */
  animateProjectCards() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
      card.style.animationDelay = (index * 0.1) + 's';
      card.classList.add('project-card-enter');
    });
  },

  /**
   * 進捗バーに輝きエフェクトを追加
   */
  addProgressGlow(progressBar) {
    if (progressBar && !progressBar.classList.contains('progress-glow')) {
      progressBar.classList.add('progress-glow');
    }
  }
};

// グローバルに公開
window.CelebrationSystem = CelebrationSystem;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  CelebrationSystem.init();
});
