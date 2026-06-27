/**
 * utils.js - 工具函数
 */
window.AppUtils = {
    toast(msg, type = 'info') {
        const colors = { info: '#0091D5', success: '#16a34a', warning: '#f59e0b', error: '#dc2626' };
        const t = document.createElement('div');
        t.className = 'toast-custom';
        t.textContent = msg;
        t.style.borderLeft = '4px solid ' + (colors[type] || colors.info);
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },
    
     {
        const el = document.getElementById(id);
        if (!el) console.warn('[Utils] 元素不存在: #' + id);
        return el;
    },
    
    qs(selector, parent = document) {
        const el = parent.querySelector(selector);
        if (!el) console.warn('[Utils] 元素不存在: ' + selector);
        return el;
    },
    
    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleString('zh-CN');
    },
    
    formatCurrency(amount) {
        return (amount || 0).toFixed(2) + ' SAR';
    },
    
    generateOrderNumber() {
        const today = new Date();
        const prefix = 'ORD-' + today.getFullYear() + 
            String(today.getMonth() + 1).padStart(2, '0') + 
            String(today.getDate()).padStart(2, '0');
        const count = (AppStore.get('allOrders') || []).filter(o => o.date === today.toISOString().split('T')[0]).length + 1;
        return prefix + '-' + String(count).padStart(4, '0');
    },
    
    today() { return new Date().toISOString().split('T')[0]; },
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },
    
    waitForDOM(id, timeout = 3000) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById(id)) { resolve(true); }
                else if (attempts < timeout / 50) { setTimeout(check, 50); }
                else { resolve(false); }
            };
            check();
        });
    }
};

console.log('[Utils] 加载完成');
