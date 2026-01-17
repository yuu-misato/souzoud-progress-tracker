/**
 * Workflow UI Enhancement System
 * 作業者・ディレクター向けUI/UX改善
 */

const WorkflowUI = {
  /**
   * HTMLエスケープ
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
   * スタイルを注入
   */
  injectStyles() {
    if (document.getElementById('workflow-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'workflow-ui-styles';
    styles.textContent = `
      /* カンバンボード */
      .kanban-board {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--space-4);
        padding: var(--space-4) 0;
      }

      .kanban-column {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-xl);
        padding: var(--space-4);
        min-height: 400px;
      }

      .kanban-column__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-3);
        border-bottom: 2px solid var(--color-border);
      }

      .kanban-column__title {
        font-weight: 600;
        font-size: var(--font-size-base);
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .kanban-column__count {
        background: var(--color-bg-card);
        padding: 2px 10px;
        border-radius: var(--radius-full);
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .kanban-column--pending .kanban-column__header {
        border-bottom-color: #6366f1;
      }

      .kanban-column--in-progress .kanban-column__header {
        border-bottom-color: #f59e0b;
      }

      .kanban-column--review .kanban-column__header {
        border-bottom-color: #8b5cf6;
      }

      .kanban-column--done .kanban-column__header {
        border-bottom-color: #10b981;
      }

      .kanban-card {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin-bottom: var(--space-3);
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: var(--shadow-sm);
      }

      .kanban-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--color-primary);
      }

      .kanban-card__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-2);
      }

      .kanban-card__title {
        font-weight: 600;
        font-size: var(--font-size-sm);
        color: var(--color-text);
        flex: 1;
      }

      .kanban-card__priority {
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .kanban-card__priority--high {
        background: #fee2e2;
        color: #dc2626;
      }

      .kanban-card__priority--medium {
        background: #fef3c7;
        color: #d97706;
      }

      .kanban-card__priority--low {
        background: #dbeafe;
        color: #2563eb;
      }

      .kanban-card__project {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin-bottom: var(--space-2);
      }

      .kanban-card__meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--space-3);
        padding-top: var(--space-2);
        border-top: 1px solid var(--color-border);
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }

      .kanban-card__due {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .kanban-card__due--overdue {
        color: #dc2626;
        font-weight: 600;
      }

      .kanban-card__due--soon {
        color: #d97706;
        font-weight: 500;
      }

      .kanban-card__avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--gradient-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
      }

      /* クイックアクションバー */
      .quick-actions {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-4);
        background: var(--color-bg-card);
        border-radius: var(--radius-xl);
        margin-bottom: var(--space-6);
        box-shadow: var(--shadow-sm);
        flex-wrap: wrap;
      }

      .quick-action {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .quick-action:hover {
        background: var(--color-bg-card);
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }

      .quick-action__icon {
        font-size: 18px;
      }

      .quick-action__badge {
        background: #ef4444;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: var(--radius-full);
        font-weight: 600;
      }

      /* タイムライン進捗 */
      .progress-timeline {
        position: relative;
        padding: var(--space-4) 0;
      }

      .progress-timeline__bar {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--color-border);
        transform: translateY(-50%);
        border-radius: var(--radius-full);
      }

      .progress-timeline__fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: var(--gradient-primary);
        border-radius: var(--radius-full);
        transition: width 0.5s ease;
      }

      .progress-timeline__steps {
        position: relative;
        display: flex;
        justify-content: space-between;
      }

      .progress-timeline__step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .progress-timeline__dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-bg-card);
        border: 3px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .progress-timeline__step--completed .progress-timeline__dot {
        background: #10b981;
        border-color: #10b981;
        color: white;
      }

      .progress-timeline__step--current .progress-timeline__dot {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
      }

      .progress-timeline__label {
        margin-top: var(--space-2);
        font-size: 10px;
        color: var(--color-text-muted);
        text-align: center;
        max-width: 60px;
        line-height: 1.2;
      }

      .progress-timeline__step--completed .progress-timeline__label,
      .progress-timeline__step--current .progress-timeline__label {
        color: var(--color-text);
        font-weight: 500;
      }

      /* ステータスカード（グリッド） */
      .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }

      .status-card {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: var(--space-5);
        display: flex;
        align-items: center;
        gap: var(--space-4);
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .status-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .status-card__icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .status-card--pending .status-card__icon {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      }

      .status-card--progress .status-card__icon {
        background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
      }

      .status-card--review .status-card__icon {
        background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
      }

      .status-card--done .status-card__icon {
        background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      }

      .status-card--overdue .status-card__icon {
        background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      }

      .status-card__content {
        flex: 1;
      }

      .status-card__value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        color: var(--color-text);
      }

      .status-card__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin-top: 4px;
      }

      /* タスク詳細モーダル */
      .task-detail {
        padding: var(--space-4);
      }

      .task-detail__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--color-border);
      }

      .task-detail__title {
        font-size: var(--font-size-xl);
        font-weight: 600;
      }

      .task-detail__status {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        font-size: var(--font-size-sm);
        font-weight: 600;
      }

      .task-detail__section {
        margin-bottom: var(--space-4);
      }

      .task-detail__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin-bottom: var(--space-1);
      }

      .task-detail__value {
        font-size: var(--font-size-base);
        color: var(--color-text);
      }

      .task-detail__actions {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-6);
        padding-top: var(--space-4);
        border-top: 1px solid var(--color-border);
      }

      /* 通知トースト */
      .workflow-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: var(--space-4);
        display: flex;
        align-items: center;
        gap: var(--space-3);
        box-shadow: var(--shadow-xl);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 10000;
        max-width: 400px;
      }

      .workflow-toast.show {
        transform: translateX(0);
      }

      .workflow-toast__icon {
        font-size: 24px;
      }

      .workflow-toast__content {
        flex: 1;
      }

      .workflow-toast__title {
        font-weight: 600;
        margin-bottom: 2px;
      }

      .workflow-toast__message {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
      }

      /* ドラッグ&ドロップ */
      .kanban-card.dragging {
        opacity: 0.5;
        transform: scale(1.02);
      }

      .kanban-column.drag-over {
        background: rgba(99, 102, 241, 0.1);
        border: 2px dashed var(--color-primary);
      }

      /* フィルターバー */
      .filter-bar {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-3);
        background: var(--color-bg-card);
        border-radius: var(--radius-lg);
        margin-bottom: var(--space-4);
        flex-wrap: wrap;
        align-items: center;
      }

      .filter-bar__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .filter-chip {
        padding: var(--space-1) var(--space-3);
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        font-size: var(--font-size-sm);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .filter-chip:hover {
        background: var(--color-bg-card);
      }

      .filter-chip.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
      }

      /* アクティビティフィード */
      .activity-feed {
        max-height: 400px;
        overflow-y: auto;
      }

      .activity-item {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-3);
        border-bottom: 1px solid var(--color-border);
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-item__icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }

      .activity-item__content {
        flex: 1;
      }

      .activity-item__text {
        font-size: var(--font-size-sm);
        color: var(--color-text);
        line-height: 1.4;
      }

      .activity-item__time {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin-top: 2px;
      }

      /* ビュー切り替え */
      .view-toggle {
        display: flex;
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
        padding: 4px;
      }

      .view-toggle__btn {
        padding: var(--space-2) var(--space-4);
        border: none;
        background: transparent;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--color-text-muted);
      }

      .view-toggle__btn.active {
        background: var(--color-bg-card);
        color: var(--color-text);
        box-shadow: var(--shadow-sm);
      }

      .view-toggle__btn:hover:not(.active) {
        color: var(--color-text);
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * カンバンボードをレンダリング
   */
  renderKanbanBoard(containerId, tasks, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.injectStyles();

    const columns = [
      { id: 'pending', title: '未着手', icon: '📋', tasks: [] },
      { id: 'in_progress', title: '作業中', icon: '🔧', tasks: [] },
      { id: 'submitted', title: 'レビュー待ち', icon: '👀', tasks: [] },
      { id: 'approved', title: '完了', icon: '✅', tasks: [] }
    ];

    // タスクを振り分け
    tasks.forEach(task => {
      const status = task.status || 'pending';
      const column = columns.find(c => c.id === status);
      if (column) {
        column.tasks.push(task);
      }
    });

    const html = `
      <div class="kanban-board">
        ${columns.map(col => `
          <div class="kanban-column kanban-column--${col.id.replace('_', '-')}"
               data-status="${col.id}"
               ondragover="WorkflowUI.handleDragOver(event)"
               ondrop="WorkflowUI.handleDrop(event, '${col.id}')">
            <div class="kanban-column__header">
              <div class="kanban-column__title">
                <span>${col.icon}</span>
                <span>${col.title}</span>
              </div>
              <span class="kanban-column__count">${col.tasks.length}</span>
            </div>
            <div class="kanban-column__cards">
              ${col.tasks.map(task => this.renderKanbanCard(task)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * カンバンカードをレンダリング
   */
  renderKanbanCard(task) {
    const now = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < now && task.status !== 'approved';
    const isSoon = dueDate && !isOverdue && (dueDate - now) < (2 * 24 * 60 * 60 * 1000);

    const priority = this.calculatePriority(task);

    let dueClass = '';
    if (isOverdue) dueClass = 'kanban-card__due--overdue';
    else if (isSoon) dueClass = 'kanban-card__due--soon';

    const initials = (task.workerName || '?').substring(0, 2).toUpperCase();

    return `
      <div class="kanban-card"
           draggable="true"
           data-task-id="${task.id}"
           ondragstart="WorkflowUI.handleDragStart(event, '${task.id}')"
           ondragend="WorkflowUI.handleDragEnd(event)"
           onclick="WorkflowUI.openTaskDetail('${task.id}')">
        <div class="kanban-card__header">
          <div class="kanban-card__title">${this.escapeHtml(task.stepName || task.name)}</div>
          ${priority !== 'normal' ? `
            <span class="kanban-card__priority kanban-card__priority--${priority}">
              ${priority === 'high' ? '緊急' : '優先'}
            </span>
          ` : ''}
        </div>
        <div class="kanban-card__project">
          ${this.escapeHtml(task.clientName || '')} / ${this.escapeHtml(task.projectName || '')}
        </div>
        <div class="kanban-card__meta">
          ${dueDate ? `
            <span class="kanban-card__due ${dueClass}">
              📅 ${this.formatDate(dueDate)}${isOverdue ? ' (遅延)' : ''}
            </span>
          ` : '<span></span>'}
          <div class="kanban-card__avatar" title="${this.escapeHtml(task.workerName || '未割当')}">${initials}</div>
        </div>
      </div>
    `;
  },

  /**
   * 優先度を計算
   */
  calculatePriority(task) {
    if (!task.dueDate) return 'normal';

    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'high';
    if (daysUntilDue <= 2) return 'medium';
    return 'normal';
  },

  /**
   * クイックアクションバーをレンダリング
   */
  renderQuickActions(containerId, stats) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.injectStyles();

    const html = `
      <div class="quick-actions">
        <div class="quick-action" onclick="WorkflowUI.filterByStatus('pending')">
          <span class="quick-action__icon">📋</span>
          <span>未着手</span>
          ${stats.pending > 0 ? `<span class="quick-action__badge">${stats.pending}</span>` : ''}
        </div>
        <div class="quick-action" onclick="WorkflowUI.filterByStatus('in_progress')">
          <span class="quick-action__icon">🔧</span>
          <span>作業中</span>
          ${stats.inProgress > 0 ? `<span class="quick-action__badge">${stats.inProgress}</span>` : ''}
        </div>
        <div class="quick-action" onclick="WorkflowUI.filterByStatus('submitted')">
          <span class="quick-action__icon">👀</span>
          <span>レビュー待ち</span>
          ${stats.submitted > 0 ? `<span class="quick-action__badge">${stats.submitted}</span>` : ''}
        </div>
        <div class="quick-action" onclick="WorkflowUI.filterByStatus('overdue')">
          <span class="quick-action__icon">⚠️</span>
          <span>遅延タスク</span>
          ${stats.overdue > 0 ? `<span class="quick-action__badge" style="background:#dc2626;">${stats.overdue}</span>` : ''}
        </div>
        <div class="quick-action" onclick="WorkflowUI.showTodaysTasks()">
          <span class="quick-action__icon">📆</span>
          <span>今日のタスク</span>
          ${stats.today > 0 ? `<span class="quick-action__badge" style="background:#f59e0b;">${stats.today}</span>` : ''}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * ステータスカードグリッドをレンダリング
   */
  renderStatusGrid(containerId, stats) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.injectStyles();

    const html = `
      <div class="status-grid">
        <div class="status-card status-card--pending" onclick="WorkflowUI.filterByStatus('pending')">
          <div class="status-card__icon">📋</div>
          <div class="status-card__content">
            <div class="status-card__value">${stats.pending || 0}</div>
            <div class="status-card__label">未着手タスク</div>
          </div>
        </div>
        <div class="status-card status-card--progress" onclick="WorkflowUI.filterByStatus('in_progress')">
          <div class="status-card__icon">🔧</div>
          <div class="status-card__content">
            <div class="status-card__value">${stats.inProgress || 0}</div>
            <div class="status-card__label">作業中</div>
          </div>
        </div>
        <div class="status-card status-card--review" onclick="WorkflowUI.filterByStatus('submitted')">
          <div class="status-card__icon">👀</div>
          <div class="status-card__content">
            <div class="status-card__value">${stats.submitted || 0}</div>
            <div class="status-card__label">レビュー待ち</div>
          </div>
        </div>
        <div class="status-card status-card--overdue" onclick="WorkflowUI.filterByStatus('overdue')">
          <div class="status-card__icon">⚠️</div>
          <div class="status-card__content">
            <div class="status-card__value">${stats.overdue || 0}</div>
            <div class="status-card__label">遅延タスク</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * 進捗タイムラインをレンダリング
   */
  renderProgressTimeline(containerId, steps, currentStepIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.injectStyles();

    const progressPercent = steps.length > 1
      ? (currentStepIndex / (steps.length - 1)) * 100
      : 0;

    const html = `
      <div class="progress-timeline">
        <div class="progress-timeline__bar">
          <div class="progress-timeline__fill" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="progress-timeline__steps">
          ${steps.map((step, index) => {
            let statusClass = '';
            if (index < currentStepIndex) statusClass = 'progress-timeline__step--completed';
            else if (index === currentStepIndex) statusClass = 'progress-timeline__step--current';

            return `
              <div class="progress-timeline__step ${statusClass}">
                <div class="progress-timeline__dot">
                  ${index < currentStepIndex ? '✓' : index + 1}
                </div>
                <div class="progress-timeline__label">${this.escapeHtml(step.name)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * ビュー切り替えボタンをレンダリング
   */
  renderViewToggle(containerId, currentView) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.injectStyles();

    const html = `
      <div class="view-toggle">
        <button class="view-toggle__btn ${currentView === 'list' ? 'active' : ''}"
                onclick="WorkflowUI.switchView('list')">
          📋 リスト
        </button>
        <button class="view-toggle__btn ${currentView === 'kanban' ? 'active' : ''}"
                onclick="WorkflowUI.switchView('kanban')">
          📊 カンバン
        </button>
        <button class="view-toggle__btn ${currentView === 'calendar' ? 'active' : ''}"
                onclick="WorkflowUI.switchView('calendar')">
          📅 カレンダー
        </button>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * トーストを表示
   */
  showToast(title, message, icon = '✓') {
    this.injectStyles();

    // 既存のトーストを削除
    const existing = document.querySelector('.workflow-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'workflow-toast';
    toast.innerHTML = `
      <div class="workflow-toast__icon">${icon}</div>
      <div class="workflow-toast__content">
        <div class="workflow-toast__title">${this.escapeHtml(title)}</div>
        <div class="workflow-toast__message">${this.escapeHtml(message)}</div>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * 日付フォーマット
   */
  formatDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  },

  /**
   * ドラッグ&ドロップハンドラー
   */
  currentDragId: null,

  handleDragStart(event, taskId) {
    this.currentDragId = taskId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  },

  handleDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
  },

  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  },

  handleDrop(event, newStatus) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    if (this.currentDragId && this.onStatusChange) {
      this.onStatusChange(this.currentDragId, newStatus);
    }
    this.currentDragId = null;
  },

  /**
   * コールバック設定
   */
  onStatusChange: null,
  onTaskClick: null,

  setOnStatusChange(callback) {
    this.onStatusChange = callback;
  },

  setOnTaskClick(callback) {
    this.onTaskClick = callback;
  },

  openTaskDetail(taskId) {
    if (this.onTaskClick) {
      this.onTaskClick(taskId);
    }
  },

  /**
   * フィルター
   */
  currentFilter: null,

  filterByStatus(status) {
    this.currentFilter = status;
    if (this.onFilterChange) {
      this.onFilterChange(status);
    }
  },

  onFilterChange: null,

  setOnFilterChange(callback) {
    this.onFilterChange = callback;
  },

  /**
   * ビュー切り替え
   */
  currentView: 'list',

  switchView(view) {
    this.currentView = view;
    if (this.onViewChange) {
      this.onViewChange(view);
    }
  },

  onViewChange: null,

  setOnViewChange(callback) {
    this.onViewChange = callback;
  },

  showTodaysTasks() {
    this.filterByStatus('today');
  }
};

// グローバルに公開
if (typeof window !== 'undefined') {
  window.WorkflowUI = WorkflowUI;
}
