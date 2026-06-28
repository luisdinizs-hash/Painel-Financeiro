const API_URL=(window.APP_CONFIG?.CLOUD_API_URL||'').trim();
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const $=selector=>document.querySelector(selector);
const el={form:$('#transactionForm'),description:$('#description'),value:$('#value'),category:$('#category'),date:$('#date'),payment:$('#payment'),month:$('#monthFilter'),year:$('#yearFilter'),search:$('#searchInput'),message:$('#formMessage'),list:$('#transactionList'),empty:$('#emptyState'),count:$('#transactionCount'),export:$('#exportButton'),income:$('#totalIncome'),expense:$('#totalExpense'),balance:$('#monthBalance'),goal15:$('#goal15'),goal20:$('#goal20'),bar15:$('#progress15'),bar20:$('#progress20'),label15:$('#progress15Label'),label20:$('#progress20Label'),chart:$('#categoryChart'),chartTotal:$('#chartTotal'),chartCenterTotal:$('#chartCenterTotal'),chartLegend:$('#chartLegend'),chartEmpty:$('#chartEmpty'),debtForm:$('#debtForm'),creditor:$('#creditor'),debtTotal:$('#debtTotal'),debtPaid:$('#debtPaid'),debtPriority:$('#debtPriority'),debtInstallments:$('#debtInstallments'),cancelDebtEdit:$('#cancelDebtEdit'),debtPreview:$('#debtPreview'),debtMessage:$('#debtMessage'),debtList:$('#debtList'),debtEmpty:$('#debtEmpty'),debtCount:$('#debtCount'),debtGrandTotal:$('#debtGrandTotal'),debtPaidTotal:$('#debtPaidTotal'),debtRemainingTotal:$('#debtRemainingTotal'),debtProgressText:$('#debtProgressText'),toast:$('#toast')};
Object.assign(el,{insightsPeriod:$('#insightsPeriod'),insightsStatus:$('#insightsStatus'),variableExpenseTotal:$('#variableExpenseTotal'),variableExpenseAlert:$('#variableExpenseAlert'),monthlyComparison:$('#monthlyComparison'),monthlyComparisonText:$('#monthlyComparisonText'),targetImpact:$('#targetImpact'),targetImpactText:$('#targetImpactText'),monthlyRecommendation:$('#monthlyRecommendation'),cloudStatus:$('#cloudStatus'),automationList:$('#automationList')});
let transactions=[],debts=[],automaticRules=[],toastTimer,isSyncing=false,editingDebtId=null;

