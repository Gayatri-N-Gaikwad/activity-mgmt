import API from "./api";

export const getAdminDashboardAnalytics = async (params = {}) => {
  const { data } = await API.get("/dashboard/admin", { params });
  return data;
};

export const getHodDashboardAnalytics = async (params = {}) => {
  const { data } = await API.get("/dashboard/hod", { params });
  return data;
};

export const getCoordinatorDashboardAnalytics = async () => {
  const { data } = await API.get("/dashboard/coordinator-dashboard");
  return data;
};
