const { BaseRepository } = require('./base');
const { sprint } = require('../mappers');

class SprintsRepository extends BaseRepository {
  constructor() {
    super('sprints', 'sprints', sprint);
  }

  async findByCallId(callId) {
    return this.find(s => s.callId === callId, { eq: { call_id: callId } });
  }

  async findByStatus(status) {
    return this.find(s => !status || s.status === status, { eq: status ? { status } : null });
  }

  async findById(id) {
    return this.findOne(s => s.id === id, { eq: { id } });
  }
}

module.exports = new SprintsRepository();
