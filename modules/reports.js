/**
 * reports.js - 财务管理模块
 */
window.ReportsModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Reports] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Reports] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('reportTableBody')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        const picker = document.getElementById('reportDatePicker');
        if (picker) picker.addEventListener('change', () => this.loadData());
    },

    async loadData() {
        const date = document.getElementById('reportDatePicker')?.value || new Date().toISOString().split('T')[0];
        const orders = (AppState.allOrders || []).filter(o => o.date === date);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const vat = orders.reduce((s, o) => s + (o.vat || 0), 0);
        this.reportData = { orders, total, vat, date };
        this.render();
    },

    render() {
        const data = this.reportData || { orders: [], total: 0, vat: 0 };
        if (document.getElementById('dailyOrders')) document.getElementById('dailyOrders').textContent = data.orders.length;
        if (document.getElementById('dailyRevenue')) document.getElementById('dailyRevenue').textContent = data.total.toFixed(2) + ' SAR';
        if (document.getElementById('dailyVat')) document.getElementById('dailyVat').textContent = data.vat.toFixed(2) + ' SAR';
        if (document.getElementById('dailyProfit')) document.getElementById('dailyProfit').textContent = data.total.toFixed(2) + ' SAR';

        const table = document.getElementById('reportTableBody');
        if (table) {
            table.innerHTML = data.orders.slice(0, 30).map(o => 
                <div class="flex justify-between p-1 border-b text-sm"><span></span><span></span><span> SAR</span></div>
            ).join('') || '<div class="text-center text-gray-400 py-4">暂无数据</div>';
        }
    }
};

console.log('[Reports] 模块已注册');
