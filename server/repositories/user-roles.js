const { BaseRepository } = require('./base');

const roleMapper = {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      role: row.role,
      grantedBy: row.granted_by || row.grantedBy,
      grantedAt: row.granted_at || row.grantedAt,
      revokedAt: row.revoked_at || row.revokedAt,
      internalNote: row.internal_note || row.internalNote
    };
  },
  toDatabase(obj) {
    if (!obj) return null;
    const db = {};
    if (obj.id) db.id = obj.id;
    if (obj.userId || obj.user_id) db.user_id = obj.userId || obj.user_id;
    if (obj.role) db.role = obj.role;
    if (obj.grantedBy || obj.granted_by) db.granted_by = obj.grantedBy || obj.granted_by;
    if (obj.grantedAt || obj.granted_at) db.granted_at = obj.grantedAt || obj.granted_at;
    if (obj.revokedAt || obj.revoked_at) db.revoked_at = obj.revokedAt || obj.revoked_at;
    if (obj.internalNote || obj.internal_note) db.internal_note = obj.internalNote || obj.internal_note;
    return db;
  }
};

class UserRolesRepository extends BaseRepository {
  constructor() {
    super('user_roles', 'user_roles', roleMapper);
  }

  async findActiveRolesByUserId(userId) {
    const roles = await this.find(
      r => (r.userId === userId || r.user_id === userId) && !r.revokedAt,
      { eq: { user_id: userId } }
    );
    return roles.filter(r => !r.revokedAt).map(r => r.role);
  }

  async grantRole(userId, role, grantedBy = 'system') {
    const record = {
      id: 'rol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      role,
      grantedBy,
      grantedAt: new Date().toISOString()
    };
    return this.create(record);
  }

  async revokeRole(userId, role, revokedBy = 'system') {
    const now = new Date().toISOString();
    return this.update(
      r => (r.userId === userId || r.user_id === userId) && r.role === role,
      { revokedAt: now },
      { eq: { user_id: userId, role } }
    );
  }
}

module.exports = new UserRolesRepository();
