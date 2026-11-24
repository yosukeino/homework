/**
 * 中学英語 20問連続チャレンジ - クリア記録受信用 Google Apps Script
 *
 * 【機能】
 * - 生徒が20問連続正解クリアした際、Googleスプレッドシートの「クリア記録」シートに自動追記します。
 * - 初回実行時にシートとヘッダー行を自動で作成します。
 * - 同時クリア時の競合防止（LockService）、リトライ時の重複登録防止、数式インジェクション対策を含みます。
 */

const SHEET_NAME = 'クリア記録';
const HEADERS = [
  '提出日時',
  '氏名',
  '結果',
  '単元',
  '総解答数',
  'ミス回数',
  '所要時間',
  '所要秒数',
  '確認コード'
];

/**
 * ブラウザでURLを開いた時の疎通確認用
 */
function doGet() {
  return jsonResponse({
    ok: true,
    message: '20問連続チャレンジ 受信用APIは正常に稼働しています。'
  });
}

/**
 * クリア記録を受信してスプレッドシートへ記録
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: '送信データが空です' });
    }

    const payload = JSON.parse(e.postData.contents);
    const rawName = String(payload.studentName || '').trim();
    if (!rawName) {
      return jsonResponse({ ok: false, error: '氏名が入力されていません' });
    }

    const studentName = sanitizeCell(rawName.slice(0, 40));
    const unitName = sanitizeCell(String(payload.unitName || '中学英語・人称代名詞').slice(0, 60));
    const targetStreak = Number(payload.targetStreak) || 20;
    const totalAnswered = Number(payload.totalAnswered) || targetStreak;
    const missCount = Number(payload.missCount) || 0;
    const elapsedSeconds = Number(payload.elapsedSeconds) || 0;
    const elapsedText = sanitizeCell(String(payload.elapsedText || `${elapsedSeconds}秒`).slice(0, 30));
    const submissionId = sanitizeCell(String(payload.submissionId || '').slice(0, 40));

    const sheet = getOrCreateSheet();

    // 同じ確認コード（リトライ送信）による重複登録を防止
    if (submissionId && isDuplicateSubmission(sheet, submissionId)) {
      return jsonResponse({ ok: true, duplicate: true, submissionId: submissionId });
    }

    const nowJst = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    const resultLabel = `${targetStreak}問連続クリア`;

    sheet.appendRow([
      nowJst,
      studentName,
      resultLabel,
      unitName,
      totalAnswered,
      missCount,
      elapsedText,
      elapsedSeconds,
      submissionId
    ]);

    return jsonResponse({ ok: true, submissionId: submissionId });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/**
 * 「クリア記録」シートを取得（なければ自動作成＆ヘッダー整形）
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#eff6ff');
    headerRange.setFontColor('#1e3a8a');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 確認コード（9列目）の重複チェック
 */
function isDuplicateSubmission(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  // 直近200件を確認すれば十分高速かつ確実
  const startRow = Math.max(2, lastRow - 199);
  const numRows = lastRow - startRow + 1;
  const colIndex = HEADERS.length; // 確認コード列
  const values = sheet.getRange(startRow, colIndex, numRows, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === submissionId) {
      return true;
    }
  }
  return false;
}

/**
 * スプレッドシートの数式インジェクション対策
 */
function sanitizeCell(str) {
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * JSONレスポンス生成
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
