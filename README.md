# PoE2 Boss Market

Path of Exile 2 のボス参加費、注目ドロップ、既知のドロップ確率を比較する静的サイトです。

## Commands

- `npm test` — データ定義と価格正規化のテスト
- `npm run dev` — ローカルAPI付きプレビュー
- `npm run build:pages` — GitHub Pages向け静的スナップショット生成

GitHub Pages版は公開時にpoe.ninjaの価格を静的JSONへ書き出し、GitHub Actionsで1時間ごとに更新します。
