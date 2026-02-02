import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import showToast from "../utils/toast";

function HODDashboard() {
  const navigate = useNavigate();
  const [year, setYear] = useState(null);
  const [allocationData, setAllocationData] = useState([]); // Array of subjects with divisions as properties
  const [loading, setLoading] = useState(false);

  // Check if user is HOD
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "HOD") {
      showToast("error", "Access Denied: HOD only");
      navigate("/");
    }
  }, [navigate]);

  // Fetch allocation data when year is selected
  useEffect(() => {
    if (year) {
      fetchAllocationData(year);
    }
  }, [year]);

  const fetchAllocationData = async (year) => {
    try {
      setLoading(true);
      const assignmentsRes = await API.get(`/hod/assignments/${year}`);
      const allAssignments = assignmentsRes.data.data || [];

      // Group by subject with divisions as columns
      const subjectMap = new Map();

      allAssignments.forEach(assignment => {
        const subjectId = assignment.subjectId?._id;
        const subjectName = assignment.subjectId?.name || 'Unknown';
        const subjectCode = assignment.subjectId?.code || '';
        const division = assignment.division;
        const facultyName = assignment.facultyId?.name || 'Not Assigned';
        const facultyId = assignment.facultyId?._id;

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

        const subjectData = subjectMap.get(subjectId);
        
        // Match divisions: "09", "9", etc.
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
      console.error("Error fetching allocation data:", err);
      showToast("error", "Failed to load allocation data");
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyClick = (facultyName, subjectId, subjectName, facultyId, division, year) => {
    if (!facultyName || facultyName === '-') return;

    navigate(`/hod/activities?facultyId=${facultyId}&subjectId=${subjectId}&year=${year}&division=${division}&facultyName=${encodeURIComponent(facultyName)}&subjectName=${encodeURIComponent(subjectName)}`);
  };

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
      <h1>HOD Dashboard</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>View subject allocations and faculty assignments</p>

      {!year ? (
        <>
          <h2>Select Academic Year</h2>
          <div style={{ marginTop: "20px" }}>
            <button 
              onClick={() => setYear('SY')}
              style={{
                padding: "12px 24px",
                marginRight: "10px",
                marginBottom: "10px",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Second Year
            </button>
            <button 
              onClick={() => setYear('TE')}
              style={{
                padding: "12px 24px",
                marginRight: "10px",
                marginBottom: "10px",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Third Year
            </button>
            <button 
              onClick={() => setYear('BE')}
              style={{
                padding: "12px 24px",
                marginRight: "10px",
                marginBottom: "10px",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Fourth Year
            </button>
          </div>
        </>
      ) : (
        <>
          <button 
            onClick={() => setYear(null)}
            style={{
              padding: "8px 16px",
              marginBottom: "20px",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>

          <h2>Subject Allocations - {getYearLabel()}</h2>

          {loading ? (
            <p>Loading allocations...</p>
          ) : allocationData.length === 0 ? (
            <p style={{ color: "#999", fontStyle: "italic" }}>No subjects allocated for this year</p>
          ) : (
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
                {allocationData.map((item) => (
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
                        year
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
                        year
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
                        year
                      )}
                    >
                      {item.div11 || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default HODDashboard;
