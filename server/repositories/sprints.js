const { BaseRepository } = require('./base');

class SprintsRepository extends BaseRepository {
  constructor() {
    super('sprints', 'sprints');
  }

  async findByStage(stage) {
    return this.find(s => !stage || s.stage === stage);
  }

  async findByDomain(domain) {
    return this.find(s => !domain || s.domain?.toLowerCase() === domain.toLowerCase());
  }

  async findById(id) {
    return this.findOne(s => s.id === id, { eq: { id } });
  }
}

module.exports = new SprintsRepository();
