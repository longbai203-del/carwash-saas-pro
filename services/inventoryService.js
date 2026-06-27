/**
 * services/inventoryService.js - 库存服务
 */
window.InventoryService = {
    async getInventory() {
        return SupabaseService.query('inventory');
    },

    async getItem(id) {
        const items = await SupabaseService.query('inventory', { filter: { id } });
        return items && items.length > 0 ? items[0] : null;
    },

    async createProduct(data) {
        const product = {
            name: data.name,
            category: data.category || '其他',
            unit: data.unit || '个',
            quantity: data.quantity || 0,
            cost: data.cost || 0,
            min_qty: data.min_qty || 5,
            created_at: new Date().toISOString()
        };
        const result = await SupabaseService.insert('inventory', [product]);
        if (result && result.length > 0) {
            const inventory = AppStore.get('allInventory') || [];
            inventory.push(result[0]);
            AppStore.set('allInventory', inventory);
            return result[0];
        }
        return null;
    },

    async updateProduct(id, data) {
        data.last_updated = new Date().toISOString();
        const result = await SupabaseService.update('inventory', id, data);
        if (result && result.length > 0) {
            const inventory = AppStore.get('allInventory') || [];
            const idx = inventory.findIndex(i => i.id === id);
            if (idx !== -1) inventory[idx] = result[0];
            AppStore.set('allInventory', inventory);
            return result[0];
        }
        return null;
    },

    async stockIn(productId, quantity, unitPrice, supplier, note) {
        const product = await this.getItem(productId);
        if (!product) throw new Error('产品不存在');
        const newQuantity = (product.quantity || 0) + quantity;
        await this.updateProduct(productId, { quantity: newQuantity, cost: unitPrice || product.cost });
        const log = {
            inventory_id: productId,
            product_name: product.name,
            quantity: quantity,
            unit_price: unitPrice || 0,
            total_price: (unitPrice || 0) * quantity,
            supplier: supplier || '未知',
            note: note || '',
            created_by: AppStore.get('currentUser')?.name || '系统',
            created_at: new Date().toISOString()
        };
        await SupabaseService.insert('stock_in', [log]);
        return { product, newQuantity, log };
    },

    async stockOut(productId, quantity, reason, note) {
        const product = await this.getItem(productId);
        if (!product) throw new Error('产品不存在');
        if ((product.quantity || 0) < quantity) {
            throw new Error('库存不足！当前库存: ' + product.quantity);
        }
        const newQuantity = (product.quantity || 0) - quantity;
        await this.updateProduct(productId, { quantity: newQuantity });
        const log = {
            inventory_id: productId,
            product_name: product.name,
            quantity: quantity,
            reason: reason || '日常消耗',
            note: note || '',
            created_by: AppStore.get('currentUser')?.name || '系统',
            created_at: new Date().toISOString()
        };
        await SupabaseService.insert('stock_out', [log]);
        return { product, newQuantity, log };
    },

    async getLowStock() {
        const inventory = await this.getInventory();
        return inventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5));
    },

    async getStats() {
        const inventory = await this.getInventory();
        const totalItems = inventory.length;
        const totalQuantity = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
        const totalValue = inventory.reduce((s, i) => s + ((i.quantity || 0) * (i.cost || 0)), 0);
        const lowStock = inventory.filter(i => (i.quantity || 0) <= (i.min_qty || 5));
        return { totalItems, totalQuantity, totalValue, lowStockCount: lowStock.length, lowStockItems: lowStock };
    },

    async searchProducts(keyword) {
        const inventory = await this.getInventory();
        return inventory.filter(i => i.name.includes(keyword) || (i.category && i.category.includes(keyword)));
    }
};

console.log('[InventoryService] 加载完成');
