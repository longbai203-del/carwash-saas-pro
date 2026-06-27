// ================================================================
//  inventory.js - 库存管理模块
// ================================================================

const InventoryModule = {
    init() {
        console.log('📦 InventoryModule 初始化');
        if (!document.getElementById('inventoryList')) {
            console.warn('⚠️ 库存元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        this.refresh();
    },

    destroy() {
        console.log('📦 InventoryModule 销毁');
    },

    refresh() {
        this.refreshInventory();
        this.refreshStockLogs();
    },

    refreshInventory() {
        const list = document.getElementById('inventoryList');
        if (!list) return;

        list.innerHTML = (allInventory || []).map(i => {
            const isLow = (i.quantity || 0) <= (i.min_qty || 5);
            return `<div class="${isLow ? 'stock-low' : 'stock-normal'} flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">
                <div>
                    <span class="font-medium">${i.name}</span>
                    <span class="text-xs text-gray-400 ml-2">${i.category || '其他'} · ${i.unit || '个'}</span>
                    ${isLow ? '<span class="text-xs text-red-500 ml-2">⚠️ 低库存</span>' : ''}
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold ${isLow ? 'text-red-600' : 'text-green-600'}">${i.quantity || 0}</span>
                    <span class="text-sm text-gray-400">${(i.cost || 0).toFixed(2)} SAR</span>
                </div>
            </div>`;
        }).join('') || '<div class="text-center text-gray-400">暂无库存</div>';
    },

    refreshStockLogs() {
        const list = document.getElementById('stockLogList');
        if (!list) return;
        // 简化版本
        list.innerHTML = '<div class="text-center text-gray-400 text-sm">暂无记录</div>';
    },

    openStockInModal() {
        const sel = document.getElementById('stockInProduct');
        if (!sel) return;
        sel.innerHTML = (allInventory || []).map(i => `<option value="${i.id}">${i.name} (库存: ${i.quantity || 0})</option>`).join('');
        const modal = document.getElementById('stockInModal');
        if (modal) modal.classList.remove('hidden');
        const qty = document.getElementById('stockInQty');
        const price = document.getElementById('stockInPrice');
        const supplier = document.getElementById('stockInSupplier');
        if (qty) qty.value = '';
        if (price) price.value = '';
        if (supplier) supplier.value = '';
    },

    openStockOutModal() {
        const sel = document.getElementById('stockOutProduct');
        if (!sel) return;
        sel.innerHTML = (allInventory || []).map(i => `<option value="${i.id}">${i.name} (库存: ${i.quantity || 0})</option>`).join('');
        const modal = document.getElementById('stockOutModal');
        if (modal) modal.classList.remove('hidden');
        const qty = document.getElementById('stockOutQty');
        if (qty) qty.value = '';
    },

    openAddProductModal() {
        const modal = document.getElementById('addProductModal');
        if (modal) modal.classList.remove('hidden');
        const name = document.getElementById('newProductName');
        const qty = document.getElementById('newProductQty');
        const cost = document.getElementById('newProductCost');
        const minQty = document.getElementById('newProductMinQty');
        const unit = document.getElementById('newProductUnit');
        if (name) name.value = '';
        if (qty) qty.value = '';
        if (cost) cost.value = '';
        if (minQty) minQty.value = '5';
        if (unit) unit.value = '瓶';
    },

    async submitStockIn() {
        const productId = document.getElementById('stockInProduct')?.value;
        const qty = parseInt(document.getElementById('stockInQty')?.value);
        const price = parseFloat(document.getElementById('stockInPrice')?.value) || 0;
        const supplier = document.getElementById('stockInSupplier')?.value || '未知';
        if (!productId || !qty || qty <= 0) { showToast('请选择产品并输入数量'); return; }
        try {
            const product = (allInventory || []).find(i => i.id === productId);
            if (!product) { showToast('产品不存在'); return; }
            const newQty = (product.quantity || 0) + qty;
            await supabaseClient.from('inventory').update({ quantity: newQty, cost: price || product.cost, last_updated: new Date().toISOString() }).eq('id', productId);
            product.quantity = newQty;
            if (price) product.cost = price;
            await supabaseClient.from('stock_in').insert([{ inventory_id: productId, product_name: product.name, quantity: qty, unit_price: price, total_price: price * qty, supplier: supplier, created_by: currentUser?.name || '系统' }]);
            closeModal('stockInModal');
            this.refresh();
            showToast('✅ 入库成功: ' + qty + ' 件');
        } catch (error) { showToast('❌ 入库失败: ' + error.message); }
    },

    async submitStockOut() {
        const productId = document.getElementById('stockOutProduct')?.value;
        const qty = parseInt(document.getElementById('stockOutQty')?.value);
        const reason = document.getElementById('stockOutReason')?.value;
        if (!productId || !qty || qty <= 0) { showToast('请选择产品并输入数量'); return; }
        const product = (allInventory || []).find(i => i.id === productId);
        if (!product) { showToast('产品不存在'); return; }
        if ((product.quantity || 0) < qty) { showToast('库存不足！当前库存: ' + product.quantity); return; }
        try {
            const newQty = product.quantity - qty;
            await supabaseClient.from('inventory').update({ quantity: newQty, last_updated: new Date().toISOString() }).eq('id', productId);
            product.quantity = newQty;
            await supabaseClient.from('stock_out').insert([{ inventory_id: productId, product_name: product.name, quantity: qty, reason: reason, created_by: currentUser?.name || '系统' }]);
            closeModal('stockOutModal');
            this.refresh();
            showToast('✅ 出库成功: ' + qty + ' 件');
        } catch (error) { showToast('❌ 出库失败: ' + error.message); }
    },

    async submitNewProduct() {
        const name = document.getElementById('newProductName')?.value?.trim();
        const category = document.getElementById('newProductCategory')?.value;
        const unit = document.getElementById('newProductUnit')?.value?.trim() || '个';
        const qty = parseInt(document.getElementById('newProductQty')?.value) || 0;
        const cost = parseFloat(document.getElementById('newProductCost')?.value) || 0;
        const minQty = parseInt(document.getElementById('newProductMinQty')?.value) || 5;
        if (!name) { showToast('请输入产品名称'); return; }
        try {
            const { data, error } = await supabaseClient.from('inventory').insert([{ name, category, unit, quantity: qty, cost, min_qty: minQty }]).select();
            if (error) throw new Error(error.message);
            if (data && data.length > 0) allInventory.unshift(data[0]);
            closeModal('addProductModal');
            this.refresh();
            showToast('✅ 产品已添加: ' + name);
        } catch (error) { showToast('❌ 添加失败: ' + error.message); }
    }
};

window.InventoryModule = InventoryModule;
window.refreshInventory = function() { InventoryModule.refreshInventory(); };
window.openStockInModal = function() { InventoryModule.openStockInModal(); };
window.openStockOutModal = function() { InventoryModule.openStockOutModal(); };
window.openAddProductModal = function() { InventoryModule.openAddProductModal(); };
window.submitStockIn = function() { InventoryModule.submitStockIn(); };
window.submitStockOut = function() { InventoryModule.submitStockOut(); };
window.submitNewProduct = function() { InventoryModule.submitNewProduct(); };
console.log('✅ inventory.js 已加载');