function localDate(){const now=new Date(),offset=now.getTimezoneOffset()*60000;return new Date(now-offset).toISOString().slice(0,10)}
function isApiConfigured(){return API_URL&&!API_URL.includes('COLE_AQUI')}
function setCloudStatus(state,text){el.cloudStatus.className=`cloud-status ${state}`;el.cloudStatus.querySelector('strong').textContent=text}
async function apiRequest(action,data={}){
  if(!isApiConfigured())throw new Error('Configure o endpoint de nuvem no arquivo config.js.');
  const options=action==='list'?{method:'GET',cache:'no-store'}:{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data})};
  const response=await fetch(action==='list'?`${API_URL}?t=${Date.now()}`:API_URL,options);
  if(!response.ok)throw new Error(`Falha na comunicação com a planilha (${response.status}).`);
  const responseText=await response.text();
  let result;
  try{result=JSON.parse(responseText)}catch{
    if(responseText.trim().startsWith('<'))throw new Error('A função da Netlify não foi encontrada ou o Google Apps Script exige login. Verifique a publicação da função e a URL /exec.');
    throw new Error('A nuvem retornou uma resposta inválida.');
  }
  if(!result.success)throw new Error(result.message||'A planilha recusou a operação.');
  return result;
}
async function loadCloudData(showMessage=false){
  if(isSyncing)return;
  isSyncing=true;setCloudStatus('syncing','Sincronizando');
  try{
    const result=await apiRequest('list');
    transactions=Array.isArray(result.transactions)?result.transactions.map(normalizeTransaction).filter(item=>item.data):[];
    ensureTransactionYears();
    debts=Array.isArray(result.debts)?result.debts:[];
    automaticRules=Array.isArray(result.automations)?result.automations:[];
    render();renderDebts();setCloudStatus('online','Nuvem atualizada');
    if(showMessage)toast('Dados atualizados pela planilha.');
  }catch(error){setCloudStatus('offline','Nuvem desconectada');toast(error.message)}
  finally{isSyncing=false}
}
function money(text){const clean=text.trim().replace(/\s|R\$/gi,'');if(!clean)return NaN;return Number(clean.includes(',')?clean.replace(/\./g,'').replace(',','.'):clean)}
function normalizeDate(value,createdAt){
  if(!value)return'';
  const raw=String(value).trim();
  const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return`${iso[1]}-${iso[2]}-${iso[3]}`;
  const brazilian=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(brazilian)return`${brazilian[3]}-${brazilian[2].padStart(2,'0')}-${brazilian[1].padStart(2,'0')}`;
  const timestamp=Number(createdAt),reference=new Date(timestamp),referenceYear=Number.isNaN(reference.getTime())?new Date().getFullYear():reference.getFullYear();
  const withYear=/\b\d{4}\b/.test(raw)?raw:`${raw} ${referenceYear}`;
  const parsed=new Date(withYear);if(Number.isNaN(parsed.getTime()))return'';
  return`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
}
function normalizeTransaction(item){const criadoEm=Number(item.criadoEm??item.createdAt)||0;return{id:String(item.id||''),tipo:item.tipo??item.type,descricao:String(item.descricao??item.description??''),valor:Number(item.valor??item.value)||0,categoria:String(item.categoria??item.category??'Outros'),data:normalizeDate(item.data??item.date,criadoEm),formaPagamento:String(item.formaPagamento??item.payment??'Outros'),criadoEm}}
function dateBR(date){const [y,m,d]=String(date||'').split('-');return y&&m&&d?`${d}/${m}/${y}`:'Data inválida'}
function ensureTransactionYears(){const current=el.year.value,existing=new Set([...el.year.options].map(option=>option.value));transactions.forEach(item=>{const year=item.data.slice(0,4);if(/^\d{4}$/.test(year)&&!existing.has(year)){el.year.add(new Option(year,year));existing.add(year)}});if([...el.year.options].some(option=>option.value===current))el.year.value=current}
function safe(value){const div=document.createElement('div');div.textContent=String(value);return div.innerHTML}
function selectedPeriod(){return`${el.year.value}-${el.month.value}`}
function monthItems(){return transactions.filter(item=>item.data.slice(0,7)===selectedPeriod())}
function filtered(){const query=el.search.value.trim().toLocaleLowerCase('pt-BR');return monthItems().filter(item=>!query||[item.descricao,item.categoria,item.formaPagamento,item.tipo==='income'?'receita':'despesa'].some(field=>field.toLocaleLowerCase('pt-BR').includes(query))).sort((a,b)=>b.data.localeCompare(a.data)||b.criadoEm-a.criadoEm)}

function updateProgress(goal,saved,bar,label){const percent=Math.min(100,saved/goal*100);bar.style.width=`${percent}%`;label.textContent=percent>=100?'Meta alcançada!':`${percent.toLocaleString('pt-BR',{maximumFractionDigits:1})}% alcançado`}
function renderSummary(){const items=monthItems(),income=items.filter(i=>i.tipo==='income').reduce((s,i)=>s+i.valor,0),expense=items.filter(i=>i.tipo==='expense').reduce((s,i)=>s+i.valor,0),balance=income-expense,saved=Math.max(0,balance);el.income.textContent=currency.format(income);el.expense.textContent=currency.format(expense);el.balance.textContent=currency.format(balance);el.balance.classList.toggle('negative',balance<0);el.goal15.textContent=currency.format(Math.max(0,15000-saved));el.goal20.textContent=currency.format(Math.max(0,20000-saved));updateProgress(15000,saved,el.bar15,el.label15);updateProgress(20000,saved,el.bar20,el.label20)}
function renderList(){const items=filtered();el.list.innerHTML=items.map(item=>{const income=item.tipo==='income';return`<tr><td>${dateBR(item.data)}</td><td class="description-cell" title="${safe(item.descricao)}">${safe(item.descricao)}</td><td>${safe(item.categoria)}</td><td>${safe(item.formaPagamento)}</td><td><span class="type-badge ${income?'income':'expense'}">${income?'Receita':'Despesa'}</span></td><td class="value-cell ${income?'income-value':'expense-value'}">${income?'+':'−'} ${currency.format(item.valor)}</td><td><button class="delete-button" type="button" data-delete-id="${item.id}" title="Excluir lançamento" aria-label="Excluir ${safe(item.descricao)}">×</button></td></tr>`}).join('');el.empty.hidden=items.length>0;el.list.closest('table').hidden=items.length===0;el.count.textContent=items.length?`${items.length} ${items.length===1?'lançamento encontrado':'lançamentos encontrados'}`:'Nenhum lançamento neste período'}
function renderChart(){
  const colors=['#1667ff','#18c8c8','#8069e9','#ef5261','#f5b83d','#10b981','#ee7c36','#db4ec5','#4f7f9d','#8fb43d','#5367d5','#cf6d8d','#8592a6'];
  const grouped=monthItems().filter(item=>item.tipo==='expense').reduce((result,item)=>{result[item.categoria]=(result[item.categoria]||0)+item.valor;return result},{});
  const data=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  const total=data.reduce((sum,item)=>sum+item[1],0);
  el.chartTotal.textContent=currency.format(total);
  el.chartCenterTotal.textContent=total>=1000?`R$ ${(total/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mil`:currency.format(total).replace(',00','');
  el.chartEmpty.hidden=total>0;
  el.chartCenterTotal.parentElement.hidden=total===0;
  el.chartLegend.innerHTML=data.map(([category,value],index)=>`<div class="legend-item"><span class="legend-color" style="--legend-color:${colors[index%colors.length]}"></span><div class="legend-name"><strong>${safe(category)}</strong><small>${(value/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% do total</small></div><b>${currency.format(value)}</b></div>`).join('');

  const canvas=el.chart,displaySize=Math.round(canvas.getBoundingClientRect().width)||300,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==displaySize*dpr||canvas.height!==displaySize*dpr){canvas.width=displaySize*dpr;canvas.height=displaySize*dpr}
  const context=canvas.getContext('2d'),size=displaySize,center=size/2,radius=Math.max(80,size/2-30),lineWidth=Math.max(28,size*.12);
  context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,size,size);
  context.lineWidth=lineWidth;context.lineCap='butt';
  if(!total){context.beginPath();context.arc(center,center,radius,0,Math.PI*2);context.strokeStyle='#e9eef5';context.stroke();return}
  let start=-Math.PI/2;
  data.forEach(([,value],index)=>{const angle=value/total*Math.PI*2,gap=data.length>1?.018:0;context.beginPath();context.arc(center,center,radius,start+gap,start+angle-gap);context.strokeStyle=colors[index%colors.length];context.stroke();start+=angle});
}
function renderDebts(){
  const priorityOrder={high:0,medium:1,low:2},priorityText={high:'Prioridade alta',medium:'Prioridade média',low:'Prioridade baixa'};
  const sorted=[...debts].sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||b.createdAt-a.createdAt);
  const total=debts.reduce((sum,item)=>sum+item.total,0),paid=debts.reduce((sum,item)=>sum+item.paid,0),remaining=Math.max(0,total-paid),percentage=total?Math.min(100,paid/total*100):0;
  el.debtGrandTotal.textContent=currency.format(total);el.debtPaidTotal.textContent=currency.format(paid);el.debtRemainingTotal.textContent=currency.format(remaining);el.debtProgressText.textContent=`${percentage.toLocaleString('pt-BR',{maximumFractionDigits:1})}% quitado`;
  el.debtList.innerHTML=sorted.map(item=>{const balance=Math.max(0,item.total-item.paid),progress=item.total?Math.min(100,item.paid/item.total*100):0,installments=Math.max(0,Number(item.installments)||0);return`<article class="debt-item"><div class="creditor-cell"><strong title="${safe(item.creditor)}">${safe(item.creditor)}</strong><span class="priority-badge priority-${item.priority}">${priorityText[item.priority]}</span></div><div class="debt-value"><span>Valor total</span><strong>${currency.format(item.total)}</strong></div><div class="debt-value"><span>Valor pago</span><strong>${currency.format(item.paid)}</strong></div><div class="debt-value remaining"><span>Saldo restante</span><strong>${currency.format(balance)}</strong></div><div class="debt-value"><span>Parcelas restantes</span><strong>${installments||'—'}</strong></div><div class="debt-progress-cell"><div class="debt-progress-track"><div class="debt-progress-fill" style="width:${progress}%"></div></div><small>${progress.toLocaleString('pt-BR',{maximumFractionDigits:1})}% pago</small></div><div class="debt-actions"><button class="pay-debt-button" type="button" data-pay-debt="${item.id}" ${!installments||balance<=0?'disabled':''}>✓ Pagar parcela</button><button class="edit-debt-button" type="button" data-edit-debt="${item.id}">Editar</button><button class="delete-button" type="button" data-delete-debt="${item.id}" title="Excluir dívida" aria-label="Excluir dívida de ${safe(item.creditor)}">×</button></div></article>`}).join('');
  el.debtEmpty.hidden=sorted.length>0;el.debtList.hidden=sorted.length===0;el.debtCount.textContent=sorted.length?`${sorted.length} ${sorted.length===1?'dívida cadastrada':'dívidas cadastradas'}`:'Nenhuma dívida cadastrada';
}
function renderInsights(){
  const items=monthItems(),income=items.filter(item=>item.tipo==='income').reduce((sum,item)=>sum+item.valor,0),expenses=items.filter(item=>item.tipo==='expense'),expenseTotal=expenses.reduce((sum,item)=>sum+item.valor,0),balance=income-expenseTotal;
  const fixedCategories=new Set(['aluguel','babá','escola','dívidas']);
  const isVariable=item=>!fixedCategories.has(item.categoria.toLocaleLowerCase('pt-BR'));
  const variable=expenses.filter(isVariable).reduce((sum,item)=>sum+item.valor,0),variableRatio=income?variable/income:0;
  const selectedDate=new Date(Number(el.year.value),Number(el.month.value)-2,1),previousPeriod=`${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}`;
  const previousVariable=transactions.filter(item=>item.tipo==='expense'&&item.data.slice(0,7)===previousPeriod&&isVariable(item)).reduce((sum,item)=>sum+item.valor,0);
  const saved=Math.max(0,balance),impact15=Math.min(100,saved/15000*100),impact20=Math.min(100,saved/20000*100),monthName=el.month.options[el.month.selectedIndex]?.text||'';
  let level='neutral',status='Aguardando dados';
  if(items.length){if(balance<=0){level='danger';status='Atenção necessária'}else if(variableRatio>0.5){level='warning';status='Gastos elevados'}else{level='good';status='Mês sob controle'}}
  el.insightsPeriod.textContent=`Análise de ${monthName} de ${el.year.value}`;el.insightsStatus.className=`insights-status ${level}`;el.insightsStatus.textContent=status;el.variableExpenseTotal.textContent=currency.format(variable);
  if(!expenses.length)el.variableExpenseAlert.textContent='Nenhuma despesa registrada neste período.';
  else if(!income)el.variableExpenseAlert.textContent='Registre sua receita para medir o peso desses gastos no orçamento.';
  else el.variableExpenseAlert.textContent=`Representam ${(variableRatio*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% da receita do mês.`;
  if(previousVariable>0){const difference=(variable-previousVariable)/previousVariable*100,direction=difference>0?'↑':difference<0?'↓':'→';el.monthlyComparison.textContent=`${direction} ${Math.abs(difference).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;el.monthlyComparisonText.textContent=difference>0?`Você gastou ${currency.format(variable-previousVariable)} a mais que no mês anterior.`:difference<0?`Você economizou ${currency.format(previousVariable-variable)} em gastos variáveis.`:'Os gastos variáveis ficaram estáveis em relação ao mês anterior.'}
  else{el.monthlyComparison.textContent='Sem histórico';el.monthlyComparisonText.textContent='Ainda não há gastos variáveis no mês anterior para comparar.'}
  el.targetImpact.textContent=`${impact15.toLocaleString('pt-BR',{maximumFractionDigits:1})}% da meta mínima`;
  el.targetImpactText.textContent=saved?`O saldo cobre ${impact20.toLocaleString('pt-BR',{maximumFractionDigits:1})}% da meta ideal de R$ 20 mil.`:balance<0?`O déficit de ${currency.format(Math.abs(balance))} afasta o mês das duas metas.`:'Seu saldo positivo mostrará o avanço rumo às metas.';
  el.monthlyRecommendation.className=`monthly-recommendation ${level}`;
  const recommendation=!items.length?'Registre receitas e despesas para gerar uma orientação personalizada.':balance<=0?`Reduza ao menos ${currency.format(Math.abs(balance))} dos gastos ou aumente a receita para voltar ao saldo positivo.`:variableRatio>0.5?`Os gastos variáveis consomem mais da metade da receita. Uma redução de 10% liberaria ${currency.format(variable*.1)} para a meta.`:`Você preservou ${currency.format(saved)} neste mês. Faltam ${currency.format(Math.max(0,15000-saved))} para R$ 15 mil e ${currency.format(Math.max(0,20000-saved))} para R$ 20 mil.`;
  el.monthlyRecommendation.innerHTML=`<span aria-hidden="true">✦</span><p><strong>Recomendação do mês:</strong> ${recommendation}</p>`;
}
function renderAutomations(){
  if(!el.automationList)return;
  if(!automaticRules.length){el.automationList.innerHTML='<p class="automation-loading">A programação aparecerá após a atualização do Apps Script.</p>';return}
  el.automationList.innerHTML=automaticRules.map(rule=>`<article class="automation-item"><span class="automation-type ${rule.type==='income'?'income':'expense'}">${rule.type==='income'?'Receita':'Despesa'}</span><div><strong>${safe(rule.description)}</strong><small>${safe(rule.schedule)} · ${safe(rule.category)}</small></div><b>${currency.format(Number(rule.value)||0)}</b></article>`).join('');
}
function render(){renderSummary();renderInsights();renderAutomations();renderChart();renderList()}
function toast(message){clearTimeout(toastTimer);el.toast.textContent=message;el.toast.classList.add('visible');toastTimer=setTimeout(()=>el.toast.classList.remove('visible'),2600)}

el.form.addEventListener('submit',async event=>{
  event.preventDefault();el.message.textContent='';
  const value=money(el.value.value),type=new FormData(el.form).get('type');
  if(!el.description.value.trim()||!el.category.value||!el.date.value||!el.payment.value){el.message.textContent='Preencha todos os campos para continuar.';return}
  if(!Number.isFinite(value)||value<=0){el.message.textContent='Digite um valor válido maior que zero.';el.value.focus();return}
  const button=el.form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Salvando na nuvem...';
  try{
    const payload={type,description:el.description.value.trim(),value,category:el.category.value,date:el.date.value,payment:el.payment.value};
    await apiRequest('addTransaction',{data:payload});
    el.year.value=payload.date.slice(0,4);el.month.value=payload.date.slice(5,7);el.form.reset();$('input[name="type"][value="income"]').checked=true;el.date.value=localDate();await loadCloudData();el.description.focus();toast('Lançamento salvo e dados atualizados.');
  }catch(error){el.message.textContent=error.message;setCloudStatus('offline','Falha ao salvar')}
  finally{button.disabled=false;button.textContent='＋ Adicionar lançamento'}
});
el.list.addEventListener('click',async event=>{const button=event.target.closest('[data-delete-id]');if(!button)return;const item=transactions.find(i=>i.id===button.dataset.deleteId);if(!item||!confirm(`Excluir o lançamento “${item.descricao}”?`))return;button.disabled=true;try{await apiRequest('deleteTransaction',{id:item.id});await loadCloudData();toast('Lançamento excluído da planilha.')}catch(error){button.disabled=false;toast(error.message)}});
el.export.addEventListener('click',()=>{const items=filtered();if(!items.length){toast('Não há lançamentos para exportar neste período.');return}const quote=value=>`"${String(value).replace(/"/g,'""')}"`,rows=[['Data','Descrição','Categoria','Forma de pagamento','Tipo','Valor'],...items.map(i=>[dateBR(i.data),i.descricao,i.categoria,i.formaPagamento,i.tipo==='income'?'Receita':'Despesa',i.valor.toFixed(2).replace('.',',')])],csv='\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),link=document.createElement('a');link.href=url;link.download=`lancamentos-${selectedPeriod()}.csv`;link.click();URL.revokeObjectURL(url);toast('Arquivo CSV exportado.')});

el.debtForm.addEventListener('submit',async event=>{event.preventDefault();el.debtMessage.textContent='';const total=money(el.debtTotal.value),paid=money(el.debtPaid.value),installments=Math.max(0,Math.floor(Number(el.debtInstallments.value)||0));if(!el.creditor.value.trim()||!el.debtPriority.value||!Number.isFinite(total)||!Number.isFinite(paid)){el.debtMessage.textContent='Preencha todos os campos com valores válidos.';return}if(total<=0||paid<0){el.debtMessage.textContent='O valor total deve ser maior que zero e o pago não pode ser negativo.';return}if(paid>total){el.debtMessage.textContent='O valor pago não pode ser maior que o valor total.';return}const button=el.debtForm.querySelector('button[type="submit"]'),wasEditing=Boolean(editingDebtId);button.disabled=true;button.textContent='Salvando na nuvem...';try{const payload={creditor:el.creditor.value.trim(),total,paid,priority:el.debtPriority.value,installments};await apiRequest(wasEditing?'updateDebt':'addDebt',wasEditing?{id:editingDebtId,data:payload}:{data:payload});resetDebtForm();await loadCloudData();toast(wasEditing?'Dívida atualizada.':'Dívida salva na planilha.')}catch(error){el.debtMessage.textContent=error.message}finally{button.disabled=false;button.textContent=editingDebtId?'Salvar alterações':'＋ Adicionar dívida'}});
el.debtList.addEventListener('click',async event=>{
  const editButton=event.target.closest('[data-edit-debt]'),payButton=event.target.closest('[data-pay-debt]'),deleteButton=event.target.closest('[data-delete-debt]');
  if(editButton){const item=debts.find(debt=>debt.id===editButton.dataset.editDebt);if(!item)return;editingDebtId=item.id;el.creditor.value=item.creditor;el.debtTotal.value=Number(item.total).toLocaleString('pt-BR',{minimumFractionDigits:2});el.debtPaid.value=Number(item.paid).toLocaleString('pt-BR',{minimumFractionDigits:2});el.debtPriority.value=item.priority;el.debtInstallments.value=item.installments||0;el.debtForm.querySelector('button[type="submit"]').textContent='Salvar alterações';el.cancelDebtEdit.hidden=false;el.debtForm.scrollIntoView({behavior:'smooth',block:'start'});updateDebtPreview();return}
  if(payButton){const item=debts.find(debt=>debt.id===payButton.dataset.payDebt);if(!item)return;const installments=Number(item.installments)||0,amount=installments?Math.max(0,item.total-item.paid)/installments:0;if(!confirm(`Confirmar pagamento de ${currency.format(amount)} para ${item.creditor}?`))return;payButton.disabled=true;try{await apiRequest('payDebt',{id:item.id});await loadCloudData();toast('Parcela registrada como paga.')}catch(error){payButton.disabled=false;toast(error.message)}return}
  if(deleteButton){const item=debts.find(debt=>debt.id===deleteButton.dataset.deleteDebt);if(!item||!confirm(`Excluir a dívida de “${item.creditor}”?`))return;deleteButton.disabled=true;try{await apiRequest('deleteDebt',{id:item.id});await loadCloudData();toast('Dívida excluída da planilha.')}catch(error){deleteButton.disabled=false;toast(error.message)}}
});
function resetDebtForm(){editingDebtId=null;el.debtForm.reset();el.debtPaid.value='0,00';el.cancelDebtEdit.hidden=true;el.debtForm.querySelector('button[type="submit"]').textContent='＋ Adicionar dívida';updateDebtPreview()}
el.cancelDebtEdit.addEventListener('click',resetDebtForm);
function updateDebtPreview(){const total=money(el.debtTotal.value),paid=money(el.debtPaid.value),remaining=Number.isFinite(total)&&Number.isFinite(paid)?Math.max(0,total-paid):0;el.debtPreview.textContent=currency.format(remaining)}
[el.debtTotal,el.debtPaid].forEach(input=>{input.addEventListener('input',updateDebtPreview);input.addEventListener('blur',()=>{const value=money(input.value);if(Number.isFinite(value)&&value>=0)input.value=value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});updateDebtPreview()})});
document.querySelectorAll('.view-tab').forEach(button=>button.addEventListener('click',()=>{const showDebts=button.dataset.view==='debts';document.querySelectorAll('.view-tab').forEach(tab=>tab.classList.toggle('active',tab===button));document.querySelectorAll('.dashboard-section').forEach(section=>section.hidden=showDebts);$('#debtsView').hidden=!showDebts;document.querySelector('.month-control').hidden=showDebts;if(showDebts)renderDebts()}));
el.month.addEventListener('change',render);el.year.addEventListener('change',render);el.search.addEventListener('input',renderList);el.value.addEventListener('blur',()=>{const value=money(el.value.value);if(Number.isFinite(value)&&value>0)el.value.value=value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})});
const today=localDate(),currentYear=Number(today.slice(0,4));for(let year=currentYear+2;year>=currentYear-8;year--)el.year.add(new Option(year,year));el.date.value=today;el.month.value=today.slice(5,7);el.year.value=today.slice(0,4);el.debtPaid.value='0,00';render();renderDebts();
if(location.protocol==='file:'){setCloudStatus('offline','Publicação necessária');toast('A versão em nuvem funciona após a publicação na Netlify ou Vercel.')}else if(isApiConfigured())loadCloudData();else{setCloudStatus('offline','Configuração pendente');toast('Configure o endpoint de nuvem no arquivo config.js.')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isApiConfigured())loadCloudData()});
