const { BaseRepository } = require('./base');

class AuditEventsRepository extends BaseRepository {
  constructor() {
    super('audit_events', 'audit_events');
  }

  async logEvent({ actorId, action, targetType, targetId, metadata = {}, ip = null, userAgent = null }) {
    const event = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      actorId,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString()
    };
    return this.create(event);
  }
}

module.exports = new AuditEventsRepository();
