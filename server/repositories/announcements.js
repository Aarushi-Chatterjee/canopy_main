const { BaseRepository } = require('./base');

class AnnouncementsRepository extends BaseRepository {
  constructor() {
    super('announcements', 'announcements');
  }

  async getActive() {
    const all = await this.find();
    return all
      .filter(a => a.status !== 'archived')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = new AnnouncementsRepository();

