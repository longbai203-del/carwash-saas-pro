/**
 * customers.js - 客户管理模块
 */
window.CustomersModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Customers] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Customers] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('membersList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
            if (data) AppState.allCustomers = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('membersList');
        if (!list) return;
        list.innerHTML = (AppState.allCustomers || []).map(c => 
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <div>
                    <strong></strong>
                    <span class="customer-level customer-level-"></span>
                    <br><small> | </small>
                </div>
                <div class="text-right">
                    <div>余额: <span class="font-bold text-green-600"> SAR</span></div>
                    <div class="text-sm">积分:  | 到店: 次</div>
                </div>
            </div>
        ).join('') || '<div class="text-center text-gray-400 py-8">暂无客户</div>';
    }
};

console.log('[Customers] 模块已注册');
