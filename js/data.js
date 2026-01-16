/**
 * Data Management Module
 * Handles localStorage operations for project and client data
 */

const DataManager = {
  STORAGE_KEY: 'progress_tracker_projects',
  CLIENTS_KEY: 'progress_tracker_clients',

  // Default steps for new projects (can be customized)
  defaultSteps: [
    { id: 1, name: 'ヒアリング・要件定義', description: '', status: 'pending', completedAt: null },
    { id: 2, name: '企画・コンセプト設計', description: '', status: 'pending', completedAt: null },
    { id: 3, name: 'デザイン制作', description: '', status: 'pending', completedAt: null },
    { id: 4, name: '制作・開発', description: '', status: 'pending', completedAt: null },
    { id: 5, name: 'レビュー・修正', description: '', status: 'pending', completedAt: null },
    { id: 6, name: '最終確認', description: '', status: 'pending', completedAt: null },
    { id: 7, name: '納品完了', description: '', status: 'pending', completedAt: null }
  ],

  /**
   * Generate a unique ID (8 chars for projects, 6 chars for clients)
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a client ID (shorter and prefixed with CL)
   */
  generateClientId() {
    return 'CL' + this.generateId(4);
  },

  // ==================== CLIENT OPERATIONS ====================

  /**
   * Get all clients
   */
  getAllClients() {
    const data = localStorage.getItem(this.CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save all clients
   */
  saveAllClients(clients) {
    localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
  },

  /**
   * Get a single client by ID
   */
  getClient(clientId) {
    const clients = this.getAllClients();
    return clients.find(c => c.id === clientId) || null;
  },

  /**
   * Create a new client
   */
  createClient(clientData) {
    const clients = this.getAllClients();

    const newClient = {
      id: this.generateClientId(),
      name: clientData.name,
      createdAt: new Date().toISOString()
    };

    clients.push(newClient);
    this.saveAllClients(clients);

    return newClient;
  },

  /**
   * Get or create client by name
   */
  getOrCreateClient(clientName) {
    const clients = this.getAllClients();
    let client = clients.find(c => c.name === clientName);

    if (!client) {
      client = this.createClient({ name: clientName });
    }

    return client;
  },

  /**
   * Get all projects for a client
   */
  getProjectsByClientId(clientId) {
    const projects = this.getAllProjects();
    return projects.filter(p => p.clientId === clientId);
  },

  // ==================== PROJECT OPERATIONS ====================

  /**
   * Get all projects
   */
  getAllProjects() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save all projects
   */
  saveAllProjects(projects) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
  },

  /**
   * Get a single project by ID
   */
  getProject(projectId) {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  },

  /**
   * Create a new project
   */
  createProject(projectData) {
    const projects = this.getAllProjects();

    // Get or create client
    const client = this.getOrCreateClient(projectData.client);

    // Use custom steps if provided, otherwise use defaults
    const steps = projectData.steps || JSON.parse(JSON.stringify(this.defaultSteps));

    const newProject = {
      id: this.generateId(),
      name: projectData.name,
      client: projectData.client,
      clientId: client.id,
      description: projectData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: steps
    };

    projects.push(newProject);
    this.saveAllProjects(projects);

    return newProject;
  },

  /**
   * Update a project
   */
  updateProject(projectId, updates) {
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);

    if (index === -1) return null;

    // If client name changed, update clientId
    if (updates.client && updates.client !== projects[index].client) {
      const client = this.getOrCreateClient(updates.client);
      updates.clientId = client.id;
    }

    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveAllProjects(projects);
    return projects[index];
  },

  /**
   * Delete a project
   */
  deleteProject(projectId) {
    const projects = this.getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    this.saveAllProjects(filtered);
  },

  // ==================== STEP OPERATIONS ====================

  /**
   * Add a new step to a project
   */
  addStep(projectId, stepData) {
    const project = this.getProject(projectId);
    if (!project) return null;

    const newStep = {
      id: project.steps.length > 0 ? Math.max(...project.steps.map(s => s.id)) + 1 : 1,
      name: stepData.name,
      description: stepData.description || '',
      status: 'pending',
      completedAt: null
    };

    project.steps.push(newStep);
    return this.updateProject(projectId, { steps: project.steps });
  },

  /**
   * Update a step
   */
  updateStep(projectId, stepId, updates) {
    const project = this.getProject(projectId);
    if (!project) return null;

    const step = project.steps.find(s => s.id === stepId);
    if (!step) return null;

    Object.assign(step, updates);
    return this.updateProject(projectId, { steps: project.steps });
  },

  /**
   * Delete a step from a project
   */
  deleteStep(projectId, stepId) {
    const project = this.getProject(projectId);
    if (!project) return null;

    project.steps = project.steps.filter(s => s.id !== stepId);

    // Re-order step IDs
    project.steps.forEach((step, index) => {
      step.id = index + 1;
    });

    return this.updateProject(projectId, { steps: project.steps });
  },

  /**
   * Reorder steps
   */
  reorderSteps(projectId, fromIndex, toIndex) {
    const project = this.getProject(projectId);
    if (!project) return null;

    const [removed] = project.steps.splice(fromIndex, 1);
    project.steps.splice(toIndex, 0, removed);

    // Re-order step IDs
    project.steps.forEach((step, index) => {
      step.id = index + 1;
    });

    return this.updateProject(projectId, { steps: project.steps });
  },

  /**
   * Update step status
   */
  updateStepStatus(projectId, stepId, status) {
    const project = this.getProject(projectId);
    if (!project) return null;

    const step = project.steps.find(s => s.id === stepId);
    if (!step) return null;

    step.status = status;
    step.completedAt = status === 'completed' ? new Date().toISOString() : null;

    // If completing a step, mark all previous steps as completed
    if (status === 'completed' || status === 'current') {
      project.steps.forEach(s => {
        if (s.id < stepId) {
          s.status = 'completed';
          if (!s.completedAt) {
            s.completedAt = new Date().toISOString();
          }
        }
      });
    }

    // If setting a step as current, mark subsequent steps as pending
    if (status === 'current') {
      project.steps.forEach(s => {
        if (s.id > stepId) {
          s.status = 'pending';
          s.completedAt = null;
        }
      });
    }

    return this.updateProject(projectId, { steps: project.steps });
  },

  /**
   * Get current step for a project
   */
  getCurrentStep(project) {
    if (!project || !project.steps) return null;

    const currentStep = project.steps.find(s => s.status === 'current');
    if (currentStep) return currentStep;

    // If no current step, find the first pending step
    const pendingStep = project.steps.find(s => s.status === 'pending');
    if (pendingStep) return pendingStep;

    // All completed
    return project.steps[project.steps.length - 1];
  },

  /**
   * Get progress percentage
   */
  getProgressPercentage(project) {
    if (!project || !project.steps || project.steps.length === 0) return 0;

    const completedCount = project.steps.filter(s => s.status === 'completed').length;
    return Math.round((completedCount / project.steps.length) * 100);
  },

  /**
   * Format date for display
   */
  formatDate(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  },

  /**
   * Get share URL for a client (shows all their projects)
   */
  getShareUrl(clientId) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${baseUrl}/index.html?client=${clientId}`;
  },

  /**
   * Get share URL for a specific project
   */
  getProjectShareUrl(projectId) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${baseUrl}/index.html?project=${projectId}`;
  },

  /**
   * Initialize with sample data (for demo)
   */
  initializeSampleData() {
    const existing = this.getAllProjects();
    if (existing.length > 0) return;

    // Create sample client
    const sampleClient = {
      id: 'DEMO01',
      name: '株式会社サンプル',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.saveAllClients([sampleClient]);

    // Create sample projects for the client with descriptions
    const sampleProjects = [
      {
        id: 'PROJ0001',
        name: 'コーポレートサイトリニューアル',
        client: '株式会社サンプル',
        clientId: 'DEMO01',
        description: 'コーポレートサイトの全面リニューアルプロジェクト',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { id: 1, name: 'ヒアリング・要件定義', description: '・ターゲットユーザー：30-50代のビジネスパーソン\n・必須ページ：トップ、会社概要、サービス、お問い合わせ\n・レスポンシブ対応必須', status: 'completed', completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 2, name: '企画・コンセプト設計', description: '・コンセプト：信頼感と先進性の両立\n・カラー：ネイビー×ホワイト基調\n・競合分析完了', status: 'completed', completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 3, name: 'デザイン制作', description: '・TOPページ + 下層5ページ\n・SP/PC両対応\n・バナー3種含む', status: 'completed', completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 4, name: '制作・開発', description: '・WordPress実装\n・お問い合わせフォーム設置\n・Google Analytics連携', status: 'current', completedAt: null },
          { id: 5, name: 'レビュー・修正', description: '', status: 'pending', completedAt: null },
          { id: 6, name: '最終確認', description: '', status: 'pending', completedAt: null },
          { id: 7, name: '納品・公開', description: '', status: 'pending', completedAt: null }
        ]
      },
      {
        id: 'PROJ0002',
        name: '採用サイト制作',
        client: '株式会社サンプル',
        clientId: 'DEMO01',
        description: '新卒・中途採用向けサイトの新規制作',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { id: 1, name: 'ヒアリング・要件定義', description: '・新卒・中途両方に対応\n・社員インタビュー5名分\n・エントリーフォーム連携必須', status: 'completed', completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 2, name: '企画・コンセプト設計', description: '・コンセプト検討中\n・競合採用サイト調査', status: 'current', completedAt: null },
          { id: 3, name: 'デザイン制作', description: '', status: 'pending', completedAt: null },
          { id: 4, name: '制作・開発', description: '', status: 'pending', completedAt: null },
          { id: 5, name: 'レビュー・修正', description: '', status: 'pending', completedAt: null },
          { id: 6, name: '納品・公開', description: '', status: 'pending', completedAt: null }
        ]
      }
    ];

    this.saveAllProjects(sampleProjects);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataManager;
}
