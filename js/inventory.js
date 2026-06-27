// ================================================================
//  库存管理
// ================================================================
function refreshInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = allInventory.map(i => {
        const isLow = (i.quantity || 0) <= (i.min_qty || 5);
        return `<div class="${isLow ? 'stock-low' : 'stock-normal'} flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border">
            <div><span class="font-medium">${i.name}</span><span class="text-xs text-gray-400 ml-2">${i.category || '其他'} · ${i.unit || '个'}</span>${isLow ? '<span class="text-xs text-red-500 ml-2">⚠️ 低库存</span>' : ''}</div>
            <div class="flex items-center gap-4"><span class="font-bold ${isLow ? 'text-red-600' : 'text-green-600'}">${i.quantity || 0}</span><span class="text-sm text-gray-400">${(i.cost || 0).toFixed(2)} SAR</span></div>
        </div>`;
    }).join('') || '<div class="text-center text-gray-400">暂无库存</div>';
}

function openStockInModal() {
    const sel = document.getElementById('stockInProduct');
    sel.innerHTML = allInventory.map(i => `<option value="${i.id}">${i.name} (库存: ${i.quantity || 0})</option>`).join('');
    document.getElementById('stockInModal').classList.remove('hidden');
    document.getElementById('stockInQty').value = ''; document.getElementById('stockInPrice').value = ''; document.getElementById('stockInSupplier').value = '';
}

function openStockOutModal() {
    const sel = document.getElementById('stockOutProduct');
    sel.innerHTML = allInventory.map(i => `<option value="${i.id}">${i.name} (库存: ${i.quantity || 0})</option>`).join('');
    document.getElementById('stockOutModal').classList.remove('hidden');
    document.getElementById('stockOutQty').value = '';
}

function openAddProductModal() {
    document.getElementById('addProductModal').classList.remove('hidden');
    document.getElementById('newProductName').value = ''; document.getElementById('newProductQty').value = '';
    document.getElementById('newProductCost').value = ''; document.getElementById('newProductMinQty').value = '5';
    document.getElementById('newProductUnit').value = '瓶';
}

async function submitStockIn() {
    const productId = document.getElementById('stockInProduct').value;
    const qty = parseInt(document.getElementById('stockInQty').value);
    const price = parseFloat(document.getElementById('stockInPrice').value) || 0;
    const supplier = document.getElementById('stockInSupplier').value || '未知';
    if (!productId || !qty || qty <= 0) { showToast('请选择产品并输入数量'); return; }
    try {
        const product = allInventory.find(i => i.id === productId);
        const newQty = (product.quantity || 0) + qty;
        await supabaseClient.from('inventory').update({ quantity: newQty, cost: price || product.cost, last_updated: new Date().toISOString() }).eq('id', productId);
        product.quantity = newQty; if (price) product.cost = price;
        await supabaseClient.from('stock_in').insert([{ inventory_id: productId, product_name: product.name, quantity: qty, unit_price: price, total_price: price * qty, supplier: supplier, created_by: currentUser?.name || '系统' }]);
        closeModal('stockInModal');
        refreshInventory();
        showToast('✅ 入库成功: ' + qty + ' 件');
    } catch (error) { showToast('❌ 入库失败: ' + error.message); }
}

async function submitStockOut() {
    const productId = document.getElementById('stockOutProduct').value;
    const qty = parseInt(document.getElementById('stockOutQty').value);
    const reason = document.getElementById('stockOutReason').value;
    if (!productId || !qty || qty <= 0) { showToast('请选择产品并输入数量'); return; }
    const product = allInventory.find(i => i.id === productId);
    if (!product) { showToast('产品不存在'); return; }
    if ((product.quantity || 0) < qty) { showToast('库存不足！当前库存: ' + product.quantity); return; }
    try {
        const newQty = product.quantity - qty;
        await supabaseClient.from('inventory').update({ quantity: newQty, last_updated: new Date().toISOString() }).eq('id', productId);
        product.quantity = newQty;
        await supabaseClient.from('stock_out').insert([{ inventory_id: productId, product_name: product.name, quantity: qty, reason: reason, created_by: currentUser?.name || '系统' }]);
        closeModal('stockOutModal');
        refreshInventory();
        showToast('✅ 出库成功: ' + qty + ' 件');
    } catch (error) { showToast('❌ 出库失败: ' + error.message); }
}

async function submitNewProduct() {
    const name = document.getElementById('newProductName').value.trim();
    const category = document.getElementById('newProductCategory').value;
    const unit = document.getElementById('newProductUnit').value.trim() || '个';
    const qty = parseInt(document.getElementById('newProductQty').value) || 0;
    const cost = parseFloat(document.getElementById('newProductCost').value) || 0;
    const minQty = parseInt(document.getElementById('newProductMinQty').value) || 5;
    if (!name) { showToast('请输入产品名称'); return; }
    try {
        const { data, error } = await supabaseClient.from('inventory').insert([{ name, category, unit, quantity: qty, cost, min_qty: minQty }]).select();
        if (error) throw new Error(error.message);
        if (data && data.length > 0) allInventory.unshift(data[0]);
        closeModal('addProductModal');
        refreshInventory();
        showToast('✅ 产品已添加: ' + name);
    } catch (error) { showToast('❌ 添加失败: ' + error.message); }
}