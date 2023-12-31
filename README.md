# TransKana

英文をカタカナに変換するJavaScriptコードです。

## デモサイト
- [https://yakkyoku-oj.github.io/transkana.js/index.html](https://yakkyoku-oj.github.io/transkana.js/index.html)

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
 - `cmu_reading_kana` : `cmu_reading`をカタカナに変換したテキスト（132747単語）
 - `bep_reading` : 次のデータを元に登録した英単語の読み（46404単語）
 [http://www.argv.org/bep/Windows/index.html](http://www.argv.org/bep/Windows/index.html)
 - `gpt_reading` : ChatGPTを利用して作成した英単語の読み（15921単語）
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
### Example **HTML** file:
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

## 依存関係

特にありません。

## バージョン履歴

- 1.0.0

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

本サービスは「現状有姿」および「利用可能な限り」で提供され、その可用性、正確性、信頼性、適合性、または安全性について、明示的または黙示的な保証は一切ありません。

### 責任の制限

いかなる状況においても、本サービスの利用によってあなたまたは第三者が被る直接的、間接的、偶発的、特別、結果的、または懲罰的な損害（「損害」）について、私は一切責任を負いません。

### サービスの中断または終了

本サービスを通じてユーザーが得る情報またはサービスがユーザーの期待に応える、またはエラーフリーであるという保証は一切ありません。また、本サービスの中断または終了によって発生した損害について、私は一切責任を負いません。

### セキュリティに関する免責事項

本サービスを通じて取得した情報またはサービスがあなたの期待に応える、またはエラーフリーであるという保証は一切ありません。さらに、本サービスの中断または終了によって発生した損害について、私は一切責任を負いません。

### 第三者の行為に対する免責事項

ウイルスを含む第三者による干渉または損害の可能性があります。そのような損害に対して、私は一切責任を負いません。

