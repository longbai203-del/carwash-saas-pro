/**
 * components/navbar.js - 导航栏组件
 */
window.NavbarComponent = {
    render(container) {
        const user = AppStore.get('currentUser');
        const roleLabels = { owner: '老板', manager: '店长', cashier: '收银员', employee: '员工' };
        const html = '
            <nav class="bg-white shadow-sm py-3 px-6 flex justify-between items-center border-b border-gray-100">
                <div class="flex items-center gap-3">
                    <i class="fas fa-car text-blue-500 text-xl"></i>
                    <span class="text-xl font-bold text-gray-800">CarWash Pro</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-600 hidden md:inline">👤 ' + (user?.name || user?.username || '未登录') + '</span>
                    <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">' + (roleLabels[user?.role] || user?.role || '未登录') + '</span>
                    <button onclick="AppAuth.logout()" class="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100">退出</button>
                </div>
            </nav>
        ';
        if (container) container.innerHTML = html;
        return html;
    }
};

console.log('[NavbarComponent] 加载完成');
