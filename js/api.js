/**
 * api.js - API 服务层（增加租户/门店过滤）
 */
(function() {
    'use strict';

    window.AppApi = {

        _getClient: function() {
            if (!window.SupabaseService) {
                console.error('[Api] SupabaseService 未加载');
                return null;
            }
            var client = window.SupabaseService.getClient();
            if (!client) {
                console.error('[Api] 获取客户端失败');
                return null;
            }
            return client;
        },

        // ===== 通用查询 =====
        query: async function(table, options) {
            try {
                var client = this._getClient();
                if (!client) {
                    console.warn('[Api] 客户端未初始化，返回空数据');
                    return [];
                }

                options = options || {};
                var filter = options.filter || {};

                // 自动添加租户过滤
                var currentTenant = AppStore.get('currentTenant');
                var tablesWithTenant = ['orders', 'customers', 'inventory', 'attendance', 'expenses', 'vehicles', 'appointments', 'products'];
                if (tablesWithTenant.indexOf(table) !== -1 && currentTenant) {
                    filter.tenant_id = currentTenant.id;
                }

                // 自动添加门店过滤
                var currentStore = AppStore.get('currentStore');
                if (currentStore && tablesWithTenant.indexOf(table) !== -1) {
                    filter.store_id = currentStore.id;
                }

                var query = client.from(table).select(options.select || '*');

                if (Object.keys(filter).length > 0) {
                    Object.keys(filter).forEach(function(key) {
                        query = query.eq(key, filter[key]);
                    });
                }

                if (options.order) {
                    query = query.order(options.order.by, {
                        ascending: options.order.ascending || false
                    });
                }

                if (options.limit) {
                    query = query.limit(options.limit);
                }

                var result = await query;

                if (result.error) {
                    console.error('[Api] 查询错误:', result.error);
                    return [];
                }

                return result.data || [];

            } catch (error) {
                console.error('[Api] 查询异常:', error);
                return [];
            }
        },

        // ===== 插入数据 =====
        insert: async function(table, data) {
            try {
                var client = this._getClient();
                if (!client) {
                    console.warn('[Api] 客户端未初始化');
                    return [];
                }

                // 自动添加租户/门店ID
                var currentTenant = AppStore.get('currentTenant');
                var currentStore = AppStore.get('currentStore');
                var tablesWithTenant = ['orders', 'customers', 'inventory', 'attendance', 'expenses', 'vehicles', 'appointments', 'products'];

                if (tablesWithTenant.indexOf(table) !== -1) {
                    if (currentTenant && !data.tenant_id) {
                        data.tenant_id = currentTenant.id;
                    }
                    if (currentStore && !data.store_id) {
                        data.store_id = currentStore.id;
                    }
                }

                var result = await client.from(table).insert(data).select();

                if (result.error) {
                    console.error('[Api] 插入错误:', result.error);
                    return [];
                }

                return result.data || [];

            } catch (error) {
                console.error('[Api] 插入异常:', error);
                return [];
            }
        },

        // ===== 更新数据 =====
        update: async function(table, id, data) {
            try {
                var client = this._getClient();
                if (!client) {
                    console.warn('[Api] 客户端未初始化');
                    return [];
                }

                var result = await client.from(table).update(data).eq('id', id).select();

                if (result.error) {
                    console.error('[Api] 更新错误:', result.error);
                    return [];
                }

                return result.data || [];

            } catch (error) {
                console.error('[Api] 更新异常:', error);
                return [];
            }
        },

        // ===== 删除数据 =====
        delete: async function(table, id) {
            try {
                var client = this._getClient();
                if (!client) {
                    console.warn('[Api] 客户端未初始化');
                    return false;
                }

                var result = await client.from(table).delete().eq('id', id);

                if (result.error) {
                    console.error('[Api] 删除错误:', result.error);
                    return false;
                }

                return true;

            } catch (error) {
                console.error('[Api] 删除异常:', error);
                return false;
            }
        },

        // ============================================================
        // 租户/门店
        // ============================================================

        getTenants: function() {
            return this.query('tenants');
        },

        getStores: function(tenantId) {
            var filter = {};
            if (tenantId) filter.tenant_id = tenantId;
            return this.query('stores', { filter: filter });
        },

        getCurrentStores: function() {
            var tenant = AppStore.get('currentTenant');
            if (!tenant) return Promise.resolve([]);
            return this.getStores(tenant.id);
        },

        // ============================================================
        // 用户
        // ============================================================

        getUsers: function() {
            return this.query('users', {
                order: { by: 'created_at', ascending: false }
            });
        },

        getUserById: function(userId) {
            return this.query('users', {
                filter: { id: userId }
            });
        },

        // ============================================================
        // 订单
        // ============================================================

        getOrders: function() {
            return this.query('orders', {
                order: { by: 'created_at', ascending: false },
                limit: 200
            });
        },

        getTodayOrders: function() {
            var today = new Date().toISOString().split('T')[0];
            return this.query('orders', {
                filter: { date: today },
                order: { by: 'created_at', ascending: false }
            });
        },

        getOrdersByDate: function(date) {
            return this.query('orders', {
                filter: { date: date },
                order: { by: 'created_at', ascending: false }
            });
        },

        getOrdersByStatus: function(status) {
            return this.query('orders', {
                filter: { status: status },
                order: { by: 'created_at', ascending: false }
            });
        },

        createOrder: function(orderData) {
            return this.insert('orders', orderData);
        },

        updateOrderStatus: function(orderId, status) {
            return this.update('orders', orderId, {
                status: status,
                updated_at: new Date().toISOString()
            });
        },

        // ============================================================
        // 客户
        // ============================================================

        getCustomers: function() {
            return this.query('customers', {
                order: { by: 'created_at', ascending: false }
            });
        },

        getCustomerById: function(customerId) {
            return this.query('customers', {
                filter: { id: customerId }
            });
        },

        getCustomerByPlate: function(plate) {
            return this.query('customers', {
                filter: { plate_number: plate }
            });
        },

        createCustomer: function(customerData) {
            return this.insert('customers', customerData);
        },

        updateCustomer: function(customerId, data) {
            return this.update('customers', customerId, data);
        },

        // ============================================================
        // 库存
        // ============================================================

        getInventory: function() {
            return this.query('inventory');
        },

        getLowStock: function() {
            return this.query('inventory', {
                filter: { low_stock: true }
            });
        },

        updateInventory: function(id, data) {
            return this.update('inventory', id, data);
        },

        // ============================================================
        // 考勤
        // ============================================================

        getAttendance: function() {
            return this.query('attendance', {
                order: { by: 'time', ascending: false },
                limit: 100
            });
        },

        getAttendanceByDate: function(date) {
            return this.query('attendance', {
                filter: { date: date },
                order: { by: 'time', ascending: false }
            });
        },

        clockIn: function(staffName) {
            return this.insert('attendance', [{
                staff_name: staffName,
                type: 'Clock In',
                time: new Date().toISOString()
            }]);
        },

        clockOut: function(staffName) {
            return this.insert('attendance', [{
                staff_name: staffName,
                type: 'Clock Out',
                time: new Date().toISOString()
            }]);
        },

        // ============================================================
        // 费用
        // ============================================================

        getExpenses: function() {
            return this.query('expenses', {
                order: { by: 'created_at', ascending: false },
                limit: 200
            });
        },

        getExpensesByDate: function(date) {
            return this.query('expenses', {
                filter: { expense_date: date },
                order: { by: 'created_at', ascending: false }
            });
        },

        getExpenseCategories: function() {
            return this.query('expense_categories', {
                order: { by: 'name', ascending: true }
            });
        },

        createExpense: function(expenseData) {
            return this.insert('expenses', expenseData);
        },

        // ============================================================
        // 审计日志
        // ============================================================

        getAuditLogs: function() {
            return this.query('audit_logs', {
                order: { by: 'created_at', ascending: false },
                limit: 100
            });
        },

        createAuditLog: function(logData) {
            return this.insert('audit_logs', logData);
        },

        // ============================================================
        // 通用工具
        // ============================================================

        getBranches: function() {
            return this.query('stores');
        },

        count: async function(table) {
            var data = await this.query(table);
            return data ? data.length : 0;
        },

        // 获取统计信息
        getStats: async function() {
            var orders = await this.getOrders();
            var today = new Date().toISOString().split('T')[0];
            var todayOrders = orders.filter(function(o) { return o.date === today; });
            var totalRevenue = orders.reduce(function(s, o) { return s + (o.total || 0); }, 0);
            var todayRevenue = todayOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0);

            return {
                totalOrders: orders.length,
                totalRevenue: totalRevenue,
                todayOrders: todayOrders.length,
                todayRevenue: todayRevenue,
                avgOrder: orders.length > 0 ? totalRevenue / orders.length : 0,
                pendingOrders: orders.filter(function(o) { return o.status === 'pending' || o.status === 'confirmed'; }).length
            };
        }
    };

    console.log('[Api] 加载完成');
})();