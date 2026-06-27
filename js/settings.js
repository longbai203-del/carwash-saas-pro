// ================================================================
//  设置功能
// ================================================================
function loadSettings() {
    document.getElementById('shopName').value = config.shopName || '';
    document.getElementById('shopTaxId').value = config.shopTaxId || '';
    document.getElementById('vatRateInput').value = config.vatRate || 15;
    document.getElementById('commissionRate').value = config.commissionRate || 5;
}

function saveSettings() {
    if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以修改设置'); return; }
    config.shopName = document.getElementById('shopName').value.trim() || config.shopName;
    config.shopTaxId = document.getElementById('shopTaxId').value.trim();
    config.vatRate = parseFloat(document.getElementById('vatRateInput').value) || 15;
    config.commissionRate = parseFloat(document.getElementById('commissionRate').value) || 5;
    localStorage.setItem('cw_config', JSON.stringify(config));
    showToast('✅ 设置已保存');
}

// ================================================================
//  备份功能
// ================================================================
async function loadBackupConfig() {
    try {
        const { data, error } = await supabaseClient.from('backup_config').select('*').eq('id', 1).single();
        if (!error && data) {
            document.getElementById('backupEnabled').value = data.auto_backup_enabled ? 'true' : 'false';
            document.getElementById('backupFrequency').value = data.backup_frequency || 'daily';
        }
    } catch(e) {}
}

async function saveBackupConfig() {
    if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以修改备份设置'); return; }
    try {
        await supabaseClient.from('backup_config').update({
            auto_backup_enabled: document.getElementById('backupEnabled').value === 'true',
            backup_frequency: document.getElementById('backupFrequency').value,
            updated_at: new Date().toISOString()
        }).eq('id', 1);
        showToast('✅ 备份设置已保存');
    } catch (error) { showToast('❌ 保存失败: ' + error.message); }
}

async function manualBackup() {
    if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以执行备份'); return; }
    showToast('⏳ 正在备份...');
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            users: allUsers, orders: allOrders, customers: allCustomers,
            inventory: allInventory, attendance: allAttendance, branches: allBranches,
            commissions: allCommissions, config: config
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ 备份完成');
    } catch (error) { showToast('❌ 备份失败: ' + error.message); }
}