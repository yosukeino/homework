# オンライン宿題 セットアップ＆Vercel＋Supabase公開ガイド

Next.js（App Router）＋ Framer Motion ＋ Vercel ＋ **Supabase** 構成です。
テーブルを1つ作るだけで、全単元の提出記録と**リアルタイムランキング（ノーミス優先 → 最速タイム順）**が一元管理されます。

---

## Step 1. Supabase にテーブルを1つ作成する（約1分）

1. Supabase ダッシュボードで対象のプロジェクトを開きます。
2. 左メニューの **「SQL Editor」** → **「New query」** を開きます。
3. [`supabase/schema.sql`](supabase/schema.sql) の中身をそのまま貼り付けて **「Run」** をクリックします。
   - `public.homework_clears` テーブルとランキング用インデックス・RLS設定が自動作成されます。

---

## Step 2. Supabase の接続キーを確認する（約30秒）

1. Supabase ダッシュボード左メニューの **「Project Settings」→「API」**（または **「Data API」 / 「API Keys」**）を開きます。
2. 以下の2つをコピーします：
   - **Project URL**（`https://xxxxxxxxxxxx.supabase.co`）
   - **`service_role` キー**（または Secret key：`eyJ...` や `sb_secret_...`）
     - ※サーバー側（Vercel API Route）だけで使用するため、生徒のブラウザには一切露出しません。

---

## Step 3. Vercel の Environment Variables に登録する（約1分）

1. Vercel の `homework` プロジェクト画面で **Settings → Environment Variables** を開きます。
2. 以下の2つを追加して **Save** します：
   - **Key**：`SUPABASE_URL` / **Value**：Project URL
   - **Key**：`SUPABASE_SERVICE_ROLE_KEY` / **Value**：`service_role`（Secret）キー
3. **Deployments** タブから最新のデプロイを **Redeploy** すれば完了です！

> **Googleスプレッドシートとの併用について**  
> 既存の `GAS_WEB_APP_URL` が残っていれば Supabase と Googleスプレッドシートの両方に並行保存されます。Supabase に完全移行したい場合は、Vercel から `GAS_WEB_APP_URL` を削除するだけでOKです。

---

## 先生用の確認方法（Supabase Table Editor）

- Supabase ダッシュボードの **「Table Editor」→「homework_clears」** を開くだけで、全単元のクリア履歴（氏名・単元・ミス数・タイム・日時）をフィルタ・CSVエクスポートできます。
- 生徒向けランキングは `/rankings`（および各単元のスタート画面・クリア画面）で自動表示されます。
