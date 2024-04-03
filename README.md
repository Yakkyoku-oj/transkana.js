# TransKana.js

TransKana.jsは、英語のテキストをカタカナに変換するJavaScriptライブラリです。

## 特徴

- 英単語をカタカナに変換
- ローマ字表記をカタカナに変換
- アルファベットをカタカナに変換
- ハイフンやキャメルケースで連結された複合語に対応
- SQLiteデータベースを使用して、正確な変換を実現

## デモ

以下のURLでデモページを確認できます。

[デモページ](https://yakkyoku-oj.github.io/transkana.js/)

## インストール

適当なフォルダでリポジトリをcloneするか、右上のCodeからDownload ZIPしたものを展開してください。


## JSファイルの主な処理内容

- `transkana.js` : TransKanaクラスが定義されているソースコード
- `form.js` : デモサイト用フォーム出力用クラスが定義されているソースコード

## ライセンス（MIT）
- 当アプリのライセンスはMITライセンスとなっております。
- 当アプリ内で使用している`sql.js`はJ同様にMITライセンスとなっております。
  `sql.js`のライセンスURL : [https://github.com/sql-js/sql.js/blob/master/LICENSE](https://github.com/sql-js/sql.js/blob/master/LICENSE)
- 当アプリに使用しているデータベースをこのまま使用する場合は、Carnegie Mellon Universityのライセンスに準じる必要があります。
### cmudict0.7bのライセンス
Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.
- ソースコードの再配布の際は、上記の著作権通知と免責事項を保持する必要があります。
- バイナリ形式での再配布の場合も、同様の通知と免責事項を文書や配布物に記載する必要があります。
- このソフトウェアは「AS IS」（現状のまま）で提供され、明示的または暗黙的な保証はありません。
- Carnegie Mellon Universityやその関連者は、このソフトウェアの使用による損害に対して責任を持ちません。
- 詳細なライセンス条件については[https://github.com/Alexir/CMUdict/blob/master/LICENSE](https://github.com/Alexir/CMUdict/blob/master/LICENSE)をご参照ください。
  
## 外部リソース(sql.js)

- 辞書データベースを取得するために必要な`sql.js`は次のリポジトリにて公開されているライブラリです。
  リポジトリURL : [https://github.com/sql-js/sql.js](https://github.com/sql-js/sql.js)

## ファイル構成

- `index.html`                   - デモアプリを起動するためのHTMLファイル
- `./css/style.css`              - デモアプリで使用するスタイルシート
- `./css/reset.css`              - デモアプリで使用するスタイルシート
- `./js/transkana.js`            - 英文をカタカナに変換する処理が実装されたJavaScriptソースファイル
- `./js/form.js`                 - デモアプリを起動するためのUIが定義されているJavaScriptソースファイル
- `./dict/kanayomi.db`           - 英単語およそ16万語の読み（カタカナのみ）が登録されているSQLiteデータベース

## データベース
使用しているkanayomi.dbのテーブル構造は以下の通りです。
```sql
CREATE TABLE "T_WORDS" (
	"id"	INTEGER NOT NULL UNIQUE,
	"surface_form"	TEXT NOT NULL UNIQUE,
	"cmu_reading"	TEXT,
	"cmu_reading_kana"	TEXT,
	"bep_reading"	TEXT,
	"gpt_reading"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
)
```
 - `surfamce_form` : 英単語のスペル
 - `cmu_reading` : 次のデータを元に登録した発音記号テキスト
 [https://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b](https://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b)
 - `cmu_reading_kana` : `cmu_reading`をカタカナに変換したテキスト（およそ130000単語）
 - `bep_reading` : 次のデータを元に登録した英単語の読み（およそ46000単語）
 [http://www.argv.org/bep/Windows/index.html](http://www.argv.org/bep/Windows/index.html)
 - `gpt_reading` : ChatGPTを利用して作成した英単語の読み（およそ16000単語）
 ### データベースの取得
 transkana.js内で、以下のクエリを実行して辞書データを取得しています。`gpt_reading`を優先して取得するようになっています。
```sql
SELECT 
  surface_form,
CASE
  WHEN COALESCE(gpt_reading, '') != '' THEN gpt_reading
  WHEN COALESCE(bep_reading, '') != '' THEN bep_reading
  ELSE cmu_reading_kana
  END AS preferred_reading
FROM 
  T_WORDS;
```

# インストール手順

HTMLファイル、CSS、JSファイルリポジトリの構成のまま、全て展開してください。

## 使用方法

ファイルをサーバ環境に展開し、`index.html`をブラウザで表示してください。
`transkana.js`とkanayomi.dbのみを使用して独自のアプリに組み込む場合は、以下のようなコードを使用してください。
### Example **HTML** file(1):
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Language" content="ja">
<title>EnglishToKana</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js" integrity="sha512-VYs2RuvWreNg7oouVhZ/9bEvdPgyd5L2iCPCB8+8Qks/PHbmnc82TQOEctYoEKPveJGML8s+3NGcUEZYJrFIqg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="./js/transkana.js"></script>
<script>

  const yomi = new TransKana()
  function englishToKana(str)
  {
    if (yomi.ready === false){ alert('データベースが読み込まれていません。少々お待ちください'); return; }

    alert(yomi.exec(str));
  }

</script>
</head>
<body>

  <textarea id="text" rows="4" cols="50"></textarea>
  <button id="button" onclick="englishToKana(document.getElementById('text').value)">カタカナに変換する</button>

</body>
</html>
```

### Example **HTML** file(2):
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Language" content="ja">
<title>EnglishToKana</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js" integrity="sha512-VYs2RuvWreNg7oouVhZ/9bEvdPgyd5L2iCPCB8+8Qks/PHbmnc82TQOEctYoEKPveJGML8s+3NGcUEZYJrFIqg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="./js/transkana.js"></script>
<script>

const transKana = new TransKana();
transKana.init().then(() => {
  const checkReady = () => {
    if (transKana.ready) {
      runTestCases();
    } else {
      setTimeout(checkReady, 100);
    }
  };

  const runTestCases = () => {
    const testCases = [
      "a A",
      "hello world, this is a test.",
      "This is a hyphen-separated sentence.",
      "ThisIsCamelCaseText. ItShouldBeSeparatedAndTranslated.",
      "It's a beautiful day, isn't it?",
      "UPPERCASE, lowercase, and MixedCase words.",
      "This sentence contains 123 numbers.",
      "Ｆｕｌｌ－ｗｉｄｔｈ ｃｈａｒａｃｔｅｒｓ should be converted to half-width.",
      "Hello, world! This is a test; it should work.",
      "The quick brown fox jumps over the lazy dog. ThisIsAComplexSentence, with hyphen-separated words, numbers (123), and punctuation! It's a good test case, isn't it?"
    ];

    testCases.forEach(testCase => {
      const result = transKana.exec(testCase);
      console.log(`Input: ${testCase}`);
      console.log(`Output: ${result}`);
      console.log("---");
    });
  };

  checkReady();
});

</script>
</head>
<body>

<p>テストケースの実行。consoleを確認してください。</p>

</body>
</html>
```

## 依存関係

### `sql.js` の依存関係について
本プロジェクトでは、SQLiteデータベースからデータを取得するために、`sql.js` ライブラリを使用しています。`sql.js` は、SQLite データベースをブラウザ上で操作するための JavaScript ライブラリです。

#### 依存関係の管理
`sql.js` は、CDN 経由で読み込まれています。具体的には、以下の URL から必要なファイルを取得しています。
```javascript
const sqlPromise = initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
});
```

このため、本プロジェクトをローカル環境で実行する場合、インターネット接続が必要となります。

#### 留意点
`sql.js` のバージョンアップに伴い、API の変更や非互換性が発生する可能性があります。そのため、`sql.js` のバージョンを変更する際は、十分な検証が必要です。

また、`sql.js` は、ブラウザ上でSQLiteデータベースを操作するため、大規模なデータベースの処理には適していません。本プロジェクトでは、比較的小さなデータセットを扱うことを前提としています。

#### ライセンス
`sql.js` は、MIT ライセンスのもとで提供されています。ライセンスの詳細については、sql.js のGitHubリポジトリを参照してください。
 - [リポジトリURL](https://github.com/sql-js/sql.js)

## バージョン履歴

- 1.0.0 公開
- 1.0.1 更新 2024/04/02
  - 辞書データベースの修正
    - 単語の末尾に(n)が付加されていたレコードを削除
    - 単語の読みを修正
      - it = イット
      - or = オア
      - no = ノウ
  - TransKanaクラスの修正
    - 数字トークンの抽出（電話番号、カンマ区切り、数字の連続）
    - 数字トークンのカタカナ変換を実装
    - 記号のマッピング
    - 辞書データベース取得時のエラーハンドリングを修正
    - その他
  - デモ用サイト(index.html)の更新
    - テストケース用JavaScriptの追加（結果はconsoleに出力）
  - README
- 1.0.1 更新 2024/04/03
  - 辞書データベースの修正
    - 数字トークン用の単語を追加
      - quadrillion = グワドリリオン(発音記号は推測)
  - TransKanaクラスの修正
    - 数字トークンの処理を修正
    - シングルクォーテーションの前後にスペースを付加する処理を追加

## クレジット

- `sql.js`はAlcaDesign様が開発したライブラリで、次のリポジトリにて公開されています。
  - [リポジトリURL](https://github.com/sql-js/sql.js)

- `TransKana`クラス内で使用している、ローマ字表記をカタカナに変換する処理は、下記サイトより取得したコードを使用しています。
  - [JavaScriptでローマ字をカタカナに変換する関数](https://qiita.com/recordare/items/35a27f6b88b9413fef91)


## 問い合わせ先

- Twitter: [https://twitter.com/greenhill_pharm](https://twitter.com/greenhill_pharm)
- Twitchチャンネル: [https://www.twitch.tv/yakkyoku_oj3](https://www.twitch.tv/yakkyoku_oj3)

## 免責事項

### 一般的な免責事項
本ライブラリは「現状有姿」で提供され、明示的または黙示的な保証は一切ありません。

### 責任の制限
本ライブラリの利用によって生じたいかなる損害についても、開発者は一切の責任を負いません。

### 第三者の行為に対する免責事項
本ライブラリの利用に関連して、第三者による干渉や損害が生じる可能性があります。そのような損害に対して、開発者は一切の責任を負いません。

### ライブラリの変更または終了
開発者は、予告なく本ライブラリの変更または提供の終了を行う権利を有します。これによって生じた損害について、開発者は一切の責任を負いません。
