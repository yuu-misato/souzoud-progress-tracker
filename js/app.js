/**
 * Client-facing Progress Tracker Application (Supabase Version)
 * シンプルで使いやすい進捗確認
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentClientId = null;
    let currentProjectId = null;
    let currentUser = null;
    let previousMilestones = [];

    // DOM Elements
    const searchSection = document.getElementById('search-section');
    const clientSection = document.getElementById('client-section');
    const projectSection = document.getElementById('project-section');
    const notFoundSection = document.getElementById('not-found-section');
    const emailInput = document.getElementById('client-email-input');
    const passwordInput = document.getElementById('client-password-input');
    const loginError = document.getElementById('login-error');
    const searchBtn = document.getElementById('search-btn');
    const loginForm = document.getElementById('login-form');
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

    // Event Listeners - Form submit
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
    searchBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogin();
    });

    backBtn?.addEventListener('click', showSearchSection);
    backToListBtn?.addEventListener('click', () => {
        if (currentClientId) {
            displayClientProjects(currentClientId);
        } else {
            showSearchSection();
        }
    });
    retryBtn?.addEventListener('click', showSearchSection);

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

        // XSS防止のためのエスケープ関数
        const escapeHtml = (str) => {
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
        };

        projectList.innerHTML = projects.map(project => {
            const progress = DataManager.getProgressPercentage(project);
            const currentStep = DataManager.getCurrentStep(project);
            const isCompleted = project.steps.every(s => s.status === 'completed');
            const statusText = isCompleted ? '完了' : escapeHtml(currentStep?.name) || '-';

            // Resource icons
            const hasFolderUrl = project.folderUrl && project.folderUrl.trim();
            const hasDeliveryUrl = project.deliveryUrl && project.deliveryUrl.trim();
            let resourceIcons = '';
            if (hasFolderUrl || hasDeliveryUrl) {
                resourceIcons = '<div class="project-item__icons">';
                if (hasFolderUrl) {
                    resourceIcons += `<a href="${escapeHtml(project.folderUrl)}" target="_blank" rel="noopener noreferrer" class="project-item__icon" title="専用フォルダ" onclick="event.stopPropagation();">📁</a>`;
                }
                if (hasDeliveryUrl) {
                    resourceIcons += `<a href="${escapeHtml(project.deliveryUrl)}" target="_blank" rel="noopener noreferrer" class="project-item__icon" title="最終納品物" onclick="event.stopPropagation();">📦</a>`;
                }
                resourceIcons += '</div>';
            }

            return `
        <div class="project-item" data-project-id="${escapeHtml(project.id)}">
          <div class="project-item__info">
            <div class="project-item__name">${escapeHtml(project.name)}</div>
            <div class="project-item__step">${statusText}</div>
          </div>
          ${resourceIcons}
          <div class="project-item__progress">
            <div class="project-item__progress-bar">
              <div class="project-item__progress-fill" style="width: ${progress}%;"></div>
            </div>
            <div class="project-item__progress-text">${progress}%</div>
          </div>
          <span class="project-item__arrow">→</span>
        </div>
      `;
        }).join('');

        // Add click handlers
        document.querySelectorAll('.project-item').forEach(card => {
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

        // XSS防止のためのエスケープ関数
        const escapeHtml = (str) => {
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
        };

        teamList.innerHTML = members.map(m => {
            const isPending = !m.password_set && m.invite_token;
            const statusBadge = isPending
                ? '<span style="font-size: var(--font-size-xs); background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; margin-left: var(--space-2);">招待中</span>'
                : '';

            const resendBtn = isPending
                ? `<button class="btn btn--ghost btn--sm" onclick="resendTeamInvite('${escapeHtml(m.id)}')" style="color: var(--color-primary);">再送信</button>`
                : '';

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                <div>
                    <div style="font-weight: 500;">${escapeHtml(m.name)}${statusBadge}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(m.email)}</div>
                </div>
                <div style="display: flex; gap: var(--space-2); align-items: center;">
                    ${resendBtn}
                    ${m.id !== currentUser?.id ? `<button class="btn btn--ghost btn--sm" onclick="deleteTeamMember('${escapeHtml(m.id)}')">削除</button>` : '<span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">(あなた)</span>'}
                </div>
            </div>
        `;
        }).join('');
    }

    function showAddTeamMemberForm() {
        const teamList = document.getElementById('team-list');
        const formHtml = `
            <div id="add-team-form" style="background: #f8fafc; padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4);">
                <h4 style="margin-bottom: var(--space-3);">新しい担当者を招待</h4>
                <div style="margin-bottom: var(--space-3);">
                    <input type="text" id="new-member-name" class="input" placeholder="担当者名" style="width: 100%;">
                </div>
                <div style="margin-bottom: var(--space-3);">
                    <input type="email" id="new-member-email" class="input" placeholder="メールアドレス" style="width: 100%;">
                </div>
                <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">招待メールが送信され、担当者自身がパスワードを設定します。</p>
                <div id="add-member-error" style="color: #ef4444; font-size: var(--font-size-sm); margin-bottom: var(--space-2); display: none;"></div>
                <div id="add-member-success" style="color: var(--color-success); font-size: var(--font-size-sm); margin-bottom: var(--space-2); display: none;"></div>
                <div style="display: flex; gap: var(--space-2);">
                    <button class="btn btn--primary btn--sm" onclick="addTeamMember()">招待メールを送信</button>
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
        const errorEl = document.getElementById('add-member-error');
        const successEl = document.getElementById('add-member-success');

        // Hide previous messages
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        if (!name || !email) {
            errorEl.textContent = '担当者名とメールアドレスを入力してください';
            errorEl.style.display = 'block';
            return;
        }

        // Basic email validation
        if (!email.includes('@') || !email.includes('.')) {
            errorEl.textContent = '有効なメールアドレスを入力してください';
            errorEl.style.display = 'block';
            return;
        }

        try {
            // Create user with invite token
            const result = await DataManager.inviteClientUser({
                clientId: currentClientId,
                email,
                name
            });

            // Get base URL for invite link
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            const inviteUrl = `${baseUrl}/invite.html?token=${result.inviteToken}`;

            // Send invite email
            if (window.NotificationService) {
                await NotificationService.send('clientInvite', email, {
                    name: name,
                    inviteUrl: inviteUrl
                });
            }

            // Clear form and show success
            document.getElementById('new-member-name').value = '';
            document.getElementById('new-member-email').value = '';
            successEl.textContent = '招待メールを送信しました';
            successEl.style.display = 'block';

            // Refresh list after a short delay
            setTimeout(() => {
                document.getElementById('add-team-form')?.remove();
                document.getElementById('add-team-btn').style.display = 'inline-flex';
                renderTeamMembers();
            }, 1500);
        } catch (e) {
            console.error('Error inviting team member:', e);
            const errorMsg = e.message || String(e);
            if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('23505')) {
                errorEl.textContent = 'このメールアドレスは既に使用されています';
            } else {
                errorEl.textContent = 'エラーが発生しました: ' + errorMsg;
            }
            errorEl.style.display = 'block';
        }
    };

    window.resendTeamInvite = async function (userId) {
        try {
            const result = await DataManager.resendInvite(userId);

            // Get base URL for invite link
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            const inviteUrl = `${baseUrl}/invite.html?token=${result.inviteToken}`;

            // Send invite email
            if (window.NotificationService) {
                await NotificationService.send('clientInvite', result.email, {
                    name: result.name,
                    inviteUrl: inviteUrl
                });
            }

            alert('招待メールを再送信しました');
        } catch (e) {
            console.error('Error resending invite:', e);
            alert('再送信に失敗しました');
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
    async function displayProject(project) {
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

        // Progress
        const progressEl = document.getElementById('display-progress');
        const progressBarFill = document.getElementById('progress-bar-fill');
        const progress = DataManager.getProgressPercentage(project);
        progressEl.textContent = `${progress}%`;
        if (progressBarFill) {
            progressBarFill.style.width = `${progress}%`;
        }

        document.getElementById('display-updated').textContent =
            `更新: ${DataManager.formatDate(project.updatedAt || project.updated_at)}`;

        // Project Due Date
        updateProjectDueDate(project);

        // Director Contact
        await updateDirectorContact(project);

        // Resource Links (folder and delivery URLs)
        updateResourceLinks(project);

        // Current Step Status
        const steps = project.steps || [];

        if (steps.length === 0) {
            document.getElementById('timeline').innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: var(--space-8);">工程データがありません</p>';
        } else {
            renderSimpleTimeline(project);
        }
    }

    /**
     * Update director contact information
     */
    async function updateDirectorContact(project) {
        const directorContactEl = document.getElementById('director-contact');
        const directorNameEl = document.getElementById('director-name');
        const directorEmailEl = document.getElementById('director-email');

        if (!directorContactEl) return;

        try {
            const director = await DataManager.getProjectDirector(project.id);

            if (director && director.name) {
                directorContactEl.style.display = 'flex';
                directorNameEl.textContent = director.name;
                if (director.email) {
                    directorEmailEl.href = `mailto:${director.email}`;
                    directorEmailEl.textContent = director.email;
                    directorEmailEl.style.display = 'inline';
                } else {
                    directorEmailEl.style.display = 'none';
                }
            } else {
                directorContactEl.style.display = 'none';
            }
        } catch (e) {
            console.error('Error fetching director:', e);
            directorContactEl.style.display = 'none';
        }
    }

    /**
     * Update project due date display
     */
    function updateProjectDueDate(project) {
        const dueDateEl = document.getElementById('project-due-date');
        const dueDateValueEl = document.getElementById('project-due-date-value');

        if (!dueDateEl || !dueDateValueEl) return;

        if (project.dueDate) {
            const date = new Date(project.dueDate);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            dueDateValueEl.textContent = `${year}年${month}月${day}日`;
            dueDateEl.style.display = 'flex';
        } else {
            dueDateEl.style.display = 'none';
        }
    }

    /**
     * Update resource links (folder and delivery URLs)
     */
    function updateResourceLinks(project) {
        const resourceLinksEl = document.getElementById('resource-links');
        const folderLinkEl = document.getElementById('folder-link');
        const deliveryLinkEl = document.getElementById('delivery-link');

        if (!resourceLinksEl) return;

        const hasFolderUrl = project.folderUrl && project.folderUrl.trim();
        const hasDeliveryUrl = project.deliveryUrl && project.deliveryUrl.trim();

        if (!hasFolderUrl && !hasDeliveryUrl) {
            resourceLinksEl.style.display = 'none';
            return;
        }

        resourceLinksEl.style.display = 'flex';

        // Folder link
        if (hasFolderUrl && folderLinkEl) {
            folderLinkEl.href = project.folderUrl;
            folderLinkEl.style.display = 'inline-flex';
        } else if (folderLinkEl) {
            folderLinkEl.style.display = 'none';
        }

        // Delivery link
        if (hasDeliveryUrl && deliveryLinkEl) {
            deliveryLinkEl.href = project.deliveryUrl;
            deliveryLinkEl.style.display = 'inline-flex';
        } else if (deliveryLinkEl) {
            deliveryLinkEl.style.display = 'none';
        }
    }

    /**
     * Render simplified timeline
     */
    function renderSimpleTimeline(project) {
        const container = document.getElementById('timeline');

        // XSS防止のためのエスケープ関数
        const escapeHtml = (str) => {
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
        };

        // URLサニタイズ
        const sanitizeUrl = (url) => {
            if (typeof SecurityUtils !== 'undefined') {
                return SecurityUtils.sanitizeUrl(url);
            }
            if (!url) return '';
            const trimmed = url.trim().toLowerCase();
            if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
                return '';
            }
            return url;
        };

        let html = '';

        // 提出予定日のフォーマット関数
        const formatDueDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}/${month}/${day}`;
        };

        project.steps.forEach((step, index) => {
            const statusClass = step.status === 'completed' ? 'timeline-simple__item--completed' :
                step.status === 'current' ? 'timeline-simple__item--current' :
                    'timeline-simple__item--pending';

            // 完了日 or 提出予定日の表示
            let dateHtml = '';
            if (step.status === 'completed' && step.completedAt) {
                dateHtml = `<div class="timeline-simple__date">完了: ${DataManager.formatDate(step.completedAt)}</div>`;
            } else if (step.status === 'current') {
                if (step.dueDate) {
                    dateHtml = `<div class="timeline-simple__date timeline-simple__date--due">提出予定: ${formatDueDate(step.dueDate)}</div>`;
                } else {
                    dateHtml = `<div class="timeline-simple__date">進行中</div>`;
                }
            } else if (step.status === 'pending' && step.dueDate) {
                dateHtml = `<div class="timeline-simple__date timeline-simple__date--due">提出予定: ${formatDueDate(step.dueDate)}</div>`;
            }

            const icon = step.status === 'completed' ? '✓' : (index + 1);

            let descriptionHtml = '';
            if (step.description && (step.status === 'completed' || step.status === 'current')) {
                descriptionHtml = `<div class="timeline-simple__description">${escapeHtml(step.description).replace(/\n/g, '<br>')}</div>`;
            }

            let linkHtml = '';
            if (step.url && (step.status === 'completed' || step.status === 'current')) {
                const safeUrl = sanitizeUrl(step.url);
                if (safeUrl) {
                    linkHtml = `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="timeline-simple__link">関連ファイルを開く →</a>`;
                }
            }

            html += `
        <div class="timeline-simple__item ${statusClass}">
          <div class="timeline-simple__indicator">${icon}</div>
          <div class="timeline-simple__content">
            <div class="timeline-simple__title">${escapeHtml(step.name)}</div>
            ${dateHtml}
            ${descriptionHtml}
            ${linkHtml}
          </div>
        </div>
      `;
        });

        container.innerHTML = html;
    }

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
