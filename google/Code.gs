// Семинар: Google Таблица остаётся закрытой. Публичный обработчик принимает только ответы.
// Один раз запустите setup(), затем Deploy → New deployment → Web app.
// Execute as: Me. Who has access: Anyone. Не публикуйте саму таблицу.
function setup() {
  var p = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    if (!p.getProperty('SPREADSHEET_ID')) {
      var book = SpreadsheetApp.create('Семинар — ответы участников');
      var sheet = book.getSheets()[0]; sheet.setName('Ответы');
      sheet.appendRow(['ID','Дата UTC','Язык','Оценка','Характеристика (код)','Формат (код)','Пожелания']);
      sheet.setFrozenRows(1); sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#dcebdd');
      sheet.setColumnWidth(7, 420);
      p.setProperty('SPREADSHEET_ID', book.getId());
    }
    if (!p.getProperty('ADMIN_PASSWORD')) p.setProperty('ADMIN_PASSWORD', Utilities.getUuid());
    console.log('Таблица: https://docs.google.com/spreadsheets/d/' + p.getProperty('SPREADSHEET_ID'));
    console.log('Пароль сводки (сохраните у себя, не публикуйте): ' + p.getProperty('ADMIN_PASSWORD'));
  } finally { lock.releaseLock(); }
}
function output_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return output_({ok:true,service:'seminar-feedback',version:1}); }
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 20000) return output_({ok:false,error:'Некорректный запрос'});
    var raw = e.parameter && e.parameter.payload;
    if (!raw || raw.length > 12000) return output_({ok:false,error:'Некорректный запрос'});
    var d = JSON.parse(raw), p = PropertiesService.getScriptProperties();
    var bookId = p.getProperty('SPREADSHEET_ID');
    if (!bookId) return output_({ok:false,error:'Сначала запустите setup'});
    if (d.action === 'results') {
      if (!p.getProperty('ADMIN_PASSWORD') || d.password !== p.getProperty('ADMIN_PASSWORD')) return output_({ok:false,error:'Неверный пароль'});
      var sheet = SpreadsheetApp.openById(bookId).getSheetByName('Ответы');
      var last = sheet.getLastRow();
      var data = last > 1 ? sheet.getRange(2,1,last-1,7).getValues() : [];
      return output_({ok:true, rows:data.filter(function(r){return r[0];}).reverse().map(function(r){return {id:r[0],created_at:r[1] instanceof Date?r[1].toISOString():r[1],lang:r[2],rating:Number(r[3]),ratingIndex:Number(r[3])-1,word:Number(r[4]),format:Number(r[5]),wishes:String(r[6])};})});
    }
    if (d.action !== 'submit' || !['ru','kz'].includes(d.lang) || !Number.isInteger(d.rating) || d.rating < 1 || d.rating > 5 || !Number.isInteger(d.word) || d.word < 0 || d.word > 4 || !Number.isInteger(d.format) || d.format < 0 || d.format > 4 || typeof d.wishes !== 'string' || d.wishes.length > 2000 || typeof d.id !== 'string' || !/^[0-9a-f-]{36}$/.test(d.id)) return output_({ok:false,error:'Проверьте ответы'});
    var lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      var s = SpreadsheetApp.openById(bookId).getSheetByName('Ответы'), count=s.getLastRow();
      var found = count > 1 && s.getRange(2,1,count-1,1).createTextFinder(d.id).matchEntireCell(true).findNext();
      if (!found) {
        var wish=d.wishes.trim();
        if (/^[=+@\-\t\r]/.test(wish)) wish="'"+wish;
        s.appendRow([d.id,new Date().toISOString(),d.lang,d.rating,d.word,d.format,wish]);
        SpreadsheetApp.flush();
      }
      return output_({ok:true});
    } finally { lock.releaseLock(); }
  } catch (err) { return output_({ok:false,error:'Не удалось выполнить запрос. Повторите попытку.'}); }
}
