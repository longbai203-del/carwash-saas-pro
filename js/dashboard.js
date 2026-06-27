// ================================================================
//  dashboard.js - 仪表板模块（兼容模式）
// ================================================================

const DashboardModule = {
    init() {
        console.log('📊 DashboardModule 初始化');
        if (!document.getElementById('kpiTodayOrders')) {
            console.warn('⚠️ 仪表板元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        this.refresh();
    },

    destroy() {
        console.log('📊 DashboardModule 销毁');
    },

    refresh() {
        this.refreshDashboard();
    },

    refreshDashboard() {
        const orders = typeof getFilteredOrders === 'function' ? getFilteredOrders() : (allOrders || []);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => (o.date || '').startsWith(today));
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setText('todayRevenue', todayRevenue.toFixed(2) + ' SAR');
        setText('todayOrdersValue', todayOrders.length);
        setText('customersValue', (allCustomers || []).length);
        setText('totalSalesValue', total.toFixed(2) + ' SAR');
        setText('employeesCount', (allUsers || []).filter(u => u.role !== 'owner' && u.status === 'approved').length);

        const lowStock = (allInventory || []).filter(i => (i.quantity || 0) <= (i.min_qty || 5)).length;
        const avgOrder = orders.length > 0 ? total / orders.length : 0;
        const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'in_progress'].includes(o.status)).length;

        setText('kpiTodayOrders', todayOrders.length);
        setText('kpiTodayRevenue', todayRevenue.toFixed(2) + ' SAR');
        setText('kpiTotalRevenue', total.toFixed(2) + ' SAR');
        setText('kpiLowStock', lowStock);
        setText('kpiPendingOrders', pendingOrders);
        setText('kpiAvgOrder', avgOrder.toFixed(2) + ' SAR');

        const staffStats = {};
        orders.forEach(o => { const name = o.staff_name || '未知'; staffStats[name] = (staffStats[name] || 0) + (o.total || 0); });
        const topStaff = Object.entries(staffStats).sort((a, b) => b[1] - a[1])[0];
        setText('kpiTopStaff', topStaff ? topStaff[0] + ' (' + topStaff[1].toFixed(0) + ' SAR)' : '-');

        const serviceStats = {};
        orders.forEach(o => { const name = o.service_name || '基础'; serviceStats[name] = (serviceStats[name] || 0) + 1; });
        const topService = Object.entries(serviceStats).sort((a, b) => b[1] - a[1])[0];
        setText('kpiTopService', topService ? topService[0] + ' (' + topService[1] + '单)' : '-');

        const lowItems = (allInventory || []).filter(i => (i.quantity || 0) <= (i.min_qty || 5));
        const alertBar = document.getElementById('stockAlertBar');
        const alertText = document.getElementById('stockAlertText');
        if (lowItems.length > 0 && alertBar && alertText) {
            alertBar.classList.remove('hidden');
            alertText.textContent = '⚠️ ' + lowItems.map(i => i.name + '(' + i.quantity + '/' + i.min_qty + ')').join('、');
        } else if (alertBar) {
            alertBar.classList.add('hidden');
        }

        const preview = document.getElementById('todayOrdersPreview');
        if (preview) {
            preview.innerHTML = todayOrders.slice(0, 10).map(o =>
                `<div class="flex justify-between p-2 bg-gray-50 rounded-lg">
                    <span>${o.plate_number || 'N/A'}</span>
                    <span class="status-badge ${ORDER_STATUS_CLASSES?.[o.status] || 'status-pending'}">${ORDER_STATUS_LABELS?.[o.status] || o.status}</span>
                    <span>${o.total || 0} SAR</span>
                </div>`
            ).join('') || '<div class="text-gray-400 text-center">今日暂无订单</div>';
        }

        const counts = {};
        orders.forEach(o => { const n = o.service_name || 'Basic'; counts[n] = (counts[n] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topServices = document.getElementById('topServicesContent');
        if (topServices) {
            topServices.innerHTML = sorted.map(([name, count]) =>
                `<div class="flex justify-between"><span>${name}</span><span>${count} 单</span></div>`
            ).join('') || '<div class="text-gray-400 text-center">暂无数据</div>';
        }

        // 初始化图表
        if (typeof initCharts === 'function') initCharts();
    }
};

window.DashboardModule = DashboardModule;
window.refreshDashboard = function() { DashboardModule.refreshDashboard(); };
console.log('✅ dashboard.js 已加载');