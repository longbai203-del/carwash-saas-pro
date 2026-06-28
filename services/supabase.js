/**
 * services/supabase.js - Supabase 客户端封装
 */
(function() {
    'use strict';

    var CONFIG = {
        url: 'https://fhwsbdokxgjqyrbvstxq.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3NiZG9reGdqcXlyYnZzdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQzNjAsImV4cCI6MjA5Nzk2MDM2MH0.XXR5BhhOuF0t6lzOkeYl6OPyva_QCwcV482TzOFV_84'
    };

    window.SupabaseService = {
        _client: null,
        _initialized: false,

        // ===== 初始化 =====
        init: function() {
            if (this._initialized && this._client) {
                return this._client;
            }

            console.log('[SupabaseService] 初始化...');

            try {
                var sb = window.supabase;
                if (!sb) {
                    console.warn('[SupabaseService] window.supabase 不存在，等待加载...');
                    return null;
                }

                if (typeof sb.createClient !== 'function') {
                    console.error('[SupabaseService] supabase.createClient 不是函数');
                    return null;
                }

                this._client = sb.createClient(CONFIG.url, CONFIG.anonKey);
                this._initialized = true;
                console.log('[SupabaseService] ✅ 初始化完成');
                return this._client;

            } catch (error) {
                console.error('[SupabaseService] ❌ 初始化失败:', error.message);
                return null;
            }
        },

        // ===== 获取客户端 =====
        getClient: function() {
            if (!this._initialized || !this._client) {
                this.init();
            }
            // 如果还是 null，尝试重新初始化
            if (!this._client && window.supabase) {
                try {
                    this._client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
                    this._initialized = true;
                } catch (e) {
                    console.error('[SupabaseService] 重新创建客户端失败:', e);
                }
            }
            return this._client;
        },

        // ===== 检查是否就绪 =====
        isReady: function() {
            return this._initialized && this._client !== null;
        },

        // ===== 等待就绪 =====
        waitForReady: function(timeout) {
            timeout = timeout || 5000;
            var self = this;
            return new Promise(function(resolve) {
                var startTime = Date.now();
                var check = function() {
                    if (self.isReady()) {
                        resolve(true);
                        return;
                    }
                    if (Date.now() - startTime > timeout) {
                        console.warn('[SupabaseService] 等待超时');
                        resolve(false);
                        return;
                    }
                    self.init();
                    setTimeout(check, 200);
                };
                check();
            });
        },

        // ===== 查询数据 =====
        query: async function(table, options) {
            var client = this.getClient();
            if (!client) {
                console.error('[SupabaseService] 客户端未初始化');
                return [];
            }

            try {
                options = options || {};
                var query = client.from(table).select(options.select || '*');

                if (options.filter) {
                    Object.keys(options.filter).forEach(function(key) {
                        query = query.eq(key, options.filter[key]);
                    });
                }
                if (options.order) {
                    query = query.order(options.order.by, {
                        ascending: options.order.ascending || false
                    });
                }
                if (options.limit) {
                    query = query.limit(options.limit);
                }

                var result = await query;
                if (result.error) {
                    console.error('[SupabaseService] 查询错误:', result.error);
                    return [];
                }
                return result.data || [];

            } catch (error) {
                console.error('[SupabaseService] 查询异常:', error);
                return [];
            }
        },

        // ===== 插入数据 =====
        insert: async function(table, data) {
            var client = this.getClient();
            if (!client) {
                console.error('[SupabaseService] 客户端未初始化');
                return [];
            }

            try {
                var result = await client.from(table).insert(data).select();
                if (result.error) {
                    console.error('[SupabaseService] 插入错误:', result.error);
                    return [];
                }
                return result.data || [];

            } catch (error) {
                console.error('[SupabaseService] 插入异常:', error);
                return [];
            }
        },

        // ===== 更新数据 =====
        update: async function(table, id, data) {
            var client = this.getClient();
            if (!client) {
                console.error('[SupabaseService] 客户端未初始化');
                return [];
            }

            try {
                var result = await client.from(table).update(data).eq('id', id).select();
                if (result.error) {
                    console.error('[SupabaseService] 更新错误:', result.error);
                    return [];
                }
                return result.data || [];

            } catch (error) {
                console.error('[SupabaseService] 更新异常:', error);
                return [];
            }
        },

        // ===== 删除数据 =====
        delete: async function(table, id) {
            var client = this.getClient();
            if (!client) {
                console.error('[SupabaseService] 客户端未初始化');
                return false;
            }

            try {
                var result = await client.from(table).delete().eq('id', id);
                if (result.error) {
                    console.error('[SupabaseService] 删除错误:', result.error);
                    return false;
                }
                return true;

            } catch (error) {
                console.error('[SupabaseService] 删除异常:', error);
                return false;
            }
        },

        // ===== 订阅实时更新 =====
        subscribe: function(channel, callback) {
            var client = this.getClient();
            if (!client) {
                console.error('[SupabaseService] 客户端未初始化');
                return null;
            }

            try {
                return client
                    .channel(channel)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public'
                    }, callback)
                    .subscribe();

            } catch (error) {
                console.error('[SupabaseService] 订阅失败:', error);
                return null;
            }
        }
    };

    // ===== 自动初始化 =====
    function autoInit() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.SupabaseService.init();
        } else {
            console.log('[SupabaseService] 等待 supabase 加载...');
            setTimeout(autoInit, 300);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        setTimeout(autoInit, 100);
    }

    console.log('[SupabaseService] 加载完成');
})();