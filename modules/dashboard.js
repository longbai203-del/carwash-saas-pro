/**
 * dashboard.js - 仪表板模块
 * 生命周期: init() -> loadData() -> render() -> destroy()
 */
window.DashboardModule = {
    initialized: false,
    moduleName: 'dashboard',
    charts: [],

    async init() {
        if (this.initialized) return;
        console.log('[Dashboard] 初始化...');
        await this.loadData();
        this.render();
        this.setupRealtime();
        this.initialized = true;
        console.log('[Dashboard] 初始化完成');
    },

    destroy() {
        console.log('[Dashboard] 销毁...');
        this.charts.forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
        this.charts = [];
        this.initialized = false;
    },

    async loadData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .gte('date', today)
                .order('created_at', { ascending: false });
            if (orders) AppState.allOrders = orders;

            const { data: customers } = await supabase.from('customers').select('*');
            if (customers) AppState.allCustomers = customers;

            const { data: inventory } = await supabase.from('inventory').select('*');
            if (inventory) AppState.allInventory = inventory;

            const { data: users } = await supabase.from('users').select('*');
            if (users) AppState.allUsers = users;

        } catch (error) {
            console.error('[Dashboard] 加载数据失败:', error);
        }
    },

    render() {
        this.updateStats();
        this.updateTodayOrders();
        this.updateTopServices();
        this.initCharts();
    },

    updateStats() {
        const orders = AppState.allOrders || [];
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.date === today);
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

        const el = (id) => document.getElementById(id);
        if (el('todayRevenue')) el('todayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
        if (el('todayOrdersValue')) el('todayOrdersValue').textContent = todayOrders.length;
        if (el('customersValue')) el('customersValue').textContent = AppState.allCustomers?.length || 0;
        if (el('totalSalesValue')) el('totalSalesValue').textContent = total.toFixed(2) + ' SAR';
        if (el('employeesCount')) el('employeesCount').textContent = AppState.allUsers?.filter(u => u.status === 'approved' && u.role !== 'owner').length || 0;

        const lowStock = AppState.allInventory?.filter(i => (i.quantity || 0) <= (i.min_qty || 5)).length || 0;
        const avgOrder = orders.length > 0 ? total / orders.length : 0;
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_progress').length;

        if (el('kpiTodayOrders')) el('kpiTodayOrders').textContent = todayOrders.length;
        if (el('kpiTodayRevenue')) el('kpiTodayRevenue').textContent = todayRevenue.toFixed(2) + ' SAR';
        if (el('kpiTotalRevenue')) el('kpiTotalRevenue').textContent = total.toFixed(2) + ' SAR';
        if (el('kpiLowStock')) el('kpiLowStock').textContent = lowStock;
        if (el('kpiPendingOrders')) el('kpiPendingOrders').textContent = pendingOrders;
        if (el('kpiAvgOrder')) el('kpiAvgOrder').textContent = avgOrder.toFixed(2) + ' SAR';

        const staffStats = {};
        orders.forEach(o => { const name = o.staff_name || '未知'; staffStats[name] = (staffStats[name] || 0) + (o.total || 0); });
        const topStaff = Object.entries(staffStats).sort((a, b) => b[1] - a[1])[0];
        if (el('kpiTopStaff')) el('kpiTopStaff').textContent = topStaff ? topStaff[0] + ' (' + topStaff[1].toFixed(0) + ' SAR)' : '-';

        const serviceStats = {};
        orders.forEach(o => { const name = o.service_name || '基础'; serviceStats[name] = (serviceStats[name] || 0) + 1; });
        const topService = Object.entries(serviceStats).sort((a, b) => b[1] - a[1])[0];
        if (el('kpiTopService')) el('kpiTopService').textContent = topService ? topService[0] + ' (' + topService[1] + '单)' : '-';

        const lowItems = AppState.allInventory?.filter(i => (i.quantity || 0) <= (i.min_qty || 5)) || [];
        const alertBar = document.getElementById('stockAlertBar');
        const alertText = document.getElementById('stockAlertText');
        if (alertBar && alertText) {
            if (lowItems.length > 0) {
                alertBar.classList.remove('hidden');
                alertText.textContent = '⚠️ ' + lowItems.map(i => i.name + '(' + i.quantity + '/' + i.min_qty + ')').join('、');
            } else {
                alertBar.classList.add('hidden');
            }
        }
    },

    updateTodayOrders() {
        const preview = document.getElementById('todayOrdersPreview');
        if (!preview) return;
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = (AppState.allOrders || []).filter(o => o.date === today).slice(0, 10);
        preview.innerHTML = todayOrders.map(o => 
            <div class="flex justify-between p-2 bg-gray-50 rounded-lg">
                <span></span>
                <span class="status-badge "></span>
                <span> SAR</span>
            </div>
        ).join('') || '<div class="text-gray-400 text-center">今日暂无订单</div>';
    },

    updateTopServices() {
        const container = document.getElementById('topServicesContent');
        if (!container) return;
        const counts = {};
        (AppState.allOrders || []).forEach(o => { const n = o.service_name || 'Basic'; counts[n] = (counts[n] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        container.innerHTML = sorted.map(([name, count]) =>
            '<div class="flex justify-between"><span>' + name + '</span><span>' + count + ' 单</span></div>'
        ).join('') || '<div class="text-gray-400 text-center">暂无数据</div>';
    },

    initCharts() {
        const ctx1 = document.getElementById('serviceStatsChart');
        if (ctx1) {
            if (this.charts[0]) { this.charts[0].destroy(); }
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            const counts = days.map(() => Math.floor(Math.random() * 10) + 1);
            this.charts[0] = new Chart(ctx1, {
                type: 'bar',
                data: { labels: days, datasets: [{ label: '订单数', data: counts, backgroundColor: '#0091D5', borderRadius: 6 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
        const ctx2 = document.getElementById('monthlyRevenueChart');
        if (ctx2) {
            if (this.charts[1]) { this.charts[1].destroy(); }
            const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
            const revenues = months.map(() => Math.floor(Math.random() * 5000) + 1000);
            this.charts[1] = new Chart(ctx2, {
                type: 'line',
                data: { labels: months, datasets: [{ label: '收入', data: revenues, borderColor: '#0091D5', fill: true, tension: 0.3 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
    },

    setupRealtime() {
        if (AppState.realtimeSubscription) {
            AppState.realtimeSubscription.unsubscribe();
        }
        AppState.realtimeSubscription = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                this.loadData();
                this.render();
            })
            .subscribe();
    }
};

console.log('[Dashboard] 模块已注册');
