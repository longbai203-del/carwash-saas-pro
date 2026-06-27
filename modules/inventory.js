/**
 * inventory.js - 库存管理模块
 */
window.InventoryModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Inventory] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Inventory] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('inventoryList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('inventory').select('*');
            if (data) AppState.allInventory = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('inventoryList');
        if (!list) return;
        list.innerHTML = (AppState.allInventory || []).map(i => {
            const isLow = (i.quantity || 0) <= (i.min_qty || 5);
            return \
            <div class="\ flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">
                <div>
                    <span class="font-medium">\</span>
                    <span class="text-xs text-gray-400 ml-2">\ · \</span>
                    \
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold \">\</span>
                    <span class="text-sm text-gray-400">\ SAR</span>
                </div>
            </div>
            \;
        }).join('') || '<div class="text-center text-gray-400 py-8">暂无库存</div>';
    }
};

console.log('[Inventory] 模块已注册');
