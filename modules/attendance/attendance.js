/**
 * attendance.js - 考勤管理模块
 */
window.AttendanceModule = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        console.log('[Attendance] 初始化...');
        await this.waitForDOM();
        await this.loadData();
        this.render();
        this.initialized = true;
        console.log('[Attendance] 初始化完成');
    },

    destroy() {
        this.initialized = false;
    },

    waitForDOM() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (document.getElementById('attendanceList')) { resolve(); }
                else if (attempts < 60) { setTimeout(check, 50); }
                else { resolve(); }
            };
            check();
        });
    },

    async loadData() {
        try {
            const { data } = await supabase.from('attendance').select('*').order('time', { ascending: false }).limit(100);
            if (data) AppState.allAttendance = data;
        } catch (e) { console.error(e); }
    },

    render() {
        const list = document.getElementById('attendanceList');
        if (!list) return;
        list.innerHTML = (AppState.allAttendance || []).slice(0, 20).map(a => 
            <div class="text-sm p-2 bg-gray-50 rounded"> ·  · </div>
        ).join('') || '<div class="text-center text-gray-400 py-8">暂无记录</div>';
    }
};

console.log('[Attendance] 模块已注册');
