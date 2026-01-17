// Supabase Edge Function for Email Notifications
// Uses Resend for email delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@souzoud.com";
const APP_URL = Deno.env.get("APP_URL") || "https://souzoud-progress-tracker.vercel.app";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email templates
const templates = {
  // New task assignment notification
  taskAssigned: (data: { workerName: string; projectName: string; stepName: string; dueDate?: string; notes?: string }) => ({
    subject: `[SOUZOUD] 新しいタスクが割り当てられました: ${data.stepName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .info-box { background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #6366f1; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: 600; color: #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">新しいタスクが割り当てられました</h1>
          </div>
          <div class="content">
            <p>${data.workerName} さん、</p>
            <p>新しいタスクが割り当てられました。詳細をご確認ください。</p>

            <div class="info-box">
              <div class="label">プロジェクト</div>
              <div class="value">${data.projectName}</div>
            </div>

            <div class="info-box">
              <div class="label">タスク</div>
              <div class="value">${data.stepName}</div>
            </div>

            ${data.dueDate ? `
            <div class="info-box">
              <div class="label">期日</div>
              <div class="value">${data.dueDate}</div>
            </div>
            ` : ''}

            ${data.notes ? `
            <div class="info-box">
              <div class="label">備考</div>
              <div class="value">${data.notes}</div>
            </div>
            ` : ''}

            <p style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/worker.html" class="btn">作業者ポータルを開く</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Submission notification (to director)
  submissionReceived: (data: { directorName: string; workerName: string; projectName: string; stepName: string; stage: string; comment?: string }) => ({
    subject: `[SOUZOUD] 新しい提出物があります: ${data.projectName} - ${data.stepName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .info-box { background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: 600; color: #1e293b; }
          .badge { display: inline-block; background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">新しい提出物があります</h1>
          </div>
          <div class="content">
            <p>${data.directorName} さん、</p>
            <p>作業者から成果物が提出されました。確認・承認をお願いします。</p>

            <div class="info-box">
              <div class="label">プロジェクト / タスク</div>
              <div class="value">${data.projectName} - ${data.stepName}</div>
            </div>

            <div class="info-box">
              <div class="label">提出者</div>
              <div class="value">${data.workerName}</div>
            </div>

            <div class="info-box">
              <div class="label">提出種別</div>
              <div class="value"><span class="badge">${data.stage === 'draft' ? '初稿' : data.stage === 'revision' ? '修正稿' : '最終稿'}</span></div>
            </div>

            ${data.comment ? `
            <div class="info-box">
              <div class="label">コメント</div>
              <div class="value">${data.comment}</div>
            </div>
            ` : ''}

            <p style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/admin.html" class="btn">管理画面で確認する</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Approval notification (to worker)
  submissionApproved: (data: { workerName: string; projectName: string; stepName: string }) => ({
    subject: `[SOUZOUD] 提出物が承認されました: ${data.stepName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .success-icon { font-size: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">&#10004;</div>
            <h1 style="margin: 0; font-size: 24px;">提出物が承認されました</h1>
          </div>
          <div class="content">
            <p>${data.workerName} さん、</p>
            <p>お疲れ様でした！以下のタスクの提出物が承認されました。</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #10b981;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">${data.projectName}</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${data.stepName}</div>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/worker.html" class="btn">次のタスクを確認</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Rejection notification (to worker)
  submissionRejected: (data: { workerName: string; projectName: string; stepName: string; comment?: string }) => ({
    subject: `[SOUZOUD] 提出物が差し戻されました: ${data.stepName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .feedback-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">提出物が差し戻されました</h1>
          </div>
          <div class="content">
            <p>${data.workerName} さん、</p>
            <p>以下のタスクの提出物が差し戻されました。フィードバックを確認の上、修正をお願いします。</p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">${data.projectName}</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${data.stepName}</div>
            </div>

            ${data.comment ? `
            <div class="feedback-box">
              <div style="font-size: 12px; color: #991b1b; text-transform: uppercase; margin-bottom: 8px; font-weight: 600;">フィードバック</div>
              <div style="color: #1e293b;">${data.comment}</div>
            </div>
            ` : ''}

            <p style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/worker.html" class="btn">修正して再提出</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Progress update notification (to client)
  progressUpdate: (data: { clientName: string; projectName: string; stepName: string; progress: number }) => ({
    subject: `[SOUZOUD] プロジェクト進捗のお知らせ: ${data.projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .progress-bar { background: #e2e8f0; border-radius: 8px; height: 20px; overflow: hidden; margin: 16px 0; }
          .progress-fill { background: linear-gradient(90deg, #6366f1, #8b5cf6); height: 100%; transition: width 0.3s; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">プロジェクト進捗のお知らせ</h1>
          </div>
          <div class="content">
            <p>${data.clientName} 様</p>
            <p>プロジェクトの進捗状況をお知らせします。</p>

            <div style="background: white; border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">プロジェクト</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">${data.projectName}</div>

              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">完了した工程</div>
              <div style="font-size: 16px; font-weight: 600; color: #10b981; margin-bottom: 16px;">${data.stepName}</div>

              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">全体進捗</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.progress}%;"></div>
              </div>
              <div style="text-align: center; font-size: 24px; font-weight: 700; color: #6366f1;">${data.progress}%</div>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/index.html" class="btn">詳細を確認する</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // New user welcome email
  welcomeUser: (data: { name: string; email: string; role: string; loginUrl: string }) => ({
    subject: `[SOUZOUD] アカウントが作成されました`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 14px; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .info-box { background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">ようこそ SOUZOUD へ</h1>
          </div>
          <div class="content">
            <p>${data.name} さん、</p>
            <p>SOUZOUD Progress Tracker へのアカウントが作成されました。</p>

            <div class="info-box">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">ログインメールアドレス</div>
              <div style="font-size: 16px; font-weight: 600; color: #1e293b;">${data.email}</div>
            </div>

            <div class="info-box">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">アカウント種別</div>
              <div style="font-size: 16px; font-weight: 600; color: #1e293b;">${data.role}</div>
            </div>

            <p style="color: #64748b; font-size: 14px;">
              初回ログイン時に、管理者から共有されたパスワードを使用してください。
              セキュリティのため、ログイン後にパスワードの変更をお勧めします。
            </p>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.loginUrl}" class="btn">ログインする</a>
            </p>
          </div>
          <div class="footer">
            <p>SOUZOUD Inc. Progress Tracker</p>
            <p style="font-size: 12px;">このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template based on type
    const templateFn = templates[type as keyof typeof templates];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown notification type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = templateFn(data);
    const result = await sendEmail(to, subject, html);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
