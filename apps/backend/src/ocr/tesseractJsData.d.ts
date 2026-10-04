/**
 * `@tesseract.js-data/*` paketleri tip tanımı (.d.ts) içermiyor — bu dosya
 * yalnızca paketin gerçek `index.js` çıktısının (bkz. node_modules/
 * @tesseract.js-data/tur/index.js) şeklini TypeScript'e bildirir.
 */
declare module '@tesseract.js-data/tur' {
  interface TesseractLanguageData {
    code: string;
    gzip: boolean;
    langPath: string;
  }
  const data: TesseractLanguageData;
  export default data;
}
