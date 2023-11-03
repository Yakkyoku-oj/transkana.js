/**
 * Project: EnglishToKatakana
 * File: transkana.js
 * Author: [Yakkyoku_oj3]
 * Contact: https://twitter.com/greenhill_pharm
 * Created Date: 2023-10-30
 * Modified Date: 2023-11-03
 *
 * License: [The MIT License (MIT)]
 * Version: 1.0.0
 * 
 * Copyright (c) 2023, Yakkyoku_oj3.
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
   * init - SQLiteデータベースでクエリを実行し、戻り値をmapオブジェクトにセットします。
   * 
   * @function
   * 
   * @throws {Error} DBに接続できない、SQLクエリの実行に失敗した場合にエラーを投げます。
   */
  async init() {
    if (!this.map) {
      this.map = new Map();

      try {

        // DBに接続する
        const db = await this.get_sqlite();
        if (!db) {
          throw new Error(`DBの取得に失敗`);
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

          // SQLクエリを実行
          const contents = db.exec(query);
          for (let row of contents[0].values) {

            // キーのシングルクォーテーションが連続している場合は置き換え
            this.map.set(row[0].replaceAll("''", "'"), row[1]);
          }

          this.ready = true;

        } catch (error) {
          console.error(error);
        }

      } catch (error) {
        console.error(error);
      }
    }
  }
  /**
   * get_sqlite - SQLiteデータベースオブジェクトを返すメソッド。
   * 
   * @function
   * 
   * @throws {Error} sql.jsのアクティベーションが出来ない場合、エラーを投げます。
   * @returns {Object} 対応するSQLデータベースオブジェクト
   */
  async get_sqlite() {

    try {

      const sqlPromise = initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });
      const dataPromise = fetch(`./dict/kanayomi.db`).then(res => res.arrayBuffer());
      const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
      return new SQL.Database(new Uint8Array(buf));

    } catch (error) {
      console.error('sql.jsのアクティベーションに失敗')
      console.error(error);
    }
  }

  /**
   * fetch_kana - 単語をカタカナに変換するメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   * fetch_kana('English');
   */
  fetch_kana(word) {
    // a のみ例外処理
    if (word === 'a') return 'ア';
    if (word === 'A') return 'エー';

    // 入力テキストを小文字に変換
    const lowerWord = this.convert_to_lower(word);

    // マップに単語が含まれる場合、それを返す
    if (this.map.has(lowerWord)) {
      return this.map.get(lowerWord);
    }

    // 単語を分解して変換
    return this.convert_split_words(word);
  }

  /**
   * convert_split_words - ハイフン、キャメルケースで複数の単語が繋がっている場合に、分解して処理するメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   */
  convert_split_words(word) {
    // ハイフンで分解
    const hyphenSplit = word.split('-');
    let kanaArray = [];

    hyphenSplit.forEach(part => {
      // キャメルケースでの分解
      const camelWords = this.splitCamelCase(part);

      console.log(camelWords)
      const kanaWords = camelWords.map(w => {
        const lowerW = this.convert_to_lower(w);
        return this.map.has(lowerW) ? this.map.get(lowerW) : this.convert_readable_format(lowerW);
      });
      kanaArray.push(...kanaWords);
    });

    return kanaArray.join('');
  }

  splitCamelCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  }

  /**
   * convert_readable_format - ローマ字とアルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convert_readable_format(word) {
    const romanConverted = this.convert_roman_to_kana(word);
    return this.convert_alphabet(romanConverted);
  }

  /**
   * convert_alphabet - アルファベットの変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convert_alphabet(word) {

    // 単一アルファベットからカタカナへのマッピング
    const alphabets = Array.from(word);
    const basicMapping = this.get_basicmap();
    const kanaAlphabets = alphabets.map(alphabet => basicMapping[alphabet] || alphabet);
    return kanaAlphabets.join('');
  }

  /**
   * convert_roman_to_kana - ローマ字表記の変換を行うメソッド
   * 
   * @function
   * @param {string} word - 変換対象の文字列
   * @returns {string} 対応するカタカナ
   * @example
   */
  convert_roman_to_kana(original) {
    const str = this.convert_to_lower(original); // 全角→半角→小文字
    const tree = this.get_roman_tree();
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
        if (prev && (prev === 'n' || prev === char)) { // 促音やnへの対応
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

  convert_to_lower(word) {
    return word.replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248)).toLowerCase();
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
    const words = input_text.match(/[a-zA-Z\-']+/g) || [];
    let kanaWords = [];

    for (const word of words) {
      kanaWords.push(this.fetch_kana(word));
    }

    return input_text.replace(/[a-zA-Z\-']+/g, () => kanaWords.shift());
  }

  /**
   * get_basicmap - アルファベット変換用のマッピングデータを返すメソッド
   * 
   * @function
   * @returns {object} keyがアルファベット、valueがカタカナのマッピングデータ
   * @example
   */
  get_basicmap() {
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
      'z': 'ズィー'
    };
  }

  /**
   * get_basicmap - ローマ字表記変換用のマッピングデータを返すメソッド
   * 
   * @function
   * @returns {object} 母音と子音、
   * @example
   */
  get_roman_tree() {
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
}
