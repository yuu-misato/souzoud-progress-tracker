/**
 * Admin Panel Application (Supabase Version with Templates)
 */

document.addEventListener('DOMContentLoaded', () => {
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
    const templateModal = document.getElementById('template-modal');
    const toast = document.getElementById('toast');

    // Initialize
    init();

    async function init() {
        // Display admin name
        if (window.adminSession) {
            const adminNameEl = document.getElementById('admin-name');
            if (adminNameEl) {
                adminNameEl.textContent = window.adminSession.name || window.adminSession.email;
            }

            // Hide new project button for directors (they can only manage assigned projects)
            if (window.adminSession.role === 'director') {
                newProjectBtn.style.display = 'none';
            }

            // Show worker management button for master/admin
            if (window.adminSession.role === 'master' || window.adminSession.role === 'admin') {
                const workerSettingsBtn = document.getElementById('worker-settings-btn');
                if (workerSettingsBtn) {
                    workerSettingsBtn.style.display = 'inline-block';
                    workerSettingsBtn.addEventListener('click', openWorkerManagement);
                }
            }

            // Show approval button for directors, master, and admin
            if (window.adminSession.role === 'director' || window.adminSession.role === 'master' || window.adminSession.role === 'admin') {
                const approvalBtn = document.getElementById('approval-btn');
                if (approvalBtn) {
                    approvalBtn.style.display = 'inline-block';
                    approvalBtn.addEventListener('click', openApprovalModal);
                }
            }
        }

        // Logout button handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('admin_session');
                window.location.href = 'login.html';
            });
        }

        await renderProjectList();
    }

    // Event Listeners
    newProjectBtn.addEventListener('click', () => openProjectModal());

    document.getElementById('modal-close').addEventListener('click', closeProjectModal);
    document.getElementById('modal-cancel').addEventListener('click', closeProjectModal);
    document.getElementById('modal-save').addEventListener('click', saveProject);

    shareBtn.addEventListener('click', openShareModal);
    document.getElementById('share-modal-close').addEventListener('click', closeShareModal);
    document.getElementById('share-modal-cancel').addEventListener('click', closeShareModal);
    document.getElementById('open-client-users-btn')?.addEventListener('click', () => {
        if (currentProjectId) {
            const clientId = document.getElementById('project-client-id')?.textContent;
            const clientName = document.getElementById('project-client')?.textContent;
            if (clientId) {
                closeShareModal();
                openClientUsersModal(clientId, clientName || clientId);
            }
        }
    });

    // Copy button handlers
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            await copyToClipboard(input.value);
        });
    });

    editProjectBtn.addEventListener('click', async () => {
        if (currentProjectId) {
            isEditMode = true;
            const project = await DataManager.getProject(currentProjectId);
            openProjectModal(project);
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

    // Template Modal Event Listeners
    document.getElementById('modal-save-template')?.addEventListener('click', openSaveTemplateModal);
    document.getElementById('template-modal-close')?.addEventListener('click', closeTemplateModal);
    document.getElementById('template-modal-cancel')?.addEventListener('click', closeTemplateModal);
    document.getElementById('template-modal-save')?.addEventListener('click', saveCurrentAsTemplate);

    // Close modals on overlay click
    [projectModal, shareModal, deleteModal, stepModal, templateModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });

    /**
     * Render the project list grouped by client
     */
    async function renderProjectList() {
        // Get projects filtered by user role (directors see only assigned projects)
        const projects = await DataManager.getProjectsForCurrentUser();

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
            const clientKey = project.clientId || project.client_id || 'unknown';
            if (!projectsByClient[clientKey]) {
                projectsByClient[clientKey] = {
                    clientName: project.client,
                    clientId: clientKey,
                    projects: []
                };
            }
            projectsByClient[clientKey].projects.push(project);
        });

        // Get collapsed state from localStorage
        const collapsedClients = JSON.parse(localStorage.getItem('collapsed_clients') || '{}');

        let html = '';
        Object.values(projectsByClient).forEach(group => {
            const isCollapsed = collapsedClients[group.clientId] === true;
            const toggleIcon = isCollapsed ? '▶' : '▼';

            html += `
        <li class="project-list__group">
          <div class="project-list__group-header" data-client-id="${group.clientId}" style="cursor: pointer;">
            <span class="project-list__group-toggle">${toggleIcon}</span>
            <span class="project-list__group-name">🏢 ${group.clientName}</span>
            <span class="project-list__group-id">${group.clientId}</span>
          </div>
        </li>
      `;

            group.projects.forEach(project => {
                const isActive = project.id === currentProjectId;
                const progress = DataManager.getProgressPercentage(project);
                const hiddenStyle = isCollapsed ? 'display: none;' : '';

                html += `
          <li class="project-list__item ${isActive ? 'project-list__item--active' : ''}"
              data-id="${project.id}" data-client="${group.clientId}" style="${hiddenStyle}">
            <div class="project-list__name">${project.name}</div>
            <div class="project-list__client">${progress}%</div>
          </li>
        `;
            });
        });

        projectList.innerHTML = html;

        // Add click handlers for project items
        projectList.querySelectorAll('.project-list__item').forEach(item => {
            item.addEventListener('click', () => {
                selectProject(item.dataset.id);
            });
        });

        // Add click handlers for client group toggle
        projectList.querySelectorAll('.project-list__group-header').forEach(header => {
            header.addEventListener('click', () => {
                const clientId = header.dataset.clientId;
                const toggleIcon = header.querySelector('.project-list__group-toggle');
                const collapsedClients = JSON.parse(localStorage.getItem('collapsed_clients') || '{}');

                // Toggle state
                const isNowCollapsed = !collapsedClients[clientId];
                collapsedClients[clientId] = isNowCollapsed;
                localStorage.setItem('collapsed_clients', JSON.stringify(collapsedClients));

                // Update icon
                toggleIcon.textContent = isNowCollapsed ? '▶' : '▼';

                // Toggle visibility of project items
                projectList.querySelectorAll(`.project-list__item[data-client="${clientId}"]`).forEach(item => {
                    item.style.display = isNowCollapsed ? 'none' : '';
                });
            });
        });
    }

    /**
     * Select a project
     */
    async function selectProject(projectId) {
        currentProjectId = projectId;
        const project = await DataManager.getProject(projectId);

        if (!project) {
            showEmptyState();
            return;
        }

        // Update list highlight
        await renderProjectList();

        // Show editor
        emptyState.style.display = 'none';
        projectEditor.style.display = 'block';

        // Update project info
        document.getElementById('editor-project-name').textContent = project.name;
        document.getElementById('editor-client-name').textContent = project.client;
        document.getElementById('editor-client-id').textContent = project.clientId || project.client_id || '-';
        document.getElementById('editor-progress').textContent =
            `${DataManager.getProgressPercentage(project)}%`;
        document.getElementById('editor-created-at').textContent =
            DataManager.formatDate(project.createdAt || project.created_at);
        document.getElementById('editor-updated-at').textContent =
            DataManager.formatDate(project.updatedAt || project.updated_at);

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

            const descriptionPreview = step.description
                ? step.description.substring(0, 60) + (step.description.length > 60 ? '...' : '')
                : '仕様未設定（クリックで編集）';

            const isFirst = step.id === project.steps[0].id;
            const isLast = step.id === project.steps[project.steps.length - 1].id;

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
            <button class="btn btn--ghost btn--sm action-move-up" title="上へ移動" ${isFirst ? 'disabled' : ''}>↑</button>
            <button class="btn btn--ghost btn--sm action-move-down" title="下へ移動" ${isLast ? 'disabled' : ''}>↓</button>
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

            item.querySelector('[data-edit-step]')?.addEventListener('click', () => {
                openEditStepModal(stepId);
            });

            item.querySelector('.action-move-up')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await DataManager.reorderStep(currentProjectId, stepId, 'up');
                await selectProject(currentProjectId);
                showToast('工程を上に移動しました');
            });

            item.querySelector('.action-move-down')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await DataManager.reorderStep(currentProjectId, stepId, 'down');
                await selectProject(currentProjectId);
                showToast('工程を下に移動しました');
            });

            item.querySelector('.action-complete')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await updateStepStatus(stepId, 'completed');
            });

            item.querySelector('.action-current')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await updateStepStatus(stepId, 'current');
            });

            item.querySelector('.action-revert')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await updateStepStatus(stepId, 'current');
            });
        });
    }

    /**
     * Update step status
     */
    async function updateStepStatus(stepId, status) {
        await DataManager.updateStepStatus(currentProjectId, stepId, status);
        await selectProject(currentProjectId);
        showToast('ステータスを更新しました');
    }

    /**
     * Open add step modal
     */
    async function openAddStepModal() {
        if (!currentProjectId) return;

        isNewStep = true;
        currentStepId = null;

        document.getElementById('step-modal-title').textContent = '工程を追加';
        document.getElementById('step-name').value = '';
        document.getElementById('step-description').value = '';
        document.getElementById('step-url').value = '';
        document.getElementById('step-delete-btn').style.display = 'none';

        // Populate position selector
        const project = await DataManager.getProject(currentProjectId);
        const positionSelect = document.getElementById('step-position');
        const positionGroup = document.getElementById('step-position-group');
        positionSelect.innerHTML = '<option value="end">最後に追加</option>';
        if (project?.steps?.length > 0) {
            project.steps.forEach((step, index) => {
                positionSelect.innerHTML += `<option value="${index}">${step.name} の前</option>`;
            });
        }
        positionGroup.style.display = 'block';

        // Populate worker dropdown
        await populateWorkerDropdown();
        document.getElementById('step-worker').value = '';
        document.getElementById('step-due-date').value = '';
        document.getElementById('step-notes').value = '';

        stepModal.classList.add('active');
        document.getElementById('step-name').focus();
    }

    /**
     * Open edit step modal
     */
    async function openEditStepModal(stepId) {
        if (!currentProjectId) return;

        const project = await DataManager.getProject(currentProjectId);
        const step = project?.steps.find(s => s.id === stepId);
        if (!step) return;

        isNewStep = false;
        currentStepId = stepId;

        document.getElementById('step-modal-title').textContent = '工程を編集';
        document.getElementById('step-name').value = step.name;
        document.getElementById('step-description').value = step.description || '';
        document.getElementById('step-url').value = step.url || '';
        document.getElementById('step-delete-btn').style.display = 'block';

        // Hide position selector for edit mode
        document.getElementById('step-position-group').style.display = 'none';

        // Populate worker dropdown and load assignment
        await populateWorkerDropdown();
        const assignments = await DataManager.getAssignmentsForStep(stepId, currentProjectId);
        if (assignments.length > 0) {
            const a = assignments[0];
            document.getElementById('step-worker').value = a.worker_id || '';
            document.getElementById('step-due-date').value = a.due_date ? a.due_date.slice(0, 16) : '';
            document.getElementById('step-notes').value = a.notes || '';
        } else {
            document.getElementById('step-worker').value = '';
            document.getElementById('step-due-date').value = '';
            document.getElementById('step-notes').value = '';
        }

        stepModal.classList.add('active');
    }

    /**
     * Populate worker dropdown
     */
    async function populateWorkerDropdown() {
        const workers = await DataManager.getAllWorkers();
        const select = document.getElementById('step-worker');
        select.innerHTML = '<option value="">選択してください</option>';
        workers.filter(w => w.isActive).forEach(w => {
            select.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });
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
    async function saveStep() {
        const name = document.getElementById('step-name').value.trim();
        const description = document.getElementById('step-description').value.trim();
        const url = document.getElementById('step-url').value.trim();

        if (!name) {
            showToast('工程名は必須です');
            return;
        }

        if (isNewStep) {
            const position = document.getElementById('step-position').value;
            const newStep = await DataManager.addStep(currentProjectId, { name, description, url }, position === 'end' ? null : parseInt(position));
            // Save assignment if worker selected
            const workerId = document.getElementById('step-worker').value;
            if (workerId && newStep) {
                await DataManager.createAssignment({
                    stepId: newStep.id,
                    projectId: currentProjectId,
                    workerId: workerId,
                    directorId: window.adminSession?.id,
                    dueDate: document.getElementById('step-due-date').value || null,
                    notes: document.getElementById('step-notes').value,
                    createdBy: window.adminSession?.id
                });
            }
            showToast('工程を追加しました');
        } else {
            await DataManager.updateStep(currentProjectId, currentStepId, { name, description, url });
            // Update or create assignment
            const workerId = document.getElementById('step-worker').value;
            const assignments = await DataManager.getAssignmentsForStep(currentStepId, currentProjectId);
            if (workerId) {
                if (assignments.length > 0) {
                    await DataManager.updateAssignment(assignments[0].id, {
                        dueDate: document.getElementById('step-due-date').value || null,
                        notes: document.getElementById('step-notes').value,
                        directorId: window.adminSession?.id
                    });
                } else {
                    await DataManager.createAssignment({
                        stepId: currentStepId,
                        projectId: currentProjectId,
                        workerId: workerId,
                        directorId: window.adminSession?.id,
                        dueDate: document.getElementById('step-due-date').value || null,
                        notes: document.getElementById('step-notes').value,
                        createdBy: window.adminSession?.id
                    });
                }
            } else if (assignments.length > 0) {
                // Remove assignment if worker deselected
                await DataManager.deleteAssignment(assignments[0].id);
            }
            showToast('工程を更新しました');
        }

        closeStepModal();
        await selectProject(currentProjectId);
    }

    /**
     * Delete step
     */
    async function deleteStep() {
        if (!currentProjectId || !currentStepId) return;

        const project = await DataManager.getProject(currentProjectId);
        if (project.steps.length <= 1) {
            showToast('最後の工程は削除できません');
            return;
        }

        if (confirm('この工程を削除しますか？')) {
            await DataManager.deleteStep(currentProjectId, currentStepId);
            closeStepModal();
            await selectProject(currentProjectId);
            showToast('工程を削除しました');
        }
    }

    /**
     * Show empty state
     */
    async function showEmptyState() {
        emptyState.style.display = 'flex';
        projectEditor.style.display = 'none';
        currentProjectId = null;
        await renderProjectList();
    }

    /**
     * Open project modal (create or edit)
     */
    async function openProjectModal(project = null) {
        isEditMode = !!project;
        document.getElementById('modal-title').textContent =
            isEditMode ? 'プロジェクトを編集' : '新規プロジェクト';

        document.getElementById('input-name').value = project?.name || '';
        document.getElementById('input-client').value = project?.client || '';
        document.getElementById('input-description').value = project?.description || '';

        // Populate client datalist from existing clients
        const clientList = document.getElementById('client-list');
        if (clientList) {
            const clients = await DataManager.getAllClients();
            clientList.innerHTML = clients.map(c => `<option value="${c.name}">`).join('');
        }

        // Populate template dropdown
        const templateSelect = document.getElementById('input-template');
        if (templateSelect) {
            const templates = DataManager.getAllTemplates();
            templateSelect.innerHTML = templates.map(t =>
                `<option value="${t.id}">${t.name}</option>`
            ).join('');

            // Hide template selection in edit mode
            const templateGroup = templateSelect.closest('.input-group');
            if (templateGroup) {
                templateGroup.style.display = isEditMode ? 'none' : 'block';
            }
        }

        // Hide/show save template button
        const saveTemplateBtn = document.getElementById('modal-save-template');
        if (saveTemplateBtn) {
            saveTemplateBtn.style.display = isEditMode ? 'inline-flex' : 'none';
        }

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
    async function saveProject() {
        const name = document.getElementById('input-name').value.trim();
        const client = document.getElementById('input-client').value.trim();
        const description = document.getElementById('input-description').value.trim();
        const templateSelect = document.getElementById('input-template');
        const templateId = templateSelect ? templateSelect.value : 'default';

        if (!name || !client) {
            showToast('プロジェクト名とクライアント名は必須です');
            return;
        }

        if (isEditMode && currentProjectId) {
            await DataManager.updateProject(currentProjectId, { name, client, description });
            showToast('プロジェクトを更新しました');
            await selectProject(currentProjectId);
        } else {
            // Use template for new project
            const newProject = await DataManager.createProjectWithTemplate(
                { name, client, description },
                templateId
            );
            showToast('プロジェクトを作成しました');
            await selectProject(newProject.id);
        }

        closeProjectModal();
    }

    /**
     * Open save template modal
     */
    function openSaveTemplateModal() {
        if (!currentProjectId) {
            showToast('プロジェクトを選択してください');
            return;
        }
        closeProjectModal();
        document.getElementById('template-name').value = '';
        templateModal.classList.add('active');
        document.getElementById('template-name').focus();
    }

    /**
     * Close template modal
     */
    function closeTemplateModal() {
        templateModal.classList.remove('active');
    }

    /**
     * Save current project's steps as template
     */
    async function saveCurrentAsTemplate() {
        const templateName = document.getElementById('template-name').value.trim();
        if (!templateName) {
            showToast('テンプレート名を入力してください');
            return;
        }

        const project = await DataManager.getProject(currentProjectId);
        if (!project) return;

        DataManager.saveTemplate(templateName, project.steps);
        closeTemplateModal();
        showToast('テンプレートを保存しました');
    }

    /**
     * Open share modal
     */
    async function openShareModal() {
        if (!currentProjectId) return;

        const project = await DataManager.getProject(currentProjectId);
        if (!project) return;

        const clientShareUrl = DataManager.getShareUrl(project.clientId || project.client_id);
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
    async function confirmDelete() {
        if (!currentProjectId) return;

        await DataManager.deleteProject(currentProjectId);
        closeDeleteModal();
        await showEmptyState();
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

    // ==================== ADMIN MANAGEMENT ====================

    const adminListModal = document.getElementById('admin-list-modal');
    const adminEditModal = document.getElementById('admin-edit-modal');
    const adminSettingsBtn = document.getElementById('admin-settings-btn');
    let currentEditAdminId = null;

    // Show admin settings button for master admins
    if (window.adminSession && window.adminSession.role === 'master' && adminSettingsBtn) {
        adminSettingsBtn.style.display = 'inline-flex';
        adminSettingsBtn.addEventListener('click', openAdminListModal);
    }

    // Admin list modal events
    document.getElementById('admin-list-modal-close')?.addEventListener('click', closeAdminListModal);
    document.getElementById('admin-list-modal-cancel')?.addEventListener('click', closeAdminListModal);
    document.getElementById('add-admin-btn')?.addEventListener('click', openAddAdminModal);

    // Admin edit modal events  
    document.getElementById('admin-edit-modal-close')?.addEventListener('click', closeAdminEditModal);
    document.getElementById('admin-edit-modal-cancel')?.addEventListener('click', closeAdminEditModal);
    document.getElementById('admin-edit-modal-save')?.addEventListener('click', saveAdmin);
    document.getElementById('admin-delete-btn')?.addEventListener('click', deleteAdmin);

    // Close on overlay click
    [adminListModal, adminEditModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });

    async function openAdminListModal() {
        await renderAdminList();
        adminListModal.classList.add('active');
    }

    function closeAdminListModal() {
        adminListModal.classList.remove('active');
    }

    async function renderAdminList() {
        const adminList = document.getElementById('admin-list');
        const admins = await DataManager.getAllAdmins();

        if (admins.length === 0) {
            adminList.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">管理者がいません</p>';
            return;
        }

        adminList.innerHTML = admins.map(admin => {
            const roleLabels = { master: '👑 マスター', admin: '👤 管理者', director: '🎬 ディレクター' };
            const roleLabel = roleLabels[admin.role] || admin.role;
            const statusClass = admin.isActive ? '' : 'opacity: 0.5;';
            const isSelf = admin.id === window.adminSession?.id;

            return `
                <div class="admin-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); ${statusClass}">
                    <div>
                        <div style="font-weight: 500;">${admin.name} ${isSelf ? '(自分)' : ''}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${admin.email}</div>
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${roleLabel} ${!admin.isActive ? '(無効)' : ''}</div>
                    </div>
                    <button class="btn btn--secondary btn--sm" onclick="editAdmin('${admin.id}')" ${isSelf ? 'disabled' : ''}>編集</button>
                </div>
            `;
        }).join('');
    }

    // Global function for edit button
    window.editAdmin = async function (adminId) {
        const admins = await DataManager.getAllAdmins();
        const admin = admins.find(a => a.id === adminId);
        if (!admin) return;

        currentEditAdminId = adminId;
        document.getElementById('admin-edit-title').textContent = '管理者を編集';
        document.getElementById('admin-email').value = admin.email;
        document.getElementById('admin-display-name').value = admin.name;
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-role').value = admin.role;
        document.getElementById('admin-delete-btn').style.display = 'block';

        // Show/hide project assignment for directors
        await updateProjectAssignmentVisibility(admin.role, adminId);

        adminEditModal.classList.add('active');
    };

    // Update project assignment visibility based on role
    async function updateProjectAssignmentVisibility(role, adminId = null) {
        const groupEl = document.getElementById('project-assignment-group');
        const listEl = document.getElementById('project-assignment-list');

        if (role === 'director') {
            groupEl.style.display = 'block';

            // Get all projects and current assignments
            const projects = await DataManager.getAllProjects();
            const assignedProjectIds = adminId ? await DataManager.getDirectorProjects(adminId) : [];

            listEl.innerHTML = projects.map(p => `
                <label style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1); cursor: pointer;">
                    <input type="checkbox" name="assigned-project" value="${p.id}" 
                           ${assignedProjectIds.includes(p.id) ? 'checked' : ''}>
                    <span>${p.name}</span>
                    <span style="color: var(--color-text-muted); font-size: var(--font-size-xs);">(${p.client})</span>
                </label>
            `).join('');
        } else {
            groupEl.style.display = 'none';
            listEl.innerHTML = '';
        }
    }

    // Listen for role change
    document.getElementById('admin-role')?.addEventListener('change', (e) => {
        updateProjectAssignmentVisibility(e.target.value, currentEditAdminId);
    });

    function openAddAdminModal() {
        currentEditAdminId = null;
        document.getElementById('admin-edit-title').textContent = '管理者を追加';
        document.getElementById('admin-email').value = '';
        document.getElementById('admin-display-name').value = '';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-role').value = 'director';
        document.getElementById('admin-delete-btn').style.display = 'none';

        // Show project assignment for new directors
        updateProjectAssignmentVisibility('director');

        adminEditModal.classList.add('active');
        document.getElementById('admin-email').focus();
    }

    function closeAdminEditModal() {
        adminEditModal.classList.remove('active');
        currentEditAdminId = null;
    }

    async function saveAdmin() {
        const email = document.getElementById('admin-email').value.trim();
        const name = document.getElementById('admin-display-name').value.trim();
        const password = document.getElementById('admin-password').value;
        const role = document.getElementById('admin-role').value;

        if (!email || !name) {
            showToast('メールアドレスと表示名は必須です');
            return;
        }

        if (!currentEditAdminId && !password) {
            showToast('パスワードは必須です');
            return;
        }

        if (password && password.length < 8) {
            showToast('パスワードは8文字以上で入力してください');
            return;
        }

        try {
            let passwordHash = null;
            if (password) {
                passwordHash = await hashPassword(password);
            }

            let adminId = currentEditAdminId;

            if (currentEditAdminId) {
                const updates = { email, name, role };
                if (passwordHash) updates.passwordHash = passwordHash;
                await DataManager.updateAdmin(currentEditAdminId, updates);
                showToast('管理者を更新しました');
            } else {
                const newAdmin = await DataManager.createAdmin({ email, name, role, passwordHash });
                adminId = newAdmin?.id;
                showToast('管理者を追加しました');
            }

            // Save director project assignments
            if (role === 'director' && adminId) {
                // Get selected projects
                const checkboxes = document.querySelectorAll('input[name="assigned-project"]');
                const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
                const unselectedIds = Array.from(checkboxes).filter(cb => !cb.checked).map(cb => cb.value);

                // Get currently assigned projects
                const currentlyAssigned = await DataManager.getDirectorProjects(adminId);

                // Add new assignments
                for (const projectId of selectedIds) {
                    if (!currentlyAssigned.includes(projectId)) {
                        await DataManager.assignProjectToDirector(adminId, projectId);
                    }
                }

                // Remove unassignments
                for (const projectId of unselectedIds) {
                    if (currentlyAssigned.includes(projectId)) {
                        await DataManager.removeProjectFromDirector(adminId, projectId);
                    }
                }
            }

            closeAdminEditModal();
            await renderAdminList();
        } catch (e) {
            console.error('Error saving admin:', e);
            showToast('エラーが発生しました');
        }
    }

    async function deleteAdmin() {
        if (!currentEditAdminId) return;

        if (confirm('この管理者を無効化しますか？')) {
            try {
                await DataManager.deleteAdmin(currentEditAdminId);
                showToast('管理者を無効化しました');
                closeAdminEditModal();
                await renderAdminList();
            } catch (e) {
                showToast('エラーが発生しました');
            }
        }
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Open approval modal (show pending submissions)
     */
    async function openApprovalModal() {
        try {
            // Get all pending submissions (for master/admin, get all; for director, get assigned projects)
            const pendingSubmissions = await DataManager.getAllPendingSubmissions();

            if (pendingSubmissions.length === 0) {
                showToast('承認待ちの提出物はありません');
                return;
            }

            // Build modal content
            const stageLabels = { draft: '初稿', revision: '修正稿', final: '最終稿' };

            let modalHtml = `
                <div style="max-height: 60vh; overflow-y: auto;">
            `;

            for (const s of pendingSubmissions) {
                modalHtml += `
                    <div style="padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-3); background: #f8fafc;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
                            <div>
                                <div style="font-weight: 600; font-size: var(--font-size-base);">${s.projectName || 'プロジェクト'}</div>
                                <div style="color: var(--color-primary); font-weight: 500;">${s.stepName || '工程'}</div>
                            </div>
                            <span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: var(--font-size-sm);">
                                ${stageLabels[s.stage]} 提出
                            </span>
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-2);">
                            👤 ${s.workerName || '作業者'} ・ 📅 ${new Date(s.submitted_at).toLocaleString('ja-JP')}
                        </div>
                        ${s.comment ? `<div style="font-size: var(--font-size-sm); background: white; padding: var(--space-2); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">💬 ${s.comment}</div>` : ''}
                        ${s.url ? `<div style="margin-bottom: var(--space-3);"><a href="${s.url}" target="_blank" style="color: var(--color-primary); font-size: var(--font-size-sm);">🔗 成果物を確認</a></div>` : ''}
                        <div style="display: flex; gap: var(--space-2);">
                            <button class="btn btn--primary btn--sm" onclick="approveSubmission('${s.id}')">✓ 承認</button>
                            <button class="btn btn--secondary btn--sm" onclick="rejectSubmission('${s.id}')">↩ 差戻し</button>
                        </div>
                    </div>
                `;
            }
            modalHtml += `</div>`;

            // Create and show modal
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.id = 'approval-modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 600px;">
                    <div class="modal__header">
                        <h2 class="modal__title">📋 承認待ち (${pendingSubmissions.length}件)</h2>
                        <button class="modal__close" onclick="document.getElementById('approval-modal-overlay').remove();">&times;</button>
                    </div>
                    <div class="modal__body">${modalHtml}</div>
                </div>
            `;
            document.body.appendChild(overlay);

        } catch (e) {
            console.error('Error opening approval modal:', e);
            showToast('承認待ちの取得に失敗しました');
        }
    }

    // Global approval functions
    window.approveSubmission = async function (submissionId) {
        try {
            await DataManager.approveSubmission(submissionId, window.adminSession?.id);
            showToast('承認しました');
            // Refresh the modal
            document.getElementById('approval-modal-overlay')?.remove();
            openApprovalModal();
        } catch (e) {
            showToast('承認に失敗しました');
        }
    };

    window.rejectSubmission = async function (submissionId) {
        const comment = prompt('差戻しの理由を入力してください:');
        if (comment === null) return;
        try {
            await DataManager.rejectSubmission(submissionId, comment);
            showToast('差戻しました');
            // Refresh the modal
            document.getElementById('approval-modal-overlay')?.remove();
            openApprovalModal();
        } catch (e) {
            showToast('差戻しに失敗しました');
        }
    };

    /**
     * Open worker management
     */
    async function openWorkerManagement() {
        try {
            const workers = await DataManager.getAllWorkers();

            let html = `<h3 style="margin-bottom: var(--space-4);">作業者一覧</h3>`;

            if (workers.length === 0) {
                html += `<p style="color: var(--color-text-muted);">作業者が登録されていません</p>`;
            } else {
                html += `<div style="max-height: 300px; overflow-y: auto;">`;
                workers.forEach(w => {
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                            <div>
                                <div style="font-weight: 500;">${w.name}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${w.email}</div>
                            </div>
                            <span style="font-size: var(--font-size-sm); color: ${w.is_active ? 'var(--color-success)' : 'var(--color-text-muted)'};">
                                ${w.is_active ? '有効' : '無効'}
                            </span>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `
                <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <h4 style="margin-bottom: var(--space-3);">新規作業者追加</h4>
                    <input type="text" id="new-worker-name" class="input" placeholder="名前" style="margin-bottom: var(--space-2);">
                    <input type="email" id="new-worker-email" class="input" placeholder="メールアドレス" style="margin-bottom: var(--space-2);">
                    <input type="password" id="new-worker-password" class="input" placeholder="パスワード" style="margin-bottom: var(--space-3);">
                    <button class="btn btn--primary" onclick="addNewWorker()">追加</button>
                </div>
            `;

            // Create modal dynamically
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.id = 'worker-modal-overlay';
            overlay.innerHTML = `
                <div class="modal" style="max-width: 500px;">
                    <div class="modal__header">
                        <h2 class="modal__title">作業者管理</h2>
                        <button class="modal__close" onclick="document.getElementById('worker-modal-overlay').remove();">&times;</button>
                    </div>
                    <div class="modal__body">${html}</div>
                </div>
            `;
            document.body.appendChild(overlay);

        } catch (e) {
            console.error('Error opening worker management:', e);
            showToast('作業者一覧の取得に失敗しました');
        }
    }

    // Global function to add new worker
    window.addNewWorker = async function () {
        const name = document.getElementById('new-worker-name').value.trim();
        const email = document.getElementById('new-worker-email').value.trim();
        const password = document.getElementById('new-worker-password').value;

        if (!name || !email || !password) {
            showToast('全ての項目を入力してください');
            return;
        }

        try {
            const passwordHash = await hashPassword(password);
            await DataManager.createWorker({ name, email, passwordHash });
            showToast('作業者を追加しました');
            document.getElementById('worker-modal-overlay').remove();
            openWorkerManagement(); // Refresh list
        } catch (e) {
            console.error('Error adding worker:', e);
            showToast('作業者の追加に失敗しました');
        }
    };

    // ==================== CLIENT USER MANAGEMENT ====================

    let currentClientUsersClientId = null;

    window.openClientUsersModal = async function (clientId, clientName) {
        currentClientUsersClientId = clientId;
        document.getElementById('client-users-modal-name').textContent = clientName;
        document.getElementById('client-users-modal').classList.add('active');
        await renderClientUsersList();
    };

    window.closeClientUsersModal = function () {
        document.getElementById('client-users-modal').classList.remove('active');
        currentClientUsersClientId = null;
    };

    async function renderClientUsersList() {
        const listEl = document.getElementById('client-users-list');
        if (!currentClientUsersClientId) return;

        const users = await DataManager.getClientUsers(currentClientUsersClientId);

        if (users.length === 0) {
            listEl.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">ユーザーが登録されていません</p>';
            return;
        }

        listEl.innerHTML = users.map(u => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                <div>
                    <div style="font-weight: 500;">${u.name}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${u.email}</div>
                </div>
                <button class="btn btn--ghost btn--sm" onclick="deleteClientUserFromAdmin('${u.id}')" style="color: #ef4444;">削除</button>
            </div>
        `).join('');
    }

    window.addClientUserFromAdmin = async function () {
        const name = document.getElementById('new-client-user-name').value.trim();
        const email = document.getElementById('new-client-user-email').value.trim();
        const password = document.getElementById('new-client-user-password').value;
        const errorEl = document.getElementById('client-user-error');

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
            const passwordHash = await hashPassword(password);
            await DataManager.createClientUser({
                clientId: currentClientUsersClientId,
                email,
                name,
                passwordHash
            });

            // Clear form
            document.getElementById('new-client-user-name').value = '';
            document.getElementById('new-client-user-email').value = '';
            document.getElementById('new-client-user-password').value = '';
            errorEl.style.display = 'none';

            showToast('ユーザーを追加しました');
            await renderClientUsersList();
        } catch (e) {
            console.error('Error adding client user:', e);
            errorEl.textContent = 'このメールアドレスは既に使用されています';
            errorEl.style.display = 'block';
        }
    };

    window.deleteClientUserFromAdmin = async function (userId) {
        if (!confirm('このユーザーを削除しますか？')) return;

        try {
            await DataManager.deleteClientUser(userId);
            showToast('ユーザーを削除しました');
            await renderClientUsersList();
        } catch (e) {
            console.error('Error deleting client user:', e);
            showToast('削除に失敗しました');
        }
    };
});
