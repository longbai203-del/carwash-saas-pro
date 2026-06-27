/**
 * services/orderService.js - 订单服务
 */
window.OrderService = {
    generateOrderNumber() {
        const today = new Date();
        const prefix = 'ORD-' + today.getFullYear() +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');
        const count = (AppStore.get('allOrders') || [])
            .filter(o => o.date === AppUtils.today()).length + 1;
        return prefix + '-' + String(count).padStart(4, '0');
    },

    async createOrder(orderData) {
        const order = {
            order_number: this.generateOrderNumber(),
            plate_number: orderData.plate_number,
            customer_id: orderData.customer_id || null,
            employee_id: orderData.employee_id || null,
            staff_name: orderData.staff_name,
            service_name: orderData.service_name,
            amount: orderData.amount,
            vat: orderData.vat || 0,
            total: orderData.total,
            payment_method: orderData.payment_method,
            status: orderData.status || 'pending',
            date: orderData.date || AppUtils.today(),
            created_at: new Date().toISOString()
        };
        const result = await SupabaseService.insert('orders', [order]);
        if (result && result.length > 0) {
            const orders = AppStore.get('allOrders') || [];
            orders.unshift(result[0]);
            AppStore.set('allOrders', orders);
            return result[0];
        }
        return null;
    },

    async getOrders(filters = {}) {
        const options = { order: { by: 'created_at', ascending: false }, limit: 200 };
        if (filters.date) options.filter = { date: filters.date };
        if (filters.status) options.filter = { ...options.filter, status: filters.status };
        if (filters.customer_id) options.filter = { ...options.filter, customer_id: filters.customer_id };
        return SupabaseService.query('orders', options);
    },

    async getTodayOrders() {
        return this.getOrders({ date: AppUtils.today() });
    },

    async updateStatus(orderId, status) {
        return SupabaseService.update('orders', orderId, {
            status: status,
            updated_at: new Date().toISOString()
        });
    },

    async updateOrder(orderId, data) {
        data.updated_at = new Date().toISOString();
        return SupabaseService.update('orders', orderId, data);
    },

    async deleteOrder(orderId) {
        return SupabaseService.delete('orders', orderId);
    },

    async getStats() {
        const orders = await this.getOrders();
        const today = AppUtils.today();
        const todayOrders = orders.filter(o => o.date === today);
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const todayTotal = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'in_progress');
        return {
            totalOrders: orders.length,
            totalRevenue: total,
            todayOrders: todayOrders.length,
            todayRevenue: todayTotal,
            pendingOrders: pending.length,
            avgOrder: orders.length > 0 ? total / orders.length : 0
        };
    },

    async getTopServices() {
        const orders = await this.getOrders();
        const stats = {};
        orders.forEach(o => {
            const name = o.service_name || '基础';
            stats[name] = (stats[name] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    },

    async getTopStaff() {
        const orders = await this.getOrders();
        const stats = {};
        orders.forEach(o => {
            const name = o.staff_name || '未知';
            stats[name] = (stats[name] || 0) + (o.total || 0);
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, revenue]) => ({ name, revenue }));
    },

    async getDailyReport(date) {
        const orders = await SupabaseService.query('orders', {
            filter: { date: date || AppUtils.today() }
        });
        const total = orders.reduce((s, o) => s + (o.total || 0), 0);
        const vat = orders.reduce((s, o) => s + (o.vat || 0), 0);
        const byPayment = {};
        orders.forEach(o => {
            const method = o.payment_method || 'other';
            byPayment[method] = (byPayment[method] || 0) + (o.total || 0);
        });
        return { orders, total, vat, count: orders.length, byPayment };
    },

    calculateCommission(order) {
        const rate = AppStore.get('config')?.commissionRate || 5;
        return order.total * rate / 100;
    }
};

console.log('[OrderService] 加载完成');
