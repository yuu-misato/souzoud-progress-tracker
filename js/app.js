/**
 * Client-facing Progress Tracker Application (Supabase Version)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentClientId = null;
    let currentProjectId = null;

    // DOM Elements
    const searchSection = document.getElementById('search-section');
    const clientSection = document.getElementById('client-section');
    const projectSection = document.getElementById('project-section');
    const notFoundSection = document.getElementById('not-found-section');
    const clientIdInput = document.getElementById('client-id-input');
    const searchBtn = document.getElementById('search-btn');
    const backBtn = document.getElementById('back-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Check for client ID or project ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlClientId = urlParams.get('client');
    const urlProjectId = urlParams.get('project');

    if (urlClientId) {
        clientIdInput.value = urlClientId;
        searchClient(urlClientId);
    } else if (urlProjectId) {
        loadProjectDirect(urlProjectId);
    }

    // Event Listeners
    searchBtn.addEventListener('click', () => {
        const clientId = clientIdInput.value.trim().toUpperCase();
        if (clientId) {
            searchClient(clientId);
        }
    });

    clientIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const clientId = clientIdInput.value.trim().toUpperCase();
            if (clientId) {
                searchClient(clientId);
            }
        }
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
    }

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
     * Show search section
     */
    function showSearchSection() {
        searchSection.style.display = 'block';
        clientSection.style.display = 'none';
        projectSection.style.display = 'none';
        notFoundSection.style.display = 'none';
        clientIdInput.value = '';
        currentClientId = null;
        currentProjectId = null;

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
