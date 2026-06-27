// ================================================================
//  Supabase配置
// ================================================================
const SUPABASE_URL = 'https://fhwsbdokxgjqyrbvstxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3NiZG9reGdqcXlyYnZzdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQzNjAsImV4cCI6MjA5Nzk2MDM2MH0.XXR5BhhOuF0t6lzOkeYl6OPyva_QCwcV482TzOFV_84';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================================
//  全局状态
// ================================================================
let currentUser = null;
let allUsers = [];
let allOrders = [];
let allCustomers = [];
let allInventory = [];
let allAttendance = [];
let allStockIn = [];
let allStockOut = [];
let allDailyReports = [];
let allCommissions = [];
let allAuditLogs = [];
let allBranches = [];
let allVehicles = [];
let currentBranch = 'all';
let config = {
    vatRate: 15,
    shopName: 'Car Wash Pro',
    shopTaxId: '310245678900003',
    commissionRate: 5
};
let serviceChart = null;
let revenueChart = null;
let realtimeSubscription = null;

// 角色权限
const ROLE_PERMISSIONS = {
    owner: { label: '老板', icon: '👑', dashboard: true, cashier: true, orders: true, inventory: true, customers: true, attendance: true, reports: true, employees: true, audit: true, settings: true },
    manager: { label: '店长', icon: '📋', dashboard: true, cashier: true, orders: true, inventory: true, customers: true, attendance: true, reports: true, employees: false, audit: false, settings: false },
    cashier: { label: '收银员', icon: '💰', dashboard: true, cashier: true, orders: false, inventory: false, customers: true, attendance: false, reports: false, employees: false, audit: false, settings: false },
    employee: { label: '员工', icon: '👤', dashboard: true, cashier: false, orders: false, inventory: false, customers: false, attendance: true, reports: false, employees: false, audit: false, settings: false }
};

// 订单状态
const ORDER_STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', CANCELLED: 'cancelled', REFUNDED: 'refunded' };
const ORDER_STATUS_LABELS = { pending: '待确认', confirmed: '已确认', in_progress: '施工中', completed: '已完成', cancelled: '已取消', refunded: '已退款' };
const ORDER_STATUS_CLASSES = { pending: 'status-pending', confirmed: 'status-confirmed', in_progress: 'status-in_progress', completed: 'status-completed', cancelled: 'status-cancelled', refunded: 'status-refunded' };