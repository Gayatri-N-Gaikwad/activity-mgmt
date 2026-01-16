import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllTeachingAssignments,
  addClass,
  addSubject,
  assignFaculty,
  getAllClasses,
  getAllSubjects,
  getAllFaculties,
  uploadStudentsExcel
} from "../services/teachingAssignmentApi";
import showToast from "../utils/toast";

import { setAcademicYear as setAcademicYearApi, getActiveAcademicYear } from "../services/teachingAssignmentApi";


function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");
  const [assignments, setAssignments] = useState([]);

  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState({ name: "", code: "" });

  const [assignData, setAssignData] = useState({
    facultyId: "",
    subjectId: "",
    classId: "",
  });

  const [studentFile, setStudentFile] = useState(null);
  const [studentClassId, setStudentClassId] = useState("");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);

  const [academicYear, setAcademicYear] = useState("");
  const [activeAcademicYear, setActiveAcademicYear] = useState("");


  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "admin") {
      showToast("error", "Access Denied: Admins only");
      navigate("/"); // redirect to home or login
    }
  }, [navigate]);

  // Fetch assignments
  useEffect(() => {
    if (activeTab === "assignments") {
      getAllTeachingAssignments()
        .then(setAssignments)
        .catch(() => showToast("error", "Failed to load teaching assignments"));
    }
  }, [activeTab]);

  /* =======================
     FETCH DROPDOWN DATA
  ======================= */
  useEffect(() => {
    if (activeTab === "assign" || activeTab === "uploadStudents") {
      // Fetch classes, subjects, faculties for dropdowns
      getAllClasses()
        .then(setClasses)
        .catch(() => showToast("error", "Failed to load classes"));

      if (activeTab === "assign") {
        getAllSubjects()
          .then(setSubjects)
          .catch(() => showToast("error", "Failed to load subjects"));
        getAllFaculties()
          .then(setFaculties)
          .catch(() => showToast("error", "Failed to load faculties"));
      }
    }
  }, [activeTab]);

  // Fetch active academic year
  useEffect(() => {
    getActiveAcademicYear()
      .then((res) => setActiveAcademicYear(res.year))
      .catch(() => { });
  }, []);


  // Handlers

  // Add Class
  const handleAddClass = async () => {
    if (!className) {
      showToast("error", "Enter class name");
      return;
    }

    try {
      await addClass(className);
      showToast("success", "Class added successfully");
      setClassName("");
    } catch (err) {
      showToast("error", "Error adding class");
    }
  };

  // Add Subject
  const handleAddSubject = async () => {
    if (!subject.name || !subject.code) {
      showToast("error", "Enter subject name and code");
      return;
    }

    try {
      await addSubject(subject);
      showToast("success", "Subject added successfully");
      setSubject({ name: "", code: "" });
    } catch (err) {
      showToast("error", "Error adding subject");
    }
  };

  // Assign Faculty
  const handleAssign = async () => {
    const { facultyId, subjectId, classId } = assignData;

    if (!facultyId || !subjectId || !classId) {
      showToast("error", "All fields are required");
      return;
    }

    try {
      await assignFaculty(assignData);
      showToast("success", "Faculty assigned successfully");

      setAssignData({
        facultyId: "",
        subjectId: "",
        classId: "",
      });
    } catch (err) {
      showToast("error", "Error assigning faculty");
    }
  };

  // Add student data
  const handleStudentUpload = async () => {
    if (!studentFile || !studentClassId) {
      showToast("error", "Please select class and Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", studentFile);
    formData.append("classId", studentClassId);

    try {
      await uploadStudentsExcel(formData);
      showToast("success", "Students uploaded successfully");
      setStudentFile(null);
      setStudentClassId("");
    } catch (err) {
      showToast("error", "Failed to upload students");
    }
  };

  const handleSetAcademicYear = async () => {
  if (!academicYear) {
    showToast("error", "Enter academic year");
    return;
  }

  try {
    await setAcademicYearApi(academicYear); 
    showToast("success", "Academic year set successfully");
    setActiveAcademicYear(academicYear); // update UI
    setAcademicYear(""); // clear input
  } catch (err) {
    showToast("error", "Failed to set academic year");
  }
};

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>

      {/* Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("assignments")}>
          View Assignments
        </button>{" "}
        <button onClick={() => setActiveTab("addClass")}>Add Class</button>{" "}
        <button onClick={() => setActiveTab("addSubject")}>Add Subject</button>{" "}
        <button onClick={() => setActiveTab("assign")}>Assign Faculty</button> {" "}
        <button onClick={() => setActiveTab("uploadStudents")}>
          Upload Students
        </button>
        <button onClick={() => setActiveTab("academicYear")}>
          Academic Year
        </button>
      </div>

      <hr />

      {/* Content rendering (same as before) */}
      {activeTab === "assignments" && (
        <>
          <h2>Teaching Assignments</h2>
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Subject</th>
                <th>Class</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a._id}>
                  <td>{a.facultyId?.name}</td>
                  <td>{a.subjectId?.name}</td>
                  <td>{a.classId?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {activeTab === "addClass" && (
        <>
          <h2>Add Class</h2>
          <input
            type="text"
            placeholder="Class Name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <br />
          <br />
          <button onClick={handleAddClass}>Add Class</button>
        </>
      )}

      {activeTab === "addSubject" && (
        <>
          <h2>Add Subject</h2>
          <input
            type="text"
            placeholder="Subject Name"
            value={subject.name}
            onChange={(e) => setSubject({ ...subject, name: e.target.value })}
          />
          <br />
          <br />
          <input
            type="text"
            placeholder="Subject Code"
            value={subject.code}
            onChange={(e) => setSubject({ ...subject, code: e.target.value })}
          />
          <br />
          <br />
          <button onClick={handleAddSubject}>Add Subject</button>
        </>
      )}

      {/* =======================
         ASSIGN FACULTY (DROPDOWNS)
      ======================= */}
      {activeTab === "assign" && (
        <>
          <h2>Assign Subject & Class to Faculty</h2>

          <select
            value={assignData.facultyId}
            onChange={(e) =>
              setAssignData({ ...assignData, facultyId: e.target.value })
            }
          >
            <option value="">Select Faculty</option>
            {faculties.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.email})
              </option>
            ))}
          </select>

          <br />
          <br />

          <select
            value={assignData.subjectId}
            onChange={(e) =>
              setAssignData({ ...assignData, subjectId: e.target.value })
            }
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <br />
          <br />

          <select
            value={assignData.classId}
            onChange={(e) =>
              setAssignData({ ...assignData, classId: e.target.value })
            }
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <br />
          <br />

          <button onClick={handleAssign}>Assign</button>
        </>
      )}


      {/* =======================
         UPLOAD STUDENTS (CLASS DROPDOWN)
      ======================= */}
      {activeTab === "uploadStudents" && (
        <>
          <h2>Upload Students (Excel)</h2>

          <select value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
          </select>

          <br /><br />

          <input type="file" accept=".xlsx, .xls" onChange={(e) => setStudentFile(e.target.files[0])} />
          <br /><br />

          <button onClick={handleStudentUpload}>Upload Students</button>

          <p style={{ marginTop: "10px", fontSize: "14px" }}>
            Excel format: <b>rollNumber | name</b>
          </p>
        </>
      )}

      {activeTab === "academicYear" && (
        <>
          <h2>Academic Year</h2>

          {activeAcademicYear && (
            <p>
              <b>Current Academic Year:</b> {activeAcademicYear}
            </p>
          )}

          <input
            type="text"
            placeholder="e.g. 2024-25"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />

          <br /><br />

          <button onClick={handleSetAcademicYear}>
            Set Academic Year
          </button>

          <p style={{ marginTop: "10px", fontSize: "14px", color: "gray" }}>
            This academic year will be automatically used while assigning faculty.
          </p>
        </>
      )}

    </div>
  );
}

export default AdminDashboard;
