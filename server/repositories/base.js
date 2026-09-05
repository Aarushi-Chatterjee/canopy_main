const { supabase, isConfigured } = require('../config/supabase');
const { store } = require('../data/store');

class BaseRepository {
  constructor(tableName, collectionName) {
    this.tableName = tableName;
    this.collectionName = collectionName || tableName;
    this.hasWarned = false;
  }

  get client() {
    return isConfigured() ? supabase : null;
  }

  async find(filterFn = null, options = {}) {
    if (this.client) {
      try {
        let query = this.client.from(this.tableName).select(options.select || '*');
        if (options.eq) {
          for (const [col, val] of Object.entries(options.eq)) {
            query = query.eq(col, val);
          }
        }
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        if (!this.hasWarned) {
          console.warn(`[Repository:${this.tableName}] Remote query deferred to local store:`, err.message);
          this.hasWarned = true;
        }
      }
    }

    // Resilient local store fallback
    const items = store.getCollection(this.collectionName);
    return filterFn ? items.filter(filterFn) : items;
  }

  async findOne(predicate, options = {}) {
    if (this.client && options.eq) {
      try {
        let query = this.client.from(this.tableName).select(options.select || '*');
        for (const [col, val] of Object.entries(options.eq)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) return data;
      } catch (err) {
        // Fallback to local store
      }
    }

    return store.getItem(this.collectionName, predicate);
  }

  async create(item) {
    if (this.client) {
      try {
        const { data, error } = await this.client.from(this.tableName).insert(item).select().single();
        if (!error && data) {
          store.addItem(this.collectionName, data);
          return data;
        }
      } catch (err) {
        // Fallback to local store
      }
    }

    return store.addItem(this.collectionName, item);
  }

  async update(predicate, updates, options = {}) {
    if (this.client && options.eq) {
      try {
        let query = this.client.from(this.tableName).update(updates);
        for (const [col, val] of Object.entries(options.eq)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.select().maybeSingle();
        if (!error && data) {
          store.updateItem(this.collectionName, predicate, updates);
          return data;
        }
      } catch (err) {
        // Fallback to local store
      }
    }

    return store.updateItem(this.collectionName, predicate, updates);
  }
}

module.exports = { BaseRepository };
