const { BaseRepository } = require('./base');

class NotebookRepository extends BaseRepository {
  constructor() {
    super('notebook_entries', 'notebook_entries');
  }

  async findScoped({ domain, entryType } = {}) {
    return this.find(e => {
      if (domain && e.domain?.toLowerCase() !== domain.toLowerCase()) return false;
      if (entryType && e.entryType !== entryType) return false;
      return true;
    });
  }

  async findById(id) {
    return this.findOne(e => e.id === id, { eq: { id } });
  }
}

module.exports = new NotebookRepository();
