const { BaseRepository } = require('./base');
const { platformSettings: platformSettingsMapper } = require('../mappers');

class PlatformSettingsRepository extends BaseRepository {
  constructor() {
    super('platform_settings', 'platform_settings', platformSettingsMapper);
  }

  async getSetting(key, fallback = null) {
    const record = await this.findOne(s => s.key === key, { eq: { key } });
    if (record && record.value !== undefined) {
      return record.value;
    }
    return fallback;
  }

  async setSetting(key, value, description = '', updatedBy = 'system') {
    const existing = await this.findOne(s => s.key === key, { eq: { key } });
    const now = new Date().toISOString();
    
    if (existing) {
      return this.update(
        s => s.key === key,
        {
          value,
          description: description || existing.description,
          updatedBy,
          updatedAt: now
        },
        { eq: { key } }
      );
    }

    return this.create({
      key,
      value,
      description,
      updatedBy,
      createdAt: now,
      updatedAt: now
    });
  }

  async getAllSettings() {
    const list = await this.find();
    const dictionary = {};
    for (const item of list) {
      dictionary[item.key] = item.value;
    }
    return {
      settings: list,
      dictionary,
      ...dictionary
    };
  }
}

module.exports = new PlatformSettingsRepository();
