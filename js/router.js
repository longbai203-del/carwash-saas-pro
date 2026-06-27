/**
 * router.js - 路由管理
 */
(function() {
    'use strict';

    window.AppRouter = {
        currentRoute: null,
        defaultRoute: 'dashboard',

        init() {
            console.log('[Router] 初始化...');

            window.addEventListener('hashchange', () => {
                this.handleRoute();
            });

            this.handleRoute();
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
            AppStore.set('currentModule', moduleName);

            if (updateHash) {
                window.location.hash = moduleName;
            }

            ModuleLoader.load(moduleName);

            // 更新导航高亮
            document.querySelectorAll('[data-module]').forEach(el => {
                el.classList.remove('nav-item-active');
                if (el.dataset.module === moduleName) {
                    el.classList.add('nav-item-active');
                }
            });

            // 更新标题
            const titles = {
                dashboard: '仪表板',
                cashier: '收银台',
                orders: '订单管理',
                inventory: '库存管理',
                customers: '客户管理',
                attendance: '考勤管理',
                reports: '财务管理',
                employees: '员工审核',
                audit: '审计日志',
                settings: '系统设置'
            };
            document.getElementById('currentPageTitle').textContent = titles[moduleName] || moduleName;
        },

        handleRoute() {
            const hash = window.location.hash.replace('#', '') || this.defaultRoute;
            this.navigate(hash, false);
        },

        getCurrentRoute() {
            return this.currentRoute;
        },

        back() {
            window.history.back();
        },

        // 注册路由
        register(route, moduleName) {
            // 已通过 AppConfig.modules 配置
            return this;
        }
    };

    console.log('[Router] 加载完成');
})();