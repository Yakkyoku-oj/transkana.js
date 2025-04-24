# TransKana.js

**TransKana.js** は英語テキストをカタカナ読みへ変換する JavaScript ライブラリです。ブラウザ上で SQLite データベースを直接参照し、約 16 万語の読みデータを高速に提供します。

---

## 特長

| 機能 | 説明 |
|------|------|
| 単語変換 | 登録英単語を正確にカタカナ化 |
| ローマ字解析 | ローマ字・CamelCase・hyphen‑compound の分割と変換 |
| 記号・数字 | `+ = %` 等の記号読み、電話番号／3 桁カンマ区切り／小数の読み上げ |
| 縮約形対応 (v 1.1.0) | `it's` / `isn't` などアポストロフィを含む語を正しく 1 トークンとして処理 |
| スマートクォート正規化 (v 1.1.0) | “ ” ‘ ’ → " ' へ統一しトークン分割を安定化 |
| TTS フレンドリー出力 (v 1.1.0) | `exec(text,{compact:true})` で和文＋カタカナ間の余計な空白を自動削除 |

---

## デモ

<https://yakkyoku-oj.github.io/transkana.js/>

---

## インストール

```bash
git clone https://github.com/your-account/transkana.js.git
# あるいは ZIP をダウンロードして展開
```

---

## ファイル構成

| パス | 概要 |
|------|------|
| **index.html** | デモページ |
| **/css/** | スタイルシート（reset・style） |
| **/js/transkana.js** | 変換ライブラリ本体 |
| **/js/form.js** | デモ UI |
| **/dict/kanayomi.db** | 読みデータ (SQLite) |

---

## サンプルコード

### 1 – 即時変換ボタン

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js"></script>
<script src="./js/transkana.js"></script>
<script>
 const yomi = new TransKana();
 function toKana() {
   if (!yomi.ready) { alert('辞書ロード中です'); return; }
   alert( yomi.exec(document.getElementById('txt').value, {compact:true}) );
 }
</script>
```

### 2 – テストケースをコンソール出力

```html
<script>
 const transKana = new TransKana();
 transKana.init().then(async () => {
   while (!transKana.ready) await new Promise(r=>setTimeout(r,50));
   console.log( transKana.exec("It's a good test case, isn't it?",{compact:true}) );
 });
</script>
```

---

## 依存ライブラリ

* **sql.js 1.8.0** MIT License  
  <https://github.com/sql-js/sql.js>

---

## データベース

`kanayomi.db` の主テーブル構造:

```sql
CREATE TABLE T_WORDS (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  surface_form     TEXT NOT NULL UNIQUE,  -- 英単語
  cmu_reading      TEXT,                  -- ARPABET
  cmu_reading_kana TEXT,                  -- カタカナ
  bep_reading      TEXT,                  -- BEP 読み
  gpt_reading      TEXT                   -- ChatGPT 生成読み
);
```

> 取得クエリでは `gpt_reading → bep_reading → cmu_reading_kana` の優先順で採用。

---

## バージョン履歴

| Version | Date | 主な変更点 |
|---------|------|-----------|
| **1.1.1** | 2025‑04‑24 | CamelCase分割、記号文脈判断、顔文字処理、全角記号／数式強化、混在言語処理の改良 / デモUI更新 |
| **1.1.0** | 2025‑04‑17 | *縮約形トークン化修正* / *スマートクォート正規化* / `compact` オプション追加 / 空白最適化 |
| **1.0.2** | 2024‑09‑02 | 数字トークン改良、記号読み追加、テストケース拡充 |
| **1.0.1** | 2024‑04‑03 | 辞書修正・数字読み・エラーハンドリング強化 |
| **1.0.0** | 2023‑10‑30 | 初版リリース（149 875 語収録） |

---

## ライセンス

* **TransKana.js** MIT License  
* **Dictionary** 一部 CMUdict (© Carnegie Mellon University) を変換・拡張  
  詳細と再配布条件は `LICENSE` および cmudict ライセンスを参照。

---

## お問い合わせ

* Twitter <https://twitter.com/greenhill_pharm>  
* Twitch <https://www.twitch.tv/yakkyoku_oj3>

---

> 本ライブラリは「現状有姿」で提供されます。利用によるいかなる損害に対しても作者は責任を負いません。

