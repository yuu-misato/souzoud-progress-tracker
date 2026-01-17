/**
 * Milestone Achievement & Recording System
 * マイルストーン達成記録と祝福システム
 */

const MilestoneSystem = {
  // マイルストーン定義
  MILESTONES: [
    {
      id: 'project_start',
      name: 'プロジェクト開始',
      icon: '🚀',
      description: '新しい挑戦が始まりました',
      condition: (project) => true
    },
    {
      id: 'first_step',
      name: '最初の一歩',
      icon: '👣',
      description: '最初のステップを完了しました',
      condition: (project) => {
        const completed = project.steps?.filter(s => s.status === 'completed').length || 0;
        return completed >= 1;
      }
    },
    {
      id: 'quarter_done',
      name: '25%達成',
      icon: '🌟',
      description: '4分の1が完了しました',
      condition: (project) => {
        const progress = MilestoneSystem.calculateProgress(project);
        return progress >= 25;
      }
    },
    {
      id: 'halfway',
      name: '折り返し地点',
      icon: '🎯',
      description: '半分が完了しました！',
      condition: (project) => {
        const progress = MilestoneSystem.calculateProgress(project);
        return progress >= 50;
      }
    },
    {
      id: 'three_quarters',
      name: '75%達成',
      icon: '🔥',
      description: 'あと少しです！',
      condition: (project) => {
        const progress = MilestoneSystem.calculateProgress(project);
        return progress >= 75;
      }
    },
    {
      id: 'project_complete',
      name: 'プロジェクト完了',
      icon: '🏆',
      description: '素晴らしい成果です！',
      condition: (project) => {
        return project.steps?.every(s => s.status === 'completed');
      }
    },
    {
      id: 'speed_demon',
      name: 'スピード制作',
      icon: '⚡',
      description: '7日以内に完了しました',
      condition: (project) => {
        if (!project.steps?.every(s => s.status === 'completed')) return false;
        const start = new Date(project.createdAt || project.created_at);
        const end = MilestoneSystem.getCompletionDate(project);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }
    },
    {
      id: 'marathon_runner',
      name: 'マラソンランナー',
      icon: '🏃',
      description: '30日以上の長期プロジェクトを完了',
      condition: (project) => {
        if (!project.steps?.every(s => s.status === 'completed')) return false;
        const start = new Date(project.createdAt || project.created_at);
        const end = MilestoneSystem.getCompletionDate(project);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return days >= 30;
      }
    }
  ],

  /**
   * 進捗を計算
   */
  calculateProgress(project) {
    if (!project?.steps?.length) return 0;
    const completed = project.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / project.steps.length) * 100);
  },

  /**
   * 完了日を取得
   */
  getCompletionDate(project) {
    if (!project?.steps) return new Date();

    const completedSteps = project.steps.filter(s => s.completedAt);
    if (completedSteps.length === 0) return new Date();

    const dates = completedSteps.map(s => new Date(s.completedAt));
    return new Date(Math.max(...dates));
  },

  /**
   * 達成済みマイルストーンを取得
   */
  getAchievedMilestones(project) {
    return this.MILESTONES.filter(m => m.condition.call(this, project));
  },

  /**
   * 次のマイルストーンを取得
   */
  getNextMilestone(project) {
    return this.MILESTONES.find(m => !m.condition.call(this, project));
  },

  /**
   * マイルストーン達成をチェックして祝福
   */
  checkAndCelebrate(project, previousMilestones = []) {
    const current = this.getAchievedMilestones(project);
    const newMilestones = current.filter(m => !previousMilestones.includes(m.id));

    newMilestones.forEach((milestone, index) => {
      setTimeout(() => {
        this.celebrateMilestone(milestone, project);
      }, index * 1500); // 複数の場合は順番に表示
    });

    return current.map(m => m.id);
  },

  /**
   * マイルストーン達成を祝福
   */
  celebrateMilestone(milestone, project) {
    // 記録を保存
    this.recordMilestone(project.id, milestone);

    // バッジを表示
    this.showMilestoneBadge(milestone);

    // エフェクト発動
    if (typeof CelebrationSystem !== 'undefined') {
      if (milestone.id === 'project_complete') {
        CelebrationSystem.launchConfetti({ count: 200 });
        setTimeout(() => CelebrationSystem.launchFireworks({ count: 5 }), 500);
      } else if (milestone.id === 'halfway') {
        CelebrationSystem.launchConfetti({ count: 80 });
      } else {
        CelebrationSystem.launchConfetti({ count: 30 });
      }
    }

    // 通知を追加
    if (typeof RealtimeSystem !== 'undefined') {
      RealtimeSystem.addNotification({
        icon: milestone.icon,
        title: `${milestone.name}達成！`,
        description: milestone.description
      });
    }
  },

  /**
   * マイルストーンバッジを表示
   */
  showMilestoneBadge(milestone) {
    // 既存のバッジを削除
    const existing = document.querySelector('.milestone-achievement-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'milestone-achievement-modal';
    modal.innerHTML = `
      <div class="milestone-achievement-backdrop"></div>
      <div class="milestone-achievement-content">
        <div class="achievement-sparkles">
          ${'✦'.repeat(8).split('').map((_, i) =>
            `<span class="sparkle-item" style="--delay: ${i * 0.1}s; --angle: ${i * 45}deg"></span>`
          ).join('')}
        </div>
        <div class="achievement-icon">${milestone.icon}</div>
        <div class="achievement-banner">マイルストーン達成！</div>
        <div class="achievement-name">${milestone.name}</div>
        <div class="achievement-description">${milestone.description}</div>
        <button class="achievement-close" onclick="this.closest('.milestone-achievement-modal').remove()">
          閉じる
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // アニメーション開始
    setTimeout(() => modal.classList.add('show'), 100);

    // 自動で閉じる
    setTimeout(() => {
      if (document.body.contains(modal)) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 500);
      }
    }, 5000);
  },

  /**
   * マイルストーン達成を記録
   */
  recordMilestone(projectId, milestone) {
    const key = `milestones_${projectId}`;
    const stored = localStorage.getItem(key);
    const records = stored ? JSON.parse(stored) : [];

    if (!records.find(r => r.id === milestone.id)) {
      records.push({
        id: milestone.id,
        achievedAt: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(records));
    }
  },

  /**
   * マイルストーン記録を取得
   */
  getMilestoneRecords(projectId) {
    const key = `milestones_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * マイルストーン表示パネルをレンダリング
   */
  renderMilestonePanel(containerId, project) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const achieved = this.getAchievedMilestones(project);
    const records = this.getMilestoneRecords(project.id);
    const next = this.getNextMilestone(project);

    const html = `
      <div class="milestone-panel">
        <div class="milestone-panel-header">
          <h3 class="milestone-panel-title">🏆 マイルストーン</h3>
          <span class="milestone-count">${achieved.length}/${this.MILESTONES.length}</span>
        </div>

        <div class="milestone-progress-bar">
          <div class="milestone-progress-fill" style="width: ${(achieved.length / this.MILESTONES.length) * 100}%"></div>
        </div>

        <div class="milestone-list">
          ${this.MILESTONES.map(m => {
            const isAchieved = achieved.find(a => a.id === m.id);
            const record = records.find(r => r.id === m.id);
            const achievedDate = record ? this.formatDate(record.achievedAt) : null;

            return `
              <div class="milestone-item ${isAchieved ? 'achieved' : 'locked'}">
                <div class="milestone-item-icon">${isAchieved ? m.icon : '🔒'}</div>
                <div class="milestone-item-info">
                  <div class="milestone-item-name">${m.name}</div>
                  <div class="milestone-item-description">
                    ${isAchieved ? m.description : '未達成'}
                  </div>
                  ${achievedDate ? `<div class="milestone-item-date">達成日: ${achievedDate}</div>` : ''}
                </div>
                ${isAchieved ? '<div class="milestone-item-check">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        ${next ? `
          <div class="milestone-next">
            <div class="milestone-next-label">次のマイルストーン</div>
            <div class="milestone-next-name">${next.icon} ${next.name}</div>
          </div>
        ` : `
          <div class="milestone-complete-message">
            🎉 すべてのマイルストーンを達成しました！
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * コンパクトなマイルストーンバッジをレンダリング
   */
  renderMilestoneBadges(containerId, project) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const achieved = this.getAchievedMilestones(project);

    const html = `
      <div class="milestone-badges">
        ${achieved.map(m => `
          <div class="milestone-badge-item" title="${m.name}: ${m.description}">
            <span class="badge-icon">${m.icon}</span>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * 日付をフォーマット
   */
  formatDate(isoString) {
    const date = new Date(isoString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }
};

// スタイルを追加
const milestoneStyles = document.createElement('style');
milestoneStyles.textContent = `
  /* マイルストーン達成モーダル */
  .milestone-achievement-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .milestone-achievement-modal.show {
    opacity: 1;
  }

  .milestone-achievement-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
  }

  .milestone-achievement-content {
    position: relative;
    text-align: center;
    color: white;
    transform: scale(0.8);
    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .milestone-achievement-modal.show .milestone-achievement-content {
    transform: scale(1);
  }

  .achievement-sparkles {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
  }

  .sparkle-item {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 4px;
    background: #ffd700;
    border-radius: 50%;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-80px);
    animation: sparkle-radiate 1s ease-out var(--delay) infinite;
  }

  @keyframes sparkle-radiate {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-100px);
    }
  }

  .achievement-icon {
    font-size: 100px;
    margin-bottom: 20px;
    animation: icon-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes icon-bounce {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .achievement-banner {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: #ffd700;
    margin-bottom: 10px;
  }

  .achievement-name {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .achievement-description {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 30px;
  }

  .achievement-close {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 25px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .achievement-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* マイルストーンパネル */
  .milestone-panel {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 24px;
  }

  .milestone-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .milestone-panel-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .milestone-count {
    background: var(--gradient-primary);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }

  .milestone-progress-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .milestone-progress-fill {
    height: 100%;
    background: var(--gradient-primary);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .milestone-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .milestone-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .milestone-item.achieved {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .milestone-item.locked {
    opacity: 0.5;
  }

  .milestone-item-icon {
    font-size: 28px;
    width: 40px;
    text-align: center;
  }

  .milestone-item-info {
    flex: 1;
  }

  .milestone-item-name {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 2px;
  }

  .milestone-item-description {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .milestone-item-date {
    font-size: 11px;
    color: var(--color-success);
    margin-top: 4px;
  }

  .milestone-item-check {
    width: 24px;
    height: 24px;
    background: var(--color-success);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }

  .milestone-next {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }

  .milestone-next-label {
    font-size: 12px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }

  .milestone-next-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-primary);
  }

  .milestone-complete-message {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    font-weight: 600;
    color: var(--color-success);
  }

  /* コンパクトバッジ */
  .milestone-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .milestone-badge-item {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .milestone-badge-item:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
  }

  .badge-icon {
    font-size: 18px;
  }
`;
document.head.appendChild(milestoneStyles);

// グローバルに公開
window.MilestoneSystem = MilestoneSystem;
