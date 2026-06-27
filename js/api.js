/**
 * api.js - API服务层
 */
window.AppApi = {
    async query(table, options = {}) {
        let query = supabase.from(table).select(options.select || '*');
        if (options.filter) {
            Object.keys(options.filter).forEach(key => {
                query = query.eq(key, options.filter[key]);
            });
        }
        if (options.order) {
            query = query.order(options.order.by, { ascending: options.order.ascending || false });
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    },
    
    async insert(table, data) {
        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw new Error(error.message);
        return result;
    },
    
    async update(table, id, data) {
        const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
        if (error) throw new Error(error.message);
        return result;
    },
    
    async delete(table, id) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },
    
    async getUsers() { return this.query('users', { order: { by: 'created_at', ascending: false } }); },
    async getOrders() { return this.query('orders', { order: { by: 'created_at', ascending: false }, limit: 200 }); },
    async getCustomers() { return this.query('customers', { order: { by: 'created_at', ascending: false } }); },
    async getInventory() { return this.query('inventory'); },
    async getAttendance() { return this.query('attendance', { order: { by: 'time', ascending: false }, limit: 100 }); },
    async getBranches() { return this.query('stores'); }
};

console.log('[Api] 加载完成');
