import TeachingAssignment from "../models/TeachingAssignment.js";
import Subject from "../models/Subject.js";

// GET all teaching assignments grouped by year for HOD view
export const getAllAssignmentsByYear = async (req, res) => {
  try {
    const { year } = req.params;

    // Validate year
    if (!['SY', 'TE', 'BE'].includes(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year. Must be SY, TE, or BE"
      });
    }

    // Fetch all assignments for the specified year
    const assignments = await TeachingAssignment.find({ year })
      .populate("facultyId", "name email")
      .populate("subjectId", "name code");

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No assignments found for this year"
      });
    }

    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching assignments by year:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to fetch assignments."
    });
  }
};

// GET assignments for a specific year and division
export const getAssignmentsByYearAndDivision = async (req, res) => {
  try {
    const { year, division } = req.params;

    // Validate year
    if (!['SY', 'TE', 'BE'].includes(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year. Must be SY, TE, or BE"
      });
    }

    // Fetch assignments for specified year and division
    const assignments = await TeachingAssignment.find({ year, division })
      .populate("facultyId", "name email")
      .populate("subjectId", "name code");

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No assignments found for this year and division"
      });
    }

    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to fetch assignments."
    });
  }
};

// GET all divisions for a specific year
export const getDivisionsByYear = async (req, res) => {
  try {
    const { year } = req.params;

    // Validate year
    if (!['SY', 'TE', 'BE'].includes(year)) {
      return res.status(400).json({
        success: false,
        message: "Invalid year. Must be SY, TE, or BE"
      });
    }

    // Get distinct divisions for the year
    const divisions = await TeachingAssignment.distinct("division", { year });

    return res.status(200).json({
      success: true,
      data: divisions || []
    });
  } catch (error) {
    console.error("Error fetching divisions:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to fetch divisions."
    });
  }
};
