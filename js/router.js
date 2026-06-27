/**
 * router.js - 路由管理器
 */
window.AppRouter = {
    routes: {},
    currentRoute: null,
    defaultRoute: 'dashboard',

    init() {
        console.log('[Router] 初始化...');
        window.addEventListener('hashchange', () => { this.handleRoute(); });
        this.handleRoute();
    },

    register(route, moduleName) {
        this.routes[route] = moduleName;
        return this;
    },

    registerAll(routes) {
        Object.keys(routes).forEach(key => {
            this.routes[key] = routes[key];
        });
        return this;
    },

    handleRoute() {
        const hash = window.location.hash.replace('#', '') || this.defaultRoute;
        const moduleName = this.routes[hash] || this.routes[this.defaultRoute];
        if (moduleName) {
            this.navigate(moduleName, false);
        }
    },

    navigate(moduleName, updateHash = true) {
        if (this.currentRoute === moduleName) return;
        const user = AppStore.get('currentUser');
        if (user) {
            const perms = AppConfig.permissions[user.role] || [];
            if (!perms.includes(moduleName)) {
                AppUtils.toast('您没有权限访问此页面', 'warning');
                return;
            }
        }
        this.currentRoute = moduleName;
        if (updateHash) {
            window.location.hash = moduleName;
        }
        AppStore.set('currentModule', moduleName);
        AppLoader.load(moduleName);
    },

    getCurrentRoute() {
        return this.currentRoute;
    },

    back() {
        window.history.back();
    }
};

console.log('[Router] 加载完成');
