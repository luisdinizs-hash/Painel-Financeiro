const TRANSACTIONS_SHEET = 'Lancamentos';
const DEBTS_SHEET = 'Dividas';

const TRANSACTION_HEADERS = [
  'id', 'tipo', 'descricao', 'valor', 'categoria', 'data',
  'formaPagamento', 'criadoEm'
];
const DEBT_HEADERS = [
  'id', 'credor', 'valorTotal', 'valorPago', 'prioridade', 'criadoEm', 'parcelasRestantes'
];

const AUTOMATION_START = '2026-07-01';
const WEEKLY_RULES = [
  { key: 'renda-semanal', type: 'income', description: 'Renda semanal familiar - Luís + Gaby', value: 12000, category: 'Outros', payment: 'Transferência' },
  { key: 'frutas-semanais', type: 'expense', description: 'Frutas e verduras', value: 200, category: 'Mercado', payment: 'Outros' }
];
const MONTHLY_RULES = [
  { key: 'mercantil-1', day: 1, description: 'Mercantil bairro - 1ª quinzena', value: 400, category: 'Mercado' },
  { key: 'baba-1', day: 5, description: 'Babá - 1ª quinzena', value: 756, category: 'Babá' },
  { key: 'faxineira', day: 6, description: 'Faxineira', value: 600, category: 'Outros' },
  { key: 'cartao-mae', day: 6, description: 'Cartão da mãe (uso pessoal)', value: 600, category: 'Dívidas' },
  { key: 'cartao-grazy', day: 6, description: 'Cartão Grazy (uso pessoal)', value: 1000, category: 'Dívidas' },
  { key: 'cartao-jefferson', day: 6, description: 'Cartão Jefferson (uso pessoal)', value: 3000, category: 'Dívidas' },
  { key: 'agua', day: 10, description: 'Água', value: 200, category: 'Outros' },
  { key: 'energia', day: 15, description: 'Energia', value: 850, category: 'Outros' },
  { key: 'plano-joao', day: 15, description: 'Plano de saúde João Miguel', value: 262.65, category: 'Saúde' },
  { key: 'plano-gaby', day: 15, description: 'Plano de saúde Gaby', value: 315.37, category: 'Saúde' },
  { key: 'tim', day: 15, description: 'TIM', value: 101.98, category: 'Outros' },
  { key: 'mercantil-2', day: 16, description: 'Mercantil bairro - 2ª quinzena', value: 400, category: 'Mercado' },
  { key: 'internet', day: 16, description: 'Internet', value: 130, category: 'Outros' },
  { key: 'seguro-carro', day: 17, description: 'Seguro do carro', value: 558.79, category: 'Outros' },
  { key: 'aluguel', day: 25, description: 'Aluguel', value: 1512, category: 'Aluguel' },
  { key: 'baba-2', day: 25, description: 'Babá - 2ª quinzena', value: 756, category: 'Babá' },
  { key: 'angela', day: 25, description: 'Ângela', value: 1200, category: 'Família' },
  { key: 'marleide', day: 25, description: 'Marleide', value: 1200, category: 'Família' },
  { key: 'mae', day: 25, description: 'Mãe', value: 1200, category: 'Família' },
  { key: 'gaby-contas', day: 25, description: 'Gaby contas', value: 700, category: 'Gaby' },
  { key: 'aluguel-grazy', day: 25, description: 'Aluguel de Grazy', value: 1000, category: 'Aluguel' },
  { key: 'escola-joao', day: 26, description: 'Escola João Miguel', value: 1600, category: 'Escola' },
  { key: 'pos-graduacao', day: 27, description: 'Pós-graduação', value: 650, category: 'Escola' }
];
const INSTALLMENT_RULES = [
  { key: 'carro', day: 1, description: 'Parcela do carro', value: 2850, category: 'Dívidas', installments: 20 },
  { key: 'ze-camilo', day: 10, description: 'Parcela Zé Camilo', value: 600, category: 'Dívidas', installments: 1 },
  { key: 'naniel', day: 10, description: 'Parcela Naniel', value: 500, category: 'Dívidas', installments: 3 },
  { key: 'matheus-rocha', day: 20, description: 'Parcela Matheus Rocha', value: 800, category: 'Dívidas', installments: 3 },
  { key: 'joias', day: 25, description: 'Parcela Joias', value: 565, category: 'Dívidas', installments: 2 }
];

