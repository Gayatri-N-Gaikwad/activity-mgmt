import React, { useEffect, useState } from "react";
import { getSubjectsByFacultyAndClass } from "../services/teachingAssignmentApi";

const FacultySubjects = ({ facultyId, classId }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user")); // get logged-in user

  useEffect(() => {
    if (user?.role !== "admin") return; // Only admin fetches data

    const fetchSubjects = async () => {
      try {
        const data = await getSubjectsByFacultyAndClass(facultyId, classId);
        setSubjects(data);
      } catch (err) {
        setError("Failed to load subjects");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [facultyId, classId, user?.role]);

  if (user?.role !== "admin") return <p>Access denied. Admins only.</p>;
  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <ul>
      {subjects.map((subject) => (
        <li key={subject._id}>
          {subject.name} ({subject.code})
        </li>
      ))}
    </ul>
  );
};

export default FacultySubjects;
9