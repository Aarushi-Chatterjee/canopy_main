const { BaseRepository } = require('./base');
const { notebook } = require('../mappers');

class NotebookRepository extends BaseRepository {
  constructor() {
    super('notebook_entries', 'notebook_entries', notebook);
  }

  async findPublic() {
    return this.find(e => e.isPublic === true, { eq: { is_public: true } });
  }

  async findForUser(userId) {
    return this.find(e => e.userId === userId, { eq: { user_id: userId } });
  }

  async findById(id) {
    return this.findOne(e => e.id === id, { eq: { id } });
  }
}

module.exports = new NotebookRepository();
