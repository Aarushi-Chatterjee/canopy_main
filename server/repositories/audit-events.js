const { BaseRepository } = require('./base');
const { moderation } = require('../mappers');

class AuditEventsRepository extends BaseRepository {
  constructor() {
    super('audit_events', 'audit_events', {
      toDomain: moderation.toAuditDomain,
      toDatabase: moderation.toAuditDatabase
    });
  }

  async logEvent({ actorId, actorRole, action, targetType, targetId, payload = {}, ip = null }) {
    const event = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      actorId,
      actorRole,
      eventType: action,
      targetEntityType: targetType,
      targetEntityId: targetId,
      payload,
      ipAddress: ip,
      createdAt: new Date().toISOString()
    };
    return this.create(event);
  }
}

module.exports = new AuditEventsRepository();
