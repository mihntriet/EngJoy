const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema(
  {
    sentence: { type: String, required: true, trim: true },
    translation: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const meaningSchema = new mongoose.Schema(
  {
    partOfSpeech: {
      type: String,
      required: true,
      enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'determiner', 'exclamation', 'abbreviation', 'phrasal verb', 'idiom'],
      trim: true,
    },
    definitions: [
      {
        definition: { type: String, required: true, trim: true },
        synonyms: [{ type: String, trim: true }],
        antonyms: [{ type: String, trim: true }],
      },
    ],
    examples: [exampleSchema],
  },
  { _id: false }
);

const phoneticSchema = new mongoose.Schema(
  {
    text: { type: String, default: '', trim: true },
    audio: { type: String, default: '', trim: true },
    sourceUrl: { type: String, default: '', trim: true },
    license: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const dictionarySchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phonetics: [phoneticSchema],
    meanings: {
      type: [meaningSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A word must have at least one meaning.',
      },
    },
    audio: {
      uk: { type: String, default: '', trim: true },
      us: { type: String, default: '', trim: true },
    },
    origin: { type: String, default: '', trim: true },
    frequency: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    level: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', ''],
      default: '',
      index: true,
    },
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

dictionarySchema.index({ word: 'text', 'meanings.definitions.definition': 'text' });
dictionarySchema.index({ tags: 1 });
dictionarySchema.index({ createdAt: -1 });

dictionarySchema.virtual('primaryPhonetic').get(function () {
  if (!this.phonetics || this.phonetics.length === 0) return '';
  const withText = this.phonetics.find((p) => p.text);
  return withText ? withText.text : '';
});

dictionarySchema.virtual('primaryAudio').get(function () {
  if (this.audio?.us) return this.audio.us;
  if (this.audio?.uk) return this.audio.uk;
  const withAudio = this.phonetics?.find((p) => p.audio);
  return withAudio ? withAudio.audio : '';
});

dictionarySchema.statics.findByWord = function (word) {
  return this.findOne({ word: word.toLowerCase().trim(), isActive: true });
};

dictionarySchema.statics.searchWords = function (query, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  return this.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit);
};

dictionarySchema.statics.findByLevel = function (level, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  return this.find({ level, isActive: true })
    .sort({ frequency: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Dictionary', dictionarySchema);
