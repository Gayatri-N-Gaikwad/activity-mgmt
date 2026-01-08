import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllTeachingAssignments,
  addClass,
  addSubject,
  assignFaculty,
} from "../services/teachingAssignmentApi";
import showToast from "../utils/toast";

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
        .catch(() =>
          showToast("error", "Failed to load teaching assignments")
        );
    }
  }, [activeTab]);

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
        <button onClick={() => setActiveTab("assign")}>Assign Faculty</button>
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
            onChange={(e) =>
              setSubject({ ...subject, name: e.target.value })
            }
          />
          <br />
          <br />
          <input
            type="text"
            placeholder="Subject Code"
            value={subject.code}
            onChange={(e) =>
              setSubject({ ...subject, code: e.target.value })
            }
          />
          <br />
          <br />
          <button onClick={handleAddSubject}>Add Subject</button>
        </>
      )}

      {activeTab === "assign" && (
        <>
          <h2>Assign Subject & Class to Faculty</h2>

          <input
            type="text"
            placeholder="Faculty ID"
            value={assignData.facultyId}
            onChange={(e) =>
              setAssignData({ ...assignData, facultyId: e.target.value })
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Subject ID"
            value={assignData.subjectId}
            onChange={(e) =>
              setAssignData({ ...assignData, subjectId: e.target.value })
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Class ID"
            value={assignData.classId}
            onChange={(e) =>
              setAssignData({ ...assignData, classId: e.target.value })
            }
          />
          <br />
          <br />

          <button onClick={handleAssign}>Assign</button>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
