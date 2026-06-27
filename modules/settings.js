/**
 * settings.js - 系统设置模块
 */
window.SettingsModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Settings] 初始化...');
        await this.waitForDOM();
        this.loadSettings();
        this.bindEvents();
        this.initialized = true;
        console.log('[Settings] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('shopName')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    bindEvents() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
    },

    loadSettings() {
        const config = AppState.config || {};
        if (document.getElementById('shopName')) document.getElementById('shopName').value = config.shopName || '';
        if (document.getElementById('shopTaxId')) document.getElementById('shopTaxId').value = config.shopTaxId || '';
        if (document.getElementById('vatRateInput')) document.getElementById('vatRateInput').value = config.vatRate || 15;
        if (document.getElementById('commissionRate')) document.getElementById('commissionRate').value = config.commissionRate || 5;
    },

    saveSettings() {
        if (!AppState.currentUser || AppState.currentUser.role !== 'owner') {
            showToast('只有老板可以修改设置');
            return;
        }
        AppState.config.shopName = document.getElementById('shopName')?.value.trim() || AppState.config.shopName;
        AppState.config.shopTaxId = document.getElementById('shopTaxId')?.value.trim() || AppState.config.shopTaxId;
        AppState.config.vatRate = parseFloat(document.getElementById('vatRateInput')?.value) || 15;
        AppState.config.commissionRate = parseFloat(document.getElementById('commissionRate')?.value) || 5;
        localStorage.setItem('cw_config', JSON.stringify(AppState.config));
        showToast('✅ 设置已保存');
    }
};

console.log('[Settings] 模块已注册');
