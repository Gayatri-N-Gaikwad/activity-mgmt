import Class from "../models/Class.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

/* get all classes */
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .sort({ year: 1, division: 1 }); 

    res.json({ classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load classes" });
  }
};

/* get classes assigned to a faculty */
export const getClassesByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const assignments = await TeachingAssignment.find({ facultyId })
      .select("year division");

    const uniqueKeys = new Set();
    const classes = [];

    for (const a of assignments) {
      const key = `${a.year}-${a.division}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        const classDoc = await Class.findOne({ year: a.year, division: a.division })
          .select("_id year division");
        if (classDoc) {
          classes.push(classDoc);
        }
      }
    }

    res.json({ classes });
  } catch (error) {
    console.error("Error fetching faculty classes:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* get class by year and division */
export const getClassByYearDivision = async (req, res) => {
  try {
    const { year, division } = req.params;
    const classDoc = await Class.findOne({ year, division }).select("_id year division");
    if (!classDoc) {
      return res.status(404).json({ error: "Class not found" });
    }
    res.json({ class: classDoc });
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({ message: "Server error" });
  }
};
