const { supabase, isConfigured } = require('../config/supabase');
const { store } = require('../data/store');

class BaseRepository {
  /**
   * @param {string} tableName - PostgreSQL table name in Supabase
   * @param {string} collectionName - Local fallback store collection name
   * @param {Object} [mapper] - Optional { toDomain, toDatabase } conversion functions
   */
  constructor(tableName, collectionName, mapper = null) {
    this.tableName = tableName;
    this.collectionName = collectionName || tableName;
    this.mapper = mapper;
    this.hasWarned = false;
  }

  get client() {
    return isConfigured() ? supabase : null;
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  mapToDomain(item) {
    if (!item) return null;
    return this.mapper && typeof this.mapper.toDomain === 'function' 
      ? this.mapper.toDomain(item) 
      : item;
  }

  mapToDatabase(item) {
    if (!item) return null;
    return this.mapper && typeof this.mapper.toDatabase === 'function' 
      ? this.mapper.toDatabase(item) 
      : item;
  }

  handleFailure(operation, err) {
    if (this.isProduction()) {
      const error = new Error(`[Database Error] ${this.tableName}.${operation} failed: ${err.message}`);
      error.statusCode = 503;
      error.operational = true;
      throw error;
    }
    if (!this.hasWarned) {
      console.warn(`[Repository:${this.tableName}] Remote ${operation} deferred to local store:`, err.message);
      this.hasWarned = true;
    }
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
        if (options.order) {
          query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
        }
        if (options.limit) query = query.limit(options.limit);
        const { data, error } = await query;
        if (error) {
          this.handleFailure('find', error);
        } else if (Array.isArray(data)) {
          return data.map(d => this.mapToDomain(d));
        }
      } catch (err) {
        this.handleFailure('find', err);
      }
    } else if (this.isProduction()) {
      const error = new Error(`[Database Error] Supabase is not configured in production.`);
      error.statusCode = 503;
      throw error;
    }

    // Resilient local store fallback (development/test)
    const rawItems = store.getCollection(this.collectionName);
    const domainItems = rawItems.map(item => this.mapToDomain(item));
    return filterFn ? domainItems.filter(filterFn) : domainItems;
  }

  async findOne(predicate, options = {}) {
    if (this.client && options.eq) {
      try {
        let query = this.client.from(this.tableName).select(options.select || '*');
        for (const [col, val] of Object.entries(options.eq)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.maybeSingle();
        if (error) {
          this.handleFailure('findOne', error);
        } else if (data) {
          return this.mapToDomain(data);
        }
      } catch (err) {
        this.handleFailure('findOne', err);
      }
    } else if (this.isProduction() && !this.client) {
      const error = new Error(`[Database Error] Supabase is not configured in production.`);
      error.statusCode = 503;
      throw error;
    }

    const raw = store.getItem(this.collectionName, predicate);
    return raw ? this.mapToDomain(raw) : null;
  }

  async create(item) {
    const dbPayload = this.mapToDatabase(item) || item;

    if (this.client) {
      try {
        const { data, error } = await this.client.from(this.tableName).insert(dbPayload).select().single();
        if (error) {
          this.handleFailure('create', error);
        } else if (data) {
          const domain = this.mapToDomain(data);
          store.addItem(this.collectionName, domain);
          return domain;
        }
      } catch (err) {
        this.handleFailure('create', err);
      }
    } else if (this.isProduction()) {
      const error = new Error(`[Database Error] Supabase is not configured in production.`);
      error.statusCode = 503;
      throw error;
    }

    const domainItem = this.mapToDomain(item) || item;
    store.addItem(this.collectionName, domainItem);
    return domainItem;
  }

  async update(predicate, updates, options = {}) {
    const dbUpdates = this.mapToDatabase(updates) || updates;

    if (this.client && options.eq) {
      try {
        let query = this.client.from(this.tableName).update(dbUpdates);
        for (const [col, val] of Object.entries(options.eq)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.select().maybeSingle();
        if (error) {
          this.handleFailure('update', error);
        } else if (data) {
          const domain = this.mapToDomain(data);
          store.updateItem(this.collectionName, predicate, domain);
          return domain;
        }
      } catch (err) {
        this.handleFailure('update', err);
      }
    } else if (this.isProduction() && !this.client) {
      const error = new Error(`[Database Error] Supabase is not configured in production.`);
      error.statusCode = 503;
      throw error;
    }

    const updated = store.updateItem(this.collectionName, predicate, updates);
    return updated ? this.mapToDomain(updated) : null;
  }

  async delete(predicate, options = {}) {
    if (this.client && options.eq) {
      try {
        let query = this.client.from(this.tableName).delete();
        for (const [col, val] of Object.entries(options.eq)) {
          query = query.eq(col, val);
        }
        const { error } = await query;
        if (error) {
          this.handleFailure('delete', error);
        }
      } catch (err) {
        this.handleFailure('delete', err);
      }
    }
    return store.deleteItem ? store.deleteItem(this.collectionName, predicate) : true;
  }
}

module.exports = { BaseRepository };
