import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import showToast from "../utils/toast";

function HODAllocationList() {
  const { year } = useParams();
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [allocationData, setAllocationData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if user is HOD
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const effectiveRoles = user
      ? Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles
        : user.role
          ? [user.role]
          : []
      : [];
    if (!user || !effectiveRoles.includes("HOD")) {
      showToast("error", "Access Denied: HOD only");
      navigate("/");
    }
  }, [navigate]);

  // Fetch divisions for the selected year
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/hod/divisions/${year}`);
        setDivisions(res.data.data || []);
      } catch (err) {
        console.error("Error fetching divisions:", err);
        showToast("error", "Failed to load divisions");
      } finally {
        setLoading(false);
      }
    };

    if (year) {
      fetchDivisions();
    }
  }, [year]);

  // Fetch allocation data when division is selected
  useEffect(() => {
    const fetchAllocationData = async () => {
      if (!selectedDivision) return;

      try {
        setLoading(true);
        const res = await API.get(`/hod/assignments/${year}/${selectedDivision}`);
        const assignments = res.data.data || [];

        // Group by subject
        const subjectMap = new Map();

        assignments.forEach(assignment => {
          const subjectId = assignment.subjectId?._id;
          const subjectName = assignment.subjectId?.name || 'Unknown';
          const subjectCode = assignment.subjectId?.code || '';
          const facultyName = assignment.facultyId?.name || 'Not Assigned';

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              subjectId: subjectId,
              subjectName: subjectName,
              subjectCode: subjectCode,
              faculty: facultyName
            });
          }
        });

        setAllocationData(Array.from(subjectMap.values()));
      } catch (err) {
        console.error("Error fetching allocation data:", err);
        showToast("error", "Failed to load allocation data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllocationData();
  }, [selectedDivision, year]);

  const getYearLabel = () => {
    switch(year) {
      case 'SY': return 'Second Year';
      case 'TE': return 'Third Year';
      case 'BE': return 'Fourth Year';
      default: return year;
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <button 
        onClick={() => navigate('/hod')}
        style={{
          padding: "8px 16px",
          marginBottom: "20px",
          cursor: "pointer"
        }}
      >
        ← Back to Dashboard
      </button>

      <h2>Subject Allocations - {getYearLabel()}</h2>

      {!selectedDivision ? (
        <div style={{ marginTop: "20px" }}>
          <h3>Select Division</h3>
          {divisions.length === 0 ? (
            <p>No divisions found for this year.</p>
          ) : (
            <div>
              {divisions.map((division) => (
                <button
                  key={division}
                  onClick={() => setSelectedDivision(division)}
                  style={{
                    padding: "10px 20px",
                    marginRight: "10px",
                    marginBottom: "10px",
                    fontSize: "16px",
                    cursor: "pointer",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px"
                  }}
                >
                  Division {division}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => setSelectedDivision(null)}
            style={{
              padding: "8px 16px",
              marginBottom: "20px",
              cursor: "pointer",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            ← Back to Divisions
          </button>

          <h3>Division {selectedDivision}</h3>

          {loading ? (
            <p>Loading subjects...</p>
          ) : allocationData.length === 0 ? (
            <p>No subjects allocated for this division.</p>
          ) : (
            <table border="1" cellPadding="8" style={{ marginTop: "20px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Faculty Assigned</th>
                </tr>
              </thead>
              <tbody>
                {allocationData.map((item) => (
                  <tr key={item.subjectId}>
                    <td>
                      <strong>{item.subjectName}</strong>
                      <br />
                      <small style={{ color: "gray" }}>{item.subjectCode}</small>
                    </td>
                    <td>{item.faculty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default HODAllocationList;
