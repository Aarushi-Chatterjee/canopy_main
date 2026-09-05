const { BaseRepository } = require('./base');
const userMapper = require('../mappers/user');

class UsersRepository extends BaseRepository {
  constructor() {
    super('users', 'users', userMapper);
  }

  async findByEmail(email) {
    if (!email) return null;
    const lower = email.toLowerCase().trim();
    return this.findOne(u => u.email && u.email.toLowerCase() === lower, { eq: { email: lower } });
  }

  async findById(id) {
    if (!id) return null;
    return this.findOne(u => u.id === id, { eq: { id } });
  }

  async setVerified(id) {
    return this.update(
      u => u.id === id,
      {
        isVerified: true,
        verificationToken: null,
        verificationAttempts: 0,
        updatedAt: new Date().toISOString()
      },
      { eq: { id } }
    );
  }
}

module.exports = new UsersRepository();
