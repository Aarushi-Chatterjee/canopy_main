const { BaseRepository } = require('./base');
const { contentItem } = require('../mappers');

class ContentItemsRepository extends BaseRepository {
  constructor() {
    super('content_items', 'content_items', contentItem);
  }

  async findPublished(prefix = null) {
    const items = await this.find(item => {
      if (item.status !== 'published') return false;
      if (prefix) {
        const p = prefix.toLowerCase();
        const cleanPage = p.replace(/\.$/, '');
        const matchesKey = item.contentKey && item.contentKey.toLowerCase().startsWith(p);
        const matchesPage = item.page && item.page.toLowerCase() === cleanPage;
        if (!matchesKey && !matchesPage) return false;
      }
      return true;
    });
    return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async findByKey(contentKey) {
    return this.findOne(item => item.contentKey === contentKey, { eq: { content_key: contentKey } });
  }

  async findById(id) {
    return this.findOne(item => item.id === id, { eq: { id } });
  }
}

module.exports = new ContentItemsRepository();