function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(spreadsheet, TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  ensureSheet_(spreadsheet, DEBTS_SHEET, DEBT_HEADERS);
  seedInstallmentDebts_();
  return 'Planilha configurada com sucesso.';
}

function doGet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheet_(spreadsheet, TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
    ensureSheet_(spreadsheet, DEBTS_SHEET, DEBT_HEADERS);
    seedInstallmentDebts_();
    syncAutomaticTransactions_();
    return jsonResponse_({
      success: true,
      transactions: readTransactions_(),
      debts: readDebts_(),
      automations: getAutomationRules_()
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
      case 'updateDebt':
        result = updateDebt_(body.id, body.data);
        break;
      case 'payDebt':
        result = payDebt_(body.id);
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
    createdAt: Date.now(),
    installments: Math.max(0, Math.floor(Number(data.installments) || 0))
  };
  sheet_(DEBTS_SHEET).appendRow([
    item.id, item.creditor, item.total, item.paid, item.priority, item.createdAt, item.installments
  ]);
  return item;
}

function updateDebt_(id, data) {
  validateRequired_(data, ['creditor', 'total', 'paid', 'priority']);
  const total = positiveNumber_(data.total, 'valor total');
  const paid = nonNegativeNumber_(data.paid, 'valor pago');
  if (paid > total) throw new Error('O valor pago não pode superar o valor total.');
  const location = findRowById_(DEBTS_SHEET, id);
  const createdAt = Number(location.values[5]) || Date.now();
  const item = {
    id: String(id), creditor: String(data.creditor).trim(), total: total, paid: paid,
    priority: ['high', 'medium', 'low'].includes(data.priority) ? data.priority : 'medium',
    createdAt: createdAt, installments: Math.max(0, Math.floor(Number(data.installments) || 0))
  };
  location.sheet.getRange(location.row, 1, 1, DEBT_HEADERS.length).setValues([[
    item.id, item.creditor, item.total, item.paid, item.priority, item.createdAt, item.installments
  ]]);
  return item;
}

function payDebt_(id) {
  const location = findRowById_(DEBTS_SHEET, id);
  const total = Number(location.values[2]) || 0;
  const paid = Number(location.values[3]) || 0;
  const installments = Math.max(0, Math.floor(Number(location.values[6]) || 0));
  const balance = Math.max(0, total - paid);
  if (balance <= 0) throw new Error('Esta dívida já está quitada.');
  if (installments <= 0) throw new Error('Informe as parcelas restantes antes de registrar o pagamento.');
  const installmentValue = balance / installments;
  const newPaid = Math.min(total, paid + installmentValue);
  const newInstallments = Math.max(0, installments - 1);
  location.sheet.getRange(location.row, 4).setValue(newPaid);
  location.sheet.getRange(location.row, 7).setValue(newInstallments);
  return { id: String(id), paid: newPaid, installments: newInstallments };
}

function readTransactions_() {
  return dataRows_(TRANSACTIONS_SHEET).map(function(row) {
    return {
      id: String(row[0]),
      type: String(row[1]),
      description: String(row[2]),
      value: Number(row[3]) || 0,
      category: String(row[4]),
      date: normalizeDate_(row[5], row[7]),
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
      createdAt: Number(row[5]) || 0,
      installments: Math.max(0, Math.floor(Number(row[6]) || 0))
    };
  });
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#0b1220')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
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

function syncAutomaticTransactions_() {
  const transactionSheet = sheet_(TRANSACTIONS_SHEET);
  const existingIds = new Set(dataRows_(TRANSACTIONS_SHEET).map(function(row) { return String(row[0]); }));
  const start = parseIsoDate_(AUTOMATION_START);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const rows = [];

  function queue(rule, date) {
    if (date < start || date > today) return;
    const iso = isoDate_(date);
    const id = 'auto-' + rule.key + '-' + iso;
    if (existingIds.has(id)) return;
    rows.push([id, rule.type || 'expense', rule.description, rule.value, rule.category, iso, rule.payment || 'Outros', Date.now()]);
    existingIds.add(id);
  }

  WEEKLY_RULES.forEach(function(rule) {
    const date = new Date(start.getTime());
    while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
    while (date <= today) {
      queue(rule, new Date(date.getTime()));
      date.setDate(date.getDate() + 7);
    }
  });

  const month = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (month <= today) {
    MONTHLY_RULES.forEach(function(rule) {
      queue(rule, new Date(month.getFullYear(), month.getMonth(), rule.day, 12));
    });
    month.setMonth(month.getMonth() + 1);
  }

  INSTALLMENT_RULES.forEach(function(rule) {
    for (let index = 0; index < rule.installments; index++) {
      queue(rule, new Date(start.getFullYear(), start.getMonth() + index, rule.day, 12));
    }
  });

  if (rows.length) {
    transactionSheet.getRange(transactionSheet.getLastRow() + 1, 1, rows.length, TRANSACTION_HEADERS.length).setValues(rows);
  }
}

function getAutomationRules_() {
  const rules = [];
  WEEKLY_RULES.forEach(function(rule) {
    rules.push({ type: rule.type, description: rule.description, value: rule.value, schedule: 'Toda segunda-feira', category: rule.category });
  });
  MONTHLY_RULES.forEach(function(rule) {
    rules.push({ type: 'expense', description: rule.description, value: rule.value, schedule: 'Dia ' + rule.day, category: rule.category });
  });
  INSTALLMENT_RULES.forEach(function(rule) {
    rules.push({ type: 'expense', description: rule.description, value: rule.value, schedule: 'Dia ' + rule.day + ' · ' + rule.installments + ' parcelas', category: rule.category });
  });
  return rules;
}

function seedInstallmentDebts_() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('FINANCIAL_BASE_DEBTS_SEEDED') === 'true') return;
  const definitions = [
    { creditor: 'Carro', value: 2850, installments: 20, priority: 'medium' },
    { creditor: 'Zé Camilo', value: 600, installments: 1, priority: 'high' },
    { creditor: 'Naniel', value: 500, installments: 3, priority: 'high' },
    { creditor: 'Joias', value: 565, installments: 2, priority: 'high' },
    { creditor: 'Matheus Rocha', value: 800, installments: 3, priority: 'high' }
  ];
  const debtSheet = sheet_(DEBTS_SHEET);
  const existing = new Set(dataRows_(DEBTS_SHEET).map(function(row) { return String(row[1]).toLowerCase(); }));
  const rows = [];
  definitions.forEach(function(item) {
    if (existing.has(item.creditor.toLowerCase())) return;
    rows.push([Utilities.getUuid(), item.creditor, item.value * item.installments, 0, item.priority, Date.now(), item.installments]);
  });
  if (rows.length) debtSheet.getRange(debtSheet.getLastRow() + 1, 1, rows.length, DEBT_HEADERS.length).setValues(rows);
  properties.setProperty('FINANCIAL_BASE_DEBTS_SEEDED', 'true');
}

function parseIsoDate_(iso) {
  const parts = String(iso).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12);
}

function isoDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function findRowById_(sheetName, id) {
  if (!id) throw new Error('ID não informado.');
  const sheet = sheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index++) {
    if (String(values[index][0]) === String(id)) return { sheet: sheet, row: index + 1, values: values[index] };
  }
  throw new Error('Registro não encontrado.');
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

function normalizeDate_(value, createdAt) {
  const timeZone = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  const brazilian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) {
    return brazilian[3] + '-' + ('0' + brazilian[2]).slice(-2) + '-' + ('0' + brazilian[1]).slice(-2);
  }

  const reference = new Date(Number(createdAt));
  const referenceYear = isNaN(reference.getTime()) ? new Date().getFullYear() : reference.getFullYear();
  const candidate = /\b\d{4}\b/.test(raw) ? raw : raw + ' ' + referenceYear;
  const parsed = new Date(candidate);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, timeZone, 'yyyy-MM-dd');

  const fallback = isNaN(reference.getTime()) ? new Date() : reference;
  return Utilities.formatDate(fallback, timeZone, 'yyyy-MM-dd');
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
