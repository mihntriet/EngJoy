import axiosClient from './axiosClient';
import { ENDPOINTS } from './endpoints';

export const learningPhaseApi = {
  getAll: (params = {}) => axiosClient.get(ENDPOINTS.PHASES.LIST, { params }),
  getById: (id) => axiosClient.get(ENDPOINTS.PHASES.BY_ID(id)),
  getBySlug: (slug) => axiosClient.get(ENDPOINTS.PHASES.BY_SLUG(slug)),
  getByLevel: (level) => axiosClient.get(ENDPOINTS.PHASES.BY_LEVEL(level)),
};
