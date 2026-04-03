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
  uploadStudentsExcel,
  uploadSubjectsExcel,
  uploadFacultiesExcel,
  addSingleFaculty
} from "../services/teachingAssignmentApi";
import showToast from "../utils/toast";
import AdminDashboardCharts from "./AdminDashboardCharts";

import { setAcademicYear as setAcademicYearApi, getActiveAcademicYear } from "../services/teachingAssignmentApi";


function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");

  const [classData, setClassData] = useState({
    year: "",
    division: "",
    google_group_email: "",
  });
  const [subject, setSubject] = useState({ name: "", code: "", year: "", coordinator: "" });

  const [assignData, setAssignData] = useState({
    facultyId: "",
    subjectId: "",
    classId: "",
  });

  const [studentFile, setStudentFile] = useState(null);
  const [subjectFile, setSubjectFile] = useState(null);
  const [facultyFile, setFacultyFile] = useState(null);
  const [singleFaculty, setSingleFaculty] = useState({ name: "", email: "", role: "Faculty" });
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
      const normalizeYear = (value) => {
        const y = String(value || "").trim().toUpperCase();
        if (y === "TY") return "TE";
        return y;
      };

      const [assignmentsRes, subjectsRes] = await Promise.all([
        getAllTeachingAssignments(),
        getAllSubjects(),
      ]);

      const allAssignments = assignmentsRes.data || assignmentsRes || [];
      const allSubjects = subjectsRes || [];
      const selectedYear = normalizeYear(year);

      // Include assignments for selected year
      const yearAssignments = allAssignments.filter(
        (a) => normalizeYear(a.year) === selectedYear
      );

      // Include all subjects for selected year, even when no faculty is assigned
      const yearSubjects = allSubjects.filter(
        (s) => normalizeYear(s.year) === selectedYear
      );

      const subjectMap = new Map();

      // Seed map with all subjects in selected year (unassigned by default)
      yearSubjects.forEach((subject) => {
        const subjectId = subject._id;
        subjectMap.set(subjectId, {
          subjectId,
          subjectName: subject.name,
          subjectCode: subject.code,
          div9: null,
          div10: null,
          div11: null,
          div9Info: null,
          div10Info: null,
          div11Info: null,
        });
      });

      // Overlay faculty assignment data where available
      yearAssignments.forEach((assignment) => {
        const subjectId = assignment.subjectId?._id || assignment.subjectId;
        const subjectName = assignment.subjectId?.name || "Unknown";
        const subjectCode = assignment.subjectId?.code || "";
        const division = String(assignment.division || "").toLowerCase();
        const facultyName = assignment.facultyId?.name || "Not Assigned";
        const facultyId = assignment.facultyId?._id;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subjectId,
            subjectName,
            subjectCode,
            div9: null,
            div10: null,
            div11: null,
            div9Info: null,
            div10Info: null,
            div11Info: null,
          });
        }

        const subjectData = subjectMap.get(subjectId);

        if (division === "09" || division === "9" || division.includes("9")) {
          subjectData.div9 = facultyName;
          subjectData.div9Info = { facultyId, division: assignment.division };
        } else if (division === "10" || division.includes("10")) {
          subjectData.div10 = facultyName;
          subjectData.div10Info = { facultyId, division: assignment.division };
        } else if (division === "11" || division.includes("11")) {
          subjectData.div11 = facultyName;
          subjectData.div11Info = { facultyId, division: assignment.division };
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
    const { year, division, google_group_email } = classData;

    if (!year || !division || !google_group_email) {
      showToast("error", "Select year, division, and Google Group link");
      return;
    }

    if (google_group_email) {
      try {
        const parsedUrl = new URL(google_group_email);
        if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "groups.google.com") {
          showToast("error", "Enter a valid Google Group link");
          return;
        }
      } catch {
        showToast("error", "Enter a valid Google Group link");
        return;
      }
    }

    try {
      await addClass({ year, division, google_group_email: google_group_email.trim() });
      showToast("success", "Class added successfully");

      setClassData({ year: "", division: "", google_group_email: "" });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Error adding class";
      showToast("error", message);
    }
  };


  // Add Subject
  const handleAddSubject = async () => {
    const { name, code, year, coordinator } = subject;
    
    if (!name || !code || !year || !coordinator) {
      showToast("error", "All fields are required: name, code, year, and coordinator");
      return;
    }

    try {
      await addSubject(subject);
      showToast("success", "Subject added successfully");
      setSubject({ name: "", code: "", year: "", coordinator: "" });
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

  // Upload subject data
  const handleSubjectUpload = async () => {
    if (!subjectFile) {
      showToast("error", "Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", subjectFile);

    try {
      const response = await uploadSubjectsExcel(formData);
      const { successCount, duplicateCount, errorCount, errors, validationErrors } = response.data;

      if (errorCount > 0 || (validationErrors && validationErrors.length > 0)) {
        // Show detailed error information
        let errorMessage = `UPLOAD FAILED: ${successCount} created, ${errorCount || (validationErrors && validationErrors.length)} error(s)\n\n`;
        
        const allErrors = errors || validationErrors || [];
        allErrors.slice(0, 3).forEach(err => {
          errorMessage += `Row ${err.row}: ${err.error || err.message}\n`;
        });
        
        if (allErrors.length > 3) {
          errorMessage += `...and ${allErrors.length - 3} more errors`;
        }
        
        showToast("error", errorMessage);
        return;
      }

      let message = `SUCCESS: ${successCount} subject(s) uploaded!`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} duplicates skipped)`;
      }

      showToast("success", message);
      setSubjectFile(null);
    } catch (err) {
      showToast("error", err?.response?.data?.error || "Failed to upload subjects");
    }
  };

  // Upload faculty user data
  const handleFacultyUpload = async () => {
    if (!facultyFile) {
      showToast("error", "Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", facultyFile);

    try {
      const response = await uploadFacultiesExcel(formData);
      const { inserted, failed, message } = response.data || {};

      const successCount = Number(inserted || 0);
      const failedCount = Number(failed || 0);
      let toastMessage = message || `Uploaded ${successCount} faculty record(s)`;

      if (failedCount > 0) {
        toastMessage += ` (${failedCount} failed)`;
      }

      showToast(failedCount > 0 ? "warning" : "success", toastMessage);
      setFacultyFile(null);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to upload faculties");
    }
  };

  const handleSingleFacultyAdd = async () => {
    const name = String(singleFaculty.name || "").trim();
    const email = String(singleFaculty.email || "").trim().toLowerCase();
    const role = String(singleFaculty.role || "").trim();

    if (!name || !email || !role) {
      showToast("error", "Name, email, and role are required");
      return;
    }

    try {
      const res = await addSingleFaculty({ name, email, role });
      showToast("success", res?.message || "Faculty/user added successfully");
      if (res?.defaultPassword) {
        showToast("info", `Default password: ${res.defaultPassword}`);
      }
      setSingleFaculty({ name: "", email: "", role: "Faculty" });
      if (activeTab === "assign") {
        getAllFaculties().then(setFaculties).catch(() => {});
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Failed to add faculty/user");
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
    <div className="admin-dashboard-page" style={{ padding: "0 24px" }}>
      <div className="marquee-container">
        <div className="marquee-text">
          🚀 Welcome to the <span className="marquee-highlight">Admin Dashboard</span>! Quick Access: Manage classes, add subjects, allocate faculty assignments, upload mass student data, and configure the academic year seamlessly. ⚙️
        </div>
      </div>

      <div className="admin-layout">

        {/* Navigation Sidebar */}
        <div className="admin-sidebar" style={{ border: "2px solid #e8eef7" }}>
          <h3 style={{ margin: "4px 0 16px 8px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#8b9db1", fontWeight: "700" }}>
            Admin Tools
          </h3>
          <button
            className={`admin-nav-btn ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("assignments");
              setSelectedYear(null);
              setAllocationData([]);
            }}
          >
            <i className="fa fa-table"></i>
            <span>Subject Allocations</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "uploadSubjects" ? "active" : ""}`}
            onClick={() => setActiveTab("uploadSubjects")}
          >
            <i className="fa fa-file-excel"></i>
            <span>Upload Subjects</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "uploadFaculties" ? "active" : ""}`}
            onClick={() => setActiveTab("uploadFaculties")}
          >
            <i className="fa fa-user-plus"></i>
            <span>Upload Faculties</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "addClass" ? "active" : ""}`}
            onClick={() => setActiveTab("addClass")}
          >
            <i className="fa fa-users-class"></i>
            <span>Add Class</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "addSubject" ? "active" : ""}`}
            onClick={() => setActiveTab("addSubject")}
          >
            <i className="fa fa-book"></i>
            <span>Add Subject</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "assign" ? "active" : ""}`}
            onClick={() => setActiveTab("assign")}
          >
            <i className="fa fa-user-tie"></i>
            <span>Assign Faculty</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <i className="fa fa-chart-column"></i>
            <span>Analytics</span>
          </button>

          <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "12px 0", opacity: 0.6 }} />

          <button
            className={`admin-nav-btn ${activeTab === "uploadStudents" ? "active" : ""}`}
            onClick={() => setActiveTab("uploadStudents")}
          >
            <i className="fa fa-file-excel"></i>
            <span>Upload Students</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === "academicYear" ? "active" : ""}`}
            onClick={() => setActiveTab("academicYear")}
          >
            <i className="fa fa-calendar-alt"></i>
            <span>Academic Year</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="admin-content-area" style={{ flex: 1 }}>
          {activeTab === "assignments" && (
            <div className="card">
              {!selectedYear ? (
                <>
                  <div className="activities-header">
                    <div>
                      <h2 style={{ marginTop: 0 }}>Subject Allocations</h2>
                      <p className="muted">Select a year to view the mapped assignments to faculty.</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "24px 16px", fontSize: "16px" }} onClick={() => setSelectedYear('SY')}>
                      <strong>Second Year</strong> (SY)
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "24px 16px", fontSize: "16px" }} onClick={() => setSelectedYear('TE')}>
                      <strong>Third Year</strong> (TE)
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "24px 16px", fontSize: "16px" }} onClick={() => setSelectedYear('BE')}>
                      <strong>Fourth Year</strong> (BE)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="activities-header" style={{ marginBottom: "20px" }}>
                    <div>
                      <h2 style={{ marginTop: 0 }}>
                        Subject Allocations - {
                          selectedYear === 'SY' ? 'Second Year' :
                            selectedYear === 'TE' ? 'Third Year' : 'Fourth Year'
                        }
                      </h2>
                      <p className="muted">Click on a faculty name to view their activities.</p>
                    </div>
                    <button className="btn btn-outline" onClick={() => { setSelectedYear(null); setAllocationData([]); }}>
                      <i className="fa fa-arrow-left" style={{ marginRight: "6px" }}></i> Back
                    </button>
                  </div>

                  <div className="subject-table-wrap">
                    <table className="subject-table activities-table" style={{ width: "100%", textAlign: "left" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Subject</th>
                          <th style={{ textAlign: "center" }}>Div 9</th>
                          <th style={{ textAlign: "center" }}>Div 10</th>
                          <th style={{ textAlign: "center" }}>Div 11</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationData.length > 0 ? (
                          allocationData.map((item) => (
                            <tr key={item.subjectId}>
                              <td style={{ textAlign: "left" }}>
                                <strong>{item.subjectName}</strong>
                                <div className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>{item.subjectCode}</div>
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  cursor: item.div9 && item.div9 !== '-' ? 'pointer' : 'default',
                                  fontWeight: item.div9 && item.div9 !== '-' ? '600' : 'normal',
                                  color: item.div9 && item.div9 !== '-' ? 'var(--primary)' : 'inherit',
                                }}
                                onClick={() => item.div9 && item.div9 !== '-' && item.div9Info && handleFacultyClick(
                                  item.div9, item.subjectId, item.subjectName, item.div9Info.facultyId, item.div9Info.division, selectedYear
                                )}
                              >
                                {item.div9 && item.div9 !== '-' ? <span className="action-link-edit">{item.div9}</span> : <span className="muted">-</span>}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  cursor: item.div10 && item.div10 !== '-' ? 'pointer' : 'default',
                                  fontWeight: item.div10 && item.div10 !== '-' ? '600' : 'normal',
                                  color: item.div10 && item.div10 !== '-' ? 'var(--primary)' : 'inherit',
                                }}
                                onClick={() => item.div10 && item.div10 !== '-' && item.div10Info && handleFacultyClick(
                                  item.div10, item.subjectId, item.subjectName, item.div10Info.facultyId, item.div10Info.division, selectedYear
                                )}
                              >
                                {item.div10 && item.div10 !== '-' ? <span className="action-link-edit">{item.div10}</span> : <span className="muted">-</span>}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  cursor: item.div11 && item.div11 !== '-' ? 'pointer' : 'default',
                                  fontWeight: item.div11 && item.div11 !== '-' ? '600' : 'normal',
                                  color: item.div11 && item.div11 !== '-' ? 'var(--primary)' : 'inherit',
                                }}
                                onClick={() => item.div11 && item.div11 !== '-' && item.div11Info && handleFacultyClick(
                                  item.div11, item.subjectId, item.subjectName, item.div11Info.facultyId, item.div11Info.division, selectedYear
                                )}
                              >
                                {item.div11 && item.div11 !== '-' ? <span className="action-link-edit">{item.div11}</span> : <span className="muted">-</span>}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "24px" }} className="muted">
                              No subjects found for this year
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "uploadSubjects" && (
            <div className="card create-activity-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
              <div className="form-brand">Bulk Import</div>
              <h2 className="form-title">Upload Subjects from Excel</h2>
              <p className="form-subtitle">Upload multiple subjects at once using an Excel file.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Select Excel File</label>
                  <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setSubjectFile(e.target.files?.[0] || null)}
                      style={{
                        padding: "12px",
                        border: "2px dashed #e2e8f0",
                        borderRadius: "8px",
                        width: "100%",
                        cursor: "pointer",
                        boxSizing: "border-box"
                      }}
                    />
                    <span style={{ color: "#666", fontSize: "12px", marginTop: "8px", display: "block" }}>
                      {subjectFile ? `Selected: ${subjectFile.name}` : "Choose an .xlsx or .xls file"}
                    </span>
                  </div>
                </div>

                <div className="status-alert status-alert-info" style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <i className="fa fa-info-circle"></i>
                  <div>
                    <strong>Expected Excel Format (All fields required):</strong>
                    <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6" }}>
                      <p style={{ margin: "4px 0" }}>Column 1: <b>code</b> (e.g., CS101) *</p>
                      <p style={{ margin: "4px 0" }}>Column 2: <b>name</b> (e.g., Data Structures) *</p>
                      <p style={{ margin: "4px 0" }}>Column 3: <b>year</b> (e.g., SY, TE, BE) *</p>
                      <p style={{ margin: "4px 0" }}>Column 4: <b>coordinator</b> (user email or ID) *</p>
                    </div>
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleSubjectUpload} disabled={!subjectFile}>
                    <i className="fa fa-upload" style={{ marginRight: "8px" }}></i> Upload Subjects
                  </button>
                </div>
              </div>
            </div>
          )}



          {activeTab === "uploadFaculties" && (
            <div className="card create-activity-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
              <div className="form-brand">Bulk Import</div>
              <h2 className="form-title">Upload Faculties from Excel</h2>
              <p className="form-subtitle">Save faculty names and emails in the faculty directory for registration whitelist and coordinator lookup.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Select Excel File</label>
                  <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setFacultyFile(e.target.files?.[0] || null)}
                      style={{
                        padding: "12px",
                        border: "2px dashed #e2e8f0",
                        borderRadius: "8px",
                        width: "100%",
                        cursor: "pointer",
                        boxSizing: "border-box"
                      }}
                    />
                    <span style={{ color: "#666", fontSize: "12px", marginTop: "8px", display: "block" }}>
                      {facultyFile ? `Selected: ${facultyFile.name}` : "Choose an .xlsx or .xls file"}
                    </span>
                  </div>
                </div>

                <div className="status-alert status-alert-info" style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <i className="fa fa-info-circle"></i>
                  <div>
                    <strong>Expected Excel Format (Required columns):</strong>
                    <div style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.6" }}>
                      <p style={{ margin: "4px 0" }}>Column 1: <b>name</b> (e.g., Jane Doe)</p>
                      <p style={{ margin: "4px 0" }}>Column 2: <b>email</b> (e.g., jane@college.edu)</p>
                      <p style={{ margin: "4px 0" }}>Column 3: <b>role</b> (Faculty, HOD, admin)</p>
                    </div>
                    <p style={{ marginTop: "8px", fontSize: "12px", color: "#475569" }}>
                      Uploaded emails will be allowed to register only if they exist in this faculty directory.
                    </p>
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleFacultyUpload} disabled={!facultyFile}>
                    <i className="fa fa-upload" style={{ marginRight: "8px" }}></i> Upload Faculties
                  </button>
                </div>

                <div style={{ marginTop: "28px", borderTop: "1px solid #e2e8f0", paddingTop: "22px" }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "18px" }}>Add Single Faculty/User</h3>
                  <p className="muted" style={{ marginBottom: "14px" }}>
                    Use this when you need to add one new faculty/user without uploading Excel.
                  </p>

                  <div className="form-row">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={singleFaculty.name}
                      onChange={(e) => setSingleFaculty((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-row">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="e.g. jane@college.edu"
                      value={singleFaculty.email}
                      onChange={(e) => setSingleFaculty((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-row">
                    <label>Role</label>
                    <select
                      value={singleFaculty.role}
                      onChange={(e) => setSingleFaculty((prev) => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="Faculty">Faculty</option>
                      <option value="HOD">HOD</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="form-actions" style={{ marginTop: "14px" }}>
                    <button className="btn btn-outline" onClick={handleSingleFacultyAdd}>
                      <i className="fa fa-user-plus" style={{ marginRight: "8px" }}></i> Add Faculty/User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "addClass" && (
            <div className="card create-activity-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="form-brand">Create</div>
              <h2 className="form-title">Add Class</h2>
              <p className="form-subtitle">Register a new class by defining its year and division.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Year</label>
                  <select
                    value={classData.year}
                    onChange={(e) => setClassData({ ...classData, year: e.target.value })}
                  >
                    <option value="">-- Select Year --</option>
                    <option value="SY">Second Year (SY)</option>
                    <option value="TE">Third Year (TE)</option>
                    <option value="BE">Fourth Year (BE)</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Division</label>
                  <select
                    value={classData.division}
                    onChange={(e) => setClassData({ ...classData, division: e.target.value })}
                  >
                    <option value="">-- Select Division --</option>
                    <option value="9">Div 9</option>
                    <option value="10">Div 10</option>
                    <option value="11">Div 11</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Google Group Link *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://groups.google.com/g/your-class-group"
                    value={classData.google_group_email}
                    onChange={(e) => setClassData({ ...classData, google_group_email: e.target.value })}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleAddClass}>Add Class</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "addSubject" && (
            <div className="card create-activity-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="form-brand">Create</div>
              <h2 className="form-title">Add Subject</h2>
              <p className="form-subtitle">Register a new curriculum subject into the system.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Data Structures"
                    value={subject.name}
                    onChange={(e) => setSubject({ ...subject, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label>Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS201"
                    value={subject.code}
                    onChange={(e) => setSubject({ ...subject, code: e.target.value })}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleAddSubject}>Add Subject</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assign" && (
            <div className="card create-activity-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="form-brand">Allocation</div>
              <h2 className="form-title">Assign Faculty</h2>
              <p className="form-subtitle">Map a faculty member to a specific subject and class division.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Select Faculty</label>
                  <select
                    value={assignData.facultyId}
                    onChange={(e) => setAssignData({ ...assignData, facultyId: e.target.value })}
                  >
                    <option value="">-- Select Faculty --</option>
                    {faculties.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Select Subject</label>
                  <select
                    value={assignData.subjectId}
                    onChange={(e) => setAssignData({ ...assignData, subjectId: e.target.value })}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Select Class</label>
                  <select
                    value={assignData.classId}
                    onChange={(e) => setAssignData({ ...assignData, classId: e.target.value })}
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.year} - Div {c.division}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleAssign}>Assign Faculty</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "uploadStudents" && (
            <div className="card create-activity-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="form-brand">Uploads</div>
              <h2 className="form-title">Upload Students</h2>
              <p className="form-subtitle">Bulk import students for a specific class using an Excel file.</p>

              <div className="create-form">
                <div className="form-row">
                  <label>Select Class</label>
                  <select
                    value={studentClassId}
                    onChange={(e) => setStudentClassId(e.target.value)}
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.year} - Div {c.division}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Excel File</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      id="studentUploadInput"
                      style={{ display: "none" }}
                      onChange={(e) => setStudentFile(e.target.files[0])}
                    />
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => document.getElementById("studentUploadInput").click()}
                        style={{ background: "#fbfdff" }}
                      >
                        <i className="fa fa-file-excel" style={{ marginRight: "8px" }}></i> Choose File
                      </button>
                      <span className="muted" style={{ fontSize: "14px", fontWeight: "600" }}>
                        {studentFile ? studentFile.name : "No file selected"}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="status-alert status-alert-warn" style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <i className="fa fa-info-circle"></i>
                  <span>Excel format should be: <b>rollNumber | name</b></span>
                </div>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleStudentUpload} disabled={!studentFile || !studentClassId}>
                    <i className="fa fa-upload" style={{ marginRight: "8px" }}></i> Upload Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "academicYear" && (
            <div className="card create-activity-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div className="form-brand">Setup</div>
              <h2 className="form-title">Academic Year</h2>
              <p className="form-subtitle">Configure the current academic year and semester dates.</p>

              {!activeAcademicYear && (
                <div className="status-alert status-alert-warn" style={{ marginBottom: "20px" }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: "8px" }}></i> No academic year has been set yet.
                </div>
              )}

              {activeAcademicYear && (
                <div className="status-chip-wrap" style={{ marginBottom: "20px" }}>
                  <span className="status-chip" style={{ background: "#eef5ff", color: "#114b8a", borderColor: "#c8def6" }}>
                    <i className="fa fa-calendar-check" style={{ marginRight: "6px" }}></i>
                    Current Academic Year: <strong>{activeAcademicYear}</strong>
                  </span>
                </div>
              )}

              <div className="create-form">
                <div className="form-row">
                  <label>Academic Year (e.g. 2024-25)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-25"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Semester Start Date</label>
                  <input
                    type="date"
                    value={semesterStartDate}
                    onChange={(e) => setSemesterStartDate(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Semester End Date</label>
                  <input
                    type="date"
                    value={semesterEndDate}
                    onChange={(e) => setSemesterEndDate(e.target.value)}
                  />
                </div>

                <p className="muted" style={{ fontSize: "14px", marginTop: "8px" }}>
                  This academic year and semester duration will be used strictly for scheduling logic across the system.
                </p>

                <div className="form-actions" style={{ marginTop: "24px" }}>
                  <button className="btn btn-primary" onClick={handleSetAcademicYear}>
                    <i className="fa fa-check" style={{ marginRight: "8px" }}></i> Set Academic Year
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && <AdminDashboardCharts />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
