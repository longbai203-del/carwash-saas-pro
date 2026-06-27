// ================================================================
//  仪表板
// ================================================================
function refreshDashboard() {
    const orders = getFilteredOrders();
    const total = orders.reduce((s, o) => s + (o.total || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => (o.date || '').startsWith(today));
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

    document.getElementById('todayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
    document.getElementById('todayOrdersValue').textContent = todayOrders.length;
    document.getElementById('customersValue').textContent = allCustomers.length;
    document.getElementById('totalSalesValue').textContent = total.toFixed(2) + ' SAR';
    document.getElementById('employeesCount').textContent = allUsers.filter(u => u.role !== 'owner' && u.status === 'approved').length;

    const lowStock = allInventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5)).length;
    const avgOrder = orders.length > 0 ? total / orders.length : 0;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_progress').length;
    document.getElementById('kpiTodayOrders').textContent = todayOrders.length;
    document.getElementById('kpiTodayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
    document.getElementById('kpiTotalRevenue').textContent = total.toFixed(2) + ' SAR';
    document.getElementById('kpiLowStock').textContent = lowStock;
    document.getElementById('kpiPendingOrders').textContent = pendingOrders;
    document.getElementById('kpiAvgOrder').textContent = avgOrder.toFixed(2) + ' SAR';

    const staffStats = {};
    orders.forEach(o => { const name = o.staff_name || '未知'; staffStats[name] = (staffStats[name] || 0) + (o.total || 0); });
    const topStaff = Object.entries(staffStats).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpiTopStaff').textContent = topStaff ? topStaff[0] + ' (' + topStaff[1].toFixed(0) + ' SAR)' : '-';

    const serviceStats = {};
    orders.forEach(o => { const name = o.service_name || '基础'; serviceStats[name] = (serviceStats[name] || 0) + 1; });
    const topService = Object.entries(serviceStats).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('kpiTopService').textContent = topService ? topService[0] + ' (' + topService[1] + '单)' : '-';

    const lowItems = allInventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5));
    const alertBar = document.getElementById('stockAlertBar');
    if (lowItems.length > 0) {
        alertBar.classList.remove('hidden');
        document.getElementById('stockAlertText').textContent = '⚠️ ' + lowItems.map(i => i.name + '(' + i.quantity + '/' + i.min_qty + ')').join('、');
    } else { alertBar.classList.add('hidden'); }

    const preview = document.getElementById('todayOrdersPreview');
    preview.innerHTML = todayOrders.slice(0, 10).map(o => `<div class="flex justify-between p-2 bg-gray-50 rounded-lg"><span>${o.plate_number || 'N/A'}</span><span class="status-badge ${ORDER_STATUS_CLASSES[o.status] || 'status-pending'}">${ORDER_STATUS_LABELS[o.status] || o.status}</span><span>${o.total || 0} SAR</span></div>`).join('') || '<div class="text-gray-400 text-center">今日暂无订单</div>';

    const counts = {};
    orders.forEach(o => { const n = o.service_name || 'Basic'; counts[n] = (counts[n] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('topServicesContent').innerHTML = sorted.map(([name, count]) => `<div class="flex justify-between"><span>${name}</span><span>${count} 单</span></div>`).join('') || '<div class="text-gray-400 text-center">暂无数据</div>';

    initCharts();
}