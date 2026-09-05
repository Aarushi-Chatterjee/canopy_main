const { BaseRepository } = require('./base');

class MatchesRepository extends BaseRepository {
  constructor() {
    super('matches', 'matches');
  }

  async findForUser(userId) {
    return this.find(m => m.requesterId === userId || m.recipientId === userId);
  }

  async findPendingForRecipient(recipientId) {
    return this.find(m => m.recipientId === recipientId && m.status === 'pending');
  }
}

module.exports = new MatchesRepository();
