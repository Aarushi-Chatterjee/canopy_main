const { BaseRepository } = require('./base');
const { match } = require('../mappers');

class MatchesRepository extends BaseRepository {
  constructor() {
    super('matches', 'matches', match);
  }

  async findForUser(userId) {
    return this.find(m => m.userId === userId || m.matchUserId === userId);
  }

  async findPendingForRecipient(recipientId) {
    return this.find(
      m => m.matchUserId === recipientId && m.status === 'pending',
      { eq: { match_user_id: recipientId, status: 'pending' } }
    );
  }
}

module.exports = new MatchesRepository();
