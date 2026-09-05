const { BaseRepository } = require('./base');
const { moderation } = require('../mappers');

class ModerationQueueRepository extends BaseRepository {
  constructor() {
    super('moderation_queue', 'moderation_queue', {
      toDomain: moderation.toModerationDomain,
      toDatabase: moderation.toModerationDatabase
    });
  }

  async findPending() {
    return this.find(item => item.status === 'pending', { eq: { status: 'pending' } });
  }

  async findByEntity(entityType, entityId) {
    return this.findOne(
      item => item.entityType === entityType && item.entityId === entityId,
      { eq: { entity_type: entityType, entity_id: entityId } }
    );
  }
}

module.exports = new ModerationQueueRepository();
