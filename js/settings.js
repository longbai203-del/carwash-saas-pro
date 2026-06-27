// ================================================================
//  settings.js - 系统设置模块
// ================================================================

const SettingsModule = {
    init() {
        console.log('⚙️ SettingsModule 初始化');
        if (!document.getElementById('shopName')) {
            console.warn('⚠️ 设置元素未加载，延迟重试');
            setTimeout(() => this.init(), 300);
            return;
        }
        this.loadSettings();
        this.loadBackupConfig();
        this.refreshBranches();
    },

    destroy() {
        console.log('⚙️ SettingsModule 销毁');
    },

    loadSettings() {
        const shopName = document.getElementById('shopName');
        const shopTaxId = document.getElementById('shopTaxId');
        const vatRateInput = document.getElementById('vatRateInput');
        const commissionRate = document.getElementById('commissionRate');

        if (shopName) shopName.value = config.shopName || '';
        if (shopTaxId) shopTaxId.value = config.shopTaxId || '';
        if (vatRateInput) vatRateInput.value = config.vatRate || 15;
        if (commissionRate) commissionRate.value = config.commissionRate || 5;
    },

    saveSettings() {
        if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以修改设置'); return; }
        const shopName = document.getElementById('shopName');
        const shopTaxId = document.getElementById('shopTaxId');
        const vatRateInput = document.getElementById('vatRateInput');
        const commissionRate = document.getElementById('commissionRate');

        config.shopName = shopName?.value?.trim() || config.shopName;
        config.shopTaxId = shopTaxId?.value?.trim();
        config.vatRate = parseFloat(vatRateInput?.value) || 15;
        config.commissionRate = parseFloat(commissionRate?.value) || 5;
        localStorage.setItem('cw_config', JSON.stringify(config));
        showToast('✅ 设置已保存');
    },

    async loadBackupConfig() {
        try {
            const { data, error } = await supabaseClient.from('backup_config').select('*').eq('id', 1).single();
            if (!error && data) {
                const backupEnabled = document.getElementById('backupEnabled');
                const backupFrequency = document.getElementById('backupFrequency');
                if (backupEnabled) backupEnabled.value = data.auto_backup_enabled ? 'true' : 'false';
                if (backupFrequency) backupFrequency.value = data.backup_frequency || 'daily';
            }
        } catch(e) {}
    },

    async saveBackupConfig() {
        if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以修改备份设置'); return; }
        try {
            await supabaseClient.from('backup_config').update({
                auto_backup_enabled: document.getElementById('backupEnabled')?.value === 'true',
                backup_frequency: document.getElementById('backupFrequency')?.value,
                updated_at: new Date().toISOString()
            }).eq('id', 1);
            showToast('✅ 备份设置已保存');
        } catch (error) { showToast('❌ 保存失败: ' + error.message); }
    },

    async manualBackup() {
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
    },

    refreshBranches() {
        const list = document.getElementById('branchList');
        if (!list) return;
        list.innerHTML = (allBranches || []).map(b =>
            `<div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span><strong>${b.name}</strong> <span class="text-sm text-gray-400">${b.address || ''}</span></span>
                <span class="text-xs text-gray-400">${b.status || 'active'}</span>
            </div>`
        ).join('') || '<div class="text-center text-gray-400">暂无门店</div>';
    },

    async addBranch() {
        if (!currentUser || currentUser.role !== 'owner') { showToast('只有老板可以添加门店'); return; }
        const name = document.getElementById('newBranchName')?.value?.trim();
        const address = document.getElementById('newBranchAddress')?.value?.trim();
        if (!name) { showToast('请输入门店名称'); return; }
        try {
            const { data, error } = await supabaseClient.from('stores').insert([{ name, address, status: 'active' }]).select();
            if (error) throw new Error(error.message);
            if (data && data.length > 0) {
                allBranches.push(data[0]);
                this.refreshBranches();
                if (typeof updateBranchSelector === 'function') updateBranchSelector();
                showToast('✅ 门店已添加: ' + name);
                const nameInput = document.getElementById('newBranchName');
                const addrInput = document.getElementById('newBranchAddress');
                if (nameInput) nameInput.value = '';
                if (addrInput) addrInput.value = '';
            }
        } catch (error) { showToast('❌ 添加失败: ' + error.message); }
    }
};

window.SettingsModule = SettingsModule;
window.loadSettings = function() { SettingsModule.loadSettings(); };
window.saveSettings = function() { SettingsModule.saveSettings(); };
window.loadBackupConfig = function() { SettingsModule.loadBackupConfig(); };
window.saveBackupConfig = function() { SettingsModule.saveBackupConfig(); };
window.manualBackup = function() { SettingsModule.manualBackup(); };
window.refreshBranches = function() { SettingsModule.refreshBranches(); };
window.addBranch = function() { SettingsModule.addBranch(); };
console.log('✅ settings.js 已加载');