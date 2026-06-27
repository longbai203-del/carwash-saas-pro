// ================================================================
//  reports.js - 财务管理模块
// ================================================================

const ReportsModule = {
    _boundPicker: null,

    init() {
        console.log('📊 ReportsModule 初始化');
        if (!document.getElementById('dailyOrders')) {
            console.warn('⚠️ 报表元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        const picker = document.getElementById('reportDatePicker');
        if (picker) {
            picker.value = new Date().toISOString().split('T')[0];
        }
        this.loadDailyReport();
        this.loadCommission();
        this.loadCustomerRank();
        this.bindEvents();
    },

    destroy() {
        console.log('📊 ReportsModule 销毁');
        const picker = document.getElementById('reportDatePicker');
        if (picker && this._boundPicker) {
            picker.removeEventListener('change', this._boundPicker);
        }
    },

    bindEvents() {
        const picker = document.getElementById('reportDatePicker');
        if (picker) {
            this._boundPicker = () => this.loadDailyReport();
            picker.addEventListener('change', this._boundPicker);
        }
    },

    switchReportTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
        const daily = document.getElementById('reportTabDaily');
        const comm = document.getElementById('reportTabCommission');
        const cust = document.getElementById('reportTabCustomers');
        if (daily) daily.classList.toggle('hidden', tab !== 'daily');
        if (comm) comm.classList.toggle('hidden', tab !== 'commission');
        if (cust) cust.classList.toggle('hidden', tab !== 'customers');
        if (tab === 'daily') this.loadDailyReport();
        if (tab === 'commission') this.loadCommission();
        if (tab === 'customers') this.loadCustomerRank();
    },

    loadDailyReport() {
        const picker = document.getElementById('reportDatePicker');
        const date = picker?.value || new Date().toISOString().split('T')[0];
        if (picker && !picker.value) picker.value = date;

        const orders = (typeof getFilteredOrders === 'function' ? getFilteredOrders() : (allOrders || []))
            .filter(o => o.date === date);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const vat = orders.reduce((s, o) => s + (o.vat || 0), 0);

        const dailyOrders = document.getElementById('dailyOrders');
        const dailyRevenue = document.getElementById('dailyRevenue');
        const dailyVat = document.getElementById('dailyVat');
        const dailyProfit = document.getElementById('dailyProfit');
        if (dailyOrders) dailyOrders.textContent = orders.length;
        if (dailyRevenue) dailyRevenue.textContent = total.toFixed(2) + ' SAR';
        if (dailyVat) dailyVat.textContent = vat.toFixed(2) + ' SAR';
        if (dailyProfit) dailyProfit.textContent = total.toFixed(2) + ' SAR';
    },

    exportDailyReport() {
        const date = document.getElementById('reportDatePicker')?.value || new Date().toISOString().split('T')[0];
        const orders = (typeof getFilteredOrders === 'function' ? getFilteredOrders() : (allOrders || []))
            .filter(o => o.date === date);
        if (orders.length === 0) { showToast('该日暂无数据'); return; }
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const data = [['订单号', '时间', '车牌', '服务', '金额', '支付方式', '员工', '状态']];
        orders.forEach(o => data.push([
            o.order_number || '',
            o.created_at ? new Date(o.created_at).toLocaleTimeString() : '',
            o.plate_number || '',
            o.service_name || '',
            o.total || 0,
            o.payment_method || '',
            o.staff_name || '',
            ORDER_STATUS_LABELS?.[o.status] || o.status
        ]));
        data.push(['', '', '', '', '合计', total.toFixed(2), '', '']);
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '日报');
        XLSX.writeFile(wb, `日报_${date}.xlsx`);
        showToast('✅ 日报已导出');
    },

    loadCommission() {
        const filterStaff = document.getElementById('commissionStaffFilter')?.value || 'all';
        const filterStatus = document.getElementById('commissionStatusFilter')?.value || 'all';

        let commissions = (allCommissions || []);
        if (filterStaff !== 'all') commissions = commissions.filter(c => c.employee_id === filterStaff);
        if (filterStatus !== 'all') commissions = commissions.filter(c => c.status === filterStatus);

        const list = document.getElementById('commissionList');
        if (!list) return;

        list.innerHTML = commissions.slice(0, 50).map(c => {
            const employee = (allUsers || []).find(u => u.id === c.employee_id);
            return `<div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div><span class="font-medium">${employee?.name || '未知'}</span></div>
                <div>
                    <span class="text-sm">${c.amount || 0} SAR × ${c.rate || 5}% = </span>
                    <span class="font-bold text-green-600">${(c.commission_amount || 0).toFixed(2)} SAR</span>
                    <span class="${c.status === 'paid' ? 'commission-paid' : 'commission-pending'}">${c.status === 'paid' ? '已结算' : '待结算'}</span>
                </div>
            </div>`;
        }).join('') || '<div class="text-center text-gray-400">暂无提成记录</div>';

        const total = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
        const totalEl = document.getElementById('commissionTotal');
        if (totalEl) totalEl.textContent = total.toFixed(2) + ' SAR';

        const staffFilter = document.getElementById('commissionStaffFilter');
        if (staffFilter) {
            staffFilter.innerHTML = '<option value="all">全部员工</option>' +
                (allUsers || []).filter(u => u.role !== 'owner' && u.status === 'approved')
                    .map(u => `<option value="${u.id}">${u.name || u.username}</option>`).join('');
        }
    },

    async settleCommission() {
        if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
            showToast('只有老板和店长可以结算提成');
            return;
        }
        const filterStaff = document.getElementById('commissionStaffFilter')?.value || 'all';
        const pending = (allCommissions || []).filter(c => c.status === 'pending' && (filterStaff === 'all' || c.employee_id === filterStaff));
        if (pending.length === 0) { showToast('没有待结算的提成'); return; }
        if (!confirm('确认结算 ' + pending.length + ' 条提成记录？')) return;

        try {
            for (const c of pending) {
                await supabaseClient.from('commissions').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', c.id);
                c.status = 'paid';
            }
            showToast('✅ 已结算 ' + pending.length + ' 条提成');
            this.loadCommission();
        } catch (error) { showToast('❌ 结算失败: ' + error.message); }
    },

    loadCustomerRank() {
        const type = document.getElementById('customerRankFilter')?.value || 'points';
        let sorted = [...(allCustomers || [])];
        if (type === 'points') sorted.sort((a, b) => (b.points || 0) - (a.points || 0));
        else if (type === 'spent') sorted.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
        else if (type === 'visits') sorted.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));

        const list = document.getElementById('customerRankList');
        if (!list) return;

        list.innerHTML = sorted.slice(0, 20).map((c, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
            const levelClass = 'customer-level customer-level-' + (c.level || 'normal').toLowerCase();
            return `<div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                    <span class="font-bold mr-2">${medal}</span>
                    <span>${c.name || '未知'}</span>
                    <span class="${levelClass}">${c.level || '普通'}</span>
                </div>
                <div class="text-right">
                    <div class="text-sm">积分: ${c.points || 0}</div>
                    <div class="text-sm">消费: ${(c.total_spent || 0).toFixed(2)} SAR</div>
                </div>
            </div>`;
        }).join('') || '<div class="text-center text-gray-400">暂无客户数据</div>';
    }
};

window.ReportsModule = ReportsModule;
window.switchReportTab = function(tab) { ReportsModule.switchReportTab(tab); };
window.loadDailyReport = function() { ReportsModule.loadDailyReport(); };
window.exportDailyReport = function() { ReportsModule.exportDailyReport(); };
window.loadCommission = function() { ReportsModule.loadCommission(); };
window.settleCommission = function() { ReportsModule.settleCommission(); };
window.loadCustomerRank = function() { ReportsModule.loadCustomerRank(); };
console.log('✅ reports.js 已加载');