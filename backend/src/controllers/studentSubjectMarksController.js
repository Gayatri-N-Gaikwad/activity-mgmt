import StudentSubjectMarks from "../models/StudentSubjectMarks.js";

/* ------------------------- UPDATE ATTENDANCE ------------------------- */
export const updateAttendance = async (req, res) => {
  try {
    const { studentId, subjectId, attendanceMarks } = req.body;

    const doc = await StudentSubjectMarks.findOne({ studentId, subjectId });
    if (!doc) return res.status(404).json({ error: "Record not found" });

    doc.attendanceMarks = attendanceMarks;
    await doc.save();

    res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update attendance" });
  }
};
