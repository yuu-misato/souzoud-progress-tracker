/**
 * Email Notification Service
 * Uses Supabase Edge Functions with Resend for email delivery
 */

const NotificationService = {
  // Supabase Edge Function URL (update after deployment)
  FUNCTION_URL: 'https://icoblusdkpcniysjnaus.supabase.co/functions/v1/send-notification',

  // Enable/disable notifications (can be toggled in settings)
  enabled: true,

  /**
   * Send notification via Edge Function
   */
  async send(type, to, data) {
    if (!this.enabled) {
      console.log('[Notification] Notifications disabled, skipping:', type);
      return { success: false, skipped: true };
    }

    if (!to) {
      console.warn('[Notification] No recipient email for:', type);
      return { success: false, error: 'No recipient email' };
    }

    try {
      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type, to, data }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Notification] Sent successfully:', type, to);
      } else {
        console.error('[Notification] Failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[Notification] Error:', error);
      return { success: false, error: String(error) };
    }
  },

  /**
   * Notify worker when a new task is assigned
   */
  async notifyTaskAssigned(assignment) {
    const worker = await DataManager.getWorkerById(assignment.workerId);
    if (!worker?.email) return;

    const project = await DataManager.getProject(assignment.projectId);
    const step = project?.steps?.find(s => s.id === assignment.stepId);

    return this.send('taskAssigned', worker.email, {
      workerName: worker.name,
      projectName: project?.name || 'プロジェクト',
      stepName: step?.name || assignment.stepName || 'タスク',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('ja-JP') : null,
      notes: assignment.notes,
    });
  },

  /**
   * Notify director when a submission is received
   */
  async notifySubmissionReceived(submission, assignment) {
    // Get director info
    const director = assignment.directorId
      ? await DataManager.getAdminById(assignment.directorId)
      : null;

    // If no specific director, notify all admins/directors for this project
    const recipients = [];
    if (director?.email) {
      recipients.push({ name: director.name, email: director.email });
    } else {
      // Get all admins
      const admins = await DataManager.getAllAdmins();
      admins.filter(a => a.isActive && (a.role === 'master' || a.role === 'admin'))
        .forEach(a => recipients.push({ name: a.name, email: a.email }));
    }

    const worker = await DataManager.getWorkerById(assignment.workerId);
    const project = await DataManager.getProject(assignment.projectId);

    const results = [];
    for (const recipient of recipients) {
      const result = await this.send('submissionReceived', recipient.email, {
        directorName: recipient.name,
        workerName: worker?.name || '作業者',
        projectName: project?.name || 'プロジェクト',
        stepName: assignment.stepName || 'タスク',
        stage: submission.stage || 'submission',
        comment: submission.comment,
      });
      results.push(result);
    }

    return results;
  },

  /**
   * Notify worker when submission is approved
   */
  async notifySubmissionApproved(submission) {
    // Get assignment details
    const assignments = await SupabaseClient.select(
      'assignments',
      `id=eq.${submission.assignment_id}&select=*`
    );
    const assignment = assignments?.[0];
    if (!assignment) return;

    const worker = await DataManager.getWorkerById(assignment.worker_id);
    if (!worker?.email) return;

    const project = await DataManager.getProject(assignment.project_id);

    return this.send('submissionApproved', worker.email, {
      workerName: worker.name,
      projectName: project?.name || 'プロジェクト',
      stepName: assignment.step_name || 'タスク',
    });
  },

  /**
   * Notify worker when submission is rejected
   */
  async notifySubmissionRejected(submission, comment) {
    // Get assignment details
    const assignments = await SupabaseClient.select(
      'assignments',
      `id=eq.${submission.assignment_id}&select=*`
    );
    const assignment = assignments?.[0];
    if (!assignment) return;

    const worker = await DataManager.getWorkerById(assignment.worker_id);
    if (!worker?.email) return;

    const project = await DataManager.getProject(assignment.project_id);

    return this.send('submissionRejected', worker.email, {
      workerName: worker.name,
      projectName: project?.name || 'プロジェクト',
      stepName: assignment.step_name || 'タスク',
      comment: comment,
    });
  },

  /**
   * Notify client about progress update
   */
  async notifyProgressUpdate(projectId, completedStepName) {
    const project = await DataManager.getProject(projectId);
    if (!project) return;

    // Get client users for this project
    const clientUsers = await DataManager.getClientUsers(project.clientId || project.client_id);
    if (!clientUsers?.length) return;

    const progress = DataManager.getProgressPercentage(project);

    const results = [];
    for (const user of clientUsers) {
      const result = await this.send('progressUpdate', user.email, {
        clientName: user.name,
        projectName: project.name,
        stepName: completedStepName,
        progress: progress,
      });
      results.push(result);
    }

    return results;
  },

  /**
   * Send welcome email to new user
   */
  async notifyNewUser(user, role, loginUrl) {
    if (!user?.email) return;

    const roleLabels = {
      worker: '作業者',
      director: 'ディレクター',
      admin: '管理者',
      master: 'マスター管理者',
      client: 'クライアント',
    };

    return this.send('welcomeUser', user.email, {
      name: user.name,
      email: user.email,
      role: roleLabels[role] || role,
      loginUrl: loginUrl,
    });
  },
};

// Make it globally available
window.NotificationService = NotificationService;
