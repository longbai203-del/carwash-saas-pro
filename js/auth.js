/**
 * auth.js - 认证模块
 */
window.AppAuth = {
    showLogin() {
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('registerView').classList.add('hidden');
        document.getElementById('forgotPasswordView').classList.add('hidden');
        document.getElementById('changePasswordView').classList.add('hidden');
    },
    
    showRegister() {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('registerView').classList.remove('hidden');
        document.getElementById('forgotPasswordView').classList.add('hidden');
        document.getElementById('changePasswordView').classList.add('hidden');
    },
    
    showForgotPassword() {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('registerView').classList.add('hidden');
        document.getElementById('forgotPasswordView').classList.remove('hidden');
        document.getElementById('changePasswordView').classList.add('hidden');
    },
    
    showChangePassword() {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('registerView').classList.add('hidden');
        document.getElementById('forgotPasswordView').classList.add('hidden');
        document.getElementById('changePasswordView').classList.remove('hidden');
    },
    
    async register() {
        const username = document.getElementById('regUsername').value.trim();
        const name = document.getElementById('regName').value.trim() || username;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        const role = document.getElementById('regRole').value;

        if (!username || !password) { AppUtils.toast('请填写用户名和密码', 'error'); return; }
        if (password.length < 6) { AppUtils.toast('密码至少6位', 'error'); return; }
        if (password !== confirm) { AppUtils.toast('两次密码不一致', 'error'); return; }
        if (role === 'owner') { AppUtils.toast('老板账号需管理员创建', 'error'); return; }

        try {
            const existing = await AppApi.query('users', { filter: { username } });
            if (existing && existing.length > 0) {
                AppUtils.toast('用户名已存在', 'error');
                return;
            }
            const passwordHash = CryptoJS.SHA256(password).toString();
            await AppApi.insert('users', [{
                username, password_hash: passwordHash, role, name,
                status: 'pending', registered_at: new Date().toISOString()
            }]);
            AppUtils.toast('✅ 注册申请已提交，等待审核', 'success');
            this.showLogin();
            document.getElementById('loginUsername').value = username;
        } catch (error) {
            AppUtils.toast('注册失败: ' + error.message, 'error');
        }
    },
    
    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!username || !password) { AppUtils.toast('请输入用户名和密码', 'error'); return; }

        try {
            const users = await AppApi.query('users');
            if (!users || users.length === 0) {
                AppUtils.toast('系统暂无用户，请先注册', 'warning');
                return;
            }
            AppStore.set('allUsers', users);
            
            const user = users.find(u => u.username === username);
            if (!user) { AppUtils.toast('用户不存在，请先注册', 'error'); return; }
            
            if (user.status === 'pending') {
                AppUtils.toast('⏳ 账号正在审核中', 'warning');
                return;
            }
            if (user.status === 'rejected') {
                AppUtils.toast('账号已被拒绝，请联系管理员', 'error');
                return;
            }
            if (user.status !== 'approved') {
                AppUtils.toast('账号状态异常', 'error');
                return;
            }

            const hash = CryptoJS.SHA256(password).toString();
            if (user.password_hash !== hash) { AppUtils.toast('密码错误', 'error'); return; }

            AppStore.set('currentUser', user);
            localStorage.setItem('cw_session', JSON.stringify({ id: user.id, username: user.username }));
            
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            
            await App.init();
            
            AppUtils.toast('👋 欢迎 ' + (user.name || user.username), 'success');
            
        } catch (error) {
            AppUtils.toast('登录失败: ' + error.message, 'error');
        }
    },
    
    logout() {
        AppStore.set('currentUser', null);
        localStorage.removeItem('cw_session');
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('loginModal').style.display = 'flex';
        AppUtils.toast('已退出', 'info');
    },
    
    async resetPassword() {
        const username = document.getElementById('forgotUsername').value.trim();
        const newPassword = document.getElementById('forgotNewPassword').value;
        const confirm = document.getElementById('forgotConfirmPassword').value;

        if (!username || !newPassword) { AppUtils.toast('请填写完整信息', 'error'); return; }
        if (newPassword.length < 6) { AppUtils.toast('密码至少6位', 'error'); return; }
        if (newPassword !== confirm) { AppUtils.toast('两次密码不一致', 'error'); return; }

        try {
            const user = await AppApi.query('users', { filter: { username } });
            if (!user || user.length === 0) { AppUtils.toast('用户不存在', 'error'); return; }
            if (user[0].status !== 'approved') { AppUtils.toast('账号未审核通过', 'error'); return; }

            const passwordHash = CryptoJS.SHA256(newPassword).toString();
            await AppApi.update('users', user[0].id, { password_hash: passwordHash });
            
            AppUtils.toast('✅ 密码已重置', 'success');
            document.getElementById('loginUsername').value = username;
            this.showLogin();
        } catch (error) {
            AppUtils.toast('重置失败: ' + error.message, 'error');
        }
    },
    
    async changePassword() {
        const username = document.getElementById('changeUsername').value.trim();
        const oldPassword = document.getElementById('changeOldPassword').value;
        const newPassword = document.getElementById('changeNewPassword').value;
        const confirm = document.getElementById('changeConfirmPassword').value;

        if (!username || !oldPassword || !newPassword) { AppUtils.toast('请填写完整信息', 'error'); return; }
        if (newPassword.length < 6) { AppUtils.toast('新密码至少6位', 'error'); return; }
        if (newPassword !== confirm) { AppUtils.toast('两次密码不一致', 'error'); return; }

        try {
            const user = await AppApi.query('users', { filter: { username } });
            if (!user || user.length === 0) { AppUtils.toast('用户不存在', 'error'); return; }
            
            const oldHash = CryptoJS.SHA256(oldPassword).toString();
            if (user[0].password_hash !== oldHash) { AppUtils.toast('当前密码错误', 'error'); return; }

            const newHash = CryptoJS.SHA256(newPassword).toString();
            await AppApi.update('users', user[0].id, { password_hash: newHash });
            
            AppUtils.toast('✅ 密码修改成功', 'success');
            document.getElementById('loginUsername').value = username;
            this.showLogin();
        } catch (error) {
            AppUtils.toast('修改失败: ' + error.message, 'error');
        }
    }
};

console.log('[Auth] 加载完成');
