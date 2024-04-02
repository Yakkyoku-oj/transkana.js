/**
 * Project: EnglishToKatakana
 * File: form.js
 * Author: [Yakkyoku_oj3]
 * Contact: https://twitter.com/greenhill_pharm
 * Created Date: 2023-10-30
 * Modified Date: 2023-10-30
 *
  * License: [The MIT License (MIT)]
 * Version: 1.0.0
 * 
 * Copyright (c) 2023, Yakkyoku_oj3.
 */

(() => {
  document.onreadystatechange = () => {
    if (document.readyState === "complete") {

      /**
       * フォームを出力するクラス
       */
      const form_app = new class {

        constructor(working_document)
        {
          this.controls = new Oj3Controls(working_document, this);
          this.controls.control_methods = {
            cl_convert_btn: (app) => { return () => app.convert(app); },

            /**
             * Show Discriptionボタンがクリックされたときに実行するメソッド。
             * @param {Object} app - アプリケーションオブジェクト。
             * @returns {Function} - イベントハンドラ。
             */
            cl_show_discription_btn: (app) => {
              return (event) => {
                try {
                  app.controls.set_css_root_value('--disc-max-height', `${window.innerHeight - 160}px`);
                  app.controls.update_ui('cl_show_discription_btn');
                } catch (err) {
                  app.error('An error occurred in the [cl_show_discription_btn] method within control_method.', { err, event });
                }
              }
            },

            /**
             * Show Disclaimerボタンがクリックされたときに実行するメソッド。
             * @param {Object} app - アプリケーションオブジェクト。
             * @returns {Function} - イベントハンドラ。
             */
            cl_show_disclaimer_btn: (app) => {
              return (event) => {
                try {
                  app.controls.set_css_root_value('--disc-max-height', `${window.innerHeight - 160}px`);
                  app.controls.update_ui('cl_show_disclaimer_btn');
                } catch (err) {
                  app.error('An error occurred in the [cl_show_disclaimer_btn] method within control_method.', { err, event });
                }
              }
            },

            /**
             * Closeボタンがクリックされたときに実行するメソッド。
             * @param {Object} app - アプリケーションオブジェクト。
             * @returns {Function} - イベントハンドラ。
             */
            cl_close_disc_btn: (app) => { return () => app.controls.update_ui('cl_close_disc_btn') },
          }

          this.controls.update_ui_dataset = {
            init_ui: [
              { target: 'button_convert', add_class: 'active', remove_class: 'disactive' },
            ],
            // Show Discriptionsボタンをクリックした際に適用 this.control_medhod['cl_show_discription_btn']
            cl_show_discription_btn: [
              { target: 'show_disclaimer', add_class: 'active', remove_class: 'disactive' },
              { target: 'show_discription', add_class: 'disactive', remove_class: 'active' },
              { target: 'discription_title', add_class: 'blur' },
              { target: 'controls', add_class: 'blur' },
              { target: 'disclaimer', remove_class: 'active' },
              { target: 'discription_footer', add_class: 'active' },
              { target: 'footer', add_class: 'active' },
              { target: 'left_navigate', add_class: 'active' },

            ],

            // Show Disclaimerボタンをクリックした際に適用 this.control_medhod['cl_show_disclaimer_btn']
            cl_show_disclaimer_btn: [
              { target: 'show_disclaimer', add_class: 'disactive', remove_class: 'active' },
              { target: 'show_discription', add_class: 'active', remove_class: 'disactive' },
              { target: 'discription_title', add_class: 'blur' },
              { target: 'controls', add_class: 'blur' },
              { target: 'discription_footer', remove_class: 'active' },
              { target: 'disclaimer', add_class: 'active' },
              { target: 'footer', add_class: 'active' },
              { target: 'left_navigate', add_class: 'active' },
            ],

            // Closeボタンをクリックした際に適用 this.control_medhod['cl_close_disc_btn']
            cl_close_disc_btn: [
              { target: 'show_disclaimer', remove_class: 'active' },
              { target: 'show_disclaimer', remove_class: 'disactive' },
              { target: 'show_discription', remove_class: 'active' },
              { target: 'show_discription', remove_class: 'disactive' },
              { target: 'discription_title', remove_class: 'blur' },
              { target: 'controls', remove_class: 'blur' },
              { target: 'discription_footer', remove_class: 'active' },
              { target: 'disclaimer', remove_class: 'active' },
              { target: 'footer', remove_class: 'active' },
              { target: 'left_navigate', remove_class: 'active' },
            ],
          }

          this.controls.dataset = {

            // 各セクション用のdiv要素、form要素を定義
            working_spaces: [
              { parent: working_document, element: 'div', states: { id: 'discription_title' } },
              { parent: working_document, element: 'div', states: { id: 'navigate_controls' } },
              { parent: working_document, element: 'div', states: { id: 'controls' } },
              { parent: working_document, element: 'div', states: { id: 'footer' } },
              { parent: 'navigate_controls', element: 'div', states: { id: 'left_navigate', class: 'left' } },
              { parent: 'navigate_controls', element: 'div', states: { id: 'right_navigate', class: 'right' } },
              { parent: 'controls', element: 'div', states: { id: 'discription_controls' } },
              { parent: 'footer', element: 'div', states: { id: 'discription_footer' } },
              { parent: 'footer', element: 'div', states: { id: 'disclaimer' } },
              { parent: 'controls', element: 'form', states: { id: 'ui' } },
            ],

            navigate: [
              { parent: 'left_navigate', element: 'input', value: 'Close', states: { id: 'close_disc', type: 'button', class: 'navigate_button' } },
              { parent: 'right_navigate', element: 'input', value: 'Show Discriptions', states: { id: 'show_discription', type: 'button', class: 'navigate_button' } },
              { parent: 'right_navigate', element: 'input', value: 'Show Disclaimer', states: { id: 'show_disclaimer', type: 'button', class: 'navigate_button' } },
            ],

            // 画面左側、コントロール用UIセクションの定義
            ui_details: [
              { parent: 'ui', element: 'div', states: { id: 'title_input_text' } },
              { parent: 'ui', element: 'div', states: { id: 'subject_input' } },
              { parent: 'ui', element: 'textarea',states: { id: 'inputarea', class: 'feedback-input', placeholder: 'Please enter english text...'} },
              { parent: 'ui', element: 'input', value: 'カタカナに変換する', states: { id: 'button_convert', type: 'button', class: 'disactive' } },
              { parent: 'ui', element: 'div', states: { id: 'subject_output' } },
              { parent: 'ui', element: 'textarea',states: { id: 'outputarea', class: 'feedback-input', placeholder: 'Output', readonly: 'readonly' } },
            ],

            // コントロール用UIのイベントを定義
            // セットするメソッドは、this.control_methodsに定義済みのものを使用しなければならない
            ui_controls: [
              /*
              {
                id_selector_regexp : id名とマッチする正規表現。単一の場合は先頭にスペースを入力する
                control: [ { listen : 'イベントハンドラ', require: 'メソッド名' }, { ... } ]
              }
              */
              { id: 'button_convert', control: [{ listen: 'click', require: 'cl_convert_btn' }] },
              { id: 'show_discription', control: [{ listen: 'click', require: 'cl_show_discription_btn' }] },
              { id: 'show_disclaimer', control: [{ listen: 'click', require: 'cl_show_disclaimer_btn' }] },
              { id: 'close_disc', control: [{ listen: 'click', require: 'cl_close_disc_btn' }] },
            ],

            // 画面上の説明文、見出し、ラベルの定義
            discriptions: [
              // 画面上部、audio、コントロール部分
              { parent: 'discription_title', element: 'h1', text: 'English to Katakana' },
              { parent: 'discription_title', element: 'h2', text: '英文をカタカナに変換するJavaScriptです。' },
              { parent: 'title_input_text', element: 'h3', text: 'ここに入力された英文がカタカナに変換されます。' },
              { parent: 'subject_input', element: 'h3', text: '入力 :' },
              { parent: 'subject_output', element: 'h3', text: '出力 :' },
              { parent: 'discription_footer', element: 'h2', text: 'Descriptions :' },
              { parent: 'discription_footer', element: 'p', text: 'JavaScriptとSQLiteを併用した辞書変換を行っています。動作させるには、サーバ環境が必要です。', states: { 'class': 'subject' } },
              { parent: 'discription_footer', element: 'h3', text: 'Update history : ' },
              { parent: 'discription_footer', element: 'ul', states: { id: 'histories' } },
              { parent: 'discription_footer', element: 'h3', text: 'Special thanks : ' },
              { parent: 'discription_footer', element: 'ul', states: { id: 'thanks' } },
              { parent: 'discription_footer', element: 'h3', text: 'Links : ' },
              { parent: 'discription_footer', element: 'ul', states: { id: 'links' } },

              // 更新履歴
              { parent: 'histories', element: 'li', text: '[2023/10/30] Added 149875 word resource.', states: { class: 'subject' } },
              { parent: 'histories', element: 'li', text: '[2023/11/03] Added 5070 word resource.', states: { class: 'subject' } },
              { parent: 'histories', element: 'li', text: '[2024/04/02] Modification of source code and addition of corresponding English sentence patterns (symbols, sentences surrounded by " ", numbers)', states: { class: 'subject' } },

              // スペシャルサンクス
              { parent: 'thanks', element: 'li', text: '[sql.js] : ', states: { id: 'thanks_line_0', class: 'subject' } },
              { parent: 'thanks_line_0', element: 'a', text: 'https://github.com/sql-js/sql.js', states: { href: 'https://github.com/sql-js/sql.js', target: '_blank' } },
              { parent: 'thanks', element: 'li', text: '[cmudict-0.7b] : ', states: { id: 'thanks_line_1', class: 'subject' } },
              { parent: 'thanks_line_1', element: 'a', text: 'https://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b', states: { href: 'https://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b', target: '_blank' } },
              { parent: 'thanks', element: 'li', text: '[BEP] : ', states: { id: 'thanks_line_2', class: 'subject' } },
              { parent: 'thanks_line_2', element: 'a', text: 'http://www.argv.org/bep/Windows/index.html', states: { href: 'http://www.argv.org/bep/Windows/index.html', target: '_blank' } },
              { parent: 'thanks', element: 'li', text: '[JavaScriptでローマ字をカタカナに変換する関数] : ', states: { id: 'thanks_line_3', class: 'subject' } },
              { parent: 'thanks_line_3', element: 'a', text: 'https://qiita.com/recordare/items/35a27f6b88b9413fef91', states: { href: 'https://qiita.com/recordare/items/35a27f6b88b9413fef91', target: '_blank' } },

              // リンク
              { parent: 'links', element: 'li', text: '[Developer] : yakkyoku_oj3 / ', states: { id: 'links_line_0', class: 'subject' } },
              { parent: 'links_line_0', element: 'a', text: 'https://www.twitch.tv/yakkyoku_oj3', states: { href: 'https://www.twitch.tv/yakkyoku_oj3', target: '_blank' } },

              // 利用規約
              { parent: 'disclaimer', element: 'h2', text: 'Disclaimer :' },
              { parent: 'disclaimer', element: 'ol', states: { id: 'list_disclaimer' } },
              { parent: 'list_disclaimer', element: 'li', states: { id: 'disc_item_0' } },
              { parent: 'disc_item_0', element: 'h3', text: 'General Disclaimer' },
              { parent: 'disc_item_0', element: 'p', text: 'The service is provided "as is" and "as available," without any warranties, whether express or implied, regarding its availability, accuracy, reliability, suitability, or safety.', states: { class: 'subject' } },

              { parent: 'list_disclaimer', element: 'li', states: { id: 'disc_item_1' } },
              { parent: 'disc_item_1', element: 'h3', text: 'Limitation of Liability' },
              { parent: 'disc_item_1', element: 'p', text: 'Under no circumstances shall I be liable for any direct, indirect, incidental, special, consequential, or punitive damages ("Damages") suffered by you or any third party, arising from the use of this service.', states: { class: 'subject' } },

              { parent: 'list_disclaimer', element: 'li', states: { id: 'disc_item_2' } },
              { parent: 'disc_item_2', element: 'h3', text: 'Service Interruption or Termination' },
              { parent: 'disc_item_2', element: 'p', text: 'I make no warranty that the information or services obtained by the user through this service will meet the user’s expectations or be error-free. Additionally, I shall not be liable for any damages caused by the interruption or termination of this service.', states: { class: 'subject' } },

              { parent: 'list_disclaimer', element: 'li', states: { id: 'disc_item_3' } },
              { parent: 'disc_item_3', element: 'h3', text: 'Security Disclaimer' },
              { parent: 'disc_item_3', element: 'p', text: 'I do not guarantee that the information or services obtained through this service will meet your expectations or be error-free. Furthermore, I shall not be responsible for any damages incurred due to the interruption or termination of this service.', states: { class: 'subject' } },

              { parent: 'list_disclaimer', element: 'li', states: { id: 'disc_item_4' } },
              { parent: 'disc_item_4', element: 'h3', text: 'Disclaimer for Third-Party Actions' },
              { parent: 'disc_item_4', element: 'p', text: 'There is a possibility of interference or damage caused by third parties, including viruses. I shall not be responsible for such damages.', states: { class: 'subject' } },

            ],
          }

          // 各セクションとUIの出力
          this.controls.create_ui_elements('working_spaces');
          this.controls.create_ui_elements('ui_details');
          this.controls.create_ui_elements('discriptions');
          this.controls.create_ui_elements('navigate');

          // UIの初期状態を反映
          this.controls.init_ui(this);

          // Exitポイントinit_uiのUI更新処理を実行する
          this.controls.update_ui('init_ui');

        }
        convert()
        {
          const $input = document.getElementById('inputarea');
          const $output = form_app.controls.get_element('outputarea');

          if ($input.value === '') {return;}

          $output.value = yomi.exec($input.value);
        }

        // 現在時刻を取得するメソッド
        get_time() {
          const date = new Date();
          const h = date.getHours();
          const m = date.getMinutes();
          const s = date.getSeconds();

          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        // console要素およびconsole.errorにエラー内容を書き出すメソッド
        error(message, display_obj = null) {
          console.log(`[${this.get_time()}]${message}`, '⚠');
          console.error(message);
          if (display_obj === null || Object.entries(display_obj).length === 0) { return; }

          Object.entries(display_obj).forEach(([key, value]) => {
            if (typeof (value) === 'object') {
              console.error(value);
              console.log(`${key} = [${value}]`, '⚠');
            }
          })
          console.log('Notice : If you need more detailed information, see the message output to the browser console.', '⚠❓');
        }

      }('working_document')

    }
  }
})();

const yomi = new TransKana();