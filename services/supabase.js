/**
 * services/supabase.js - Supabase 客户端封装
 */
window.SupabaseService = {
    _client: null,
    _initialized: false,

    init(url, anonKey) {
        if (this._initialized) return this._client;
        this._client = supabase.createClient(url, anonKey);
        this._initialized = true;
        console.log('[SupabaseService] 初始化完成');
        return this._client;
    },

    getClient() {
        if (!this._initialized) {
            throw new Error('SupabaseService 未初始化');
        }
        return this._client;
    },

    async query(table, options = {}) {
        const client = this.getClient();
        let query = client.from(table).select(options.select || '*');
        if (options.filter) {
            Object.keys(options.filter).forEach(key => {
                query = query.eq(key, options.filter[key]);
            });
        }
        if (options.order) {
            query = query.order(options.order.by, { ascending: options.order.ascending || false });
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    },

    async insert(table, data) {
        const client = this.getClient();
        const { data: result, error } = await client.from(table).insert(data).select();
        if (error) throw new Error(error.message);
        return result;
    },

    async update(table, id, data) {
        const client = this.getClient();
        const { data: result, error } = await client.from(table).update(data).eq('id', id).select();
        if (error) throw new Error(error.message);
        return result;
    },

    async delete(table, id) {
        const client = this.getClient();
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    subscribe(channel, callback) {
        const client = this.getClient();
        return client
            .channel(channel)
            .on('postgres_changes', { event: '*', schema: 'public' }, callback)
            .subscribe();
    }
};

console.log('[SupabaseService] 加载完成');
