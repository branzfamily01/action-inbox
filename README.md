# Action Inbox v2

## 修正内容
- PDFの文字抽出に対応
- 画像OCRに対応
- TXT / MD / CSV / JSON に対応
- 読み取り状況を画面表示
- ファイル読み取り後に「やることに変換」が動く構成へ修正

## GitHub Pagesへの更新方法
現在の `action-inbox` リポジトリにある古いファイルを、ZIP解凍後の以下4ファイルで置き換えてください。

- index.html
- styles.css
- app.js
- README.md

ZIP自体はアップロードしません。

外部CDNから pdf.js と Tesseract.js を読み込むため、利用時にはインターネット接続が必要です。
