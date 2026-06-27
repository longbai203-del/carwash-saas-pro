// ================================================================
//  POS功能
// ================================================================
function refreshPOS() {
    const custSel = document.getElementById('posCustomer');
    if (custSel) { const val = custSel.value; custSel.innerHTML = '<option value="">散客</option>' + allCustomers.map(c => `<option value="${c.id}">${c.name} (${c.plate_number || ''})</option>`).join(''); if (val) custSel.value = val; }
    const empSel = document.getElementById('posEmployee');
    if (empSel) { const staff = allUsers.filter(u => u.role !== 'owner' && u.status === 'approved'); empSel.innerHTML = staff.map(u => `<option value="${u.id}">${u.name || u.username}</option>`).join(''); if (currentUser) { for (let opt of empSel.options) { if (opt.value === currentUser.id) { opt.selected = true; break; } } } }
    updatePOSPrice();
}

function updatePOSPrice() {
    const servicePrices = { '基础清洗': 30, '深度清洗': 55, '外部抛光': 65, '内部护理': 70, '全车精洗': 110 };
    const service = document.getElementById('posService').value;
    const amount = servicePrices[service] || 30;
    const vat = amount * (config.vatRate || 15) / 100;
    document.getElementById('posAmount').value = amount;
    document.getElementById('posSubtotal').textContent = amount.toFixed(2) + ' SAR';
    document.getElementById('posVat').textContent = vat.toFixed(2) + ' SAR';
    document.getElementById('posTotal').textContent = (amount + vat).toFixed(2) + ' SAR';
}

document.getElementById('posService')?.addEventListener('change', updatePOSPrice);
document.getElementById('posAmount')?.addEventListener('input', function() {
    const amount = parseFloat(this.value) || 0;
    const vat = amount * (config.vatRate || 15) / 100;
    document.getElementById('posSubtotal').textContent = amount.toFixed(2) + ' SAR';
    document.getElementById('posVat').textContent = vat.toFixed(2) + ' SAR';
    document.getElementById('posTotal').textContent = (amount + vat).toFixed(2) + ' SAR';
});

async function posSaveOrder() {
    if (!currentUser) { showToast('请先登录'); return; }
    const plate = document.getElementById('posPlate').value.trim().toUpperCase();
    if (!plate) { showToast('请输入车牌号'); return; }
    const amount = parseFloat(document.getElementById('posAmount').value) || 0;
    if (amount <= 0) { showToast('金额必须大于0'); return; }

    try {
        const employeeId = document.getElementById('posEmployee').value || null;
        const serviceName = document.getElementById('posService').value;
        const paymentMethod = document.getElementById('posPayment').value;
        const vat = amount * (config.vatRate || 15) / 100;
        const total = amount + vat;
        const today = new Date().toISOString().split('T')[0];
        const orderNumber = 'ORD-' + today.replace(/-/g, '') + '-' + String(allOrders.filter(o => (o.date || '').startsWith(today)).length + 1).padStart(4, '0');
        const orderData = { order_number: orderNumber, plate_number: plate, employee_id: employeeId, staff_name: employeeId ? allUsers.find(u => u.id === employeeId)?.name : currentUser.name, service_name: serviceName, amount: amount, vat: vat, total: total, payment_method: paymentMethod, status: 'completed', date: today };
        const { data, error } = await supabaseClient.from('orders').insert([orderData]).select();
        if (error) throw new Error(error.message);
        if (data && data.length > 0) allOrders.unshift(data[0]);
        refreshAll();
        showToast('✅ 订单保存成功: ' + total.toFixed(2) + ' SAR');
        document.getElementById('posPlate').value = '';
    } catch (error) { showToast('❌ 保存失败: ' + error.message); }
}