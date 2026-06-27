/**
 * services/authService.js - 认证服务
 */
window.AuthService = {
    async register(username, password, name, role) {
        const passwordHash = CryptoJS.SHA256(password).toString();
        return SupabaseService.insert('users', [{
            username,
            password_hash: passwordHash,
            role: role || 'employee',
            name: name || username,
            status: 'pending',
            registered_at: new Date().toISOString()
        }]);
    },

    async login(username, password) {
        const users = await SupabaseService.query('users');
        const user = users.find(u => u.username === username);
        if (!user) throw new Error('用户不存在');
        if (user.status === 'pending') throw new Error('账号正在审核中');
        if (user.status === 'rejected') throw new Error('账号已被拒绝');
        if (user.status !== 'approved') throw new Error('账号状态异常');
        const hash = CryptoJS.SHA256(password).toString();
        if (user.password_hash !== hash) throw new Error('密码错误');
        return user;
    },

    async resetPassword(username, newPassword) {
        const users = await SupabaseService.query('users', { filter: { username } });
        if (!users || users.length === 0) throw new Error('用户不存在');
        if (users[0].status !== 'approved') throw new Error('账号未审核通过');
        const passwordHash = CryptoJS.SHA256(newPassword).toString();
        return SupabaseService.update('users', users[0].id, { password_hash: passwordHash });
    },

    async changePassword(username, oldPassword, newPassword) {
        const users = await SupabaseService.query('users', { filter: { username } });
        if (!users || users.length === 0) throw new Error('用户不存在');
        const oldHash = CryptoJS.SHA256(oldPassword).toString();
        if (users[0].password_hash !== oldHash) throw new Error('当前密码错误');
        const newHash = CryptoJS.SHA256(newPassword).toString();
        return SupabaseService.update('users', users[0].id, { password_hash: newHash });
    },

    async approveUser(userId) {
        return SupabaseService.update('users', userId, {
            status: 'approved',
            approved_at: new Date().toISOString()
        });
    },

    async rejectUser(userId) {
        return SupabaseService.update('users', userId, {
            status: 'rejected',
            approved_at: new Date().toISOString()
        });
    },

    async getPendingUsers() {
        return SupabaseService.query('users', {
            filter: { status: 'pending' },
            order: { by: 'registered_at', ascending: false }
        });
    },

    async getAllUsers() {
        return SupabaseService.query('users', {
            order: { by: 'created_at', ascending: false }
        });
    },

    async createAdmin(username, password) {
        const passwordHash = CryptoJS.SHA256(password).toString();
        return SupabaseService.insert('users', [{
            username,
            password_hash: passwordHash,
            role: 'owner',
            name: username,
            status: 'approved',
            registered_at: new Date().toISOString(),
            approved_at: new Date().toISOString()
        }]);
    }
};

console.log('[AuthService] 加载完成');
