/**
 * api.js - API服务层
 */
(function() {
    window.AppApi = {
        // 获取客户端
        _getClient: function() {
            if (!window.SupabaseService || !window.SupabaseService.getClient) {
                console.error('[Api] SupabaseService 未初始化');
                return null;
            }
            return window.SupabaseService.getClient();
        },

        // 通用查询
        query: async function(table, options) {
            var client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            
            options = options || {};
            var query = client.from(table).select(options.select || '*');
            
            if (options.filter) {
                Object.keys(options.filter).forEach(function(key) {
                    query = query.eq(key, options.filter[key]);
                });
            }
            if (options.order) {
                query = query.order(options.order.by, { ascending: options.order.ascending || false });
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            var result = await query;
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        // 插入
        insert: async function(table, data) {
            var client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            var result = await client.from(table).insert(data).select();
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        // 更新
        update: async function(table, id, data) {
            var client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            var result = await client.from(table).update(data).eq('id', id).select();
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        // 删除
        delete: async function(table, id) {
            var client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            var result = await client.from(table).delete().eq('id', id);
            if (result.error) throw new Error(result.error.message);
            return true;
        },

        // 获取用户
        getUsers: async function() {
            return this.query('users', { order: { by: 'created_at', ascending: false } });
        },

        // 获取订单
        getOrders: async function() {
            return this.query('orders', { order: { by: 'created_at', ascending: false }, limit: 200 });
        },

        // 获取客户
        getCustomers: async function() {
            return this.query('customers', { order: { by: 'created_at', ascending: false } });
        },

        // 获取库存
        getInventory: async function() {
            return this.query('inventory');
        },

        // 获取考勤
        getAttendance: async function() {
            return this.query('attendance', { order: { by: 'time', ascending: false }, limit: 100 });
        },

        // 获取门店
        getBranches: async function() {
            return this.query('stores');
        }
    };

    console.log('[Api] 加载完成');
})();