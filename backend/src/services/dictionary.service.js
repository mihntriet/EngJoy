const dictRepo = require('../repositories/dictionary.repository');

class DictionaryService {
  async lookup(word) {
    const entry = await dictRepo.findByWord(word);
    if (!entry) {
      const err = new Error(`Word "${word}" not found`);
      err.statusCode = 404;
      throw err;
    }
    return entry;
  }

  async search(query, { page = 1, limit = 20 } = {}) {
    return dictRepo.search(query, { page, limit });
  }

  async getByLevel(level, { page = 1, limit = 20 } = {}) {
    return dictRepo.findByLevel(level, { page, limit });
  }

  async getById(id) {
    const entry = await dictRepo.findById(id);
    if (!entry) {
      const err = new Error('Dictionary entry not found');
      err.statusCode = 404;
      throw err;
    }
    return entry;
  }

  async create(data) {
    return dictRepo.create(data);
  }

  async bulkCreate(entries) {
    return dictRepo.bulkCreate(entries);
  }

  async update(id, data) {
    const entry = await dictRepo.update(id, data);
    if (!entry) {
      const err = new Error('Dictionary entry not found');
      err.statusCode = 404;
      throw err;
    }
    return entry;
  }

  async delete(id) {
    const entry = await dictRepo.delete(id);
    if (!entry) {
      const err = new Error('Dictionary entry not found');
      err.statusCode = 404;
      throw err;
    }
    return entry;
  }

  async getRandomWords({ level, count = 10 } = {}) {
    return dictRepo.getRandomWords({ level, count });
  }
}

module.exports = new DictionaryService();
