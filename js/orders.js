// ================================================================
//  orders.js - 订单管理模块
// ================================================================

const OrdersModule = {
    _boundFilter: null,
    _boundDate: null,
    _boundSearch: null,

    init() {
        console.log('📋 OrdersModule 初始化');
        if (!document.getElementById('ordersList')) {
            console.warn('⚠️ 订单元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        // 设置日期默认值
        const dateFilter = document.getElementById('orderDateFilter');
        if (dateFilter) {
            dateFilter.value = new Date().toISOString().split('T')[0];
        }
        this.loadOrders();
        this.bindEvents();
    },

    destroy() {
        console.log('📋 OrdersModule 销毁');
        const filter = document.getElementById('orderStatusFilter');
        if (filter && this._boundFilter) filter.removeEventListener('change', this._boundFilter);
        const date = document.getElementById('orderDateFilter');
        if (date && this._boundDate) date.removeEventListener('change', this._boundDate);
        const search = document.getElementById('orderSearch');
        if (search && this._boundSearch) search.removeEventListener('input', this._boundSearch);
    },

    bindEvents() {
        const filter = document.getElementById('orderStatusFilter');
        if (filter) {
            this._boundFilter = () => this.loadOrders();
            filter.addEventListener('change', this._boundFilter);
        }
        const date = document.getElementById('orderDateFilter');
        if (date) {
            this._boundDate = () => this.loadOrders();
            date.addEventListener('change', this._boundDate);
        }
        const search = document.getElementById('orderSearch');
        if (search) {
            this._boundSearch = () => this.loadOrders();
            search.addEventListener('input', this._boundSearch);
        }
    },

    loadOrders() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        const dateFilter = document.getElementById('orderDateFilter')?.value || '';
        const search = document.getElementById('orderSearch')?.value?.trim() || '';

        let orders = typeof getFilteredOrders === 'function' ? getFilteredOrders() : (allOrders || []);
        if (statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
        if (dateFilter) orders = orders.filter(o => o.date === dateFilter);
        if (search) orders = orders.filter(o =>
            (o.plate_number || '').includes(search) ||
            (o.order_number || '').includes(search) ||
            (o.staff_name || '').includes(search)
        );

        const list = document.getElementById('ordersList');
        if (!list) return;

        list.innerHTML = orders.slice(0, 50).map(o => `
            <div class="bg-white p-4 rounded-xl shadow-sm border hover:border-blue-300 cursor-pointer" onclick="OrdersModule.showDetail('${o.id}')">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold text-blue-600">#${o.order_number || o.id.slice(0, 8)}</span>
                        <span class="text-sm text-gray-400 ml-2">${o.date || ''}</span>
                        <span class="status-badge ${ORDER_STATUS_CLASSES?.[o.status] || 'status-pending'}">${ORDER_STATUS_LABELS?.[o.status] || o.status}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg">${(o.total || 0).toFixed(2)} SAR</div>
                        <div class="text-sm text-gray-400">${o.plate_number || 'N/A'} | ${o.staff_name || ''}</div>
                    </div>
                </div>
                <div class="flex gap-2 mt-2 flex-wrap">
                    ${o.status === 'pending' ? `<button onclick="event.stopPropagation();OrdersModule.updateStatus('${o.id}','confirmed')" class="btn-success btn-sm">确认</button>` : ''}
                    ${o.status === 'confirmed' ? `<button onclick="event.stopPropagation();OrdersModule.updateStatus('${o.id}','in_progress')" class="btn-warning btn-sm">施工</button>` : ''}
                    ${o.status === 'in_progress' ? `<button onclick="event.stopPropagation();OrdersModule.updateStatus('${o.id}','completed')" class="btn-primary btn-sm">完成</button>` : ''}
                    ${o.status === 'pending' || o.status === 'confirmed' ? `<button onclick="event.stopPropagation();OrdersModule.updateStatus('${o.id}','cancelled')" class="btn-danger btn-sm">取消</button>` : ''}
                </div>
            </div>
        `).join('') || '<div class="text-center text-gray-400">暂无订单</div>';
    },

    async updateStatus(orderId, newStatus) {
        try {
            const { data: order } = await supabaseClient.from('orders').select('status').eq('id', orderId).single();
            if (!order) { showToast('订单不存在'); return; }
            const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'], completed: ['refunded'], cancelled: [], refunded: [] };
            if (!transitions[order.status]?.includes(newStatus)) { showToast('❌ 状态转换不允许'); return; }
            await supabaseClient.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
            showToast('✅ 订单已更新');
            this.loadOrders();
            if (typeof refreshAll === 'function') refreshAll();
        } catch (error) {
            showToast('❌ 更新失败: ' + error.message);
        }
    },

    async showDetail(orderId) {
        const order = (allOrders || []).find(o => o.id === orderId);
        if (!order) { showToast('订单不存在'); return; }
        const customer = (allCustomers || []).find(c => c.id === order.customer_id);
        const employee = (allUsers || []).find(u => u.id === order.employee_id);
        const content = document.getElementById('orderDetailContent');
        if (!content) return;
        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div><span class="text-gray-500">订单号</span><div class="font-bold">#${order.order_number || order.id.slice(0, 8)}</div></div>
                    <div><span class="text-gray-500">状态</span><div><span class="status-badge ${ORDER_STATUS_CLASSES?.[order.status] || 'status-pending'}">${ORDER_STATUS_LABELS?.[order.status] || order.status}</span></div></div>
                    <div><span class="text-gray-500">日期</span><div>${order.date || ''}</div></div>
                    <div><span class="text-gray-500">车牌</span><div>${order.plate_number || 'N/A'}</div></div>
                    <div><span class="text-gray-500">客户</span><div>${customer?.name || '散客'}</div></div>
                    <div><span class="text-gray-500">员工</span><div>${employee?.name || order.staff_name || 'N/A'}</div></div>
                </div>
                <div class="border-t pt-3">
                    <div class="flex justify-between"><span>金额</span><span>${(order.amount || 0).toFixed(2)} SAR</span></div>
                    <div class="flex justify-between"><span>增值税</span><span>${(order.vat || 0).toFixed(2)} SAR</span></div>
                    <div class="flex justify-between text-xl font-bold text-blue-600"><span>总计</span><span>${(order.total || 0).toFixed(2)} SAR</span></div>
                </div>
                <button onclick="closeModal('orderDetailModal')" class="btn-outline btn-sm w-full">关闭</button>
            </div>
        `;
        const title = document.getElementById('orderDetailTitle');
        if (title) title.textContent = '订单详情 #' + (order.order_number || order.id.slice(0, 8));
        const modal = document.getElementById('orderDetailModal');
        if (modal) modal.classList.remove('hidden');
    }
};

window.OrdersModule = OrdersModule;
window.loadOrders = function() { OrdersModule.loadOrders(); };
window.updateOrderStatus = function(id, status) { OrdersModule.updateStatus(id, status); };
window.showOrderDetail = function(id) { OrdersModule.showDetail(id); };
console.log('✅ orders.js 已加载');