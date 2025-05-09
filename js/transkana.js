/**
 * Project: EnglishToKatakana
 * File: transkana.js
 * Author: [Yakkyoku_oj3]
 * Contact: https://twitter.com/greenhill_pharm
 * Created Date: 2023-10-30
 * Modified Date: 2025-04-24
 *
 * License: [The MIT License (MIT)]
 * Version: 1.1.1
 * 
 * Copyright (c) 2023-2025, Yakkyoku_oj3.
 * 
 * [cmudict-0.7b]
 * Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.
 * https://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b
 */

class TransKana {
  constructor() {
    this.map = null;
    this.ready = false;
    this.init();
  }

  /**
   * 初期化メソッド
   * SQLiteデータベースから単語とカタカナのマッピングデータを取得し、mapプロパティに格納する
   */
  async init() {
    if (!this.map) {
      this.map = new Map();

      try {
        const db = await this._initializeSqlJs();
        if (!db) {
          throw new Error('Failed to initialize SQL.js');
        }

        const query = `
        SELECT 
            surface_form,
            CASE
                WHEN COALESCE(gpt_reading, '') != '' THEN gpt_reading
                WHEN COALESCE(bep_reading, '') != '' THEN bep_reading
                ELSE cmu_reading_kana
            END AS preferred_reading
        FROM 
            T_WORDS;
        `;

        try {
          const contents = db.exec(query);
          for (let row of contents[0].values) {
            // シングルクォーテーションが連続している場合は置換
            this.map.set(row[0].replaceAll("''", "'"), row[1]);
          }
          this.ready = true;
        } catch (error) {
          console.error('Error executing SQL query:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error initializing TransKana:', error);
        throw error;
      }
    }
  }

  /**
   * SQL.jsを初期化するメソッド
   * @returns {Promise<Database>} SQLiteデータベースオブジェクト
   */
  async _initializeSqlJs() {
    try {
      const sqlPromise = initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      const dataPromise = fetch(`./dict/kanayomi.db`).then(res => res.arrayBuffer());
      const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
      return new SQL.Database(new Uint8Array(buf));
    } catch (error) {
      console.error('Error initializing SQL.js:', error);
      throw error;
    }
  }

  /**
   * _isNumber - 文字列が正しい数値形式であるかを判定するメソッド
   * 
   * 負の数値、カンマ区切りの数値、小数点を含む数値に対応しています。
   * 
   * @param {string} value - 判定する文字列。
   * @returns {boolean} 文字列が数値形式の場合は true、そうでない場合は false。
   */
  _isNumber(value) {
    const textProcessor = this.getTextTokenizer();
    return textProcessor.isNumber(value) || textProcessor.isPhoneNumber(value);
  }


  /**
   * _isFaceLikeSymbol - 文字列が顔文字のように記号の連続であるかどうかを判定するメソッド
   * 
   * @param {string} value -
   * @returns 
   */
  _isFaceLikeSymbol(value) {
    return (
      value.length >= 2 &&
      /^[^a-zA-Z0-9\u3040-\u30FF\u4E00-\u9FFF\s]+$/.test(value) &&
      /[\(\)\[\]{}・]/.test(value)
    );
  }
  
  /**
   * _isMathContext - 記号の前後の文字列が数式構文であるかを判定する
   *
   * @param {string} prev - 記号の直前のトークン値
   * @param {string} next - 記号の直後のトークン値
   * @returns {boolean} true = 数式とみなす, false = 通常記号（例: スラッシュ）
   */
  _isMathContext(prev, next) {
    // 数値（小数も含む）
    const isNumeric = (s) => /^\d+(\.\d+)?$/.test(s);

    // 変数（英字単語、1文字以上。小文字・大文字問わず）
    const isVariable = (s) => /^[a-zA-Z]{1,10}$/.test(s);

    // A/C のような略語回避（大文字1文字のみの英字同士）
    if (/^[A-Z]$/.test(prev) && /^[A-Z]$/.test(next)) return false;

    // 略語風の文字列（例: mc, cm, AC）で数字と組み合わさる場合 → 数式とみなす
    if ((isVariable(prev) || isNumeric(prev)) && (isVariable(next) || isNumeric(next))) {
      return true;
    }

    return false;
  }

  /**
   * convertSplitWords - ハイフンやキャメルケースで連結された単語を含む文字列をカタカナ表記に変換するメソッド
   * 
   * まずハイフンを削除しキャメルケースに統一、次にキャメルケースの単語を分割し、
   * それぞれをカタカナに変換して中黒で連結した文字列を返します。
   * 
   * @param {string} word - 変換対象の文字列。
   * @returns {string} 変換後のカタカナ表記文字列。
   */
  _convertSplitWords(word) {
    // ハイフンを取り除き、後続の文字を大文字に変換してキャメルケースに統一
    const sanitizedWord = word.replace(/^[,\.]|[,\.]$/g, '');
    const halfWidthWord = this._convertToHalfWidth(sanitizedWord);
    const unifiedCamelCase = halfWidthWord.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    // キャメルケースでの分解
    const camelWords = this._splitCamelCase(unifiedCamelCase);
    const kanaArray = camelWords.map(w => {
      const lowerW = this._convertToLower(w);
      if (lowerW === 'a') return 'ア';
      return this.map.has(lowerW) ? this.map.get(lowerW) : this._convertReadableFormat(lowerW);
    });

    // 空要素を削除し、中黒で連結して返却
    return kanaArray.filter(Boolean).join('・');
  }

  /**
   * _splitCamelCase - キャメルケースで書かれた文字列を単語ごとに分割するメソッド
   * 
   * キャメルケースの文字列は、単語の区切りが大文字で表され、スペースを使用せずに複数の単語が連結された形式です。
   * このメソッドは、小文字または数字の後に大文字が来る場所を見つけ、その前にスペースを挿入して文字列を分割します。
   * 分割された文字列は、元のキャメルケースの単語が配列の各要素として返されます。
   * 
   * @param {string} str - キャメルケースで書かれた文字列。
   * @returns {string[]} キャメルケースの文字列を単語ごとに分割した配列。
   */
  _splitCamelCase(str) {
    return str.match(/([A-Z]+(?=[A-Z][a-z])|[A-Z][a-z]+|[a-z]+)/g) || [str];
  }

  /**
   * _convertReadableFormat - ローマ字とアルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  _convertReadableFormat(word) {
    const romanConverted = this._convertRomanToKana(word);
    return this._convertAlphabet(romanConverted);
  }

  /**
   * _convertAlphabet - アルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  _convertAlphabet(word) {
    // 単一アルファベットからカタカナへのマッピング
    const alphabets = Array.from(word);
    const basicMapping = this.getBasicMap();
    const kanaAlphabets = alphabets.map(alphabet => basicMapping[alphabet] || alphabet);
    return kanaAlphabets.join('');
  }

  /**
   * _convertRomanToKana - ローマ字表記の変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  _convertRomanToKana(original) {
    const str = this._convertToLower(original); // 全角→半角→小文字
    const tree = this.getRomanTree();
    let result = '';
    let tmp = '';
    let index = 0;
    const len = str.length;
    let node = tree;
    const push = (char, toRoot = true) => {
      result += char;
      tmp = '';
      node = toRoot ? tree : node;
    };

    while (index < len) {
      const char = str.charAt(index);
      if (char.match(/[a-z]/)) { // 英数字以外は考慮しない
        if (char in node) {
          const next = node[char];
          if (typeof next === 'string') {
            push(next);
          } else {
            tmp += original.charAt(index);
            node = next;
          }
          index++;
          continue;
        }
        const prev = str.charAt(index - 1);
        if (prev && (prev === 'n' || prev === char)) {
          push(prev === 'n' ? 'ン' : 'ッ', false);
        }
        if (node !== tree && char in tree) { // 今のノードがルート以外だった場合、仕切り直してチェックする
          push(tmp);
          continue;
        }
      }
      push(tmp + char);
      index++;
    }
    tmp = tmp.replace(/n$/, 'ン'); // 末尾のnは変換する
    push(tmp);
    return result;
  }

  /**
   * 入力された文字列を半角文字に変換した後、小文字に変換します。
   * 
   * @param {string} word - 変換する文字列。
   * @returns {string} 半角小文字に変換された文字列。
   */
  _convertToLower(word) {
    const halfWidthWord = this._convertToHalfWidth(word)
    return halfWidthWord.toLowerCase();
  }

  /**
   * 入力された文字列の全角文字を対応する半角文字に変換します。
   * 特定の記号（ダブルクオーテーション、シングルクオーテーション、バッククオート、バックスラッシュ、スペース、チルダ）については、
   * 文字コードのシフトだけでなく個別の置換処理が適用されます。
   * 
   * @param {string} strVal - 変換する文字列。
   * @returns {string} 全角文字が半角に変換された文字列。
   */
  _convertToHalfWidth(strVal) {
    // 半角変換
    var halfVal = strVal.replace(/[！-～]/g,
      function (tmpStr) {
        // 文字コードをシフト
        return String.fromCharCode(tmpStr.charCodeAt(0) - 0xFEE0);
      }
    );

    // 文字コードシフトで対応できない文字の変換
    return halfVal.replace(/”/g, "\"")
      .replace(/’/g, "'")
      .replace(/‘/g, "`")
      .replace(/￥/g, "\\")
      .replace(/　/g, " ")
      .replace(/〜/g, "~");
  }

  /**
   * convertNumToText - 入力された数字トークンを英文表記に変換するメソッド
   * 
   * 数字トークンはカンマ区切りも受け付け、小数部分は2桁まで考慮されます。
   * 数値が負の場合は "negative" が先頭に付き、範囲外（Number.MAX_SAFE_INTEGERを超える）の場合は "over" として表現されます。
   * 
   * @param {string} input - 変換する数値の文字列表現。
   * @returns {string} 数値を英文表記に変換した文字列。無効な入力の場合は "Invalid-number" を返します。
   */
  _convertNumToText(input) {
    const textProcessor = this.getTextTokenizer();
  
    if (!textProcessor.isPhoneNumber(input) && textProcessor.isNumber(input)) {
      // 通常の数値変換処理...
      // 数値を浮動小数点数に変換
      let num = parseFloat(input.replace(/,/g, ''));

      // 数値が無効な場合はエラーメッセージを返す
      if (isNaN(num)) return 'Invalid-number';
  
      // 負の数値の処理
      let prefix = '';
      if (num < 0) {
        prefix = 'negative-';
        num = -num; // 数値を正の数に変換
      }
  
      // 小数点以下の処理
      let decimalPart = '';
      if (num % 1 !== 0) {
        const decimals = num.toString().split('.')[1].slice(0, 2); // 小数点以下2桁を取得
        decimalPart = '-point-' + [...decimals].map(d => this._numberToWords(parseInt(d, 10))).join('-');
        num = Math.floor(num); // 小数点以下を切り捨て
      }
  
      // 範囲外の数値の処理
      if (num > Number.MAX_SAFE_INTEGER) {
        return prefix + `over-${this._numberToWords(Number.MAX_SAFE_INTEGER)}-(${Number.MAX_SAFE_INTEGER.toLocaleString()})` + decimalPart;
      }
  
      // 整数部分の数値を英文表記に変換
      const resultText = (prefix + this._numberToWords(num) + decimalPart).replace(/\-+/g, '-');
      return resultText;

    } else {
      // 電話番号形式に一致する場合、各数字を英単語に変換して連結
      return input.split('').map(char => {
        if (/\d/.test(char)) {
          return this._numberToWords(parseInt(char));
        } else if (char === '-' || char === ' ') {
          return 'hyphen';
        } else {
          return char;  // その他の文字（例: 括弧やプラス記号）はそのまま保持
        }
      }).join(' ');
    }
  }
  

  /**
   * _numberToWords - 指定された数値を英単語に変換するメソッド
   * 
   * 0から19までは個別の単語を使用し、20以上は適切な英単語に分割して表現します。
   * 1000以上の数値は "thousand"、"million" などの単位を用いて表現されます。単語の区切りは空白で行われます。
   * 
   * @private
   * @param {number} num - 変換する数値。
   * @returns {string} 数値を英単語に変換した文字列。末尾の空白は削除されます。
   */
  _numberToWords(num) {
    if (num === 0) return 'zero'; // 数値が0の場合は 'zero' を返す
  
    // 単位とスケールに対応する英語の単語のリスト
    const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion'];
  
    // 数値を英語の単語に変換するための再帰関数
    function convert(n, depth) {
      if (n === 0) return ''; // 再帰の基底条件: 0の場合は空文字を返す
      else if (n < 20) return units[n] + ' '; // 20未満の場合は units 配列から対応する単語を取得
      else if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + units[n % 10] : ''); // 100未満の場合は tens と units 配列を使用して単語を生成
      else if (n < 1000) return units[Math.floor(n / 100)] + ' hundred ' + (n % 100 ? convert(n % 100, depth + 1) : '').trim(); // 1000未満の場合は hundreds を使用して単語を生成
      else {
        // 1000以上の場合は適切なスケールで数値を分割し、各部分を再帰的に変換
        for (let i = scales.length - 1; i > 0; i--) {
          const scaleDivider = Math.pow(1000, i); // 現在のスケールに対応する数値を計算
          if (n >= scaleDivider) {
            const scalePart = convert(Math.floor(n / scaleDivider), depth + 1).trim(); // スケール部分の数値を変換
            const remainder = n % scaleDivider; // 残りの数値を計算
            return scalePart + ' ' + scales[i] + (remainder ? ' ' + convert(remainder, depth + 1) : ''); // スケール部分と残りの部分を結合
          }
        }
      }
    }
  
    const words = convert(num, 0).trim(); // 再帰関数を呼び出して、結果の文字列の前後の空白をトリム
    return words.replace(/\s+/g, ' ').trim(); // 余分な空白を1つの空白に置換し、末尾の空白を削除
  }
  
