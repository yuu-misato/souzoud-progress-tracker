/**
 * Admin Panel Application
 */

document.addEventListener('DOMContentLoaded', () => {
    // Clear old data and initialize fresh sample data
    localStorage.removeItem('progress_tracker_projects');
    localStorage.removeItem('progress_tracker_clients');
    DataManager.initializeSampleData();

    // State
    let currentProjectId = null;
    let currentStepId = null;
    let isEditMode = false;
    let isNewStep = false;

    // DOM Elements
    const projectList = document.getElementById('project-list');
    const emptyState = document.getElementById('empty-state');
    const projectEditor = document.getElementById('project-editor');
    const newProjectBtn = document.getElementById('new-project-btn');
    const shareBtn = document.getElementById('share-btn');
    const editProjectBtn = document.getElementById('edit-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const stepEditor = document.getElementById('step-editor');
    const addStepBtn = document.getElementById('add-step-btn');

    // Modal Elements
    const projectModal = document.getElementById('project-modal');
    const shareModal = document.getElementById('share-modal');
    const deleteModal = document.getElementById('delete-modal');
    const stepModal = document.getElementById('step-modal');
    const toast = document.getElementById('toast');

    // Initialize
    renderProjectList();

    // Event Listeners
    newProjectBtn.addEventListener('click', () => openProjectModal());

    document.getElementById('modal-close').addEventListener('click', closeProjectModal);
    document.getElementById('modal-cancel').addEventListener('click', closeProjectModal);
    document.getElementById('modal-save').addEventListener('click', saveProject);

    shareBtn.addEventListener('click', openShareModal);
    document.getElementById('share-modal-close').addEventListener('click', closeShareModal);
    document.getElementById('share-modal-cancel').addEventListener('click', closeShareModal);

    // Copy button handlers
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            await copyToClipboard(input.value);
        });
    });

    editProjectBtn.addEventListener('click', () => {
        if (currentProjectId) {
            isEditMode = true;
            openProjectModal(DataManager.getProject(currentProjectId));
        }
    });

    deleteProjectBtn.addEventListener('click', openDeleteModal);
    document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-modal-cancel').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-modal-confirm').addEventListener('click', confirmDelete);

    // Step Modal Event Listeners
    addStepBtn.addEventListener('click', openAddStepModal);
    document.getElementById('step-modal-close').addEventListener('click', closeStepModal);
    document.getElementById('step-modal-cancel').addEventListener('click', closeStepModal);
    document.getElementById('step-modal-save').addEventListener('click', saveStep);
    document.getElementById('step-delete-btn').addEventListener('click', deleteStep);

    // Close modals on overlay click
    [projectModal, shareModal, deleteModal, stepModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    /**
     * Render the project list grouped by client
     */
    function renderProjectList() {
        const projects = DataManager.getAllProjects();

        if (projects.length === 0) {
            projectList.innerHTML = `
        <li style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
          プロジェクトがありません
        </li>
      `;
            return;
        }

        // Group projects by client
        const projectsByClient = {};
        projects.forEach(project => {
            const clientKey = project.clientId || 'unknown';
            if (!projectsByClient[clientKey]) {
                projectsByClient[clientKey] = {
                    clientName: project.client,
                    clientId: project.clientId,
                    projects: []
                };
            }
            projectsByClient[clientKey].projects.push(project);
        });

        let html = '';
        Object.values(projectsByClient).forEach(group => {
            html += `
        <li class="project-list__group">
          <div class="project-list__group-header">
            <span class="project-list__group-name">🏢 ${group.clientName}</span>
            <span class="project-list__group-id">${group.clientId}</span>
          </div>
        </li>
      `;

            group.projects.forEach(project => {
                const isActive = project.id === currentProjectId;
                const progress = DataManager.getProgressPercentage(project);

                html += `
          <li class="project-list__item ${isActive ? 'project-list__item--active' : ''}"
              data-id="${project.id}">
            <div class="project-list__name">${project.name}</div>
            <div class="project-list__client">${progress}%</div>
          </li>
        `;
            });
        });

        projectList.innerHTML = html;

        // Add click handlers
        projectList.querySelectorAll('.project-list__item').forEach(item => {
            item.addEventListener('click', () => {
                selectProject(item.dataset.id);
            });
        });
    }

    /**
     * Select a project
     */
    function selectProject(projectId) {
        currentProjectId = projectId;
        const project = DataManager.getProject(projectId);

        if (!project) {
            showEmptyState();
            return;
        }

        // Update list highlight
        renderProjectList();

        // Show editor
        emptyState.style.display = 'none';
        projectEditor.style.display = 'block';

        // Update project info
        document.getElementById('editor-project-name').textContent = project.name;
        document.getElementById('editor-client-name').textContent = project.client;
        document.getElementById('editor-client-id').textContent = project.clientId || '-';
        document.getElementById('editor-progress').textContent =
            `${DataManager.getProgressPercentage(project)}%`;
        document.getElementById('editor-created-at').textContent =
            DataManager.formatDate(project.createdAt);
        document.getElementById('editor-updated-at').textContent =
            DataManager.formatDate(project.updatedAt);

        // Render step editor
        renderStepEditor(project);
    }

    /**
     * Render the step editor with edit functionality
     */
    function renderStepEditor(project) {
        stepEditor.innerHTML = project.steps.map(step => {
            const statusClass = step.status === 'completed' ? 'step-editor__item--completed' :
                step.status === 'current' ? 'step-editor__item--current' : '';

            const icon = step.status === 'completed' ? '✓' : step.id;
            const date = step.completedAt ? DataManager.formatDate(step.completedAt) :
                step.status === 'current' ? '進行中' : '未着手';

            // Truncate description for display
            const descriptionPreview = step.description
                ? step.description.substring(0, 60) + (step.description.length > 60 ? '...' : '')
                : '仕様未設定（クリックで編集）';

            return `
        <div class="step-editor__item ${statusClass}" data-step-id="${step.id}">
          <div class="step-editor__number">${icon}</div>
          <div class="step-editor__info" style="cursor: pointer;" data-edit-step="${step.id}">
            <div class="step-editor__name">${step.name}</div>
            <div class="step-editor__date">${date}</div>
            <div class="step-editor__description" style="margin-top: var(--space-2); font-size: var(--font-size-xs); color: ${step.description ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'}; font-style: ${step.description ? 'normal' : 'italic'};">
              ${descriptionPreview}
            </div>
          </div>
          <div class="step-editor__actions">
            ${step.status !== 'completed' ? `
              <button class="btn btn--success btn--sm action-complete" title="完了にする">✓</button>
            ` : ''}
            ${step.status !== 'current' && step.status !== 'completed' ? `
              <button class="btn btn--primary btn--sm action-current" title="進行中にする">🚀</button>
            ` : ''}
            ${step.status === 'completed' ? `
              <button class="btn btn--secondary btn--sm action-revert" title="進行中に戻す">↩️</button>
            ` : ''}
          </div>
        </div>
      `;
        }).join('');

        // Add action handlers
        stepEditor.querySelectorAll('.step-editor__item').forEach(item => {
            const stepId = parseInt(item.dataset.stepId);

            // Edit step on click
            item.querySelector('[data-edit-step]')?.addEventListener('click', () => {
                openEditStepModal(stepId);
            });

            item.querySelector('.action-complete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                updateStepStatus(stepId, 'completed');
            });

            item.querySelector('.action-current')?.addEventListener('click', (e) => {
                e.stopPropagation();
                updateStepStatus(stepId, 'current');
            });

            item.querySelector('.action-revert')?.addEventListener('click', (e) => {
                e.stopPropagation();
                updateStepStatus(stepId, 'current');
            });
        });
    }

    /**
     * Update step status
     */
    function updateStepStatus(stepId, status) {
        DataManager.updateStepStatus(currentProjectId, stepId, status);
        selectProject(currentProjectId);
        showToast('ステータスを更新しました');
    }

    /**
     * Open add step modal
     */
    function openAddStepModal() {
        if (!currentProjectId) return;

        isNewStep = true;
        currentStepId = null;

        document.getElementById('step-modal-title').textContent = '工程を追加';
        document.getElementById('step-name').value = '';
        document.getElementById('step-description').value = '';
        document.getElementById('step-delete-btn').style.display = 'none';

        stepModal.classList.add('active');
        document.getElementById('step-name').focus();
    }

    /**
     * Open edit step modal
     */
    function openEditStepModal(stepId) {
        if (!currentProjectId) return;

        const project = DataManager.getProject(currentProjectId);
        const step = project?.steps.find(s => s.id === stepId);
        if (!step) return;

        isNewStep = false;
        currentStepId = stepId;

        document.getElementById('step-modal-title').textContent = '工程を編集';
        document.getElementById('step-name').value = step.name;
        document.getElementById('step-description').value = step.description || '';
        document.getElementById('step-delete-btn').style.display = 'block';

        stepModal.classList.add('active');
    }

    /**
     * Close step modal
     */
    function closeStepModal() {
        stepModal.classList.remove('active');
        isNewStep = false;
        currentStepId = null;
    }

    /**
     * Save step (add or update)
     */
    function saveStep() {
        const name = document.getElementById('step-name').value.trim();
        const description = document.getElementById('step-description').value.trim();

        if (!name) {
            showToast('工程名は必須です');
            return;
        }

        if (isNewStep) {
            DataManager.addStep(currentProjectId, { name, description });
            showToast('工程を追加しました');
        } else {
            DataManager.updateStep(currentProjectId, currentStepId, { name, description });
            showToast('工程を更新しました');
        }

        closeStepModal();
        selectProject(currentProjectId);
    }

    /**
     * Delete step
     */
    function deleteStep() {
        if (!currentProjectId || !currentStepId) return;

        const project = DataManager.getProject(currentProjectId);
        if (project.steps.length <= 1) {
            showToast('最後の工程は削除できません');
            return;
        }

        if (confirm('この工程を削除しますか？')) {
            DataManager.deleteStep(currentProjectId, currentStepId);
            closeStepModal();
            selectProject(currentProjectId);
            showToast('工程を削除しました');
        }
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        emptyState.style.display = 'flex';
        projectEditor.style.display = 'none';
        currentProjectId = null;
        renderProjectList();
    }

    /**
     * Open project modal (create or edit)
     */
    function openProjectModal(project = null) {
        isEditMode = !!project;
        document.getElementById('modal-title').textContent =
            isEditMode ? 'プロジェクトを編集' : '新規プロジェクト';

        document.getElementById('input-name').value = project?.name || '';
        document.getElementById('input-client').value = project?.client || '';
        document.getElementById('input-description').value = project?.description || '';

        projectModal.classList.add('active');
        document.getElementById('input-name').focus();
    }

    /**
     * Close project modal
     */
    function closeProjectModal() {
        projectModal.classList.remove('active');
        isEditMode = false;
    }

    /**
     * Save project (create or update)
     */
    function saveProject() {
        const name = document.getElementById('input-name').value.trim();
        const client = document.getElementById('input-client').value.trim();
        const description = document.getElementById('input-description').value.trim();

        if (!name || !client) {
            showToast('プロジェクト名とクライアント名は必須です');
            return;
        }

        if (isEditMode && currentProjectId) {
            DataManager.updateProject(currentProjectId, { name, client, description });
            showToast('プロジェクトを更新しました');
            selectProject(currentProjectId);
        } else {
            const newProject = DataManager.createProject({ name, client, description });
            showToast('プロジェクトを作成しました');
            selectProject(newProject.id);
        }

        closeProjectModal();
    }

    /**
     * Open share modal
     */
    function openShareModal() {
        if (!currentProjectId) return;

        const project = DataManager.getProject(currentProjectId);
        if (!project) return;

        // Client share URL (shows all projects for this client)
        const clientShareUrl = DataManager.getShareUrl(project.clientId);
        document.getElementById('share-url-client').value = clientShareUrl;

        shareModal.classList.add('active');
    }

    /**
     * Close share modal
     */
    function closeShareModal() {
        shareModal.classList.remove('active');
    }

    /**
     * Copy to clipboard
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('リンクをコピーしました');
        } catch (err) {
            showToast('コピーに失敗しました');
        }
    }

    /**
     * Open delete modal
     */
    function openDeleteModal() {
        if (!currentProjectId) return;
        deleteModal.classList.add('active');
    }

    /**
     * Close delete modal
     */
    function closeDeleteModal() {
        deleteModal.classList.remove('active');
    }

    /**
     * Confirm delete project
     */
    function confirmDelete() {
        if (!currentProjectId) return;

        DataManager.deleteProject(currentProjectId);
        closeDeleteModal();
        showEmptyState();
        showToast('プロジェクトを削除しました');
    }

    /**
     * Show toast notification
     */
    function showToast(message) {
        const toastMessage = document.getElementById('toast-message');
        toastMessage.textContent = message;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
