/**
 * api.js - API服务层
 */
(function() {
    'use strict';

    window.AppApi = {
        _getClient() {
            if (!window.SupabaseService) {
                console.error('[Api] SupabaseService 未加载');
                return null;
            }
            const client = window.SupabaseService.getClient();
            if (!client) {
                console.error('[Api] 获取客户端失败');
                return null;
            }
            return client;
        },

        async query(table, options = {}) {
            const client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');

            let query = client.from(table).select(options.select || '*');

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

            const result = await query;
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        async insert(table, data) {
            const client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            const result = await client.from(table).insert(data).select();
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        async update(table, id, data) {
            const client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            const result = await client.from(table).update(data).eq('id', id).select();
            if (result.error) throw new Error(result.error.message);
            return result.data;
        },

        async delete(table, id) {
            const client = this._getClient();
            if (!client) throw new Error('Supabase 客户端未初始化');
            const result = await client.from(table).delete().eq('id', id);
            if (result.error) throw new Error(result.error.message);
            return true;
        },

        getUsers() {
            return this.query('users', { order: { by: 'created_at', ascending: false } });
        },

        getOrders() {
            return this.query('orders', { order: { by: 'created_at', ascending: false }, limit: 200 });
        },

        getCustomers() {
            return this.query('customers', { order: { by: 'created_at', ascending: false } });
        },

        getInventory() {
            return this.query('inventory');
        },

        getAttendance() {
            return this.query('attendance', { order: { by: 'time', ascending: false }, limit: 100 });
        },

        getBranches() {
            return this.query('stores');
        }
    };

    console.log('[Api] 加载完成');
})();