  /**
   * fetchKana - 単語をカタカナに変換するメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   * fetchKana('English');
   */
  fetchKana(token, context = {}) {
    const hasJapanese = context.hasJapanese;
    const prev = context.prev;
    const next = context.next;
    const { value, type, scriptHint } = token;
  
    // --- 文脈的 "a" / "A" の処理 ---
    if ((value === 'a' || value === 'A')) {
      if (type === 'word' && scriptHint === 'latin' && /^[a-zA-Z]/.test(next)) {
        return 'ア';  // Exp: a pen
      }
      if (scriptHint === 'latin' && hasJapanese) {
        return 'エー';  // Exp: Aじゃん
      }
      return 'エー';  // Exp: Plan A / Type A
    }

    const halfWord = this._convertToHalfWidth(value);
    
    // --- 数値トークン（半角）として英語読みする場合 ---
    if (type === 'number' && scriptHint === 'latin' && hasJapanese === false) {
      const numberText = this._convertNumToText(halfWord);
      return this._convertSplitWords(numberText);
    }
  
    // --- 日本語文中の数値：そのまま半角数値で返す ---
    if (type === 'number' && scriptHint !== 'latin') {
      return halfWord;
    }

    // --- 記号トークンの場合 ---
    if (type === 'symbol') {
      const mathMap = this.getMathOperatorMap();
      const generalMap = this.getGeneralSymbolMap();

      if (this._isFaceLikeSymbol(value)) {
        return value;  // 顔文字などはそのまま返す
      }

      // 優先：数学文脈 → mathMap、それ以外 → generalMap
      if (this._isMathContext(prev, next) && mathMap[value]) {
        return mathMap[value];
      }

      return generalMap[value] || value;
    }
  
    // --- 通常の辞書判定（カンマ・ピリオド除去後） ---
    const lowerWord = this._convertToLower(halfWord);
    const sanitizedWord = lowerWord.replace(/^[,\.]+|[,\.]+$/g, '');
  
    if (this.map.has(sanitizedWord)) {
      const result = this.map.get(sanitizedWord);
      return lowerWord.match(/\.$/) ? result + "。" : result;
    }
  
    // --- Fallback：数字文字列の読み上げチェック ---
    if (this._isNumber(lowerWord) && hasJapanese === false) {
      const numberText = this._convertNumToText(lowerWord);
      return this._convertSplitWords(numberText);
    }

    if (type === 'symbol') {
      const symbolKanaMap = this.getMathOperatorMap();
      if (this._isFaceLikeSymbol(value)) return value;
      return symbolKanaMap[value] || value;
    }
  
    // --- Fallback：辞書にも数値でもない → 分解して音変換 ---
    return this._convertSplitWords(value);
  }

