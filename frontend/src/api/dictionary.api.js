import axiosClient from './axiosClient';
import { ENDPOINTS } from './endpoints';

export const dictionaryApi = {
  lookup: (word) => axiosClient.get(ENDPOINTS.DICTIONARY.BY_WORD(word)),
  search: (q, params = {}) => axiosClient.get(ENDPOINTS.DICTIONARY.SEARCH, { params: { q, ...params } }),
  getByLevel: (level, params = {}) => axiosClient.get(ENDPOINTS.DICTIONARY.BY_LEVEL(level), { params }),
  getById: (id) => axiosClient.get(ENDPOINTS.DICTIONARY.BY_ID(id)),
  getRandom: (params = {}) => axiosClient.get(ENDPOINTS.DICTIONARY.RANDOM, { params }),
};
