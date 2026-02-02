import express from 'express';
import {
  getAllAssignmentsByYear,
  getAssignmentsByYearAndDivision,
  getDivisionsByYear
} from '../controllers/hodController.js';
import { isAdmin } from '../middlewares/isAdmin.js';

const router = express.Router();

// HOD routes (view-only)
// Get all divisions for a specific year
router.get('/divisions/:year', getDivisionsByYear);

// Get assignments for a specific year and division
router.get('/assignments/:year/:division', getAssignmentsByYearAndDivision);

// Get all assignments for a year
router.get('/assignments/:year', getAllAssignmentsByYear);

export default router;
