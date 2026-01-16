/**
 * Supabase Configuration
 */
const SUPABASE_URL = 'https://icoblusdkpcniysjnaus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljb2JsdXNka3Bjbml5c2puYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQzNDgsImV4cCI6MjA4NDE1MDM0OH0.eGRudlk7CQHpj2ej0XA67b-l72SeRXP0xrqps6mYL88';

/**
 * Supabase Client - Simple REST API wrapper
 */
const SupabaseClient = {
  async fetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  // SELECT
  async select(table, query = '') {
    return this.fetch(`${table}?${query}`);
  },

  // INSERT
  async insert(table, data) {
    return this.fetch(table, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // UPDATE
  async update(table, query, data) {
    return this.fetch(`${table}?${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // DELETE
  async delete(table, query) {
    return this.fetch(`${table}?${query}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Data Management Module - Supabase Version
 */
const DataManager = {
  /**
   * Generate a unique ID
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  generateClientId() {
    return 'CL' + this.generateId(4);
  },

  // ==================== CLIENT OPERATIONS ====================

  async getAllClients() {
    try {
      return await SupabaseClient.select('clients', 'order=created_at.desc');
    } catch (e) {
      console.error('Error fetching clients:', e);
      return [];
    }
  },

  async getClient(clientId) {
    try {
      const clients = await SupabaseClient.select('clients', `id=eq.${clientId}`);
      return clients[0] || null;
    } catch (e) {
      console.error('Error fetching client:', e);
      return null;
    }
  },

  async createClient(clientData) {
    try {
      const newClient = {
        id: this.generateClientId(),
        name: clientData.name
      };
      const result = await SupabaseClient.insert('clients', newClient);
      return result[0];
    } catch (e) {
      console.error('Error creating client:', e);
      return null;
    }
  },

  async getOrCreateClient(clientName) {
    try {
      const clients = await SupabaseClient.select('clients', `name=eq.${encodeURIComponent(clientName)}`);
      if (clients.length > 0) return clients[0];
      return await this.createClient({ name: clientName });
    } catch (e) {
      console.error('Error in getOrCreateClient:', e);
      return null;
    }
  },

  async getProjectsByClientId(clientId) {
    try {
      const projects = await SupabaseClient.select('projects', `client_id=eq.${clientId}&order=created_at.desc`);
      // Load steps for each project
      for (const project of projects) {
        project.steps = await this.getStepsForProject(project.id);
      }
      return projects;
    } catch (e) {
      console.error('Error fetching projects by client:', e);
      return [];
    }
  },

  // ==================== PROJECT OPERATIONS ====================

  async getAllProjects() {
    try {
      const projects = await SupabaseClient.select('projects', 'order=created_at.desc');
      for (const project of projects) {
        project.steps = await this.getStepsForProject(project.id);
        project.clientId = project.client_id;
        project.createdAt = project.created_at;
        project.updatedAt = project.updated_at;
      }
      return projects;
    } catch (e) {
      console.error('Error fetching projects:', e);
      return [];
    }
  },

  async getProject(projectId) {
    try {
      const projects = await SupabaseClient.select('projects', `id=eq.${projectId}`);
      if (projects.length === 0) return null;

      const project = projects[0];
      project.steps = await this.getStepsForProject(project.id);
      project.clientId = project.client_id;
      project.createdAt = project.created_at;
      project.updatedAt = project.updated_at;
      return project;
    } catch (e) {
      console.error('Error fetching project:', e);
      return null;
    }
  },

  async getStepsForProject(projectId) {
    try {
      const steps = await SupabaseClient.select('steps', `project_id=eq.${projectId}&order=step_order.asc`);
      return steps.map(s => ({
        id: s.step_order,
        name: s.name,
        description: s.description || '',
        url: s.url || '',
        status: s.status,
        completedAt: s.completed_at
      }));
    } catch (e) {
      console.error('Error fetching steps:', e);
      return [];
    }
  },

  async createProject(projectData) {
    try {
      const client = await this.getOrCreateClient(projectData.client);

      const newProject = {
        id: this.generateId(),
        name: projectData.name,
        client: projectData.client,
        client_id: client.id,
        description: projectData.description || ''
      };

      const result = await SupabaseClient.insert('projects', newProject);
      const project = result[0];

      // Create default steps
      const defaultSteps = [
        { name: 'ヒアリング・要件定義', description: '' },
        { name: '企画・コンセプト設計', description: '' },
        { name: 'デザイン制作', description: '' },
        { name: '制作・開発', description: '' },
        { name: 'レビュー・修正', description: '' },
        { name: '最終確認', description: '' },
        { name: '納品完了', description: '' }
      ];

      for (let i = 0; i < defaultSteps.length; i++) {
        await SupabaseClient.insert('steps', {
          project_id: project.id,
          step_order: i + 1,
          name: defaultSteps[i].name,
          description: defaultSteps[i].description,
          status: i === 0 ? 'current' : 'pending'
        });
      }

      project.steps = await this.getStepsForProject(project.id);
      project.clientId = project.client_id;
      project.createdAt = project.created_at;
      project.updatedAt = project.updated_at;

      return project;
    } catch (e) {
      console.error('Error creating project:', e);
      return null;
    }
  },

  async updateProject(projectId, updates) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;

      if (updates.client) {
        updateData.client = updates.client;
        const client = await this.getOrCreateClient(updates.client);
        updateData.client_id = client.id;
      }

      await SupabaseClient.update('projects', `id=eq.${projectId}`, updateData);
      return await this.getProject(projectId);
    } catch (e) {
      console.error('Error updating project:', e);
      return null;
    }
  },

  async deleteProject(projectId) {
    try {
      await SupabaseClient.delete('projects', `id=eq.${projectId}`);
    } catch (e) {
      console.error('Error deleting project:', e);
    }
  },

  // ==================== STEP OPERATIONS ====================

  async addStep(projectId, stepData) {
    try {
      const steps = await this.getStepsForProject(projectId);
      const newOrder = steps.length + 1;

      await SupabaseClient.insert('steps', {
        project_id: projectId,
        step_order: newOrder,
        name: stepData.name,
        description: stepData.description || '',
        url: stepData.url || '',
        status: 'pending'
      });

      await SupabaseClient.update('projects', `id=eq.${projectId}`, {
        updated_at: new Date().toISOString()
      });

      return await this.getProject(projectId);
    } catch (e) {
      console.error('Error adding step:', e);
      return null;
    }
  },

  async updateStep(projectId, stepId, updates) {
    try {
      const updateData = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.url !== undefined) updateData.url = updates.url;

      await SupabaseClient.update('steps', `project_id=eq.${projectId}&step_order=eq.${stepId}`, updateData);

      await SupabaseClient.update('projects', `id=eq.${projectId}`, {
        updated_at: new Date().toISOString()
      });

      return await this.getProject(projectId);
    } catch (e) {
      console.error('Error updating step:', e);
      return null;
    }
  },

  async deleteStep(projectId, stepId) {
    try {
      await SupabaseClient.delete('steps', `project_id=eq.${projectId}&step_order=eq.${stepId}`);

      // Re-order remaining steps
      const steps = await SupabaseClient.select('steps', `project_id=eq.${projectId}&order=step_order.asc`);
      for (let i = 0; i < steps.length; i++) {
        await SupabaseClient.update('steps', `project_id=eq.${projectId}&id=eq.${steps[i].id}`, {
          step_order: i + 1
        });
      }

      await SupabaseClient.update('projects', `id=eq.${projectId}`, {
        updated_at: new Date().toISOString()
      });

      return await this.getProject(projectId);
    } catch (e) {
      console.error('Error deleting step:', e);
      return null;
    }
  },

  async updateStepStatus(projectId, stepId, status) {
    try {
      const completedAt = status === 'completed' ? new Date().toISOString() : null;

      // Update the target step
      await SupabaseClient.update('steps', `project_id=eq.${projectId}&step_order=eq.${stepId}`, {
        status: status,
        completed_at: completedAt
      });

      // If completing or setting current, update previous steps
      if (status === 'completed' || status === 'current') {
        const steps = await SupabaseClient.select('steps', `project_id=eq.${projectId}&step_order=lt.${stepId}`);
        for (const step of steps) {
          if (step.status !== 'completed') {
            await SupabaseClient.update('steps', `project_id=eq.${projectId}&step_order=eq.${step.step_order}`, {
              status: 'completed',
              completed_at: step.completed_at || new Date().toISOString()
            });
          }
        }
      }

      // If setting current, mark subsequent as pending
      if (status === 'current') {
        await SupabaseClient.update('steps', `project_id=eq.${projectId}&step_order=gt.${stepId}`, {
          status: 'pending',
          completed_at: null
        });
      }

      await SupabaseClient.update('projects', `id=eq.${projectId}`, {
        updated_at: new Date().toISOString()
      });

      return await this.getProject(projectId);
    } catch (e) {
      console.error('Error updating step status:', e);
      return null;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  getCurrentStep(project) {
    if (!project || !project.steps) return null;

    const currentStep = project.steps.find(s => s.status === 'current');
    if (currentStep) return currentStep;

    const pendingStep = project.steps.find(s => s.status === 'pending');
    if (pendingStep) return pendingStep;

    return project.steps[project.steps.length - 1];
  },

  getProgressPercentage(project) {
    if (!project || !project.steps || project.steps.length === 0) return 0;

    const completedCount = project.steps.filter(s => s.status === 'completed').length;
    return Math.round((completedCount / project.steps.length) * 100);
  },

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

  getShareUrl(clientId) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${baseUrl}/index.html?client=${clientId}`;
  },

  getProjectShareUrl(projectId) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${baseUrl}/index.html?project=${projectId}`;
  },

  // ==================== TEMPLATE OPERATIONS ====================
  // Templates are stored in localStorage for simplicity

  TEMPLATES_KEY: 'progress_tracker_templates',

  getDefaultTemplates() {
    return [
      {
        id: 'default',
        name: 'デフォルト（Web制作）',
        steps: [
          { name: 'ヒアリング・要件定義', description: '' },
          { name: '企画・コンセプト設計', description: '' },
          { name: 'デザイン制作', description: '' },
          { name: '制作・開発', description: '' },
          { name: 'レビュー・修正', description: '' },
          { name: '最終確認', description: '' },
          { name: '納品完了', description: '' }
        ]
      },
      {
        id: 'lp',
        name: 'LP制作',
        steps: [
          { name: 'ヒアリング', description: '' },
          { name: '構成案作成', description: '' },
          { name: 'デザイン制作', description: '' },
          { name: 'コーディング', description: '' },
          { name: 'テスト・修正', description: '' },
          { name: '納品', description: '' }
        ]
      },
      {
        id: 'branding',
        name: 'ブランディング',
        steps: [
          { name: 'ヒアリング・調査', description: '' },
          { name: 'コンセプト設計', description: '' },
          { name: 'ロゴ・VI提案', description: '' },
          { name: '修正・ブラッシュアップ', description: '' },
          { name: 'ガイドライン作成', description: '' },
          { name: '納品', description: '' }
        ]
      }
    ];
  },

  getAllTemplates() {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];
    return [...this.getDefaultTemplates(), ...customTemplates];
  },

  getTemplate(templateId) {
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === templateId);
  },

  saveTemplate(name, steps) {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];

    const newTemplate = {
      id: 'custom_' + this.generateId(6),
      name: name,
      steps: steps.map(s => ({ name: s.name, description: s.description || '' }))
    };

    customTemplates.push(newTemplate);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(customTemplates));
    return newTemplate;
  },

  deleteTemplate(templateId) {
    if (!templateId.startsWith('custom_')) return; // Can't delete default templates

    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];
    const filtered = customTemplates.filter(t => t.id !== templateId);
    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(filtered));
  },

  async createProjectWithTemplate(projectData, templateId) {
    try {
      const client = await this.getOrCreateClient(projectData.client);

      const newProject = {
        id: this.generateId(),
        name: projectData.name,
        client: projectData.client,
        client_id: client.id,
        description: projectData.description || ''
      };

      const result = await SupabaseClient.insert('projects', newProject);
      const project = result[0];

      // Get template steps
      const template = this.getTemplate(templateId);
      const steps = template ? template.steps : this.getDefaultTemplates()[0].steps;

      for (let i = 0; i < steps.length; i++) {
        await SupabaseClient.insert('steps', {
          project_id: project.id,
          step_order: i + 1,
          name: steps[i].name,
          description: steps[i].description || '',
          status: i === 0 ? 'current' : 'pending'
        });
      }

      project.steps = await this.getStepsForProject(project.id);
      project.clientId = project.client_id;
      project.createdAt = project.created_at;
      project.updatedAt = project.updated_at;

      return project;
    } catch (e) {
      console.error('Error creating project with template:', e);
      return null;
    }
  },

  // ==================== ADMIN OPERATIONS ====================

  async getAllAdmins() {
    try {
      const admins = await SupabaseClient.select('admins', 'order=created_at.asc');
      return admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        isActive: a.is_active,
        createdAt: a.created_at
      }));
    } catch (e) {
      console.error('Error fetching admins:', e);
      return [];
    }
  },

  async createAdmin(adminData) {
    try {
      const result = await SupabaseClient.insert('admins', {
        email: adminData.email,
        password_hash: adminData.passwordHash,
        name: adminData.name,
        role: adminData.role || 'admin',
        is_active: true
      });
      return result[0];
    } catch (e) {
      console.error('Error creating admin:', e);
      throw e;
    }
  },

  async updateAdmin(adminId, updates) {
    try {
      const updateData = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.role) updateData.role = updates.role;
      if (updates.passwordHash) updateData.password_hash = updates.passwordHash;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      await SupabaseClient.update('admins', `id=eq.${adminId}`, updateData);
    } catch (e) {
      console.error('Error updating admin:', e);
      throw e;
    }
  },

  async deleteAdmin(adminId) {
    try {
      // Soft delete - just set is_active to false
      await SupabaseClient.update('admins', `id=eq.${adminId}`, { is_active: false });
    } catch (e) {
      console.error('Error deleting admin:', e);
      throw e;
    }
  },

  // No-op for compatibility
  initializeSampleData() {
    // Sample data is now in the database
    console.log('Using Supabase for data storage');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataManager;
}
