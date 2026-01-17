/**
 * Storytelling & Project Journey System
 * プロジェクトの軌跡を感動的なストーリーとして表示するモジュール
 */

const StorytellingSystem = {
  /**
   * プロジェクトの旅路を生成
   */
  generateProjectJourney(project) {
    if (!project || !project.steps) return [];

    const journey = [];
    const startDate = project.createdAt || project.created_at;

    // プロジェクト開始
    journey.push({
      type: 'milestone',
      icon: '🚀',
      title: 'プロジェクト開始',
      date: startDate,
      description: `${project.client}様との新しい挑戦が始まりました`,
      emotion: 'excited'
    });

    // 完了したステップを追加
    project.steps.forEach((step, index) => {
      if (step.status === 'completed' && step.completedAt) {
        journey.push({
          type: 'step',
          icon: this.getStepIcon(index + 1),
          title: step.name,
          date: step.completedAt,
          description: step.description || this.getDefaultDescription(index + 1),
          emotion: 'accomplished',
          stepNumber: index + 1,
          totalSteps: project.steps.length
        });
      }
    });

    // 進行中のステップ
    const currentStep = project.steps.find(s => s.status === 'current');
    if (currentStep) {
      journey.push({
        type: 'current',
        icon: '⚡',
        title: currentStep.name,
        date: new Date().toISOString(),
        description: '現在取り組んでいます',
        emotion: 'focused'
      });
    }

    // プロジェクト完了チェック
    const isCompleted = project.steps.every(s => s.status === 'completed');
    if (isCompleted) {
      const lastCompletedStep = [...project.steps]
        .filter(s => s.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

      journey.push({
        type: 'completion',
        icon: '🎉',
        title: 'プロジェクト完了',
        date: lastCompletedStep?.completedAt || new Date().toISOString(),
        description: '素晴らしい成果をお届けできました！',
        emotion: 'celebration'
      });
    }

    return journey.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * ステップアイコンを取得
   */
  getStepIcon(stepNumber) {
    const icons = {
      1: '📋',
      2: '💡',
      3: '🎨',
      4: '🚀',
      5: '🔍',
      6: '✅',
      7: '📦'
    };
    return icons[stepNumber] || '📌';
  },

  /**
   * デフォルトの説明文を取得
   */
  getDefaultDescription(stepNumber) {
    const descriptions = {
      1: 'お客様のご要望を丁寧にヒアリングしました',
      2: '最適な企画・コンセプトを設計しました',
      3: '魅力的なデザインを制作しました',
      4: '丁寧に制作・開発を進めました',
      5: 'フィードバックを反映し、品質を高めました',
      6: '最終確認で細部まで確認しました',
      7: '無事に納品完了しました'
    };
    return descriptions[stepNumber] || '';
  },

  /**
   * ストーリータイムラインをレンダリング
   */
  renderStoryTimeline(containerId, project) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const journey = this.generateProjectJourney(project);

    let html = '<div class="story-timeline">';

    journey.forEach((item, index) => {
      const dateFormatted = this.formatStoryDate(item.date);
      const emotionClass = `story-item--${item.emotion}`;

      html += `
        <div class="story-item ${emotionClass}" style="animation-delay: ${index * 0.15}s;">
          <div class="story-date" title="${dateFormatted.full}">
            ${dateFormatted.short}
          </div>
          <div class="story-content">
            <div class="story-header">
              <span class="story-icon">${item.icon}</span>
              <span class="story-title">${item.title}</span>
              ${item.type === 'step' ? `<span class="story-progress">${item.stepNumber}/${item.totalSteps}</span>` : ''}
            </div>
            <p class="story-description">${item.description}</p>
            ${item.type === 'completion' ? this.renderCompletionMessage(project) : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // アニメーション発火
    this.animateStoryItems();
  },

  /**
   * 完了メッセージをレンダリング
   */
  renderCompletionMessage(project) {
    const stats = this.calculateProjectStats(project);

    return `
      <div class="story-completion-stats">
        <div class="completion-stat">
          <span class="completion-stat-value">${stats.totalDays}</span>
          <span class="completion-stat-label">日間の制作</span>
        </div>
        <div class="completion-stat">
          <span class="completion-stat-value">${stats.stepsCompleted}</span>
          <span class="completion-stat-label">ステップ完了</span>
        </div>
      </div>
      <div class="story-thank-you">
        ご協力いただきありがとうございました
      </div>
    `;
  },

  /**
   * プロジェクト統計を計算
   */
  calculateProjectStats(project) {
    const startDate = new Date(project.createdAt || project.created_at);
    const completedSteps = project.steps.filter(s => s.status === 'completed');
    const lastCompleted = completedSteps
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

    const endDate = lastCompleted ? new Date(lastCompleted.completedAt) : new Date();
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

    return {
      totalDays,
      stepsCompleted: completedSteps.length,
      totalSteps: project.steps.length,
      progress: Math.round((completedSteps.length / project.steps.length) * 100)
    };
  },

  /**
   * 日付をフォーマット
   */
  formatStoryDate(isoString) {
    if (!isoString) return { short: '-', full: '-' };

    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return {
      short: `${month}/${day}`,
      full: `${year}年${month}月${day}日 ${hours}:${minutes}`
    };
  },

  /**
   * ストーリーアイテムをアニメーション
   */
  animateStoryItems() {
    const items = document.querySelectorAll('.story-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateX(0)';
        }
      });
    }, { threshold: 0.1 });

    items.forEach(item => observer.observe(item));
  },

  /**
   * プロジェクトサマリーカードを生成
   */
  renderProjectSummary(containerId, project) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = this.calculateProjectStats(project);
    const isCompleted = project.steps.every(s => s.status === 'completed');

    html = `
      <div class="project-summary-card ${isCompleted ? 'completed' : ''}">
        <div class="summary-header">
          <div class="summary-icon">${isCompleted ? '🎉' : '📊'}</div>
          <div class="summary-info">
            <h3 class="summary-title">${project.name}</h3>
            <p class="summary-client">${project.client}</p>
          </div>
        </div>

        <div class="summary-progress-ring">
          <svg viewBox="0 0 100 100">
            <circle class="progress-bg" cx="50" cy="50" r="40" />
            <circle class="progress-fill" cx="50" cy="50" r="40"
              stroke-dasharray="${stats.progress * 2.51327} 251.327"
              transform="rotate(-90 50 50)" />
          </svg>
          <div class="progress-text">
            <span class="progress-value">${stats.progress}</span>
            <span class="progress-unit">%</span>
          </div>
        </div>

        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-icon">📅</span>
            <span class="stat-value">${stats.totalDays}日</span>
          </div>
          <div class="summary-stat">
            <span class="stat-icon">✅</span>
            <span class="stat-value">${stats.stepsCompleted}/${stats.totalSteps}</span>
          </div>
        </div>

        ${isCompleted ? `
          <div class="summary-completion-badge">
            プロジェクト完了
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * 感動的なメッセージを生成
   */
  generateEmotionalMessage(project) {
    const stats = this.calculateProjectStats(project);
    const isCompleted = project.steps.every(s => s.status === 'completed');

    const messages = {
      start: [
        '新しい物語が始まります',
        '一緒に素晴らしいものを創りましょう',
        'ワクワクする旅の始まりです'
      ],
      quarter: [
        '順調に進んでいます！',
        '素晴らしいスタートです',
        '着実に前進しています'
      ],
      half: [
        '折り返し地点です！',
        '半分完了しました',
        'ここまでよく頑張りました'
      ],
      threeQuarters: [
        'ゴールが見えてきました！',
        'あと少しです',
        '完成間近です'
      ],
      complete: [
        '素晴らしい成果です！',
        'おめでとうございます！',
        '最高の結果をお届けします'
      ]
    };

    let category;
    if (isCompleted) {
      category = 'complete';
    } else if (stats.progress >= 75) {
      category = 'threeQuarters';
    } else if (stats.progress >= 50) {
      category = 'half';
    } else if (stats.progress >= 25) {
      category = 'quarter';
    } else {
      category = 'start';
    }

    const categoryMessages = messages[category];
    return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
  }
};

// スタイルを追加
const storytellingStyles = document.createElement('style');
storytellingStyles.textContent = `
  /* ストーリータイムライン強化スタイル */
  .story-timeline {
    position: relative;
    padding: 20px 0;
  }

  .story-item {
    position: relative;
    padding-left: 70px;
    padding-bottom: 30px;
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.5s ease;
  }

  .story-item::before {
    content: '';
    position: absolute;
    left: 24px;
    top: 50px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, var(--color-primary) 0%, var(--color-border) 100%);
  }

  .story-item:last-child::before {
    display: none;
  }

  .story-date {
    position: absolute;
    left: 0;
    top: 10px;
    width: 50px;
    height: 50px;
    background: var(--gradient-primary);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 11px;
    font-weight: 600;
    z-index: 1;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  }

  .story-item--celebration .story-date {
    background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); }
    50% { box-shadow: 0 4px 25px rgba(255, 215, 0, 0.8); }
  }

  .story-content {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--shadow-md);
    transition: all 0.3s ease;
  }

  .story-content:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .story-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .story-icon {
    font-size: 24px;
  }

  .story-title {
    font-weight: 600;
    font-size: 16px;
    flex: 1;
  }

  .story-progress {
    background: rgba(99, 102, 241, 0.1);
    color: var(--color-primary);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .story-description {
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }

  /* 完了統計 */
  .story-completion-stats {
    display: flex;
    gap: 20px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
  }

  .completion-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .completion-stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-primary);
  }

  .completion-stat-label {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .story-thank-you {
    margin-top: 16px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    color: var(--color-primary);
    font-weight: 500;
  }

  /* プロジェクトサマリーカード */
  .project-summary-card {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 24px;
    text-align: center;
  }

  .project-summary-card.completed {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-color: rgba(16, 185, 129, 0.3);
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .summary-icon {
    font-size: 48px;
  }

  .summary-info {
    text-align: left;
  }

  .summary-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 4px;
  }

  .summary-client {
    font-size: 14px;
    color: var(--color-text-muted);
    margin: 0;
  }

  /* 円形プログレス */
  .summary-progress-ring {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 24px;
  }

  .summary-progress-ring svg {
    width: 100%;
    height: 100%;
  }

  .progress-bg {
    fill: none;
    stroke: var(--color-border);
    stroke-width: 8;
  }

  .progress-fill {
    fill: none;
    stroke: url(#progressGradient);
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 1s ease;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .progress-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-text);
  }

  .progress-unit {
    font-size: 14px;
    color: var(--color-text-muted);
  }

  .summary-stats {
    display: flex;
    justify-content: center;
    gap: 32px;
  }

  .summary-stat {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stat-icon {
    font-size: 16px;
  }

  .stat-value {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .summary-completion-badge {
    margin-top: 20px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    color: white;
    border-radius: 20px;
    font-weight: 600;
    font-size: 14px;
    display: inline-block;
  }
`;
document.head.appendChild(storytellingStyles);

// グローバルに公開
window.StorytellingSystem = StorytellingSystem;
