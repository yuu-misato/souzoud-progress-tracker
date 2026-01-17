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
    const adminDashboard = document.getElementById('admin-dashboard');
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

            // Show template management button for master/admin
            if (window.adminSession.role === 'master' || window.adminSession.role === 'admin') {
                const templateSettingsBtn = document.getElementById('template-settings-btn');
                if (templateSettingsBtn) {
                    templateSettingsBtn.style.display = 'inline-block';
                    templateSettingsBtn.addEventListener('click', openTemplateManagement);
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

        // Dashboard button handler
        const dashboardBtn = document.getElementById('dashboard-btn');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                showEmptyState(); // This now shows dashboard
            });
        }

        await renderProjectList();
        await initDashboard();
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
            const clientId = document.getElementById('editor-client-id')?.textContent;
            const clientName = document.getElementById('editor-client')?.textContent;
            if (clientId && clientId !== '-') {
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

        // Setup event delegation for project list (only once)
        setupProjectListEventDelegation();
    }

    // Track if project list events are set up
    let projectListEventsInitialized = false;

    function setupProjectListEventDelegation() {
        if (projectListEventsInitialized) return;
        projectListEventsInitialized = true;

        projectList.addEventListener('click', (e) => {
            // Handle project item click
            const projectItem = e.target.closest('.project-list__item');
            if (projectItem) {
                e.preventDefault();
                selectProject(projectItem.dataset.id);
                return;
            }

            // Handle client group toggle
            const groupHeader = e.target.closest('.project-list__group-header');
            if (groupHeader) {
                e.preventDefault();
                const clientId = groupHeader.dataset.clientId;
                const toggleIcon = groupHeader.querySelector('.project-list__group-toggle');
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
            }
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
        adminDashboard.style.display = 'none';
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

        // Setup event delegation for step editor (only once)
        setupStepEditorEventDelegation();
    }

    // Track if step editor events are set up
    let stepEditorEventsInitialized = false;

    function setupStepEditorEventDelegation() {
        if (stepEditorEventsInitialized) return;
        stepEditorEventsInitialized = true;

        stepEditor.addEventListener('click', async (e) => {
            const stepItem = e.target.closest('.step-editor__item');
            if (!stepItem) return;

            const stepId = parseInt(stepItem.dataset.stepId);
            if (isNaN(stepId)) return;

            // Handle edit step click
            if (e.target.closest('[data-edit-step]')) {
                openEditStepModal(stepId);
                return;
            }

            // Handle action buttons (stop propagation for all)
            if (e.target.closest('.action-move-up')) {
                e.stopPropagation();
                await DataManager.reorderStep(currentProjectId, stepId, 'up');
                await selectProject(currentProjectId);
                showToast('工程を上に移動しました');
                return;
            }

            if (e.target.closest('.action-move-down')) {
                e.stopPropagation();
                await DataManager.reorderStep(currentProjectId, stepId, 'down');
                await selectProject(currentProjectId);
                showToast('工程を下に移動しました');
                return;
            }

            if (e.target.closest('.action-complete')) {
                e.stopPropagation();
                await updateStepStatus(stepId, 'completed');
                return;
            }

            if (e.target.closest('.action-current')) {
                e.stopPropagation();
                await updateStepStatus(stepId, 'current');
                return;
            }

            if (e.target.closest('.action-revert')) {
                e.stopPropagation();
                await updateStepStatus(stepId, 'current');
                return;
            }
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
        document.getElementById('step-client-due-date').value = '';
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
        document.getElementById('step-client-due-date').value = step.dueDate || '';
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
        const clientDueDate = document.getElementById('step-client-due-date').value || null;

        if (!name) {
            showToast('工程名は必須です');
            return;
        }

        if (isNewStep) {
            const position = document.getElementById('step-position').value;
            const newStep = await DataManager.addStep(currentProjectId, { name, description, url, dueDate: clientDueDate }, position === 'end' ? null : parseInt(position));
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
            await DataManager.updateStep(currentProjectId, currentStepId, { name, description, url, dueDate: clientDueDate });
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
     * Show empty state (now dashboard)
     */
    async function showEmptyState() {
        adminDashboard.style.display = 'block';
        projectEditor.style.display = 'none';
        currentProjectId = null;
        await renderProjectList();
        await initDashboard();
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

        // Folder and Delivery URLs (only shown in edit mode)
        const folderUrlGroup = document.getElementById('folder-url-group');
        const deliveryUrlGroup = document.getElementById('delivery-url-group');
        const directorGroup = document.getElementById('director-group');
        const projectDueDateGroup = document.getElementById('project-due-date-group');
        const folderUrlInput = document.getElementById('input-folder-url');
        const deliveryUrlInput = document.getElementById('input-delivery-url');
        const directorSelect = document.getElementById('input-director');
        const projectDueDateInput = document.getElementById('input-project-due-date');

        if (folderUrlGroup) folderUrlGroup.style.display = isEditMode ? 'block' : 'none';
        if (deliveryUrlGroup) deliveryUrlGroup.style.display = isEditMode ? 'block' : 'none';
        if (directorGroup) directorGroup.style.display = isEditMode ? 'block' : 'none';
        if (projectDueDateGroup) projectDueDateGroup.style.display = isEditMode ? 'block' : 'none';
        if (folderUrlInput) folderUrlInput.value = project?.folderUrl || '';
        if (deliveryUrlInput) deliveryUrlInput.value = project?.deliveryUrl || '';
        if (projectDueDateInput) projectDueDateInput.value = project?.dueDate || '';

        // Populate director dropdown
        if (directorSelect && isEditMode) {
            const admins = await DataManager.getAllAdmins();
            directorSelect.innerHTML = '<option value="">未設定</option>';
            admins.filter(a => a.isActive).forEach(a => {
                directorSelect.innerHTML += `<option value="${a.id}">${escapeHtml(a.name)}</option>`;
            });
            // Get current director
            const currentDirector = await DataManager.getProjectDirector(project?.id);
            if (currentDirector) {
                directorSelect.value = currentDirector.id;
            }
        }

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
            const folderUrl = document.getElementById('input-folder-url')?.value.trim() || '';
            const deliveryUrl = document.getElementById('input-delivery-url')?.value.trim() || '';
            const directorId = document.getElementById('input-director')?.value || null;
            const dueDate = document.getElementById('input-project-due-date')?.value || null;
            await DataManager.updateProject(currentProjectId, { name, client, description, folderUrl, deliveryUrl, dueDate });
            // Update director separately
            if (directorId !== null) {
                await DataManager.updateProjectDirector(currentProjectId, directorId || null);
            }
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
                        <div style="font-weight: 500;">${escapeHtml(admin.name)} ${isSelf ? '(自分)' : ''}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(admin.email)}</div>
                        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${roleLabel} ${!admin.isActive ? '(無効)' : ''}</div>
                    </div>
                    <button class="btn btn--secondary btn--sm" data-edit-admin="${admin.id}" ${isSelf ? 'disabled' : ''}>編集</button>
                </div>
            `;
        }).join('');

        // Setup event delegation for admin list
        setupAdminListEventDelegation();
    }

    // Track if admin list events are set up
    let adminListEventsInitialized = false;

    function setupAdminListEventDelegation() {
        if (adminListEventsInitialized) return;
        adminListEventsInitialized = true;

        const adminList = document.getElementById('admin-list');
        if (!adminList) return;

        adminList.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('[data-edit-admin]');
            if (editBtn && !editBtn.disabled) {
                e.preventDefault();
                const adminId = editBtn.dataset.editAdmin;
                await handleEditAdmin(adminId);
            }
        });
    }

    // Function for editing admin
    async function handleEditAdmin(adminId) {
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
    }

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
                                <div style="font-weight: 600; font-size: var(--font-size-base);">${escapeHtml(s.projectName || 'プロジェクト')}</div>
                                <div style="color: var(--color-primary); font-weight: 500;">${escapeHtml(s.stepName || '工程')}</div>
                            </div>
                            <span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: var(--font-size-sm);">
                                ${stageLabels[s.stage]} 提出
                            </span>
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-2);">
                            ${escapeHtml(s.workerName || '作業者')} / ${new Date(s.submitted_at).toLocaleString('ja-JP')}
                        </div>
                        ${s.comment ? `<div style="font-size: var(--font-size-sm); background: white; padding: var(--space-2); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">${escapeHtml(s.comment)}</div>` : ''}
                        ${s.url ? `<div style="margin-bottom: var(--space-3);"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" style="color: var(--color-primary); font-size: var(--font-size-sm);">成果物を確認</a></div>` : ''}
                        <div style="display: flex; gap: var(--space-2);">
                            <button class="btn btn--primary btn--sm" data-approve-submission="${s.id}">承認</button>
                            <button class="btn btn--secondary btn--sm" data-reject-submission="${s.id}">差戻し</button>
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
                        <h2 class="modal__title">承認待ち (${pendingSubmissions.length}件)</h2>
                        <button class="modal__close" data-close-approval-modal>&times;</button>
                    </div>
                    <div class="modal__body">${modalHtml}</div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Setup event delegation for approval modal
            overlay.addEventListener('click', async (e) => {
                // Close button
                if (e.target.closest('[data-close-approval-modal]')) {
                    overlay.remove();
                    return;
                }

                // Approve button
                const approveBtn = e.target.closest('[data-approve-submission]');
                if (approveBtn) {
                    e.preventDefault();
                    const submissionId = approveBtn.dataset.approveSubmission;
                    await handleApproveSubmission(submissionId);
                    return;
                }

                // Reject button
                const rejectBtn = e.target.closest('[data-reject-submission]');
                if (rejectBtn) {
                    e.preventDefault();
                    const submissionId = rejectBtn.dataset.rejectSubmission;
                    handleRejectSubmission(submissionId);
                    return;
                }

                // Close on overlay click
                if (e.target === overlay) {
                    overlay.remove();
                }
            });

        } catch (e) {
            console.error('Error opening approval modal:', e);
            showToast('承認待ちの取得に失敗しました');
        }
    }

    // Approval functions
    async function handleApproveSubmission(submissionId) {
        try {
            await DataManager.approveSubmission(submissionId, window.adminSession?.id);
            showToast('承認しました');
            // Refresh the modal
            document.getElementById('approval-modal-overlay')?.remove();
            openApprovalModal();
        } catch (e) {
            showToast('承認に失敗しました');
        }
    }

    function handleRejectSubmission(submissionId) {
        // Create rejection modal
        const existing = document.getElementById('rejection-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'rejection-modal-overlay';
        overlay.className = 'modal-overlay active';
        overlay.style.zIndex = '10001';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal__header">
                    <h2 class="modal__title">差し戻し理由</h2>
                    <button class="modal__close" data-close-rejection>&times;</button>
                </div>
                <div class="modal__body">
                    <div class="input-group">
                        <label for="rejection-comment">理由（作業者に通知されます）</label>
                        <textarea id="rejection-comment" class="input" rows="3" placeholder="修正点や指摘事項を入力してください"></textarea>
                    </div>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--ghost" data-close-rejection>キャンセル</button>
                    <button class="btn btn--danger" data-confirm-rejection>差し戻す</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event delegation for rejection modal
        overlay.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-rejection]') || e.target === overlay) {
                overlay.remove();
                return;
            }

            if (e.target.closest('[data-confirm-rejection]')) {
                const comment = document.getElementById('rejection-comment').value.trim();
                try {
                    await DataManager.rejectSubmission(submissionId, comment);
                    showToast('差し戻しました');
                    overlay.remove();
                    document.getElementById('approval-modal-overlay')?.remove();
                    openApprovalModal();
                } catch (err) {
                    showToast('差し戻しに失敗しました');
                }
            }
        });
    }

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
                    const isPending = !w.passwordSet && w.inviteToken;
                    const statusBadge = isPending
                        ? '<span style="font-size: var(--font-size-xs); background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: var(--radius-full); margin-left: var(--space-2);">招待中</span>'
                        : '<span style="font-size: var(--font-size-xs); background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: var(--radius-full); margin-left: var(--space-2);">登録済</span>';

                    const resendBtn = isPending
                        ? `<button class="btn btn--ghost btn--sm" data-resend-worker-invite="${w.id}" style="color: var(--color-primary);">再送信</button>`
                        : '';

                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                            <div>
                                <div style="font-weight: 500;">${escapeHtml(w.name)}${statusBadge}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(w.email)}</div>
                            </div>
                            <div style="display: flex; gap: var(--space-2); align-items: center;">
                                ${resendBtn}
                                <span style="font-size: var(--font-size-sm); color: ${w.isActive ? 'var(--color-success)' : 'var(--color-text-muted)'};">
                                    ${w.isActive ? '有効' : '無効'}
                                </span>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `
                <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <h4 style="margin-bottom: var(--space-3);">新規作業者を招待</h4>
                    <input type="text" id="new-worker-name" class="input" placeholder="名前" style="margin-bottom: var(--space-2);">
                    <input type="email" id="new-worker-email" class="input" placeholder="メールアドレス" style="margin-bottom: var(--space-3);">
                    <div id="worker-invite-error" style="color: #ef4444; font-size: var(--font-size-sm); margin-bottom: var(--space-2); display: none;"></div>
                    <div id="worker-invite-success" style="color: var(--color-success); font-size: var(--font-size-sm); margin-bottom: var(--space-2); display: none;"></div>
                    <button class="btn btn--primary" data-add-worker>招待メールを送信</button>
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
                        <button class="modal__close" data-close-worker-modal>&times;</button>
                    </div>
                    <div class="modal__body">${html}</div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Event delegation for worker modal
            overlay.addEventListener('click', async (e) => {
                if (e.target.closest('[data-close-worker-modal]') || e.target === overlay) {
                    overlay.remove();
                    return;
                }

                if (e.target.closest('[data-add-worker]')) {
                    e.preventDefault();
                    await handleAddNewWorker();
                }

                // Handle resend invite
                const resendBtn = e.target.closest('[data-resend-worker-invite]');
                if (resendBtn) {
                    e.preventDefault();
                    const workerId = resendBtn.dataset.resendWorkerInvite;
                    resendBtn.disabled = true;
                    resendBtn.textContent = '送信中...';

                    try {
                        const result = await DataManager.resendWorkerInvite(workerId);

                        // Get base URL for invite link
                        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
                        const inviteUrl = `${baseUrl}/worker-invite.html?token=${result.inviteToken}`;

                        // Send invite email
                        if (window.NotificationService) {
                            await NotificationService.send('workerInvite', result.email, {
                                name: result.name,
                                inviteUrl: inviteUrl
                            });
                        }

                        showToast('招待メールを再送信しました');
                    } catch (err) {
                        console.error('Error resending worker invite:', err);
                        showToast('再送信に失敗しました');
                    } finally {
                        resendBtn.disabled = false;
                        resendBtn.textContent = '再送信';
                    }
                }
            });

        } catch (e) {
            console.error('Error opening worker management:', e);
            showToast('作業者一覧の取得に失敗しました');
        }
    }

    // Function to invite new worker
    async function handleAddNewWorker() {
        const name = document.getElementById('new-worker-name').value.trim();
        const email = document.getElementById('new-worker-email').value.trim();
        const errorEl = document.getElementById('worker-invite-error');
        const successEl = document.getElementById('worker-invite-success');

        // Hide previous messages
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        if (!name || !email) {
            errorEl.textContent = '名前とメールアドレスを入力してください';
            errorEl.style.display = 'block';
            return;
        }

        // Basic email validation
        if (!email.includes('@') || !email.includes('.')) {
            errorEl.textContent = '有効なメールアドレスを入力してください';
            errorEl.style.display = 'block';
            return;
        }

        const btn = document.querySelector('[data-add-worker]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '送信中...';

        try {
            // Create worker with invite token
            const result = await DataManager.inviteWorker({ email, name });

            // Get base URL for invite link
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            const inviteUrl = `${baseUrl}/worker-invite.html?token=${result.inviteToken}`;

            // Send invite email
            if (window.NotificationService) {
                await NotificationService.send('workerInvite', email, {
                    name: name,
                    inviteUrl: inviteUrl
                });
            }

            // Clear form
            document.getElementById('new-worker-name').value = '';
            document.getElementById('new-worker-email').value = '';

            successEl.textContent = '招待メールを送信しました';
            successEl.style.display = 'block';

            showToast('招待メールを送信しました');

            // Refresh worker list
            document.getElementById('worker-modal-overlay').remove();
            openWorkerManagement();
        } catch (e) {
            console.error('Error inviting worker:', e);
            const errorMsg = e.message || String(e);
            if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('23505')) {
                errorEl.textContent = 'このメールアドレスは既に使用されています';
            } else {
                errorEl.textContent = 'エラーが発生しました: ' + errorMsg;
            }
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // ==================== CLIENT USER MANAGEMENT ====================

    let currentClientUsersClientId = null;
    let clientUsersModalEventsInitialized = false;

    function openClientUsersModal(clientId, clientName) {
        currentClientUsersClientId = clientId;
        document.getElementById('client-users-modal-name').textContent = clientName;
        document.getElementById('client-users-modal').classList.add('active');
        renderClientUsersList();
        setupClientUsersModalEvents();
    }

    function closeClientUsersModal() {
        document.getElementById('client-users-modal').classList.remove('active');
        currentClientUsersClientId = null;
    }

    function setupClientUsersModalEvents() {
        if (clientUsersModalEventsInitialized) return;
        clientUsersModalEventsInitialized = true;

        const modal = document.getElementById('client-users-modal');
        if (!modal) return;

        // Close button handler
        const closeBtn = document.getElementById('client-users-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeClientUsersModal());
        }

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeClientUsersModal();
            }
        });

        modal.addEventListener('click', async (e) => {
            // Handle delete button
            const deleteBtn = e.target.closest('[data-delete-client-user]');
            if (deleteBtn) {
                e.preventDefault();
                const userId = deleteBtn.dataset.deleteClientUser;
                if (confirm('このユーザーを削除しますか？')) {
                    try {
                        await DataManager.deleteClientUser(userId);
                        showToast('ユーザーを削除しました');
                        await renderClientUsersList();
                    } catch (err) {
                        console.error('Error deleting client user:', err);
                        showToast('削除に失敗しました');
                    }
                }
                return;
            }

            // Handle add button
            if (e.target.closest('[data-add-client-user]')) {
                e.preventDefault();
                await handleAddClientUser();
            }

            // Handle resend invite
            const resendBtn = e.target.closest('[data-resend-invite]');
            if (resendBtn) {
                e.preventDefault();
                const userId = resendBtn.dataset.resendInvite;
                resendBtn.disabled = true;
                resendBtn.textContent = '送信中...';

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

                    showToast('招待メールを再送信しました');
                } catch (err) {
                    console.error('Error resending invite:', err);
                    showToast('再送信に失敗しました');
                } finally {
                    resendBtn.disabled = false;
                    resendBtn.textContent = '再送信';
                }
            }
        });
    }

    async function renderClientUsersList() {
        const listEl = document.getElementById('client-users-list');
        if (!currentClientUsersClientId) return;

        const users = await DataManager.getClientUsers(currentClientUsersClientId);

        if (users.length === 0) {
            listEl.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">ユーザーが登録されていません</p>';
            return;
        }

        listEl.innerHTML = users.map(u => {
            const isPending = !u.password_set && u.invite_token;
            const statusBadge = isPending
                ? '<span style="font-size: var(--font-size-xs); background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: var(--radius-full); margin-left: var(--space-2);">招待中</span>'
                : '<span style="font-size: var(--font-size-xs); background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: var(--radius-full); margin-left: var(--space-2);">登録済</span>';

            const resendBtn = isPending
                ? `<button class="btn btn--ghost btn--sm" data-resend-invite="${u.id}" style="color: var(--color-primary);">再送信</button>`
                : '';

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border);">
                <div>
                    <div style="font-weight: 500;">${escapeHtml(u.name)}${statusBadge}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(u.email)}</div>
                </div>
                <div style="display: flex; gap: var(--space-2);">
                    ${resendBtn}
                    <button class="btn btn--ghost btn--sm" data-delete-client-user="${u.id}" style="color: #ef4444;">削除</button>
                </div>
            </div>
        `;
        }).join('');
    }

    async function handleAddClientUser() {
        const name = document.getElementById('new-client-user-name').value.trim();
        const email = document.getElementById('new-client-user-email').value.trim();
        const errorEl = document.getElementById('client-user-error');
        const successEl = document.getElementById('client-user-success');

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

        const btn = document.querySelector('[data-add-client-user]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '送信中...';

        try {
            // Create user with invite token
            const result = await DataManager.inviteClientUser({
                clientId: currentClientUsersClientId,
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

            // Clear form
            document.getElementById('new-client-user-name').value = '';
            document.getElementById('new-client-user-email').value = '';

            successEl.textContent = '招待メールを送信しました';
            successEl.style.display = 'block';

            showToast('招待メールを送信しました');
            await renderClientUsersList();
        } catch (e) {
            console.error('Error inviting client user:', e);
            // Check if it's a duplicate email error
            const errorMsg = e.message || String(e);
            if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('23505')) {
                errorEl.textContent = 'このメールアドレスは既に使用されています';
            } else {
                errorEl.textContent = 'エラーが発生しました: ' + errorMsg;
            }
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // ==================== ADMIN DASHBOARD ====================

    async function initDashboard() {
        // Initialize director header
        initDirectorHeader();

        // Fetch all data needed for dashboard
        const projects = await DataManager.getAllProjects();
        const submissions = await DataManager.getPendingSubmissions();

        // Calculate stats
        const activeProjects = projects.filter(p => {
            const progress = DataManager.calculateProgress(p.steps || []);
            return progress > 0 && progress < 100;
        });

        // Find overdue tasks
        const now = new Date();
        const overdueTasks = [];
        const upcomingDeadlines = [];
        let completedToday = 0;
        let totalCompleted = 0;
        let totalInProgress = 0;
        let totalPending = 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        for (const project of projects) {
            const steps = project.steps || [];
            for (const step of steps) {
                // Count step statuses
                if (step.status === 'completed') {
                    totalCompleted++;
                    // Check if completed today
                    if (step.completedAt) {
                        const completedDate = new Date(step.completedAt);
                        if (completedDate >= todayStart) {
                            completedToday++;
                        }
                    }
                } else if (step.status === 'current') {
                    totalInProgress++;
                } else {
                    totalPending++;
                }

                // Check for overdue and upcoming deadlines
                if (step.dueDate && step.status !== 'completed') {
                    const dueDate = new Date(step.dueDate);
                    if (dueDate < now) {
                        overdueTasks.push({
                            projectId: project.id,
                            projectName: project.name,
                            clientName: project.client,
                            stepName: step.name,
                            dueDate: step.dueDate,
                            daysOverdue: Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
                        });
                    } else {
                        // Upcoming deadline (within next 7 days)
                        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                        if (daysUntil <= 7) {
                            upcomingDeadlines.push({
                                projectId: project.id,
                                projectName: project.name,
                                stepName: step.name,
                                dueDate: step.dueDate,
                                daysUntil: daysUntil
                            });
                        }
                    }
                }
            }
        }

        // Sort upcoming deadlines by due date
        upcomingDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Update stat cards
        document.querySelector('#stat-pending-approvals .director-stat__value').textContent = submissions.length;
        document.querySelector('#stat-overdue-tasks .director-stat__value').textContent = overdueTasks.length;
        document.querySelector('#stat-completed-today .director-stat__value').textContent = completedToday;
        document.querySelector('#stat-active-projects .director-stat__value').textContent = activeProjects.length;

        // Update overall progress bar
        const totalSteps = totalCompleted + totalInProgress + totalPending;
        if (totalSteps > 0) {
            const completedPercent = (totalCompleted / totalSteps) * 100;
            const inProgressPercent = (totalInProgress / totalSteps) * 100;
            const pendingPercent = (totalPending / totalSteps) * 100;

            const progressBar = document.getElementById('overall-progress-bar');
            if (progressBar) {
                progressBar.innerHTML = `
                    <div class="progress-bar-large__segment progress-bar-large__segment--completed" style="width: ${completedPercent}%">${completedPercent >= 10 ? Math.round(completedPercent) + '%' : ''}</div>
                    <div class="progress-bar-large__segment progress-bar-large__segment--in-progress" style="width: ${inProgressPercent}%">${inProgressPercent >= 10 ? Math.round(inProgressPercent) + '%' : ''}</div>
                    <div class="progress-bar-large__segment progress-bar-large__segment--pending" style="width: ${pendingPercent}%">${pendingPercent >= 10 ? Math.round(pendingPercent) + '%' : ''}</div>
                `;
            }

            // Update legend
            document.getElementById('legend-completed').textContent = totalCompleted;
            document.getElementById('legend-in-progress').textContent = totalInProgress;
            document.getElementById('legend-pending').textContent = totalPending;
        }

        // Render pending approvals list
        const pendingList = document.getElementById('dashboard-pending-list');
        if (submissions.length === 0) {
            pendingList.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🎉</div><div>承認待ちはありません</div></div>';
        } else {
            pendingList.innerHTML = submissions.slice(0, 5).map(sub => `
                <div class="task-item" data-project-id="${sub.projectId}">
                    <div class="task-item__priority task-item__priority--medium"></div>
                    <div class="task-item__content">
                        <div class="task-item__title">${escapeHtml(sub.projectName || 'プロジェクト')} - ${escapeHtml(sub.stepName || '工程')}</div>
                        <div class="task-item__meta">
                            <span>👤 ${escapeHtml(sub.workerName || '作業者')}</span>
                            <span>📅 ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ja-JP') : '-'}</span>
                        </div>
                    </div>
                    <span class="task-item__badge task-item__badge--warning">承認待ち</span>
                </div>
            `).join('');
        }

        // Render overdue tasks list
        const overdueList = document.getElementById('dashboard-overdue-list');
        if (overdueTasks.length === 0) {
            overdueList.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🎉</div><div>遅延タスクはありません</div></div>';
        } else {
            overdueList.innerHTML = overdueTasks.slice(0, 5).map(task => `
                <div class="task-item" data-project-id="${task.projectId}">
                    <div class="task-item__priority task-item__priority--high"></div>
                    <div class="task-item__content">
                        <div class="task-item__title">${escapeHtml(task.projectName)} - ${escapeHtml(task.stepName)}</div>
                        <div class="task-item__meta">
                            <span>🏢 ${escapeHtml(task.clientName || '-')}</span>
                            <span>📅 期日: ${new Date(task.dueDate).toLocaleDateString('ja-JP')}</span>
                        </div>
                    </div>
                    <span class="task-item__badge task-item__badge--danger">${task.daysOverdue}日遅延</span>
                </div>
            `).join('');
        }

        // Render upcoming deadlines
        const deadlinesList = document.getElementById('dashboard-deadlines-list');
        if (upcomingDeadlines.length === 0) {
            deadlinesList.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📅</div><div>今後7日間の締切はありません</div></div>';
        } else {
            deadlinesList.innerHTML = upcomingDeadlines.slice(0, 5).map(task => {
                const priorityClass = task.daysUntil <= 1 ? 'high' : task.daysUntil <= 3 ? 'medium' : 'low';
                const badgeClass = task.daysUntil <= 1 ? 'danger' : task.daysUntil <= 3 ? 'warning' : 'success';
                const daysLabel = task.daysUntil === 0 ? '今日' : task.daysUntil === 1 ? '明日' : `${task.daysUntil}日後`;
                return `
                    <div class="task-item" data-project-id="${task.projectId}">
                        <div class="task-item__priority task-item__priority--${priorityClass}"></div>
                        <div class="task-item__content">
                            <div class="task-item__title">${escapeHtml(task.projectName)} - ${escapeHtml(task.stepName)}</div>
                            <div class="task-item__meta">
                                <span>📅 ${new Date(task.dueDate).toLocaleDateString('ja-JP')}</span>
                            </div>
                        </div>
                        <span class="task-item__badge task-item__badge--${badgeClass}">${daysLabel}</span>
                    </div>
                `;
            }).join('');
        }

        // Render recent activity
        const activityList = document.getElementById('dashboard-activity-list');
        // Create mock activity for now (in production, this would come from an activity log)
        const recentActivity = [];
        for (const project of projects) {
            if (project.updatedAt || project.updated_at) {
                const updatedAt = new Date(project.updatedAt || project.updated_at);
                const hoursAgo = Math.floor((now - updatedAt) / (1000 * 60 * 60));
                if (hoursAgo < 48) {
                    recentActivity.push({
                        type: 'update',
                        projectName: project.name,
                        projectId: project.id,
                        time: updatedAt,
                        hoursAgo: hoursAgo
                    });
                }
            }
        }
        recentActivity.sort((a, b) => b.time - a.time);

        if (recentActivity.length === 0) {
            activityList.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🔔</div><div>最近のアクティビティはありません</div></div>';
        } else {
            activityList.innerHTML = recentActivity.slice(0, 5).map(activity => {
                const timeLabel = activity.hoursAgo === 0 ? '今' : activity.hoursAgo < 24 ? `${activity.hoursAgo}時間前` : `${Math.floor(activity.hoursAgo / 24)}日前`;
                return `
                    <div class="task-item" data-project-id="${activity.projectId}">
                        <div class="task-item__priority task-item__priority--low"></div>
                        <div class="task-item__content">
                            <div class="task-item__title">${escapeHtml(activity.projectName)}が更新されました</div>
                            <div class="task-item__meta">
                                <span>${timeLabel}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Setup quick action handlers (using event delegation for faster response)
        setupQuickActions();
    }

    function initDirectorHeader() {
        // Set director name and role
        if (window.adminSession) {
            const name = window.adminSession.name || window.adminSession.email;
            document.getElementById('director-name').textContent = name;

            const roleLabels = {
                master: 'マスター管理者',
                admin: '管理者',
                director: 'ディレクター'
            };
            document.getElementById('director-role').textContent = roleLabels[window.adminSession.role] || 'プロジェクト管理者';

            // Set avatar initial
            const initial = name.charAt(0).toUpperCase();
            document.getElementById('director-avatar').textContent = initial;
        }

        // Set current date
        const now = new Date();
        const dateEl = document.getElementById('current-date');
        const weekdayEl = document.getElementById('current-weekday');

        if (dateEl) {
            dateEl.textContent = `${now.getMonth() + 1}/${now.getDate()}`;
        }

        if (weekdayEl) {
            const weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
            weekdayEl.textContent = weekdays[now.getDay()];
        }
    }

    // Track if quick actions are already set up
    let quickActionsInitialized = false;

    function setupQuickActions() {
        // Prevent duplicate event listeners
        if (quickActionsInitialized) return;
        quickActionsInitialized = true;

        // Use event delegation on dashboard for better performance
        const dashboard = document.getElementById('admin-dashboard');
        if (!dashboard) return;

        dashboard.addEventListener('click', (e) => {
            // Handle task-item clicks (pending, overdue, deadlines, activity lists)
            const taskItem = e.target.closest('.task-item[data-project-id]');
            if (taskItem) {
                e.preventDefault();
                const projectId = taskItem.dataset.projectId;
                if (projectId) {
                    selectProject(projectId);
                }
                return;
            }

            const target = e.target.closest('[id]');
            if (!target) return;

            switch (target.id) {
                case 'quick-new-project':
                    e.preventDefault();
                    if (window.adminSession?.role !== 'director') {
                        document.getElementById('new-project-btn')?.click();
                    } else {
                        showToast('ディレクターはプロジェクト作成権限がありません');
                    }
                    break;

                case 'quick-approval':
                case 'view-all-approvals':
                    e.preventDefault();
                    openApprovalModal();
                    break;

                case 'quick-workers':
                    e.preventDefault();
                    if (window.adminSession?.role === 'master' || window.adminSession?.role === 'admin') {
                        openWorkerManagement();
                    } else {
                        showToast('作業者管理は管理者のみ利用可能です');
                    }
                    break;

                case 'quick-reports':
                    e.preventDefault();
                    showReportsModal();
                    break;

                case 'view-all-overdue':
                    e.preventDefault();
                    showToast('遅延タスク一覧を表示');
                    break;

                case 'stat-pending-approvals':
                    e.preventDefault();
                    openApprovalModal();
                    break;
            }
        });
    }

    function showReportsModal() {
        // Create reports modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'reports-modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 700px;">
                <div class="modal__header">
                    <h2 class="modal__title">レポート</h2>
                    <button class="modal__close" data-close-reports>&times;</button>
                </div>
                <div class="modal__body" style="max-height: 500px; overflow-y: auto;">
                    <div id="reports-content">
                        <p style="text-align: center; color: var(--color-text-muted);">レポートを読み込み中...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Event delegation for reports modal
        overlay.addEventListener('click', (e) => {
            if (e.target.closest('[data-close-reports]') || e.target === overlay) {
                overlay.remove();
            }
        });

        // Generate report
        generateReport();
    }

    async function generateReport() {
        const contentEl = document.getElementById('reports-content');
        if (!contentEl) return;

        const projects = await DataManager.getAllProjects();

        let totalSteps = 0;
        let completedSteps = 0;
        let inProgressSteps = 0;
        const projectStats = [];

        for (const project of projects) {
            const steps = project.steps || [];
            const completed = steps.filter(s => s.status === 'completed').length;
            const inProgress = steps.filter(s => s.status === 'current').length;
            const pending = steps.filter(s => s.status !== 'completed' && s.status !== 'current').length;

            totalSteps += steps.length;
            completedSteps += completed;
            inProgressSteps += inProgress;

            const progress = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

            projectStats.push({
                name: project.name,
                client: project.client,
                total: steps.length,
                completed,
                inProgress,
                pending,
                progress
            });
        }

        projectStats.sort((a, b) => b.progress - a.progress);

        contentEl.innerHTML = `
            <div style="margin-bottom: var(--space-6);">
                <h3 style="margin-bottom: var(--space-4);">全体サマリー</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4);">
                    <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-success);">${completedSteps}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">完了タスク</div>
                    </div>
                    <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-primary);">${inProgressSteps}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">進行中タスク</div>
                    </div>
                    <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text);">${projects.length}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">総プロジェクト</div>
                    </div>
                </div>
            </div>

            <div>
                <h3 style="margin-bottom: var(--space-4);">プロジェクト別進捗</h3>
                ${projectStats.map(p => `
                    <div style="margin-bottom: var(--space-3); padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
                            <div>
                                <div style="font-weight: 500;">${escapeHtml(p.name)}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(p.client)}</div>
                            </div>
                            <div style="font-weight: 600; color: ${p.progress === 100 ? 'var(--color-success)' : 'var(--color-text)'};">${p.progress}%</div>
                        </div>
                        <div style="height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${p.progress}%; background: ${p.progress === 100 ? 'var(--color-success)' : 'var(--color-primary)'}; transition: width 0.3s;"></div>
                        </div>
                        <div style="display: flex; gap: var(--space-4); margin-top: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted);">
                            <span>完了: ${p.completed}</span>
                            <span>進行中: ${p.inProgress}</span>
                            <span>未着手: ${p.pending}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // XSS Protection helper
    function escapeHtml(str) {
        if (!str) return '';
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return String(str).replace(/[&<>"'/]/g, char => escapeMap[char]);
    }

    function showDashboard() {
        adminDashboard.style.display = 'block';
        projectEditor.style.display = 'none';
        currentProjectId = null;

        // Deselect all projects in list
        document.querySelectorAll('.project-list__item').forEach(item => {
            item.classList.remove('active');
        });

        // Refresh dashboard data
        initDashboard();
    }

    // ==================== EMAIL SETTINGS ====================

    // Default email templates
    const defaultEmailTemplates = {
        taskAssigned: {
            subject: '【SOUZOUD】新しいタスクが割り当てられました',
            body: `{name}様、

新しいタスクが割り当てられました。

【プロジェクト】{projectName}
【工程】{stepName}
【期限】{dueDate}
【備考】{notes}

詳細を確認し、作業を開始してください。`
        },
        submissionReceived: {
            subject: '【SOUZOUD】新しい提出物があります',
            body: `{name}様、

作業者から成果物が提出されました。

【作業者】{workerName}
【プロジェクト】{projectName}
【工程】{stepName}
【コメント】{comment}

内容を確認し、承認または差し戻しを行ってください。`
        },
        submissionApproved: {
            subject: '【SOUZOUD】提出物が承認されました',
            body: `{name}様、

おめでとうございます！提出物が承認されました。

【プロジェクト】{projectName}
【工程】{stepName}

素晴らしい仕事をありがとうございます。`
        },
        submissionRejected: {
            subject: '【SOUZOUD】提出物に修正が必要です',
            body: `{name}様、

提出物を確認しましたが、修正が必要です。

【プロジェクト】{projectName}
【工程】{stepName}
【フィードバック】{comment}

内容を確認し、再提出をお願いします。`
        },
        progressUpdate: {
            subject: '【SOUZOUD】プロジェクトの進捗更新',
            body: `{name}様、

プロジェクトの進捗をお知らせします。

【プロジェクト】{projectName}
【完了した工程】{stepName}
【全体進捗】{progress}%

詳細はダッシュボードでご確認ください。`
        },
        welcomeUser: {
            subject: '【SOUZOUD】アカウントが作成されました',
            body: `{name}様、

SOUZOUDへようこそ！
アカウントが作成されました。

【メールアドレス】{email}
【役割】{role}

以下のリンクからログインしてください。`
        }
    };

    // Load saved settings or use defaults
    function loadEmailSettings() {
        const savedSettings = localStorage.getItem('email_settings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return {
            enabled: true,
            notifications: {
                taskAssigned: true,
                submission: true,
                approved: true,
                rejected: true,
                progress: true,
                welcome: true
            },
            templates: { ...defaultEmailTemplates }
        };
    }

    function saveEmailSettings(settings) {
        localStorage.setItem('email_settings', JSON.stringify(settings));
        // Also update NotificationService if available
        if (typeof NotificationService !== 'undefined') {
            NotificationService.enabled = settings.enabled;
        }
    }

    // Setup email settings tab
    function initEmailSettings() {
        const tabs = document.querySelectorAll('.settings-tab');
        const tabContents = {
            admins: document.getElementById('tab-admins'),
            email: document.getElementById('tab-email')
        };

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show/hide content
                Object.keys(tabContents).forEach(key => {
                    if (tabContents[key]) {
                        tabContents[key].style.display = key === tabName ? 'block' : 'none';
                    }
                });

                // Update footer buttons
                const addAdminBtn = document.getElementById('add-admin-btn');
                if (addAdminBtn) {
                    addAdminBtn.style.display = tabName === 'admins' ? 'inline-flex' : 'none';
                }

                // Load email settings when switching to email tab
                if (tabName === 'email') {
                    loadEmailSettingsUI();
                }
            });
        });

        // Email settings event handlers
        document.getElementById('email-template-select')?.addEventListener('change', (e) => {
            loadTemplateToEditor(e.target.value);
        });

        document.getElementById('save-email-template')?.addEventListener('click', saveEmailTemplate);
        document.getElementById('reset-email-template')?.addEventListener('click', resetEmailTemplate);

        // Checkbox change handlers for notification types
        const notifyCheckboxes = [
            'email-enabled',
            'notify-task-assigned',
            'notify-submission',
            'notify-approved',
            'notify-rejected',
            'notify-progress',
            'notify-welcome'
        ];

        notifyCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                saveNotificationSettings();
            });
        });
    }

    function loadEmailSettingsUI() {
        const settings = loadEmailSettings();

        // Load enabled state
        document.getElementById('email-enabled').checked = settings.enabled;

        // Load notification toggles
        document.getElementById('notify-task-assigned').checked = settings.notifications.taskAssigned;
        document.getElementById('notify-submission').checked = settings.notifications.submission;
        document.getElementById('notify-approved').checked = settings.notifications.approved;
        document.getElementById('notify-rejected').checked = settings.notifications.rejected;
        document.getElementById('notify-progress').checked = settings.notifications.progress;
        document.getElementById('notify-welcome').checked = settings.notifications.welcome;

        // Load first template
        loadTemplateToEditor('taskAssigned');
    }

    function loadTemplateToEditor(templateType) {
        const settings = loadEmailSettings();
        const template = settings.templates[templateType] || defaultEmailTemplates[templateType];

        if (template) {
            document.getElementById('email-template-subject').value = template.subject;
            document.getElementById('email-template-body').value = template.body;
        }
    }

    function saveNotificationSettings() {
        const settings = loadEmailSettings();

        settings.enabled = document.getElementById('email-enabled').checked;
        settings.notifications = {
            taskAssigned: document.getElementById('notify-task-assigned').checked,
            submission: document.getElementById('notify-submission').checked,
            approved: document.getElementById('notify-approved').checked,
            rejected: document.getElementById('notify-rejected').checked,
            progress: document.getElementById('notify-progress').checked,
            welcome: document.getElementById('notify-welcome').checked
        };

        saveEmailSettings(settings);
        showToast('設定を保存しました');
    }

    function saveEmailTemplate() {
        const templateType = document.getElementById('email-template-select').value;
        const subject = document.getElementById('email-template-subject').value.trim();
        const body = document.getElementById('email-template-body').value.trim();

        if (!subject || !body) {
            showToast('件名と本文を入力してください');
            return;
        }

        const settings = loadEmailSettings();
        settings.templates[templateType] = { subject, body };
        saveEmailSettings(settings);

        showToast('テンプレートを保存しました');
    }

    function resetEmailTemplate() {
        const templateType = document.getElementById('email-template-select').value;
        const defaultTemplate = defaultEmailTemplates[templateType];

        if (defaultTemplate) {
            document.getElementById('email-template-subject').value = defaultTemplate.subject;
            document.getElementById('email-template-body').value = defaultTemplate.body;

            // Also save to settings
            const settings = loadEmailSettings();
            settings.templates[templateType] = { ...defaultTemplate };
            saveEmailSettings(settings);

            showToast('デフォルトに戻しました');
        }
    }

    // Initialize email settings
    initEmailSettings();

    // ==================== TEMPLATE MANAGEMENT ====================

    const templateManageModal = document.getElementById('template-modal-manage');
    const templateEditModal = document.getElementById('template-edit-modal');
    let currentEditTemplateId = null;
    let currentTemplateSteps = [];

    // Template management modal events
    document.getElementById('template-manage-close')?.addEventListener('click', closeTemplateManagement);
    document.getElementById('template-manage-cancel')?.addEventListener('click', closeTemplateManagement);
    document.getElementById('add-template-btn')?.addEventListener('click', openAddTemplateModal);

    // Template edit modal events
    document.getElementById('template-edit-close')?.addEventListener('click', closeTemplateEditModal);
    document.getElementById('template-edit-cancel')?.addEventListener('click', closeTemplateEditModal);
    document.getElementById('template-edit-save')?.addEventListener('click', saveTemplateEdit);
    document.getElementById('template-delete-btn')?.addEventListener('click', deleteTemplate);
    document.getElementById('add-template-step-btn')?.addEventListener('click', addTemplateStep);

    // Close on overlay click
    [templateManageModal, templateEditModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });

    function openTemplateManagement() {
        renderTemplateList();
        templateManageModal.classList.add('active');
    }

    function closeTemplateManagement() {
        templateManageModal.classList.remove('active');
    }

    function renderTemplateList() {
        const templateList = document.getElementById('template-list');
        const templates = DataManager.getAllTemplates();

        if (templates.length === 0) {
            templateList.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: var(--space-4);">テンプレートがありません</p>';
            return;
        }

        templateList.innerHTML = templates.map(template => {
            const isDefault = !template.id.startsWith('custom_');
            const stepsPreview = template.steps.slice(0, 3).map(s => s.name).join(' → ');
            const moreSteps = template.steps.length > 3 ? ` ... 他${template.steps.length - 3}工程` : '';

            return `
                <div class="template-item">
                    <div class="template-item__info">
                        <div class="template-item__name">
                            ${escapeHtml(template.name)}
                            ${isDefault ? '<span class="template-item__badge">デフォルト</span>' : ''}
                        </div>
                        <div class="template-item__steps">${escapeHtml(stepsPreview)}${moreSteps}</div>
                    </div>
                    <div>
                        <button class="btn btn--secondary btn--sm" data-view-template="${template.id}">詳細</button>
                        ${!isDefault ? `<button class="btn btn--ghost btn--sm" data-edit-template="${template.id}">編集</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Setup event delegation
        setupTemplateListEvents();
    }

    let templateListEventsInitialized = false;

    function setupTemplateListEvents() {
        if (templateListEventsInitialized) return;
        templateListEventsInitialized = true;

        const templateList = document.getElementById('template-list');
        if (!templateList) return;

        templateList.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('[data-view-template]');
            if (viewBtn) {
                e.preventDefault();
                const templateId = viewBtn.dataset.viewTemplate;
                openViewTemplateModal(templateId);
                return;
            }

            const editBtn = e.target.closest('[data-edit-template]');
            if (editBtn) {
                e.preventDefault();
                const templateId = editBtn.dataset.editTemplate;
                openEditTemplateModal(templateId);
            }
        });
    }

    function openAddTemplateModal() {
        currentEditTemplateId = null;
        currentTemplateSteps = [{ name: '' }];

        document.getElementById('template-edit-title').textContent = '新規テンプレート';
        document.getElementById('template-edit-name').value = '';
        document.getElementById('template-delete-btn').style.display = 'none';

        renderTemplateStepsEditor();
        templateEditModal.classList.add('active');
        document.getElementById('template-edit-name').focus();
    }

    function openViewTemplateModal(templateId) {
        const template = DataManager.getTemplate(templateId);
        if (!template) return;

        currentEditTemplateId = templateId;
        currentTemplateSteps = template.steps.map(s => ({ name: s.name, description: s.description || '' }));

        const isDefault = !templateId.startsWith('custom_');

        document.getElementById('template-edit-title').textContent = isDefault ? 'テンプレート詳細（読み取り専用）' : 'テンプレートを編集';
        document.getElementById('template-edit-name').value = template.name;
        document.getElementById('template-edit-name').readOnly = isDefault;
        document.getElementById('template-delete-btn').style.display = isDefault ? 'none' : 'inline-flex';
        document.getElementById('template-edit-save').style.display = isDefault ? 'none' : 'inline-flex';
        document.getElementById('add-template-step-btn').style.display = isDefault ? 'none' : 'inline-flex';

        renderTemplateStepsEditor(isDefault);
        templateEditModal.classList.add('active');
    }

    function openEditTemplateModal(templateId) {
        const template = DataManager.getTemplate(templateId);
        if (!template) return;

        currentEditTemplateId = templateId;
        currentTemplateSteps = template.steps.map(s => ({ name: s.name, description: s.description || '' }));

        document.getElementById('template-edit-title').textContent = 'テンプレートを編集';
        document.getElementById('template-edit-name').value = template.name;
        document.getElementById('template-edit-name').readOnly = false;
        document.getElementById('template-delete-btn').style.display = 'inline-flex';
        document.getElementById('template-edit-save').style.display = 'inline-flex';
        document.getElementById('add-template-step-btn').style.display = 'inline-flex';

        renderTemplateStepsEditor();
        templateEditModal.classList.add('active');
    }

    function closeTemplateEditModal() {
        templateEditModal.classList.remove('active');
        currentEditTemplateId = null;
        currentTemplateSteps = [];
    }

    function renderTemplateStepsEditor(readOnly = false) {
        const container = document.getElementById('template-steps-list');

        container.innerHTML = currentTemplateSteps.map((step, index) => `
            <div class="template-step-row" data-index="${index}">
                <span style="color: var(--color-text-muted); font-size: var(--font-size-sm); min-width: 24px;">${index + 1}.</span>
                <input type="text" class="input step-name-input" value="${escapeHtml(step.name)}" placeholder="工程名" ${readOnly ? 'readonly' : ''}>
                ${!readOnly ? `
                    <div class="step-actions">
                        <button class="btn btn--ghost btn--sm step-move-up" ${index === 0 ? 'disabled' : ''} title="上へ">↑</button>
                        <button class="btn btn--ghost btn--sm step-move-down" ${index === currentTemplateSteps.length - 1 ? 'disabled' : ''} title="下へ">↓</button>
                        <button class="btn btn--ghost btn--sm step-delete" title="削除" ${currentTemplateSteps.length <= 1 ? 'disabled' : ''}>✕</button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Setup step events
        if (!readOnly) {
            setupTemplateStepEvents();
        }
    }

    function setupTemplateStepEvents() {
        const container = document.getElementById('template-steps-list');

        container.querySelectorAll('.step-name-input').forEach((input, index) => {
            input.addEventListener('input', (e) => {
                currentTemplateSteps[index].name = e.target.value;
            });
        });

        container.querySelectorAll('.step-move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('.template-step-row');
                const index = parseInt(row.dataset.index);
                if (index > 0) {
                    const temp = currentTemplateSteps[index];
                    currentTemplateSteps[index] = currentTemplateSteps[index - 1];
                    currentTemplateSteps[index - 1] = temp;
                    renderTemplateStepsEditor();
                }
            });
        });

        container.querySelectorAll('.step-move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('.template-step-row');
                const index = parseInt(row.dataset.index);
                if (index < currentTemplateSteps.length - 1) {
                    const temp = currentTemplateSteps[index];
                    currentTemplateSteps[index] = currentTemplateSteps[index + 1];
                    currentTemplateSteps[index + 1] = temp;
                    renderTemplateStepsEditor();
                }
            });
        });

        container.querySelectorAll('.step-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (currentTemplateSteps.length <= 1) return;
                const row = e.target.closest('.template-step-row');
                const index = parseInt(row.dataset.index);
                currentTemplateSteps.splice(index, 1);
                renderTemplateStepsEditor();
            });
        });
    }

    function addTemplateStep() {
        currentTemplateSteps.push({ name: '' });
        renderTemplateStepsEditor();
        // Focus the new input
        const inputs = document.querySelectorAll('#template-steps-list .step-name-input');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }

    function saveTemplateEdit() {
        const name = document.getElementById('template-edit-name').value.trim();

        if (!name) {
            showToast('テンプレート名を入力してください');
            return;
        }

        // Filter out empty steps
        const validSteps = currentTemplateSteps.filter(s => s.name.trim());
        if (validSteps.length === 0) {
            showToast('少なくとも1つの工程を入力してください');
            return;
        }

        if (currentEditTemplateId && currentEditTemplateId.startsWith('custom_')) {
            // Update existing template
            DataManager.updateTemplate(currentEditTemplateId, name, validSteps);
            showToast('テンプレートを更新しました');
        } else {
            // Create new template
            DataManager.saveTemplate(name, validSteps);
            showToast('テンプレートを作成しました');
        }

        closeTemplateEditModal();
        renderTemplateList();
    }

    function deleteTemplate() {
        if (!currentEditTemplateId || !currentEditTemplateId.startsWith('custom_')) {
            showToast('デフォルトテンプレートは削除できません');
            return;
        }

        if (confirm('このテンプレートを削除しますか？')) {
            DataManager.deleteTemplate(currentEditTemplateId);
            showToast('テンプレートを削除しました');
            closeTemplateEditModal();
            renderTemplateList();
        }
    }
});
