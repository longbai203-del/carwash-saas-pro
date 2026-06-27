/**
 * store.js - 全局状态管理
 */
window.AppStore = {
    _state: {
        currentUser: null,
        allUsers: [],
        allOrders: [],
        allCustomers: [],
        allInventory: [],
        allAttendance: [],
        allCommissions: [],
        allAuditLogs: [],
        allBranches: [],
        currentBranch: 'all',
        currentModule: 'dashboard',
        config: {
            vatRate: 15,
            shopName: 'Car Wash Pro',
            shopTaxId: '310245678900003',
            commissionRate: 5
        },
        isInitialized: false,
        isLoading: false
    },
    
    get(key) { return this._state[key]; },
    
    set(key, value) {
        this._state[key] = value;
        this._notify(key, value);
        return this;
    },
    
    update(data) {
        Object.keys(data).forEach(key => {
            this._state[key] = data[key];
        });
        return this;
    },
    
    subscribe(key, callback) {
        if (!this._listeners) this._listeners = {};
        if (!this._listeners[key]) this._listeners[key] = [];
        this._listeners[key].push(callback);
        return this;
    },
    
    _notify(key, value) {
        if (this._listeners && this._listeners[key]) {
            this._listeners[key].forEach(cb => cb(value));
        }
    },
    
    reset() {
        this._state = {
            currentUser: null,
            allUsers: [],
            allOrders: [],
            allCustomers: [],
            allInventory: [],
            allAttendance: [],
            allCommissions: [],
            allAuditLogs: [],
            allBranches: [],
            currentBranch: 'all',
            currentModule: 'dashboard',
            config: { vatRate: 15, shopName: 'Car Wash Pro', shopTaxId: '310245678900003', commissionRate: 5 },
            isInitialized: false,
            isLoading: false
        };
        return this;
    }
};

console.log('[Store] 加载完成');
