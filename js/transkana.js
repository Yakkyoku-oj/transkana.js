/**
 * Project: EnglishToKatakana
 * File: transkana.js
 * Author: [Yakkyoku_oj3]
 * Contact: https://twitter.com/greenhill_pharm
 * Created Date: 2023-10-30
 * Modified Date: 2024-04-02
 *
 * License: [The MIT License (MIT)]
 * Version: 1.0.1
 * 
 * Copyright (c) 2023-2024, Yakkyoku_oj3.
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
        const db = await this.initializeSqlJs();
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
  async initializeSqlJs() {
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
   * fetchKana - 単語をカタカナに変換するメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   * fetchKana('English');
   */
  fetchKana(word) {
    // a のみ例外処理
    if (word === 'a') return 'ア';
    if (word === 'A') return 'エー';

    // 入力テキストを小文字に変換
    let lowerWord = this.convertToLower(word);

    // 単語が数字のみの場合
    if (this._isNumber(lowerWord)) {
      lowerWord = this.convertNumToText(lowerWord)
      return this.convertSplitWords(lowerWord);
    }
    else {
      // マップに単語が含まれる場合、それを返す
      if (this.map.has(lowerWord)) {
        return this.map.get(lowerWord);
      }

      // 単語を分解して変換
      return this.convertSplitWords(word);
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
    // 負の数値、カンマ区切りの数字、および小数点に対応した正規表現
    const regexp = new RegExp(/^(-)?(\d{1,3}(,\d{3})*(\.\d+)?)$/);
    return regexp.test(value);
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
  convertSplitWords(word) {
    // ハイフンを取り除き、後続の文字を大文字に変換してキャメルケースに統一
    const halfWidthWord = this.convertToHalfWidth(word)
    const unifiedCamelCase = halfWidthWord.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    // キャメルケースでの分解
    const camelWords = this.splitCamelCase(unifiedCamelCase);
    const kanaArray = camelWords.map(w => {
      const lowerW = this.convertToLower(w);
      return this.map.has(lowerW) ? this.map.get(lowerW) : this.convertReadableFormat(lowerW);
    });

    return kanaArray.join('・');
  }

  /**
   * splitCamelCase - キャメルケースで書かれた文字列を単語ごとに分割するメソッド
   * 
   * キャメルケースの文字列は、単語の区切りが大文字で表され、スペースを使用せずに複数の単語が連結された形式です。
   * このメソッドは、小文字または数字の後に大文字が来る場所を見つけ、その前にスペースを挿入して文字列を分割します。
   * 分割された文字列は、元のキャメルケースの単語が配列の各要素として返されます。
   * 
   * @param {string} str - キャメルケースで書かれた文字列。
   * @returns {string[]} キャメルケースの文字列を単語ごとに分割した配列。
   */
  splitCamelCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  }

  /**
   * convertReadableFormat - ローマ字とアルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convertReadableFormat(word) {
    const romanConverted = this.convertRomanToKana(word);
    return this.convertAlphabet(romanConverted);
  }

  /**
   * convertAlphabet - アルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convertAlphabet(word) {
    // 単一アルファベットからカタカナへのマッピング
    const alphabets = Array.from(word);
    const basicMapping = this.getBasicMap();
    const kanaAlphabets = alphabets.map(alphabet => basicMapping[alphabet] || alphabet);
    return kanaAlphabets.join('');
  }

  /**
   * convertRomanToKana - ローマ字表記の変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convertRomanToKana(original) {
    const str = this.convertToLower(original); // 全角→半角→小文字
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
  convertToLower(word) {
    const halfWidthWord = this.convertToHalfWidth(word)
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
  convertToHalfWidth(strVal) {
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
   * 入力された数値を英文表記に変換します。数値はカンマ区切りも受け付け、小数部分は2桁まで考慮されます。
   * 数値が負の場合は "negative" が先頭に付き、範囲外（Number.MAX_SAFE_INTEGERを超える）の場合は "over" として表現されます。
   * 
   * @param {string} input - 変換する数値の文字列表現。
   * @returns {string} 数値を英文表記に変換した文字列。無効な入力の場合は "Invalid-number" を返します。
   */
  convertNumToText(input) {
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

  }

  /**
   * 指定された数値を英単語に変換します。0から19までは個別の単語を使用し、20以上は適切な英単語に分割して表現します。
   * 1000以上の数値は "thousand"、"million" などの単位を用いて表現されます。単語の区切りはハイフンで行われます。
   * 
   * @private
   * @param {number} num - 変換する数値。
   * @returns {string} 数値を英単語に変換した文字列。末尾のハイフンは削除されます。
   */
  _numberToWords(num) {
    if (num === 0) return 'zero';

    const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion'];

    function convert(n, depth) {
      if (n === 0) return '';
      else if (n < 20) return units[n] + '-';
      else if (n < 100) return tens[Math.floor(n / 10)] + '-' + convert(n % 10, depth + 1);
      else if (n < 1000) return units[Math.floor(n / 100)] + '-hundred-' + convert(n % 100, depth + 1);
      else {
        for (let i = 0; i < scales.length; i++) {
          const scaleDivider = Math.pow(1000, i + 1);
          if (n < scaleDivider * 1000) {
            return convert(Math.floor(n / scaleDivider), depth + 1) + scales[i] + '-' + convert(n % scaleDivider, depth + 1);
          }
        }
      }
    }

    const words = convert(num, 0);
    return words.trim().replace(/-$/, ''); // 末尾のハイフンを削除
  }

  /**
   * exec - テキストをカタカナに変換するメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  exec(input_text) {
    const textProcessor = this.getTextProcessor();

    // 数字と英字の間にスペースを挿入
    const processedInput = textProcessor.insertSpaces(input_text);

    // トークンを抽出
    const words = textProcessor.extractTokens(processedInput);
    let kanaWords = [];

    for (const word of words) {
      kanaWords.push(this.fetchKana(word));
    }

    // 置換用の関数で kanaWords から要素を取り出し、テキストを変換
    return processedInput.replace(textProcessor.tokenPattern, () => kanaWords.shift());
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

  /**
   * getTextProcessor - TextProcessor クラスのインスタンスを生成して返すファクトリーメソッド
   * 
   * TextProcessor クラスは、テキスト処理のためのメソッドを提供します。これには、
   * ダブルクォーテーションで囲まれたテキストや記号の前後にスペースを挿入し、
   * 数字と文字の間にスペースを挿入してトークンを抽出する機能が含まれます。
   * 
   * @returns {TextProcessor} TextProcessor クラスの新しいインスタンス。
   */
  getTextProcessor() {
    class TextProcessor {
      constructor() {
        this.numberAndLetterPattern = /(\d|[\uFF10-\uFF19])([a-zA-Z\uFF21-\uFF3A\uFF41-\uFF5A])|([a-zA-Z\uFF21-\uFF3A\uFF41-\uFF5A])(\d|[\uFF10-\uFF19])/g;
        this.tokenPattern = /[0-9a-zA-Z\-'"`,\.\\=\+\*\/%\^&@#$~\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A－’‘，．￥　～]+/g;
        this.quotedTextPattern = /"([^"]*)"/g;  // ダブルクォーテーションで囲まれたテキストを検出
        this.symbolPattern = /([=\+\*\/%\^&@#$~])/g;
      }
  
      // ダブルクォーテーションで囲まれたテキストと記号、数字が単語に囲まれている場合の前後にスペースを挿入
      insertSpaces(text) {
        return text
          .replace(this.quotedTextPattern, ' " $1 " ')  // ダブルクォーテーションで囲まれたテキストの前後にスペースを挿入
          .replace(this.symbolPattern, ' $1 ')  // 記号の前後にスペースを挿入
          .replace(this.numberAndLetterPattern, '$1$3 $2$4')  // 数字と文字の間にスペースを挿入
          .replace(/([a-zA-Z])(\d)/g, '$1 $2')  // 文字の後に数字が来る場合にスペースを挿入
          .replace(/(\d)([a-zA-Z])/g, '$1 $2');  // 数字の後に文字が来る場合にスペースを挿入
      }
  
      // テキストからトークンを抽出するメソッド
      extractTokens(text) {
        return text.match(this.tokenPattern) || [];
      }
    }
  
    return new TextProcessor();
  }
}

class TextProcessor {
  constructor() {
    this.numberAndLetterPattern = /(\d|[\uFF10-\uFF19])([a-zA-Z\uFF21-\uFF3A\uFF41-\uFF5A])|([a-zA-Z\uFF21-\uFF3A\uFF41-\uFF5A])(\d|[\uFF10-\uFF19])/g;
    this.tokenPattern = /[0-9a-zA-Z\-'"`,\.\\=\+\*\/%\^&@#$~\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A－’‘，．￥　～]+/g;
    this.quotedTextPattern = /"([^"]*)"/g; // ダブルクォーテーションで囲まれたテキストを検出
    this.symbolPattern = /([=\+\*\/%\^&@#$~])/g;
  }

  // ダブルクォーテーションで囲まれたテキストと記号の前後、数字が単語に囲まれている場合の前後にスペースを挿入
  insertSpaces(text) {
    return text
      .replace(this.quotedTextPattern, ' " $1 " ') // ダブルクォーテーションで囲まれたテキストの前後にスペースを挿入
      .replace(this.symbolPattern, ' $1 ') // 記号の前後にスペースを挿入
      .replace(this.numberAndLetterPattern, '$1$3 $2$4') // 数字と文字の間にスペースを挿入
      .replace(/([a-zA-Z])(\d)/g, '$1 $2') // 文字の後に数字が来る場合にスペースを挿入
      .replace(/(\d)([a-zA-Z])/g, '$1 $2'); // 数字の後に文字が来る場合にスペースを挿入
  }

  // テキストからトークンを抽出するメソッド
  extractTokens(text) {
    return text.match(this.tokenPattern) || [];
  }
}

