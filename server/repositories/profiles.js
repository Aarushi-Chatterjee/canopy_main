const { BaseRepository } = require('./base');

class ProfilesRepository extends BaseRepository {
  constructor() {
    super('profiles', 'profiles');
  }

  async findByUserId(userId) {
    return this.findOne(p => p.userId === userId, { eq: { user_id: userId } });
  }

  async findByDomain(domain) {
    return this.find(
      p => !domain || p.primaryDomain?.toLowerCase() === domain.toLowerCase(),
      { eq: domain ? { primary_domain: domain } : null }
    );
  }
}

module.exports = new ProfilesRepository();
