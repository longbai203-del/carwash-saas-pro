/**
 * orders.js - 订单管理模块
 */
window.OrdersModule = {
    initialized: false,
    events: [],
    filteredOrders: [],

    async init() {
        if (this.initialized) return;
        console.log('[Orders] 初始化...');
        await this.waitForDOM();
        this.bindEvents();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Orders] 初始化完成');
    },

    destroy() {
        this.events.forEach(({ el, event, handler }) => {
            if (el) el.removeEventListener(event, handler);
        });
        this.events = [];
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('ordersList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        ['orderStatusFilter', 'orderDateFilter', 'orderSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const handler = () => { this.loadData(); };
                el.addEventListener('change', handler);
                el.addEventListener('input', handler);
                this.events.push({ el, event: 'change', handler });
            }
        });
    },

    async loadData() {
        const status = document.getElementById('orderStatusFilter')?.value || 'all';
        const date = document.getElementById('orderDateFilter')?.value || '';
        const search = document.getElementById('orderSearch')?.value?.trim() || '';
        let orders = AppState.allOrders || [];
        if (status !== 'all') orders = orders.filter(o => o.status === status);
        if (date) orders = orders.filter(o => o.date === date);
        if (search) orders = orders.filter(o => o.plate_number?.includes(search) || o.order_number?.includes(search) || o.staff_name?.includes(search));
        this.filteredOrders = orders;
        this.render();
    },

    render() {
        const list = document.getElementById('ordersList');
        if (!list) return;
        list.innerHTML = this.filteredOrders.slice(0, 50).map(o => 
            <div class="bg-white p-4 rounded-xl shadow-sm border hover:border-blue-300 cursor-pointer"
                 onclick="window.OrdersModule?.showDetail('')">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold text-blue-600">#</span>
                        <span class="text-sm text-gray-400 ml-2"></span>
                        <span class="status-badge "></span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg"> SAR</div>
                        <div class="text-sm text-gray-400"></div>
                    </div>
                </div>
            </div>
        ).join('') || '<div class="text-center text-gray-400 py-8">暂无订单</div>';
    },

    showDetail(orderId) {
        const order = AppState.allOrders.find(o => o.id === orderId);
        if (!order) { showToast('订单不存在'); return; }
        showToast('📋 订单 #' + (order.order_number || order.id.slice(0, 8)) + ' | ' + (order.total || 0) + ' SAR');
    }
};

console.log('[Orders] 模块已注册');