  /**
   * exec - 入力された文章をトークンに分割し、各トークンをカタカナ変換する。
   * 主に TTS（テキスト読み上げ）用として、英語をカタカナ化し、日本語と混在する文脈にも対応。
   *
   * @function
   * @param {string} input_text - 処理対象の入力文字列
   * @param {boolean} [compact=false] - 出力をコンパクト（不要なスペース除去）にするかどうか
   * @returns {string} カタカナ変換後の文字列
   * 
   * @example
   * exec("It's a beautiful day.") // => "イッツ ア ビューティフル デイ."
   */
  exec(input_text, compact = false) {
    // トークナイザーインスタンスの取得とトークン化の実行
    const textProcessor = this.getTextTokenizer();
    const tokens = textProcessor.extractTokens(input_text);
  
    const mergedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const current = tokens[i];

      // 顔文字や記号群などの「連続symbolトークン」を1トークンにまとめる
      if (current.type === 'symbol') {
        let combinedValue = current.value;
        let j = i + 1;
    
        while (j < tokens.length && tokens[j].type === 'symbol') {
          combinedValue += tokens[j].value;
          j++;
        }
    
        mergedTokens.push({
          ...current,
          value: combinedValue
        });
        i = j - 1; // 次のsymbol群はスキップ
      } else {
        mergedTokens.push(current);
      }
    }

