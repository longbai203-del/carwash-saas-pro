/**
 * store.js - 全局状态管理（增加租户/门店）
 */
(function() {
    'use strict';

    var defaultState = {
        currentUser: null,
        currentTenant: null,
        currentStore: null,
        allTenants: [],
        allStores: [],
        allUsers: [],
        allOrders: [],
        allCustomers: [],
        allInventory: [],
        allAttendance: [],
        allCommissions: [],
        allAuditLogs: [],
        allExpenses: [],
        allExpenseCategories: [],
        allVehicles: [],
        allAppointments: [],
        allProducts: [],
        currentBranch: 'all',
        currentModule: 'dashboard',
        config: {
            vatRate: 15,
            shopName: 'Car Wash Pro',
            shopTaxId: '310245678900003',
            commissionRate: 5,
            lowStockAlert: 5
        },
        isInitialized: false,
        isLoading: false
    };

    window.AppStore = {
        _state: JSON.parse(JSON.stringify(defaultState)),
        _listeners: {},

        get: function(key) {
            return this._state[key];
        },

        set: function(key, value) {
            this._state[key] = value;
            this._notify(key, value);
            return this;
        },

        update: function(data) {
            var self = this;
            Object.keys(data).forEach(function(key) {
                self._state[key] = data[key];
                self._notify(key, data[key]);
            });
            return this;
        },

        subscribe: function(key, callback) {
            if (!this._listeners[key]) {
                this._listeners[key] = [];
            }
            this._listeners[key].push(callback);
            return this;
        },

        _notify: function(key, value) {
            if (this._listeners && this._listeners[key]) {
                this._listeners[key].forEach(function(cb) {
                    try { cb(value); } catch(e) {}
                });
            }
        },

        reset: function() {
            this._state = JSON.parse(JSON.stringify(defaultState));
            return this;
        }
    };

    console.log('[Store] 加载完成');
})();