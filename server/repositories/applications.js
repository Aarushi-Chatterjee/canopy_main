const { BaseRepository } = require('./base');

class ApplicationsRepository extends BaseRepository {
  constructor() {
    super('applications', 'applications');
  }

  async findPendingQueue() {
    return this.find(a => a.status === 'pending_review' || a.status === 'in_review');
  }

  async findByEmail(email) {
    return this.findOne(a => a.email.toLowerCase() === email.toLowerCase(), {
      eq: { email: email.toLowerCase() }
    });
  }
}

module.exports = new ApplicationsRepository();
