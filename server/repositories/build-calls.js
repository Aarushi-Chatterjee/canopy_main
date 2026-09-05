const { BaseRepository } = require('./base');
const { buildCall } = require('../mappers');

class BuildCallsRepository extends BaseRepository {
  constructor() {
    super('build_calls', 'build_calls', buildCall);
  }

  async findScoped({ domain, status } = {}) {
    return this.find(c => {
      if (domain && c.domain?.toLowerCase() !== domain.toLowerCase()) return false;
      if (status && status !== 'all' && c.status !== status) return false;
      return true;
    });
  }

  async findById(id) {
    return this.findOne(c => c.id === id, { eq: { id } });
  }
}

module.exports = new BuildCallsRepository();
