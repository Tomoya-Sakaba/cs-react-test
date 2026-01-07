# 📝 サンプルテンプレート作成ガイド

## 最小構成のテンプレート

### Excelでの作成手順

1. **Excelを開く**

2. **A1セル**: `作業報告書` （タイトル）

3. **A3セル**: `作業日:`
4. **B3セル**: `{{work_date:date}}`

5. **A4セル**: `作業者:`
6. **B4セル**: `{{worker_name:text}}`

7. **A5セル**: `場所:`
8. **B5セル**: `{{location:text}}`

9. **A6セル**: `作業内容:`
10. **A7セル**: `{{work_content:textarea}}`

11. **保存**: `sample_report.xlsx`

### プレースホルダー一覧

| プレースホルダー | 意味 | Web入力時の型 |
|-----------------|------|---------------|
| `{{work_date:date}}` | 作業日 | 日付ピッカー |
| `{{worker_name:text}}` | 作業者名 | テキスト入力 |
| `{{location:text}}` | 場所 | テキスト入力 |
| `{{work_content:textarea}}` | 作業内容 | 複数行テキスト |

## テスト用データ

### テンプレートアップロード

```
template_name: サンプル報告書
template_code: sample_report_001
description: テスト用
created_user: admin
excel_file: sample_report.xlsx
```

### 報告書作成

```json
{
  "template_id": 1,
  "created_user": "テストユーザー",
  "data": {
    "work_date": "2025-12-17",
    "worker_name": "山田太郎",
    "location": "東京都渋谷区",
    "work_content": "サンプル報告書のテストです。\nこれは複数行のテキストです。"
  }
}
```

## よくある質問

### Q: プレースホルダーが認識されない

**A**: 以下を確認してください：
- `{{` と `}}` は半角
- `:` の前後にスペースなし
- 型名は小文字（`date`, `text`, `textarea`）

### Q: 罫線は保持される？

**A**: はい。Excelで引いた罫線、セル結合、色などは全て保持されます。

### Q: 複数のテンプレートを登録できる？

**A**: はい。`template_code`を変えて何個でも登録できます。

### Q: テンプレートを修正したい

**A**: 同じ`template_code`で再アップロードするか、別の`template_code`で新規登録してください。

