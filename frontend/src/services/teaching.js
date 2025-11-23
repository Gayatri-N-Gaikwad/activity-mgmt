import API from "./api";

// 1. Get subjects assigned to faculty for each class
export const getSubjectsAssigned = async (facultyId, classId) => {
  const res = await API.get(`/teaching/subjects/${facultyId}/${classId}`);
  return res.data.data;
};

// 2. Get assignments for a faculty
export const getFacultyAssignments = async (facultyId) => {
  const res = await API.get(`/teaching/byfaculty/${facultyId}`);
  return res.data;
};

// 3. Get all assignments for a class
export const getAssignmentsByClass = async (classId) => {
  const res = await API.get(`/teaching/class/${classId}`);
  return res.data.assignment;
};

// 4. Get assignment by class + subject
export const getAssignmentByClassAndSubject = async (classId, subjectId) => {
  const res = await API.get(`/teaching`, {
    params: { classId, subjectId }
  });
  return res.data.assignment;
};

// 5. Get students for an activity (based on class)
export const getStudentsByActivityClass = async (activityId) => {
  const res = await API.get(`/teaching/activity/${activityId}/byclass`);
  return res.data.students;
};

// 6. Create new teaching assignment
export const createTeachingAssignment = async (payload) => {
  const res = await API.post(`/teaching/add`, payload);
  return res.data;
};
