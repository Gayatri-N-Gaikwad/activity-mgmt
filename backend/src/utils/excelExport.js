import ExcelJS from 'exceljs';

/**
 * Create Excel workbook with marks data
 * @param {Object} options - Configuration object
 * @param {Array} options.students - Student list with marks
 * @param {Array} options.activities - Activities to include (array of activityId strings)
 * @param {String} options.subject - Subject name
 * @param {String} options.class - Class name
 * @returns {Promise<Buffer>} - Excel file buffer
 */
export const createMarksExcel = async (options) => {
  const { students, activities, subject, className } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Marks');

  // Add header
  const headers = ['Roll Number', 'Student Name'];
  const activityInfo = {};

  // Calculate total marks per activity
  activities.forEach((activity) => {
    headers.push(activity.name);
    activityInfo[activity._id] = {
      name: activity.name,
      maxMarks: activity.maxMarks || 0,
      rubric: activity.rubric || []
    };
  });

  headers.push('Total');

  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  // Add student data
  students.forEach((student) => {
    const row = [student.rollNumber, student.name];
    let totalMarks = 0;

    activities.forEach((activity) => {
      const activityMarks = student.activities.find(
        (a) => a.activityId === activity._id || a.activityId.toString() === activity._id.toString()
      );
      const marks = activityMarks?.totalRubricMarks || 0;
      row.push(marks);
      totalMarks += marks;
    });

    row.push(totalMarks);
    worksheet.addRow(row);
  });

  // Style data rows and set column widths
  worksheet.columns = [
    { width: 12 },
    { width: 25 },
    ...activities.map(() => ({ width: 15 })),
    { width: 12 }
  ];

  // Add totals row
  const totalRow = worksheet.addRow([
    '',
    'Total',
    ...activities.map(() => ''),
    ''
  ]);

  // Add formulas for totals
  activities.forEach((activity, idx) => {
    const col = String.fromCharCode(67 + idx); // C, D, E, etc.
    totalRow.getCell(3 + idx).value = {
      formula: `SUM(${col}2:${col}${students.length + 1})`
    };
  });

  // Total of totals
  const lastCol = String.fromCharCode(67 + activities.length);
  totalRow.getCell(3 + activities.length).value = {
    formula: `SUM(${lastCol}2:${lastCol}${students.length + 1})`
  };

  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Create combined marks Excel with separate sheets for each activity
 */
export const createCombinedMarksExcel = async (options) => {
  const { students, activities, subject, className } = options;

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary (all activities combined)
  const summarySheet = workbook.addWorksheet('Summary');
  const summaryHeaders = ['Roll Number', 'Student Name'];
  
  activities.forEach((activity) => {
    summaryHeaders.push(activity.name);
  });
  summaryHeaders.push('Total');

  summarySheet.addRow(summaryHeaders);
  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  summaryHeaderRow.alignment = { horizontal: 'center', vertical: 'center' };

  let maxRows = 1;
  students.forEach((student) => {
    const row = [student.rollNumber, student.name];
    let totalMarks = 0;

    activities.forEach((activity) => {
      const activityMarks = student.activities.find(
        (a) => a.activityId === activity._id || a.activityId.toString() === activity._id.toString()
      );
      const marks = activityMarks?.totalRubricMarks || 0;
      row.push(marks);
      totalMarks += marks;
    });

    row.push(totalMarks);
    summarySheet.addRow(row);
    maxRows++;
  });

  // Add totals row to summary
  const totalRow = summarySheet.addRow([
    '',
    'Total',
    ...activities.map(() => ''),
    ''
  ]);

  activities.forEach((activity, idx) => {
    const col = String.fromCharCode(67 + idx);
    totalRow.getCell(3 + idx).value = {
      formula: `SUM(${col}2:${col}${maxRows})`
    };
  });

  const lastCol = String.fromCharCode(67 + activities.length);
  totalRow.getCell(3 + activities.length).value = {
    formula: `SUM(${lastCol}2:${lastCol}${maxRows})`
  };

  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };

  summarySheet.columns = [
    { width: 12 },
    { width: 25 },
    ...activities.map(() => ({ width: 15 })),
    { width: 12 }
  ];

  // Create individual sheets for each activity
  activities.forEach((activity) => {
    const activitySheet = workbook.addWorksheet(activity.name.substring(0, 31)); // Excel limit 31 chars
    const headers = ['Roll Number', 'Student Name', 'Attendance'];

    // Add rubric criteria headers
    if (activity.rubric && activity.rubric.length > 0) {
      activity.rubric.forEach((criteria) => {
        headers.push(`${criteria.name} (/${criteria.maxMarks})`);
      });
    }

    activitySheet.addRow(headers);

    const headerRow = activitySheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    let rowCount = 1;
    students.forEach((student) => {
      const activityMarks = student.activities.find(
        (a) => a.activityId === activity._id || a.activityId.toString() === activity._id.toString()
      );

      const row = [
        student.rollNumber,
        student.name,
        activityMarks?.attendance || 'Present'
      ];

      if (activity.rubric && activity.rubric.length > 0) {
        activity.rubric.forEach((criteria) => {
          const rubricMark = activityMarks?.rubricMarks?.find(
            (r) => r.criteriaId === criteria._id || r.criteriaId.toString() === criteria._id.toString()
          );
          row.push(rubricMark?.marks || 0);
        });
      }

      activitySheet.addRow(row);
      rowCount++;
    });

    // Set column widths
    activitySheet.columns = [
      { width: 12 },
      { width: 25 },
      { width: 12 },
      ...((activity.rubric || []).map(() => ({ width: 18 })))
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
