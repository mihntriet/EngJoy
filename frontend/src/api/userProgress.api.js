import axiosClient from './axiosClient.js';
import { ENDPOINTS } from './endpoints.js';

export const userProgressApi = {
  getMyProgress: (params = {}) => axiosClient.get(ENDPOINTS.PROGRESS.MY_PROGRESS, { params }),
  getProfile: () => axiosClient.get(ENDPOINTS.PROGRESS.PROFILE),
  executeAction: (payload) => axiosClient.post(ENDPOINTS.PROGRESS.ACTION, payload),
  startLesson: (payload) => axiosClient.post(ENDPOINTS.PROGRESS.LESSON_START, payload),
  submitLesson: (payload) => axiosClient.post(ENDPOINTS.PROGRESS.LESSON_SUBMIT, payload),
  getByPhase: (phaseId) => axiosClient.get(ENDPOINTS.PROGRESS.BY_PHASE(phaseId)),
  getStats: () => axiosClient.get(ENDPOINTS.PROGRESS.STATS),
  startPhase: (phaseId) => axiosClient.post(ENDPOINTS.PROGRESS.START, { phaseId }),
  updateLesson: (id, data) => axiosClient.put(ENDPOINTS.PROGRESS.UPDATE_LESSON(id), data),
  complete: (id, score) => axiosClient.put(ENDPOINTS.PROGRESS.COMPLETE(id), { score }),
  migrateGuest: (payload) => axiosClient.post(ENDPOINTS.PROGRESS.MIGRATE_GUEST, payload),
};

export const progressApi = userProgressApi;
