/**
 * config.js - 全局配置
 */
window.AppConfig = {
    // Supabase 配置
    supabase: {
        url: 'https://fhwsbdokxgjqyrbvstxq.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3NiZG9reGdqcXlyYnZzdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQzNjAsImV4cCI6MjA5Nzk2MDM2MH0.XXR5BhhOuF0t6lzOkeYl6OPyva_QCwcV482TzOFV_84'
    },
    
    // 应用配置
    app: {
        name: 'CarWash Pro',
        version: '2.0.0',
        debug: true
    },
    
    // 默认配置
    defaults: {
        vatRate: 15,
        shopName: 'Car Wash Pro',
        shopTaxId: '310245678900003',
        commissionRate: 5
    },
    
    // 模块列表
    modules: {
        dashboard: { label: '仪表板', icon: 'fa-chart-line', permission: 'dashboard' },
        cashier: { label: 'POS收银', icon: 'fa-cash-register', permission: 'cashier' },
        orders: { label: '订单管理', icon: 'fa-clipboard-list', permission: 'orders' },
        inventory: { label: '库存管理', icon: 'fa-boxes', permission: 'inventory' },
        customers: { label: '客户管理', icon: 'fa-users', permission: 'customers' },
        attendance: { label: '考勤管理', icon: 'fa-clock', permission: 'attendance' },
        reports: { label: '财务管理', icon: 'fa-chart-bar', permission: 'reports' },
        employees: { label: '员工审核', icon: 'fa-user-tie', permission: 'employees' },
        audit: { label: '审计日志', icon: 'fa-history', permission: 'audit' },
        settings: { label: '系统设置', icon: 'fa-cog', permission: 'settings' }
    },
    
    // 角色权限映射
    permissions: {
        owner: ['dashboard', 'cashier', 'orders', 'inventory', 'customers', 'attendance', 'reports', 'employees', 'audit', 'settings'],
        manager: ['dashboard', 'cashier', 'orders', 'inventory', 'customers', 'attendance', 'reports'],
        cashier: ['dashboard', 'cashier', 'customers'],
        employee: ['dashboard', 'attendance']
    }
};

console.log('[Config] 加载完成');
