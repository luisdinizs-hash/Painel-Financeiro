const TRANSACTIONS_SHEET = 'Lancamentos';
const DEBTS_SHEET = 'Dividas';

const TRANSACTION_HEADERS = [
  'id', 'tipo', 'descricao', 'valor', 'categoria', 'data',
  'formaPagamento', 'criadoEm'
];
const DEBT_HEADERS = [
  'id', 'credor', 'valorTotal', 'valorPago', 'prioridade', 'criadoEm'
];

function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(spreadsheet, TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  ensureSheet_(spreadsheet, DEBTS_SHEET, DEBT_HEADERS);
  return 'Planilha configurada com sucesso.';
}

function doGet() {
  try {
    return jsonResponse_({
      success: true,
      transactions: readTransactions_(),
      debts: readDebts_()
    });
  } catch (error) {
    return jsonResponse_({ success: false, message: error.message });
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    let result;

    switch (body.action) {
      case 'addTransaction':
        result = addTransaction_(body.data);
        break;
      case 'deleteTransaction':
        deleteRowById_(TRANSACTIONS_SHEET, body.id);
        result = { id: body.id };
        break;
      case 'addDebt':
        result = addDebt_(body.data);
        break;
      case 'deleteDebt':
        deleteRowById_(DEBTS_SHEET, body.id);
        result = { id: body.id };
        break;
      default:
        throw new Error('Ação inválida.');
    }

    return jsonResponse_({ success: true, data: result });
  } catch (error) {
    return jsonResponse_({ success: false, message: error.message });
  }
}

function addTransaction_(data) {
  validateRequired_(data, ['type', 'description', 'value', 'category', 'date', 'payment']);
  const item = {
    id: Utilities.getUuid(),
    type: data.type === 'income' ? 'income' : 'expense',
    description: String(data.description).trim(),
    value: positiveNumber_(data.value, 'valor'),
    category: String(data.category).trim(),
    date: String(data.date),
    payment: String(data.payment).trim(),
    createdAt: Date.now()
  };
  sheet_(TRANSACTIONS_SHEET).appendRow([
    item.id, item.type, item.description, item.value, item.category,
    item.date, item.payment, item.createdAt
  ]);
  return item;
}

function addDebt_(data) {
  validateRequired_(data, ['creditor', 'total', 'paid', 'priority']);
  const total = positiveNumber_(data.total, 'valor total');
  const paid = nonNegativeNumber_(data.paid, 'valor pago');
  if (paid > total) throw new Error('O valor pago não pode superar o valor total.');

  const item = {
    id: Utilities.getUuid(),
    creditor: String(data.creditor).trim(),
    total: total,
    paid: paid,
    priority: ['high', 'medium', 'low'].includes(data.priority) ? data.priority : 'medium',
    createdAt: Date.now()
  };
  sheet_(DEBTS_SHEET).appendRow([
    item.id, item.creditor, item.total, item.paid, item.priority, item.createdAt
  ]);
  return item;
}

function readTransactions_() {
  return dataRows_(TRANSACTIONS_SHEET).map(function(row) {
    return {
      id: String(row[0]),
      type: String(row[1]),
      description: String(row[2]),
      value: Number(row[3]) || 0,
      category: String(row[4]),
      date: normalizeDate_(row[5]),
      payment: String(row[6]),
      createdAt: Number(row[7]) || 0
    };
  });
}

function readDebts_() {
  return dataRows_(DEBTS_SHEET).map(function(row) {
    return {
      id: String(row[0]),
      creditor: String(row[1]),
      total: Number(row[2]) || 0,
      paid: Number(row[3]) || 0,
      priority: String(row[4]),
      createdAt: Number(row[5]) || 0
    };
  });
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0b1220')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

function sheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Execute a função setup() antes de usar a API.');
  return sheet;
}

function dataRows_(name) {
  const sheet = sheet_(name);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues()
    .filter(function(row) { return row[0]; });
}

function deleteRowById_(sheetName, id) {
  if (!id) throw new Error('ID não informado.');
  const sheet = sheet_(sheetName);
  const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let index = ids.length - 1; index >= 1; index--) {
    if (String(ids[index][0]) === String(id)) {
      sheet.deleteRow(index + 1);
      return;
    }
  }
  throw new Error('Registro não encontrado.');
}

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

function validateRequired_(data, fields) {
  if (!data) throw new Error('Dados não informados.');
  fields.forEach(function(field) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error('Campo obrigatório ausente: ' + field);
    }
  });
}

function positiveNumber_(value, label) {
  const number = Number(value);
  if (!isFinite(number) || number <= 0) throw new Error('Informe um ' + label + ' válido.');
  return number;
}

function nonNegativeNumber_(value, label) {
  const number = Number(value);
  if (!isFinite(number) || number < 0) throw new Error('Informe um ' + label + ' válido.');
  return number;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
