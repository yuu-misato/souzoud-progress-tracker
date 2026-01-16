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

            item.querySelector('[data-edit-step]')?.addEventListener('click', () => {
                openEditStepModal(stepId);
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
    async function saveStep() {
        const name = document.getElementById('step-name').value.trim();
        const description = document.getElementById('step-description').value.trim();
        const url = document.getElementById('step-url').value.trim();

        if (!name) {
            showToast('工程名は必須です');
            return;
        }

        if (isNewStep) {
            await DataManager.addStep(currentProjectId, { name, description, url });
            showToast('工程を追加しました');
        } else {
            await DataManager.updateStep(currentProjectId, currentStepId, { name, description, url });
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
});
