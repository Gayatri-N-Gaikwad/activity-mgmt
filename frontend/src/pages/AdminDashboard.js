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

  const [classData, setClassData] = useState({
    year: "",
    division: ""
  });
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

  const [semesterStartDate, setSemesterStartDate] = useState("");
  const [semesterEndDate, setSemesterEndDate] = useState("");

  // Subject Allocation states
  const [selectedYear, setSelectedYear] = useState(null); // 'SY', 'TE', or 'BE'
  const [allocationData, setAllocationData] = useState([]); // All subjects with their faculty assignments

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "admin") {
      showToast("error", "Access Denied: Admins only");
      navigate("/"); // redirect to home or login
    }
  }, [navigate]);

  // Fetch allocation data when year is selected
  useEffect(() => {
    if (selectedYear) {
      fetchAllocationData(selectedYear);
    }
  }, [selectedYear]);

  const fetchAllocationData = async (year) => {
    try {
      const assignmentsRes = await getAllTeachingAssignments();
      const allAssignments = assignmentsRes.data || assignmentsRes;

      // Filter assignments for the selected year
      const yearAssignments = allAssignments.filter(a => a.year === year);

      // Group by subject and create table data
      const subjectMap = new Map();

      // Only add subjects that have assignments for this year
      yearAssignments.forEach(assignment => {
        const subjectId = assignment.subjectId?._id || assignment.subjectId;
        const subjectName = assignment.subjectId?.name || 'Unknown';
        const subjectCode = assignment.subjectId?.code || '';
        const division = assignment.division;
        const facultyName = assignment.facultyId?.name || 'Not Assigned';
        const facultyId = assignment.facultyId?._id;

        console.log('Assignment:', { subjectName, division, facultyName, year }); // Debug log

        // Initialize subject if not exists
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subjectId: subjectId,
            subjectName: subjectName,
            subjectCode: subjectCode,
            div9: null,
            div10: null,
            div11: null,
            div9Info: null,
            div10Info: null,
            div11Info: null
          });
        }

        // Set faculty for the division - handle different division formats
        const subjectData = subjectMap.get(subjectId);

        // Match divisions: "09", "9", "Div 9", etc.
        if (division === '09' || division === '9' || division.toLowerCase().includes('9')) {
          subjectData.div9 = facultyName;
          subjectData.div9Info = { facultyId, division };
        } else if (division === '10' || division.toLowerCase().includes('10')) {
          subjectData.div10 = facultyName;
          subjectData.div10Info = { facultyId, division };
        } else if (division === '11' || division.toLowerCase().includes('11')) {
          subjectData.div11 = facultyName;
          subjectData.div11Info = { facultyId, division };
        }
      });

      setAllocationData(Array.from(subjectMap.values()));
    } catch (err) {
      showToast("error", "Failed to load allocation data");
      console.error(err);
    }
  };

  const handleFacultyClick = (facultyName, subjectId, subjectName, facultyId, division, year) => {
    if (!facultyName || facultyName === '-') return;

    // Navigate to admin activities page with query params
    navigate(`/admin/activities?facultyId=${facultyId}&subjectId=${subjectId}&year=${year}&division=${division}&facultyName=${encodeURIComponent(facultyName)}&subjectName=${encodeURIComponent(subjectName)}`);
  };

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
    const loadAcademicYear = async () => {
      try {
        const res = await getActiveAcademicYear();

        if (!res.data) {
          // ✅ First-time case: nothing set yet
          setActiveAcademicYear(null);
          return;
        }

        setActiveAcademicYear(res.data.year);
      } catch {
        setActiveAcademicYear(null);
      }
    };

    loadAcademicYear();
  }, []);


  // Handlers

  // Add Class
  const handleAddClass = async () => {
    const { year, division } = classData;

    if (!year || !division) {
      showToast("error", "Select year and division");
      return;
    }

    try {
      await addClass({ year, division });
      showToast("success", "Class added successfully");

      setClassData({ year: "", division: "" });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Error adding class";
      showToast("error", message);
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
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error assigning faculty";

      showToast("error", message);
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
    if (!academicYear || !semesterStartDate || !semesterEndDate) {
      showToast("error", "Enter academic year, start date and end date");
      return;
    }

    if (new Date(semesterEndDate) <= new Date(semesterStartDate)) {
      showToast("error", "End date must be after start date");
      return;
    }

    try {
      await setAcademicYearApi({
        year: academicYear,
        semesterStartDate,
        semesterEndDate,
      });

      showToast("success", "Academic year set successfully");

      setActiveAcademicYear(academicYear);

      //  Clear inputs
      setAcademicYear("");
      setSemesterStartDate("");
      setSemesterEndDate("");
    } catch (err) {
      showToast("error", "Failed to set academic year");
    }
  };


  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>

      {/* Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => {
          setActiveTab("assignments");
          setSelectedYear(null);
          setAllocationData([]);
        }}>
          Subject Allocations
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
          {!selectedYear ? (
            <>
              <h2>Subject Allocations</h2>
              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={() => setSelectedYear('SY')}
                >
                  Second Year
                </button>{" "}
                <button
                  onClick={() => setSelectedYear('TE')}
                >
                  Third Year
                </button>{" "}
                <button
                  onClick={() => setSelectedYear('BE')}
                >
                  Fourth Year
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedYear(null);
                  setAllocationData([]);
                }}
              >
                ← Back
              </button>
              <h2>
                Subject Allocations - {
                  selectedYear === 'SY' ? 'Second Year' :
                    selectedYear === 'TE' ? 'Third Year' :
                      'Fourth Year'
                }
              </h2>
              <table border="1" cellPadding="8" style={{ marginTop: "20px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Div 9</th>
                    <th>Div 10</th>
                    <th>Div 11</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationData.length > 0 ? (
                    allocationData.map((item) => (
                      <tr key={item.subjectId}>
                        <td>
                          <strong>{item.subjectName}</strong>
                          <br />
                          <small style={{ color: "gray" }}>{item.subjectCode}</small>
                        </td>
                        <td
                          style={{
                            cursor: item.div9 && item.div9 !== '-' ? 'pointer' : 'default',
                            color: item.div9 && item.div9 !== '-' ? 'blue' : 'inherit',
                            textDecoration: item.div9 && item.div9 !== '-' ? 'underline' : 'none'
                          }}
                          onClick={() => item.div9 && item.div9 !== '-' && item.div9Info && handleFacultyClick(
                            item.div9,
                            item.subjectId,
                            item.subjectName,
                            item.div9Info.facultyId,
                            item.div9Info.division,
                            selectedYear
                          )}
                        >
                          {item.div9 || '-'}
                        </td>
                        <td
                          style={{
                            cursor: item.div10 && item.div10 !== '-' ? 'pointer' : 'default',
                            color: item.div10 && item.div10 !== '-' ? 'blue' : 'inherit',
                            textDecoration: item.div10 && item.div10 !== '-' ? 'underline' : 'none'
                          }}
                          onClick={() => item.div10 && item.div10 !== '-' && item.div10Info && handleFacultyClick(
                            item.div10,
                            item.subjectId,
                            item.subjectName,
                            item.div10Info.facultyId,
                            item.div10Info.division,
                            selectedYear
                          )}
                        >
                          {item.div10 || '-'}
                        </td>
                        <td
                          style={{
                            cursor: item.div11 && item.div11 !== '-' ? 'pointer' : 'default',
                            color: item.div11 && item.div11 !== '-' ? 'blue' : 'inherit',
                            textDecoration: item.div11 && item.div11 !== '-' ? 'underline' : 'none'
                          }}
                          onClick={() => item.div11 && item.div11 !== '-' && item.div11Info && handleFacultyClick(
                            item.div11,
                            item.subjectId,
                            item.subjectName,
                            item.div11Info.facultyId,
                            item.div11Info.division,
                            selectedYear
                          )}
                        >
                          {item.div11 || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No subjects found for this year
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {activeTab === "addClass" && (
        <>
          <h2>Add Class</h2>

          {/* YEAR */}
          <select
            value={classData.year}
            onChange={(e) =>
              setClassData({ ...classData, year: e.target.value })
            }
          >
            <option value="">Select Year</option>
            <option value="SY">Second Year (SY)</option>
            <option value="TE">Third Year (TE)</option>
            <option value="BE">Fourth Year (BE)</option>
          </select>

          <br /><br />

          {/* DIVISION */}
          <select
            value={classData.division}
            onChange={(e) =>
              setClassData({ ...classData, division: e.target.value })
            }
          >
            <option value="">Select Division</option>
            <option value="9">Div 9</option>
            <option value="10">Div 10</option>
            <option value="11">Div 11</option>
          </select>

          <br /><br />

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
                {c.year} - Div {c.division}
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

          <select
            value={studentClassId}
            onChange={(e) => setStudentClassId(e.target.value)}
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.year} - Div {c.division}
              </option>
            ))}
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

      {!activeAcademicYear && (
        <p style={{ color: "gray", fontStyle: "italic" }}>
          No academic year has been set yet.
        </p>
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

          {/* ✅ Semester Start Date */}
          <label>Semester Start Date</label><br />
          <input
            type="date"
            value={semesterStartDate}
            onChange={(e) => setSemesterStartDate(e.target.value)}
          />

          <br /><br />

          {/* ✅ Semester End Date */}
          <label>Semester End Date</label><br />
          <input
            type="date"
            value={semesterEndDate}
            onChange={(e) => setSemesterEndDate(e.target.value)}
          />

          <br /><br />

          <button onClick={handleSetAcademicYear}>
            Set Academic Year
          </button>

          <p style={{ marginTop: "10px", fontSize: "14px", color: "gray" }}>
            This academic year and semester duration will be used across the system.
          </p>
        </>
      )}

    </div>
  );
}

export default AdminDashboard;
