import API from "./api";

// Get all teaching assignments
export const getAllTeachingAssignments = async () => {
  const res = await API.get("/admin/assignments");
  return res.data.data;
};

// Add new class
export const addClass = async (name) => {
  const res = await API.post("/admin/addclass", { name });
  return res.data;
};

//  Add new subject
export const addSubject = async ({ name, code }) => {
  const res = await API.post("/admin/addsubject", {
    name,
    code,
  });
  return res.data;
};

//  Assign subject + class to faculty
export const assignFaculty = async ({ facultyId, subjectId, classId }) => {
  const res = await API.post("/admin/assign", {
    facultyId,
    subjectId,
    classId,
  });
  return res.data;
};

// Upload student data in Excel format
export const uploadStudentsExcel = (formData) => {
  return API.post("/admin/students/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

// 1️⃣ Get all classes
export const getAllClasses = async () => {
  const res = await API.get("/admin/classes");
  return res.data.data;
};

// 2️⃣ Get all subjects
export const getAllSubjects = async () => {
  const res = await API.get("/admin/subjects");
  return res.data.data;
};

// 3️⃣ Get all faculties
export const getAllFaculties = async () => {
  const res = await API.get("/admin/faculties");
  return res.data.data;
};