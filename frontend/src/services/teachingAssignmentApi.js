import API from "./api"; 

export const getAllTeachingAssignments = async () => {
  const response = await API.get(`/api/teaching-assignment/subjects`);
  return response.data.data; // data contains all teaching assignments
};
