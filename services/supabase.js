/**
 * services/supabase.js - Supabase 客户端封装
 */
(function() {
    'use strict';

    const CONFIG = {
        url: 'https://fhwsbdokxgjqyrbvstxq.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3NiZG9reGdqcXlyYnZzdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQzNjAsImV4cCI6MjA5Nzk2MDM2MH0.XXR5BhhOuF0t6lzOkeYl6OPyva_QCwcV482TzOFV_84'
    };

    window.SupabaseService = {
        _client: null,
        _initialized: false,

        init() {
            if (this._initialized) return this._client;

            // 从全局获取 supabase
            const sb = window.supabase;
            if (!sb || typeof sb.createClient !== 'function') {
                console.error('[SupabaseService] supabase 未定义');
                return null;
            }

            this._client = sb.createClient(CONFIG.url, CONFIG.anonKey);
            this._initialized = true;
            console.log('[SupabaseService] 初始化完成');
            return this._client;
        },

        getClient() {
            if (!this._initialized) {
                this.init();
            }
            return this._client;
        },

        isReady() {
            return this._initialized && this._client !== null;
        }
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.SupabaseService.init();
        });
    } else {
        setTimeout(function() {
            window.SupabaseService.init();
        }, 100);
    }

    console.log('[SupabaseService] 加载完成');
})();