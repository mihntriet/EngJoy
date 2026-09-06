import axiosClient from './axiosClient';
import { ENDPOINTS } from './endpoints';

export const userProgressApi = {
  getMyProgress: (params = {}) => axiosClient.get(ENDPOINTS.PROGRESS.MY_PROGRESS, { params }),
  getByPhase: (phaseId) => axiosClient.get(ENDPOINTS.PROGRESS.BY_PHASE(phaseId)),
  getStats: () => axiosClient.get(ENDPOINTS.PROGRESS.STATS),
  startPhase: (phaseId) => axiosClient.post(ENDPOINTS.PROGRESS.START, { phaseId }),
  updateLesson: (id, data) => axiosClient.put(ENDPOINTS.PROGRESS.UPDATE_LESSON(id), data),
  complete: (id, score) => axiosClient.put(ENDPOINTS.PROGRESS.COMPLETE(id), { score }),
};
