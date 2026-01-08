import API from "./api";

// Get all teaching assignments
export const getAllTeachingAssignments = async () => {
  const res = await API.get("/teaching-assignment/assignments");
  return res.data.data;
};

// Add new class
export const addClass = async (name) => {
  const res = await API.post("/teaching-assignment/addclass", { name });
  return res.data;
};

//  Add new subject
export const addSubject = async ({ name, code }) => {
  const res = await API.post("/teaching-assignment/addsubject", {
    name,
    code,
  });
  return res.data;
};

//  Assign subject + class to faculty
export const assignFaculty = async ({ facultyId, subjectId, classId }) => {
  const res = await API.post("/teaching-assignment/assign", {
    facultyId,
    subjectId,
    classId,
  });
  return res.data;
};
