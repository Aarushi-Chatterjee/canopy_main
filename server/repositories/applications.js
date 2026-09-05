const { BaseRepository } = require('./base');
const { application } = require('../mappers');

class ApplicationsRepository extends BaseRepository {
  constructor() {
    super('applications', 'applications', application);
  }

  async findPendingQueue() {
    return this.find(a => a.status === 'pending_review' || a.status === 'in_review' || a.status === 'pending');
  }

  async findByCallId(callId) {
    return this.find(a => a.callId === callId, { eq: { call_id: callId } });
  }

  async findByBuilderId(builderId) {
    return this.find(a => a.builderId === builderId, { eq: { builder_id: builderId } });
  }
}

module.exports = new ApplicationsRepository();
