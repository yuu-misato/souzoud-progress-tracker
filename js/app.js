/**
 * Client-facing Progress Tracker Application (Supabase Version)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentClientId = null;
    let currentProjectId = null;
    let currentUser = null;

    // DOM Elements
    const searchSection = document.getElementById('search-section');
    const clientSection = document.getElementById('client-section');
    const projectSection = document.getElementById('project-section');
    const notFoundSection = document.getElementById('not-found-section');
    const emailInput = document.getElementById('client-email-input');
    const passwordInput = document.getElementById('client-password-input');
    const loginError = document.getElementById('login-error');
    const searchBtn = document.getElementById('search-btn');
    const backBtn = document.getElementById('back-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Check for saved session
    const savedSession = localStorage.getItem('client_session');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            currentClientId = currentUser.clientId;
            displayClientProjects(currentClientId);
        } catch (e) {
            localStorage.removeItem('client_session');
        }
    }

    // Check for project ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlProjectId = urlParams.get('project');

    if (urlProjectId && currentUser) {
        loadProjectDirect(urlProjectId);
    }

    // Event Listeners
    searchBtn.addEventListener('click', handleLogin);

    emailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    passwordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    backBtn.addEventListener('click', showSearchSection);
    backToListBtn.addEventListener('click', () => {
        if (currentClientId) {
            displayClientProjects(currentClientId);
        } else {
            showSearchSection();
        }
    });
    retryBtn.addEventListener('click', showSearchSection);

    async function handleLogin() {
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            showLoginError('メールアドレスとパスワードを入力してください');
            return;
        }

        const user = await DataManager.loginClientUser(email, password);

        if (user) {
            currentUser = user;
            currentClientId = user.clientId;
            localStorage.setItem('client_session', JSON.stringify(user));
            hideLoginError();
            displayClientProjects(currentClientId);
        } else {
            showLoginError('メールアドレスまたはパスワードが正しくありません');
        }
    }

    function showLoginError(msg) {
        if (loginError) {
            loginError.textContent = msg;
            loginError.style.display = 'block';
        }
    }

    function hideLoginError() {
        if (loginError) {
            loginError.style.display = 'none';
        }
    }

    /**
     * Load project directly by ID
     */
    async function loadProjectDirect(projectId) {
        const project = await DataManager.getProject(projectId);
        if (project) {
            currentClientId = project.clientId;
            displayProject(project);
        } else {
            showNotFound();
        }
    }

    /**
     * Search for a client and display their projects
     */
    async function searchClient(clientId) {
        const client = await DataManager.getClient(clientId);

        if (client) {
            currentClientId = clientId;
            displayClientProjects(clientId);
        } else {
            showNotFound();
        }
    }

    /**
     * Display client portal with project list
     */
    async function displayClientProjects(clientId) {
        const client = await DataManager.getClient(clientId);
        const projects = await DataManager.getProjectsByClientId(clientId);

        // Update URL
        const newUrl = `${window.location.pathname}?client=${clientId}`;
        window.history.pushState({}, '', newUrl);

        // Hide other sections
        searchSection.style.display = 'none';
        projectSection.style.display = 'none';
        notFoundSection.style.display = 'none';
        clientSection.style.display = 'block';

        // Client Info
        document.getElementById('display-client-name').textContent = client.name;
        document.getElementById('display-client-id').textContent = client.id;

        // Render project list
        const projectList = document.getElementById('project-list');

        if (projects.length === 0) {
            projectList.innerHTML = `
        <div class="card empty-state" style="padding: var(--space-8);">
          <div class="empty-state__icon">📁</div>
          <p class="empty-state__title">プロジェクトがありません</p>
        </div>
      `;
            return;
        }

        projectList.innerHTML = projects.map(project => {
            const progress = DataManager.getProgressPercentage(project);
            const currentStep = DataManager.getCurrentStep(project);
            const isCompleted = project.steps.every(s => s.status === 'completed');

            const icons = {
                1: '📋', 2: '💡', 3: '🎨', 4: '🚀', 5: '🔍', 6: '✅', 7: '📦'
            };
            const statusIcon = isCompleted ? '🎉' : (icons[currentStep?.id] || '📊');
            const statusText = isCompleted ? '納品完了' : currentStep?.name || '-';

            return `
        <div class="project-card" data-project-id="${project.id}">
          <div class="project-card__header">
            <div>
              <div class="project-card__name">${project.name}</div>
              ${project.description ? `<div class="project-card__description">${project.description}</div>` : ''}
            </div>
            <span class="badge ${isCompleted ? 'badge--success' : 'badge--primary'}">
              ${isCompleted ? '完了' : '進行中'}
            </span>
          </div>
          <div class="project-card__progress">
            <div class="project-card__progress-bar">
              <div class="project-card__progress-fill" style="width: ${progress}%;"></div>
            </div>
            <div class="project-card__progress-text">${progress}%</div>
          </div>
          <div class="project-card__status">
            <span class="project-card__status-icon">${statusIcon}</span>
            <span>${statusText}</span>
          </div>
        </div>
      `;
        }).join('');

        // Add click handlers
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', async () => {
                const projectId = card.dataset.projectId;
                const project = await DataManager.getProject(projectId);
                if (project) {
                    displayProject(project);
                }
            });
        });

        // Team management button
        document.getElementById('team-btn')?.addEventListener('click', toggleTeamSection);
        document.getElementById('add-team-btn')?.addEventListener('click', showAddTeamMemberForm);
    }

    // ==================== TEAM MANAGEMENT ====================

    function toggleTeamSection() {
        const teamSection = document.getElementById('team-section');
        if (teamSection.style.display === 'none') {
            teamSection.style.display = 'block';
            renderTeamMembers();
        } else {
            teamSection.style.display = 'none';
        }
    }

    async function renderTeamMembers() {
        const teamList = document.getElementById('team-list');
        if (!currentClientId) return;

        const members = await DataManager.getClientUsers(currentClientId);

        if (members.length === 0) {
            teamList.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">担当者がいません</p>';
            return;
        }

        teamList.innerHTML = members.map(m => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                <div>
                    <div style="font-weight: 500;">${m.name}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${m.email}</div>
                </div>
                ${m.id !== currentUser?.id ? `<button class="btn btn--ghost btn--sm" onclick="deleteTeamMember('${m.id}')">削除</button>` : '<span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">(あなた)</span>'}
            </div>
        `).join('');
    }

    function showAddTeamMemberForm() {
        const teamList = document.getElementById('team-list');
        const formHtml = `
            <div id="add-team-form" style="background: #f8fafc; padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4);">
                <h4 style="margin-bottom: var(--space-3);">新しい担当者を追加</h4>
                <div style="margin-bottom: var(--space-3);">
                    <input type="text" id="new-member-name" class="input" placeholder="担当者名" style="width: 100%;">
                </div>
                <div style="margin-bottom: var(--space-3);">
                    <input type="email" id="new-member-email" class="input" placeholder="メールアドレス" style="width: 100%;">
                </div>
                <div style="margin-bottom: var(--space-3);">
                    <input type="password" id="new-member-password" class="input" placeholder="パスワード" style="width: 100%;">
                </div>
                <div id="add-member-error" style="color: #ef4444; font-size: var(--font-size-sm); margin-bottom: var(--space-2); display: none;"></div>
                <div style="display: flex; gap: var(--space-2);">
                    <button class="btn btn--primary btn--sm" onclick="addTeamMember()">追加</button>
                    <button class="btn btn--ghost btn--sm" onclick="cancelAddTeamMember()">キャンセル</button>
                </div>
            </div>
        `;
        teamList.insertAdjacentHTML('afterbegin', formHtml);
        document.getElementById('add-team-btn').style.display = 'none';
    }

    window.cancelAddTeamMember = function () {
        document.getElementById('add-team-form')?.remove();
        document.getElementById('add-team-btn').style.display = 'inline-flex';
    };

    window.addTeamMember = async function () {
        const name = document.getElementById('new-member-name')?.value.trim();
        const email = document.getElementById('new-member-email')?.value.trim();
        const password = document.getElementById('new-member-password')?.value;
        const errorEl = document.getElementById('add-member-error');

        if (!name || !email || !password) {
            errorEl.textContent = 'すべての項目を入力してください';
            errorEl.style.display = 'block';
            return;
        }

        if (password.length < 4) {
            errorEl.textContent = 'パスワードは4文字以上にしてください';
            errorEl.style.display = 'block';
            return;
        }

        try {
            // Hash password
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            await DataManager.createClientUser({
                clientId: currentClientId,
                email,
                name,
                passwordHash
            });

            document.getElementById('add-team-form')?.remove();
            document.getElementById('add-team-btn').style.display = 'inline-flex';
            renderTeamMembers();
        } catch (e) {
            console.error('Error adding team member:', e);
            errorEl.textContent = 'このメールアドレスは既に使用されています';
            errorEl.style.display = 'block';
        }
    };

    window.deleteTeamMember = async function (userId) {
        if (!confirm('この担当者を削除しますか？')) return;

        try {
            await DataManager.deleteClientUser(userId);
            renderTeamMembers();
        } catch (e) {
            console.error('Error deleting team member:', e);
            alert('削除に失敗しました');
        }
    };

    /**
     * Display project details
     */
    function displayProject(project) {
        currentProjectId = project.id;

        // Update URL
        const newUrl = `${window.location.pathname}?project=${project.id}`;
        window.history.pushState({}, '', newUrl);

        // Hide other sections
        searchSection.style.display = 'none';
        clientSection.style.display = 'none';
        notFoundSection.style.display = 'none';
        projectSection.style.display = 'block';

        // Project Info
        document.getElementById('display-project-name').textContent = project.name;
        document.getElementById('display-project-client').textContent = project.client;
        document.getElementById('display-progress').textContent =
            `${DataManager.getProgressPercentage(project)}%`;
        document.getElementById('display-updated').textContent =
            DataManager.formatDate(project.updatedAt || project.updated_at);

        // Current Step Status
        const currentStep = DataManager.getCurrentStep(project);
        const isCompleted = project.steps.every(s => s.status === 'completed');

        updateStatusCard(currentStep, isCompleted);
        renderProgressSteps(project);
        renderTimeline(project);
    }

    /**
     * Update the status card based on current step
     */
    function updateStatusCard(currentStep, isCompleted) {
        const statusIcon = document.getElementById('status-icon');
        const statusTitle = document.getElementById('status-title');
        const statusDescription = document.getElementById('status-description');
        const statusBadge = document.getElementById('status-badge');

        if (isCompleted) {
            statusIcon.textContent = '🎉';
            statusTitle.textContent = '納品完了';
            statusDescription.textContent = 'プロジェクトが完了しました。ありがとうございました！';
            statusBadge.textContent = '完了';
            statusBadge.className = 'badge badge--success';
            document.querySelector('.status-card .status-card__icon').style.background =
                'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
        } else if (currentStep) {
            const icons = {
                1: '📋', 2: '💡', 3: '🎨', 4: '🚀', 5: '🔍', 6: '✅', 7: '📦'
            };

            statusIcon.textContent = icons[currentStep.id] || '📊';
            statusTitle.textContent = currentStep.name;
            statusDescription.textContent = currentStep.description || getDefaultStepDescription(currentStep.id);
            statusBadge.textContent = '進行中';
            statusBadge.className = 'badge badge--primary';
            document.querySelector('.status-card .status-card__icon').style.background =
                'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
        }
    }

    /**
     * Get default description for each step
     */
    function getDefaultStepDescription(stepId) {
        const descriptions = {
            1: 'ご要望やご希望をお聞きし、プロジェクトの方向性を決定しています。',
            2: '企画の骨子とコンセプトを設計しています。',
            3: 'ビジュアルデザインを制作しています。',
            4: '実際の制作・開発作業を進めています。',
            5: '制作物のレビューと修正対応を行っています。',
            6: '最終確認と調整を行っています。',
            7: '納品準備を進めています。'
        };
        return descriptions[stepId] || '';
    }

    /**
     * Render progress steps
     */
    function renderProgressSteps(project) {
        const container = document.getElementById('progress-steps');
        const completedCount = project.steps.filter(s => s.status === 'completed').length;

        const totalSteps = project.steps.length;
        const progressWidth = completedCount > 0
            ? ((completedCount - 1) / (totalSteps - 1)) * 100
            : 0;

        let html = `<div class="progress-steps__line" style="width: calc(${progressWidth}% - 0px);"></div>`;

        project.steps.forEach((step, index) => {
            const statusClass = step.status === 'completed' ? 'step--completed' :
                step.status === 'current' ? 'step--current' : 'step--pending';

            const icon = step.status === 'completed' ? '✓' : (index + 1);

            html += `
        <div class="step ${statusClass}">
          <div class="step__circle">${icon}</div>
          <div class="step__label">${step.name}</div>
        </div>
      `;
        });

        container.innerHTML = html;
    }

    /**
     * Render timeline with collapsible descriptions
     */
    function renderTimeline(project) {
        const container = document.getElementById('timeline');

        let html = '';

        project.steps.forEach((step, index) => {
            const statusClass = step.status === 'completed' ? 'timeline__item--completed' :
                step.status === 'current' ? 'timeline__item--current' :
                    'timeline__item--pending';

            const date = step.completedAt
                ? DataManager.formatDate(step.completedAt)
                : step.status === 'current' ? '進行中' : '未着手';

            const hasDetails = step.description || step.url;
            const detailsId = `step-details-${index}`;

            let detailsContent = '';
            if (step.description) {
                detailsContent += `<div class="timeline__description">${step.description.replace(/\n/g, '<br>')}</div>`;
            }
            if (step.url) {
                detailsContent += `<div class="timeline__url"><a href="${step.url}" target="_blank" rel="noopener noreferrer">📎 関連ファイルを開く</a></div>`;
            }

            // Simple toggle icon next to step name
            const toggleIcon = hasDetails ? `<span class="timeline__expand" onclick="toggleDetails('${detailsId}')">▶</span>` : '';

            const detailsHtml = hasDetails ? `
              <div id="${detailsId}" class="timeline__details" style="display: none;">
                ${detailsContent}
              </div>
            ` : '';

            html += `
        <div class="timeline__item ${statusClass}">
          <div class="timeline__dot"></div>
          <div class="timeline__content">
            <div class="timeline__header">
              <div class="timeline__title">${step.name} ${toggleIcon}</div>
              <div class="timeline__date">${date}</div>
            </div>
            ${detailsHtml}
          </div>
        </div>
      `;
        });

        container.innerHTML = html;
    }

    // Global function for toggling details
    window.toggleDetails = function (detailsId) {
        const details = document.getElementById(detailsId);
        const expandIcon = details.parentElement.querySelector('.timeline__expand');

        if (details.style.display === 'none') {
            details.style.display = 'block';
            if (expandIcon) expandIcon.textContent = '▼';
        } else {
            details.style.display = 'none';
            if (expandIcon) expandIcon.textContent = '▶';
        }
    };

    /**
     * Show search section (logout)
     */
    function showSearchSection() {
        // Clear session
        localStorage.removeItem('client_session');
        currentUser = null;
        currentClientId = null;
        currentProjectId = null;

        searchSection.style.display = 'block';
        clientSection.style.display = 'none';
        projectSection.style.display = 'none';
        notFoundSection.style.display = 'none';

        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        window.history.pushState({}, '', window.location.pathname);
    }

    /**
     * Show not found section
     */
    function showNotFound() {
        searchSection.style.display = 'none';
        clientSection.style.display = 'none';
        projectSection.style.display = 'none';
        notFoundSection.style.display = 'block';
    }
});
