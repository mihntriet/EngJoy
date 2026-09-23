import axiosClient from './axiosClient';
import { ENDPOINTS } from './endpoints';

export const authApi = {
  register: (data) => axiosClient.post(ENDPOINTS.AUTH.REGISTER, data),
  verifyEmail: (data) => axiosClient.post(ENDPOINTS.AUTH.VERIFY_EMAIL, data),
  resendCode: (data) => axiosClient.post(ENDPOINTS.AUTH.RESEND_CODE, data),
  login: (data) => axiosClient.post(ENDPOINTS.AUTH.LOGIN, data),
  refresh: (refreshToken) => axiosClient.post(ENDPOINTS.AUTH.REFRESH, { refreshToken }),
  me: () => axiosClient.get(ENDPOINTS.AUTH.ME),
};
