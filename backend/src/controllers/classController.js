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


/* ========== GOOGLE GROUP EMAIL MANAGEMENT ========== */

/* Update Google Group email for a class */
export const updateClassGoogleGroupEmail = async (req, res) => {
  try {
    const { classId } = req.params;
    const { google_group_email } = req.body;

    // Validate email format
    if (!google_group_email) {
      return res.status(400).json({ error: "Google Group email is required" });
    }

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(googlegroups\.com|gmail\.com)$/i;
    if (!emailRegex.test(google_group_email)) {
      return res.status(400).json({ 
        error: "Invalid email format. Must be a valid Google Group (e.g., classname@googlegroups.com)" 
      });
    }

    // Update the class
    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { google_group_email: google_group_email.toLowerCase().trim() },
      { new: true, runValidators: true }
    ).select('year division google_group_email');

    if (!updatedClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json({
      message: "Google Group email updated successfully",
      class: updatedClass
    });
  } catch (error) {
    console.error("Error updating class Google Group email:", error);
    res.status(500).json({ error: "Server error updating class" });
  }
};

/* Get Google Group email for a class */
export const getClassGoogleGroupEmail = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await Class.findById(classId)
      .select('year division google_group_email');

    if (!classDoc) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json({
      class: classDoc
    });
  } catch (error) {
    console.error("Error fetching class Google Group email:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* Get all classes with their Google Group emails (for admin) */
export const getAllClassesWithGoogleGroups = async (req, res) => {
  try {
    const classes = await Class.find()
      .select('year division google_group_email')
      .sort({ year: 1, division: 1 });

    res.json({
      message: "Classes with Google Group emails retrieved successfully",
      classes
    });
  } catch (error) {
    console.error("Error fetching classes with Google Groups:", error);
    res.status(500).json({ error: "Server error" });
  }
};
