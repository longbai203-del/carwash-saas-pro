/**
 * app.js - 应用主入口
 */
(function() {
    'use strict';

    window.App = {
        _initialized: false,

        // ===== 初始化 =====
        async init() {
            if (this._initialized) return;
            console.log('[App] 初始化...');

            try {
                var saved = localStorage.getItem('cw_config');
                if (saved) {
                    var config = JSON.parse(saved);
                    var currentConfig = AppStore.get('config') || {};
                    AppStore.set('config', { ...currentConfig, ...config });
                }
            } catch(e) {}

            await this.loadData();
            this.updateUI();
            this.bindEvents();
            this.setupRealtime();

            this._initialized = true;
            console.log('[App] 初始化完成');
        },

        // ===== 加载所有数据 =====
        async loadData() {
            try {
                AppStore.set('isLoading', true);
                console.log('[App] 开始加载数据...');

                if (!AppApi) {
                    console.error('[App] AppApi 未加载');
                    AppStore.set('isLoading', false);
                    return;
                }

                var tenants = await AppApi.getTenants();
                if (tenants && tenants.length > 0) {
                    AppStore.set('currentTenant', tenants[0]);
                    var stores = await AppApi.getStores(tenants[0].id);
                    AppStore.set('allStores', stores || []);
                    if (stores && stores.length > 0) {
                        AppStore.set('currentStore', stores[0]);
                    }
                }

                var users = await AppApi.getUsers();
                var orders = await AppApi.getOrders();
                var customers = await AppApi.getCustomers();
                var inventory = await AppApi.getInventory();
                var attendance = await AppApi.getAttendance();
                var auditLogs = await AppApi.getAuditLogs();
                var expenses = await AppApi.getExpenses();

                console.log('[App] 数据加载完成:', {
                    tenants: (tenants || []).length,
                    stores: (stores || []).length,
                    users: (users || []).length,
                    orders: (orders || []).length,
                    customers: (customers || []).length,
                    inventory: (inventory || []).length,
                    attendance: (attendance || []).length
                });

                AppStore.update({
                    allTenants: tenants || [],
                    allUsers: users || [],
                    allOrders: orders || [],
                    allCustomers: customers || [],
                    allInventory: inventory || [],
                    allAttendance: attendance || [],
                    allAuditLogs: auditLogs || [],
                    allExpenses: expenses || [],
                    isLoading: false
                });

                this._notifyModules();

            } catch (error) {
                console.error('[App] 加载数据失败:', error);
                AppStore.set('isLoading', false);
                if (window.AppUtils && AppUtils.toast) {
                    AppUtils.toast('⚠️ 加载数据失败: ' + error.message, 'error');
                }
            }
        },

        // ===== 通知所有模块数据已更新 =====
        _notifyModules: function() {
            var activeModule = window.ModuleLoader ? ModuleLoader.getActive() : null;
            if (activeModule) {
                var module = window.ModuleLoader ? ModuleLoader.getModule(activeModule) : null;
                if (module && typeof module.loadData === 'function') {
                    console.log('[App] 通知模块刷新: ' + activeModule);
                    module.loadData();
                }
            }
        },

        // ===== 更新UI =====
        updateUI: function() {
            var user = AppStore.get('currentUser');
            if (!user) return;

            var role = user.role || 'employee';
            var perms = AppConfig.permissions[role] || [];

            document.querySelectorAll('[data-module]').forEach(function(el) {
                var module = el.dataset.module;
                el.style.display = perms.indexOf(module) !== -1 ? 'flex' : 'none';
            });

            var roleLabels = { owner: '老板', admin: '系统管理员', manager: '店长', cashier: '收银员', employee: '员工' };
            var roleEl = document.getElementById('userRoleDisplay');
            if (roleEl) roleEl.textContent = (roleLabels[role] || role);
            var roleSpan = document.getElementById('currentRoleSpan');
            if (roleSpan) roleSpan.textContent = roleLabels[role] || role;
            var userSpan = document.getElementById('currentUserSpan');
            if (userSpan) userSpan.textContent = user.name || user.username || 'Admin';
            var headerUser = document.getElementById('headerUsername');
            if (headerUser) headerUser.textContent = user.name || user.username || 'Admin';

            this.updateBranchSelector();
            this.updateStoreSelector();
        },

        // ===== 更新门店选择器 =====
        updateBranchSelector: function() {
            var sel = document.getElementById('branchSelector');
            if (!sel) return;
            var stores = AppStore.get('allStores') || [];
            var currentStore = AppStore.get('currentStore');
            var html = '<option value="all">🏪 全部门店</option>';
            stores.forEach(function(s) {
                var selected = (currentStore && s.id === currentStore.id) ? 'selected' : '';
                html += '<option value="' + s.id + '" ' + selected + '>' + s.name + '</option>';
            });
            sel.innerHTML = html;
        },

        // ===== 更新门店选择器（别名） =====
        updateStoreSelector: function() {
            this.updateBranchSelector();
        },

        // ===== 绑定事件 =====
        bindEvents: function() {
            var self = this;

            document.querySelectorAll('[data-module]').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    var module = this.dataset.module;
                    if (window.AppRouter) {
                        AppRouter.navigate(module);
                    }
                });
            });

            var branchSel = document.getElementById('branchSelector');
            if (branchSel) {
                branchSel.addEventListener('change', function() {
                    var storeId = this.value;
                    if (storeId === 'all') {
                        AppStore.set('currentStore', null);
                    } else {
                        var stores = AppStore.get('allStores') || [];
                        var store = stores.find(function(s) { return s.id === storeId; });
                        AppStore.set('currentStore', store || null);
                    }
                    var currentModule = AppStore.get('currentModule');
                    if (currentModule && window.AppRouter) {
                        AppRouter.navigate(currentModule);
                    }
                    if (window.AppUtils && AppUtils.toast) {
                        AppUtils.toast('已切换门店', 'info');
                    }
                });
            }
        },

        // ===== 实时同步 =====
        setupRealtime: function() {
            if (window._realtimeSubscription) {
                window._realtimeSubscription.unsubscribe();
            }

            var client = window.SupabaseService ? window.SupabaseService.getClient() : null;
            if (!client) return;

            window._realtimeSubscription = client
                .channel('app-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, function(payload) {
                    var orders = AppStore.get('allOrders') || [];
                    orders.unshift(payload.new);
                    AppStore.set('allOrders', orders);
                    if (window.AppUtils && AppUtils.toast) {
                        AppUtils.toast('🔔 新订单: ' + payload.new.plate_number + ' ' + payload.new.total + ' SAR', 'success');
                    }
                    window.App._notifyModules();
                })
                .subscribe();
        },

        // ===== 切换模块 =====
        switchModule: function(moduleName) {
            if (window.AppRouter) {
                AppRouter.navigate(moduleName);
            }
        },

        // ===== 刷新数据 =====
        refreshData: function() {
            this.loadData();
        }
    };

    // 暴露刷新方法到全局
    window.refreshAppData = function() {
        if (window.App) {
            window.App.loadData();
        }
    };

    console.log('[App] 加载完成');
});