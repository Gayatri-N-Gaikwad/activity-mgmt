import Class from "../models/Class.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

// Get all classes
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ name: 1 }); // sort alphabetically
    res.json({ classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load classes" });
  }
};

// Get classes by faculty
export const getClassesByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Get all teaching assignments for this faculty
    const assignments = await TeachingAssignment.find({ facultyId }).populate("classId");

    // Extract unique classes
    const classes = assignments
      .map(a => a.classId)
      .filter((cls, index, arr) => cls && arr.findIndex(c => c._id.toString() === cls._id.toString()) === index);

    res.json({ classes });
  } catch (error) {
    console.error("Error fetching faculty classes:", error);
    res.status(500).json({ message: "Server error" });
  }
};