    // 日本語が1つでも含まれていれば true（文脈判断に利用）
    const hasJapanese = mergedTokens.some(t => t.type === 'japanese');

    // 各トークンをカタカナへ変換（前後情報付きで fetchKana に渡す）
    const parts = mergedTokens.map((token, idx) => {
      const prev = mergedTokens[idx - 1]?.value || '';
      const next = mergedTokens[idx + 1]?.value || '';

      switch (token.type) {
        case 'word':
        case 'number':
        case 'phone':
        case 'symbol':
          return this.fetchKana(token, { compact, hasJapanese, prev, next });

        // 日本語や句読点、その他はそのまま出力
        default:
          return token.value;
      }
    });

    // 各要素をスペースで結合
    let result = parts.join(' ');

    // 句読点の前後、日本語と数字の間の不要スペースを削除
    result = result
      .replace(/\s+([,、.。!！?？])/g, '$1')      // 句読点の直前
      .replace(/([,、.。!！?？])\s+/g, '$1 ')     // 句読点の直後（1スペース維持）
      .replace(/([\u3040-\u30FF\u4E00-\u9FAF])\s+(\d)/g, '$1$2') // 和文＋数字
      .replace(/(\d)\s+([\u3040-\u30FF\u4E00-\u9FAF])/g, '$1$2'); // 数字＋和文

