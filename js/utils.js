// ================================================================
//  Toast
// ================================================================
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-custom';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ================================================================
//  关闭模态框
// ================================================================
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================================================================
//  加载所有数据
// ================================================================
async function loadAllData() {
    try {
        const [usersRes, ordersRes, customersRes, inventoryRes, attendanceRes, commissionRes, auditRes, branchesRes] = await Promise.all([
            supabaseClient.from('users').select('*'),
            supabaseClient.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
            supabaseClient.from('customers').select('*'),
            supabaseClient.from('inventory').select('*'),
            supabaseClient.from('attendance').select('*').order('time', { ascending: false }).limit(100),
            supabaseClient.from('commissions').select('*').order('created_at', { ascending: false }).limit(100),
            supabaseClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
            supabaseClient.from('stores').select('*')
        ]);

        if (usersRes.error) throw new Error(usersRes.error.message);
        if (ordersRes.error) throw new Error(ordersRes.error.message);
        if (customersRes.error) throw new Error(customersRes.error.message);
        if (inventoryRes.error) throw new Error(inventoryRes.error.message);
        if (attendanceRes.error) throw new Error(attendanceRes.error.message);
        if (commissionRes.error) throw new Error(commissionRes.error.message);
        if (auditRes.error) throw new Error(auditRes.error.message);
        if (branchesRes.error) throw new Error(branchesRes.error.message);

        allUsers = usersRes.data || [];
        allOrders = ordersRes.data || [];
        allCustomers = customersRes.data || [];
        allInventory = inventoryRes.data || [];
        allAttendance = attendanceRes.data || [];
        allCommissions = commissionRes.data || [];
        allAuditLogs = auditRes.data || [];
        allBranches = branchesRes.data || [];

        try { const savedConfig = JSON.parse(localStorage.getItem('cw_config')); if (savedConfig) config = { ...config, ...savedConfig }; } catch(e) {}
        return true;
    } catch (error) { console.error('Load data error:', error); showToast('⚠️ 加载数据失败'); return false; }
}

// ================================================================
//  Charts
// ================================================================
function initCharts() {
    const ctx1 = document.getElementById('serviceStatsChart');
    if (ctx1) {
        if (serviceChart) serviceChart.destroy();
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const counts = days.map(() => Math.floor(Math.random() * 10) + 1);
        serviceChart = new Chart(ctx1, {
            type: 'bar',
            data: { labels: days, datasets: [{ label: '订单数', data: counts, backgroundColor: '#0091D5', borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
    const ctx2 = document.getElementById('monthlyRevenueChart');
    if (ctx2) {
        if (revenueChart) revenueChart.destroy();
        const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
        const revenues = months.map(() => Math.floor(Math.random() * 5000) + 1000);
        revenueChart = new Chart(ctx2, {
            type: 'line',
            data: { labels: months, datasets: [{ label: '收入', data: revenues, borderColor: '#0091D5', fill: true, tension: 0.3 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}