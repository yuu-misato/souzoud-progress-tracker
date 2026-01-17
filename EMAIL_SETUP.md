# Email Notification Setup Guide / メール通知設定ガイド

このガイドでは、SOUZOUD Progress Trackerのメール通知機能を設定する方法を説明します。

## 概要

メール通知は以下のタイミングで送信されます：

| イベント | 受信者 | 説明 |
|---------|--------|------|
| タスク割り当て | 作業者 | 新しいタスクが割り当てられた時 |
| 提出物受信 | ディレクター/管理者 | 作業者から成果物が提出された時 |
| 承認 | 作業者 | 提出物が承認された時 |
| 差し戻し | 作業者 | 提出物が差し戻された時（理由付き） |
| 進捗更新 | クライアント | 工程が完了した時 |
| 新規ユーザー | 新規ユーザー | アカウントが作成された時 |

## セットアップ手順

### 1. Resendアカウントの作成

1. [Resend](https://resend.com) にアクセス
2. 無料アカウントを作成（月100通まで無料）
3. ダッシュボードからAPIキーを取得

### 2. Supabase Edge Functionのデプロイ

```bash
# Supabase CLIをインストール（まだの場合）
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref icoblusdkpcniysjnaus

# シークレットを設定
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set FROM_EMAIL=noreply@yourdomain.com
supabase secrets set APP_URL=https://your-app-url.vercel.app

# Edge Functionをデプロイ
supabase functions deploy send-notification
```

### 3. ドメイン設定（本番環境の場合）

Resendでカスタムドメインを設定すると、独自ドメインからメールを送信できます：

1. Resendダッシュボードで「Domains」をクリック
2. ドメインを追加
3. DNSレコード（SPF、DKIM）を設定
4. 認証完了を待つ

### 4. 動作確認

1. 管理画面でテスト用の作業者を作成
2. 作業者にタスクを割り当て
3. 作業者のメールアドレスに通知が届くか確認

## 設定オプション

### 通知の有効/無効切り替え

`js/notifications.js` で通知を無効にできます：

```javascript
NotificationService.enabled = false; // 通知を無効化
```

### メールテンプレートのカスタマイズ

`supabase/functions/send-notification/index.ts` の `templates` オブジェクトでテンプレートを編集できます。

### 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `RESEND_API_KEY` | ResendのAPIキー | `re_xxxxx` |
| `FROM_EMAIL` | 送信元メールアドレス | `noreply@souzoud.com` |
| `APP_URL` | アプリケーションのURL | `https://app.souzoud.com` |

## トラブルシューティング

### メールが届かない場合

1. ブラウザのコンソールでエラーを確認
2. Supabaseのログを確認：`supabase functions logs send-notification`
3. Resendダッシュボードで送信履歴を確認

### レート制限

- Resend無料プラン：月100通
- 超過した場合は有料プランにアップグレード

## 費用

| プラン | 月額 | 送信数 |
|--------|------|--------|
| Resend Free | $0 | 100通/月 |
| Resend Pro | $20 | 50,000通/月 |

## セキュリティ

- APIキーは絶対にフロントエンドのコードに含めないでください
- Edge Functionの環境変数として安全に保管されます
- メールの内容はXSSエスケープされています
