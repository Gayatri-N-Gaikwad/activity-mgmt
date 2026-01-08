import TeachingAssignment from "../models/TeachingAssignment.js";
import Activity from "../models/Activity.js";
import Student from "../models/Student.js";
import RubricCriteria from "../models/RubricCriteria.js";
import StudentActivityMarks from "../models/StudentActivityMarks.js";

import Class from "../models/Class.js";

import Subject from "../models/Subject.js";

import User from "../models/User.js";



// Controller to get all teaching assignments
export const getAllTeachingAssignments = async (req, res) => {
  try {
    // Fetch all teaching assignments from the database
    const assignments = await TeachingAssignment.find()
      .populate("facultyId", "name email")   // optional: populate faculty info
      .populate("subjectId", "name code")   // optional: populate subject info
      .populate("classId", "name year");    // optional: populate class info

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching teaching assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to fetch teaching assignments."
    });
  }
};



// Controller to create a new class
export const createClass = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Class name is required"
      });
    }

    // Check if class already exists
    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res.status(409).json({
        success: false,
        message: "Class already exists"
      });
    }

    const newClass = await Class.create({ name });

    return res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: newClass
    });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Unable to create class."
    });
  }
};




// Controller to create a new subject
export const createSubject = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Subject name and code are required"
      });
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: "Subject with this code already exists"
      });
    }

    const newSubject = await Subject.create({ name, code });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: newSubject
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Unable to create subject."
    });
  }
};



// Assign subject and class to a faculty
export const assignSubjectAndClassToFaculty = async (req, res) => {
  try {
    const { facultyId, subjectId, classId } = req.body;

    // 1. Validate input
    if (!facultyId || !subjectId || !classId) {
      return res.status(400).json({
        success: false,
        message: "facultyId, subjectId, and classId are required",
      });
    }

    // 2. Check faculty exists and role
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    if (faculty.role !== "Faculty") {
      return res.status(403).json({
        success: false,
        message: "User is not a faculty member",
      });
    }

    // 3. Check subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // 4. Check class exists
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // 5. Prevent duplicate assignment
    const existingAssignment = await TeachingAssignment.findOne({
      facultyId,
      subjectId,
      classId,
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: "This subject is already assigned to this faculty for this class",
      });
    }

    // 6. Create assignment
    const assignment = await TeachingAssignment.create({
      facultyId,
      subjectId,
      classId,
    });

    return res.status(201).json({
      success: true,
      message: "Subject and class assigned to faculty successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error assigning subject & class:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Unable to assign subject and class.",
    });
  }
};
