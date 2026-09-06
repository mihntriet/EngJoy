const Dictionary = require('../models/dictionary.model');

class DictionaryRepository {
  async findByWord(word) {
    return Dictionary.findByWord(word);
  }

  async search(query, { page = 1, limit = 20 } = {}) {
    const [docs, total] = await Promise.all([
      Dictionary.searchWords(query, { page, limit }),
      Dictionary.countDocuments({ $text: { $search: query }, isActive: true }),
    ]);
    return { docs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByLevel(level, { page = 1, limit = 20 } = {}) {
    const filter = { level, isActive: true };
    const [docs, total] = await Promise.all([
      Dictionary.findByLevel(level, { page, limit }),
      Dictionary.countDocuments(filter),
    ]);
    return { docs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    return Dictionary.findById(id);
  }

  async create(data) {
    return Dictionary.create(data);
  }

  async bulkCreate(entries) {
    return Dictionary.insertMany(entries, { ordered: false });
  }

  async update(id, data) {
    return Dictionary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return Dictionary.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async getRandomWords({ level, count = 10 } = {}) {
    const match = { isActive: true };
    if (level) match.level = level;
    return Dictionary.aggregate([{ $match: match }, { $sample: { size: count } }]);
  }

  async count({ level } = {}) {
    const filter = { isActive: true };
    if (level) filter.level = level;
    return Dictionary.countDocuments(filter);
  }
}

module.exports = new DictionaryRepository();