    // コンパクトモード：不要スペース除去（カタカナと英字の接続など）
    if (compact) {
      result = result
        .replace(/([\u3040-\u30FF\u4E00-\u9FAF])\s+([A-Za-z\u30A0-\u30FF]+)/g, '$1$2')
        .replace(/([A-Za-z\u30A0-\u30FF]+)\s+([\u3040-\u30FF\u4E00-\u9FAF])/g, '$1$2')
        .replace(/([\u30A0-\u30FF]+)\s+([A-Za-z]+)/g, '$1$2')
        .replace(/([A-Za-z]+)\s+([\u30A0-\u30FF]+)/g, '$1$2');
    }

    return result.trim();
  }

  

  /**
   * getBasicmap - アルファベットと記号変換用のマッピングデータを返すメソッド
   * 
   * @function
   * @returns {object} keyがアルファベット、valueがカタカナのマッピングデータ
   * @example
   */
  getBasicMap() {
    return {
      'a': 'エー',
      'b': 'ビー',
      'c': 'シー',
      'd': 'ディー',
      'e': 'イー',
      'f': 'エフ',
      'g': 'ジー',
      'h': 'エイチ',
      'i': 'アイ',
      'j': 'ジェイ',
      'k': 'ケー',
      'l': 'エル',
      'm': 'エム',
      'n': 'エヌ',
      'o': 'オー',
      'p': 'ピー',
      'q': 'キュー',
      'r': 'アール',
      's': 'エス',
      't': 'ティー',
      'u': 'ユー',
      'v': 'ヴィー',
      'w': 'ダブリュー',
      'x': 'エックス',
      'y': 'ワイ',
      'z': 'ズィー',
      '=': 'イコール',
      '+': 'プラス',
      '*': 'アスタリスク',
      '/': 'スラッシュ',
      '%': 'パーセント',
      '^': 'ケアット',
      '&': 'アンパサンド',
      '@': 'アット',
      '#': 'ハッシュ',
      '$': 'ドル',
      '~': 'チルダ'
    };
  }

  /**
   * getRomanTree - ローマ字表記変換用のマッピングデータを返すメソッド
   * 
   * @function
   * @returns {object} 母音と子音、
   * @example
   */
  getRomanTree() {
    return {
      a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ',
      k: {
        a: 'カ', i: 'キ', u: 'ク', e: 'ケ', o: 'コ',
        y: { a: 'キャ', i: 'キィ', u: 'キュ', e: 'キェ', o: 'キョ' },
      },
      s: {
        a: 'サ', i: 'シ', u: 'ス', e: 'セ', o: 'ソ',
        h: { a: 'シャ', i: 'シ', u: 'シュ', e: 'シェ', o: 'ショ' },
        y: { a: 'シャ', i: 'シィ', u: 'シュ', e: 'シェ', o: 'ショ' },
      },
      t: {
        a: 'タ', i: 'チ', u: 'ツ', e: 'テ', o: 'ト',
        h: { a: 'テャ', i: 'ティ', u: 'テュ', e: 'テェ', o: 'テョ' },
        y: { a: 'チャ', i: 'チィ', u: 'チュ', e: 'チェ', o: 'チョ' },
        s: { a: 'ツァ', i: 'ツィ', u: 'ツ', e: 'ツェ', o: 'ツォ' },
      },
      c: {
        a: 'カ', i: 'シ', u: 'ク', e: 'セ', o: 'コ',
        h: { a: 'チャ', i: 'チ', u: 'チュ', e: 'チェ', o: 'チョ' },
        y: { a: 'チャ', i: 'チィ', u: 'チュ', e: 'チェ', o: 'チョ' },
      },
      q: {
        a: 'クァ', i: 'クィ', u: 'ク', e: 'クェ', o: 'クォ',
      },
      n: {
        a: 'ナ', i: 'ニ', u: 'ヌ', e: 'ネ', o: 'ノ', n: 'ン',
        y: { a: 'ニャ', i: 'ニィ', u: 'ニュ', e: 'ニェ', o: 'ニョ' },
      },
      h: {
        a: 'ハ', i: 'ヒ', u: 'フ', e: 'ヘ', o: 'ホ',
        y: { a: 'ヒャ', i: 'ヒィ', u: 'ヒュ', e: 'ヒェ', o: 'ヒョ' },
      },
      f: {
        a: 'ファ', i: 'フィ', u: 'フ', e: 'フェ', o: 'フォ',
        y: { a: 'フャ', u: 'フュ', o: 'フョ' },
      },
      m: {
        a: 'マ', i: 'ミ', u: 'ム', e: 'メ', o: 'モ',
        y: { a: 'ミャ', i: 'ミィ', u: 'ミュ', e: 'ミェ', o: 'ミョ' },
      },
      y: { a: 'ヤ', i: 'イ', u: 'ユ', e: 'イェ', o: 'ヨ' },
      r: {
        a: 'ラ', i: 'リ', u: 'ル', e: 'レ', o: 'ロ',
        y: { a: 'リャ', i: 'リィ', u: 'リュ', e: 'リェ', o: 'リョ' },
      },
      w: { a: 'ワ', i: 'ウィ', u: 'ウ', e: 'ウェ', o: 'ヲ' },
      g: {
        a: 'ガ', i: 'ギ', u: 'グ', e: 'ゲ', o: 'ゴ',
        y: { a: 'ギャ', i: 'ギィ', u: 'ギュ', e: 'ギェ', o: 'ギョ' },
      },
      z: {
        a: 'ザ', i: 'ジ', u: 'ズ', e: 'ゼ', o: 'ゾ',
        y: { a: 'ジャ', i: 'ジィ', u: 'ジュ', e: 'ジェ', o: 'ジョ' },
      },
      j: {
        a: 'ジャ', i: 'ジ', u: 'ジュ', e: 'ジェ', o: 'ジョ',
        y: { a: 'ジャ', i: 'ジィ', u: 'ジュ', e: 'ジェ', o: 'ジョ' },
      },
      d: {
        a: 'ダ', i: 'ヂ', u: 'ヅ', e: 'デ', o: 'ド',
        h: { a: 'デャ', i: 'ディ', u: 'デュ', e: 'デェ', o: 'デョ' },
        y: { a: 'ヂャ', i: 'ヂィ', u: 'ヂュ', e: 'ヂェ', o: 'ヂョ' },
      },
      b: {
        a: 'バ', i: 'ビ', u: 'ブ', e: 'ベ', o: 'ボ',
        y: { a: 'ビャ', i: 'ビィ', u: 'ビュ', e: 'ビェ', o: 'ビョ' },
      },
      v: {
        a: 'ヴァ', i: 'ヴィ', u: 'ヴ', e: 'ヴェ', o: 'ヴォ',
        y: { a: 'ヴャ', i: 'ヴィ', u: 'ヴュ', e: 'ヴェ', o: 'ヴョ' },
      },
      p: {
        a: 'パ', i: 'ピ', u: 'プ', e: 'ペ', o: 'ポ',
        y: { a: 'ピャ', i: 'ピィ', u: 'ピュ', e: 'ピェ', o: 'ピョ' },
      },
      x: {
        a: 'ァ', i: 'ィ', u: 'ゥ', e: 'ェ', o: 'ォ',
        y: {
          a: 'ャ', i: 'ィ', u: 'ュ', e: 'ェ', o: 'ョ',
        },
        t: {
          u: 'ッ',
          s: {
            u: 'ッ',
          },
        },
      },
      l: {
        a: 'ァ', i: 'ィ', u: 'ゥ', e: 'ェ', o: 'ォ',
        y: {
          a: 'ャ', i: 'ィ', u: 'ュ', e: 'ェ', o: 'ョ',
        },
        t: {
          u: 'ッ',
          s: {
            u: 'ッ',
          },
        },
      },
    };
  }
  getMathOperatorMap() {
    return {
      '+': 'プラス',
      '-': 'マイナス',
      '*': 'タイムズ',
      '/': 'ディバイディッド バイ',
      '=': 'イコール',
      '%': 'モジュロ',
      '^': 'パワー',
      '<': 'レス ザン',
      '>': 'グレーター ザン',
      '<=': 'レス ザン オア イコール',
      '>=': 'グレーター ザン オア イコール',
      '!=': 'ノット イコール',
      '==': 'ダブル イコール',
      '===': 'トリプル イコール',
      '!==': 'ノット トリプル イコール',
      '&&': 'アンド',
      '||': 'オア',
      '!': 'ノット',
      '~': 'チルダ',
      '<<': 'レフト シフト',
      '>>': 'ライト シフト',
      '&': 'ビット アンド',
      '|': 'ビット オア'
    };
  };

  getGeneralSymbolMap() {
    return {
      '*': 'アスタリスク',
      '/': 'スラッシュ',
      '+': 'プラス',
      '-': 'ハイフン',
      '=': 'イコール',
      '%': 'パーセント',
      '^': 'キャレット',
      '<': 'レス ザン',
      '>': 'グレーター ザン',
      '&': 'アンド',
      '|': 'バーティカルバー',
      '~': 'チルダ',
      '#': 'シャープ',
      '@': 'アットマーク',
      '\\': 'バックスラッシュ',
      ':': 'コロン',
      ';': 'セミコロン'
    };
  }

  /**
   * getTextTokenizer - TextTokenizer クラスのインスタンスを生成して返すファクトリーメソッド
   * 
   * TextTokenizer クラスは、テキスト処理のためのメソッドを提供します。これには、
   * ダブルクォーテーションで囲まれたテキストや記号の前後にスペースを挿入し、
   * 数字と文字の間にスペースを挿入してトークンを抽出する機能が含まれます。
   * 
   * @returns {TextTokenizer} TextTokenizer クラスの新しいインスタンス。
   */
  getTextTokenizer() {
    class TextTokenizer {
      constructor() {
        // 全角英数字を含むパターン
        this.fullWidthAlphanumericPattern = /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/;

        // 日本語文字を含むパターン（全角英数字を除外）
        this.japanesePattern = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/;

        // 数値パターン（全角数字＋全角ピリオド・カンマも含む）
        this.numberPattern = /[-+]?[\d\uFF10-\uFF19\-.,\uFF0E\uFF0C]+/;

        // 数値パターン（カンマ区切り）
        this.commaSeparatedNumberPattern = /^[\d\uFF10-\uFF19]{1,3}(?:[,\uFF0C][\d\uFF10-\uFF19]{3})*(?:[.\uFF0E][\d\uFF10-\uFF19]+)?$/;

        // 数値パターン（カンマなし）
        this.normalNumberPattern = /^[-+]?\d+(?:\.\d+)?$/;

        // 数値パターン（電話番号ハイフン区切り）
        this.phonePattern = /^\d{2,3}-\d{3,4}-\d{4}$/;

        // 数値パターン（ハイフン区切り）
        this.hyphenSeparatedNumberPattern = /^[\d\uFF10-\uFF19]+(-[\d\uFF10-\uFF19]+)*$/;

        // 単語パターン（数字を含まない）
        this.wordPattern = /[A-Za-z\uFF21-\uFF3A\uFF41-\uFF5A]+(?:['-][A-Za-z\uFF21-\uFF3A\uFF41-\uFF5A]+)*/;

        // 句読点パターン
        this.punctuationPattern = /^[,、.．]$/;

        // クォーテーションパターン
        this.singleQuotedPattern = /'([^']*)'/g;
        this.doubleQuotedPattern = /"([^"]*)"/g;

        // 記号と読み上げ対象外の文字パターン
        this.symbolPattern = new RegExp(
          `[=+\\-*\\/\\%^&|~@#$<>\\[\\]{}()（）「」『』【】・…！？!?。、、・：；・ー゛゜～` +
          `\u0370-\u03FF` + // Greek
          `\u0400-\u04FF` + // Cyrillic
          `\u0600-\u06FF` + // Arabic
          `\u0900-\u097F` + // Devanagari
          `\u1F000-\u1FAFF` + // Misc emoji (optional)
          `\u2200-\u22FF` + // 数学記号
          `\u2300-\u23FF` + // Misc Technical
          `\u2600-\u26FF` + // Misc Symbols
          `\u2100-\u214F` + // Letterlike
          `\u2500-\u259F` + // Box Drawing + Block Elements
          `\uFF00-\uFFEF` + // Fullwidth
          `]`
        );

        // トークン分割用パターン
        this.combinedPattern = new RegExp(
          `(${this.numberPattern.source})|(${this.wordPattern.source})|(${this.japanesePattern.source})|(${this.punctuationPattern.source})|(${this.symbolPattern.source})`,
            'g'
        );
      
      }
  
      // ダブルクォーテーションで囲まれたテキストと記号、数字が単語に囲まれている場合の前後にスペースを挿入
      _insertSpaces(text) {
        return text
          .replace(this.singleQuotedPattern, " ' $1 ' ")  
          .replace(this.doubleQuotedPattern, " \" $1 \" ")
          .replace(this.symbolPattern, ' $1 ')
          .replace(/([a-zA-Z]+)(\-)([a-zA-Z]+)/g, '$1 $3')
          .replace(/([a-zA-Z]+)(\-)([0-9]+)/g, '$1 $3')
          .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
          .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
          .replace(/([、])([^\s])/g, '$1 $2') // 句読点の後にスペースを挿入
          .replace(/([^\s])([、])/g, '$1 $2') // 句読点の前にスペースを挿入
          .replace(/\s+/g, ' ').trim();
      }

      _formatNumbersInText(text) {
        // 数値をカンマ区切りに変換
        return text.replace(this.numberPattern, (match) => {
          // 負の数かどうかを確認
          const isNegative = match.startsWith('-');
          // 絶対値を取得
          const absValue = isNegative ? match.slice(1) : match;
          
          // 整数部分と小数部分を分離
          const [integerPart, decimalPart] = absValue.split('.');
          
          // 整数部分にカンマを挿入
          const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          
          // フォーマットされた数値を構築
          let formattedNumber = formattedInteger;
          if (decimalPart) {
            formattedNumber += '.' + decimalPart;
          }
          if (isNegative) {
            formattedNumber = '-' + formattedNumber;
          }
          
          return formattedNumber;
        });
      }

      // トークン分割処理
      extractTokens(text) {
        const tokens = [];
        const formattedText = this.processQuotes(this._formatNumbersInText(text));
        
        let match;

        while ((match = this.combinedPattern.exec(formattedText)) !== null) {
          const tokenText = match[0].trim();
          const type = this.getTokenType(tokenText);
          const scriptHint = this.detectScriptType(tokenText);
          
          const values = (type === 'number' && this.hyphenSeparatedNumberPattern.test(tokenText))
            ? tokenText.split("-")
            : [type === 'number' ? this._formatNumbersInText(tokenText) : tokenText];

          for (const value of values) {
            tokens.push({ type, value, scriptHint });
          }
        }
        
        return tokens;
      }

      // トークン種別判定（getTokenType）
      getTokenType(token) {
        const isNum = this.isNumber(token);
        const scriptType = this.detectScriptType(token);

        if (this.punctuationPattern.test(token) && !isNum) return 'punctuation';
        if (this.japanesePattern.test(token) && !this.fullWidthAlphanumericPattern.test(token)) return 'japanese';

        if (this.wordPattern.test(token)) return 'word';

        if (this.numberPattern.test(token)) {
          if (this.phonePattern.test(token)) return 'phone';
          if (this.normalNumberPattern.test(token) || this.commaSeparatedNumberPattern.test(token)) return 'number';
        }

        if (this.symbolPattern.test(token) || scriptType === 'unknown') return 'symbol';

        if (/^[\u0400-\u04FF]+$/.test(token)) return 'foreign-word';

        return 'word';
      }

      // 文字スクリプト種別判定（detectScriptType）
      detectScriptType(text) {
        if (/^[\u0400-\u04FF]+$/.test(text)) return 'cyrillic';
        if (/^[\u0370-\u03FF]+$/.test(text)) return 'greek';
        if (/^[\u0600-\u06FF]+$/.test(text)) return 'arabic';
        if (/^[\u0900-\u097F]+$/.test(text)) return 'devanagari';
        if (/^[\u3040-\u309F]+$/.test(text)) return 'hiragana';
        if (/^[\u30A0-\u30FFー]+$/.test(text)) return 'katakana';
        if (/^[\u4E00-\u9FFF]+$/.test(text)) return 'kanji';
        if (/^[A-Za-z0-9.,%+\-]+$/.test(text)) return 'latin';
        if (/^[\uFF10-\uFF19]+$/.test(text)) return 'full-width-number';
        return 'unknown';
      }

      isNumber(value) {
        return this.normalNumberPattern.test(value) || this.commaSeparatedNumberPattern.test(value);
      }
    
      isPhoneNumber(value) {
        return this.phonePattern.test(value);
      }

      processJapaneseText(text) {
        const tokens = this.extractTokens(text);
        return tokens.map(token => token.value).join(' ');
      }

      /**
       * 引用符の正規化と前後スペースの挿入を行う
       *
       * 1. “ ” ‘ ’ を " ' に統一（トークン分割を安定化）
       * 2. 'quoted' / "quoted" 形式のまとまりを検出し、
       *    双方の外側に 1 空白ずつ挿入する
       *
       * @param  {string} text - 元の文字列
       * @return {string}      - 加工後の文字列
       */
      processQuotes(text) {
        // ① スマートクォート → ストレートクォート
        const normalized = text
          .replace(/[\u2018\u2019]/g, "'")  // ‘ ’ → '
          .replace(/[\u201C\u201D]/g, '"'); // “ ” → "

        // ② 引用符で囲まれた部分の両側にスペースを付与
        //    singleQuotedPattern / doubleQuotedPattern は既存フィールドを利用
        return normalized.replace(this.doubleQuotedPattern, ' "$1" ');
      }

      normalizeApostrophes(text) {
        // ’ ‘ → '
        return text.replace(/[\u2018\u2019]/g, "'");
      }

    }
  
    return new TextTokenizer();
  }
}