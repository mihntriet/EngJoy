const userRepo = require('../repositories/user.repository');

class UserService {
  async getAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      userRepo.findAll({ limit, offset }),
      userRepo.count(),
    ]);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id) {
    const user = await userRepo.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  async update(id, data) {
    const user = await userRepo.update(id, data);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  async delete(id) {
    const deleted = await userRepo.delete(id);
    if (!deleted) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
}

module.exports = new UserService();
