import ExcelJS from 'exceljs';

const toRollNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Single-activity download (Activity List → download button).
 * Columns: Roll No | Name | Attendance | [sub1 /max] ... | Total Marks
 */
export const createMarksExcel = async (options) => {
  const { students, activities } = options;
  const activity = activities[0]; // single activity
  const sortedStudents = [...(students || [])].sort(
    (a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber)
  );

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Marks');

  const rubric = activity.rubric || [];

  // ---- HEADER ----
  const headers = ['Roll Number', 'Student Name', 'Attendance'];
  rubric.forEach((r) => headers.push(`${r.name} (/${r.maxMarks})`));
  headers.push('Total Marks');

  worksheet.addRow(headers);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  // ---- DATA ROWS ----
  sortedStudents.forEach((student) => {
    const activityMarks = student.activities.find(
      (a) => String(a.activityId) === String(activity._id)
    );

    const attendance = activityMarks?.attendance || 'Absent';
    const total = activityMarks?.totalRubricMarks ?? 0;

    const rubricCols = rubric.map((criteria) => {
      const rm = activityMarks?.rubricMarks?.find(
        (r) => String(r.criteriaId) === String(criteria._id)
      );
      return rm?.marks ?? 0;
    });

    worksheet.addRow([student.rollNumber, student.name, attendance, ...rubricCols, total]);
  });

  // ---- COLUMN WIDTHS ----
  worksheet.columns = [
    { width: 14 },
    { width: 26 },
    { width: 12 },
    ...rubric.map(() => ({ width: 18 })),
    { width: 14 },
  ];

  return await workbook.xlsx.writeBuffer();
};


/**
 * Multi-activity download (Dashboard "Download Report").
 * Summary sheet: Roll No | Name | [activityN total] ... | Grand Total | Normalised /15
 * Per-activity sheets: Roll No | Name | Attendance | [sub1 /max] ... | Total
 */
export const createCombinedMarksExcel = async (options) => {
  const { students, activities, subjectMaxMarks = 15 } = options;
  const sortedStudents = [...(students || [])].sort(
    (a, b) => toRollNumber(a.rollNumber) - toRollNumber(b.rollNumber)
  );

  const workbook = new ExcelJS.Workbook();

  // ============================================================
  // SUMMARY SHEET
  // ============================================================
  const summarySheet = workbook.addWorksheet('Summary');

  const summaryHeaders = ['Roll Number', 'Student Name'];
  activities.forEach((a) => summaryHeaders.push(a.name));
  summaryHeaders.push('Total');
  summaryHeaders.push('Normalised /15');

  summarySheet.addRow(summaryHeaders);

  const sHeader = summarySheet.getRow(1);
  sHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sHeader.alignment = { horizontal: 'center', vertical: 'center' };

  sortedStudents.forEach((student) => {
    const row = [student.rollNumber, student.name];
    let totalMarks = 0;
    let totalMaxMarks = 0;

    activities.forEach((activity) => {
      const am = student.activities.find(
        (a) => String(a.activityId) === String(activity._id)
      );
      const marks = am?.totalRubricMarks ?? 0;
      row.push(marks);
      totalMarks += marks;
      totalMaxMarks += activity.maxMarks || 0;
    });

    row.push(totalMarks);
    const normalised =
      totalMaxMarks > 0
        ? Math.round((totalMarks / totalMaxMarks) * subjectMaxMarks)
        : 0;
    row.push(normalised);

    summarySheet.addRow(row);
  });

  summarySheet.columns = [
    { width: 14 },
    { width: 26 },
    ...activities.map(() => ({ width: 15 })),
    { width: 12 },
    { width: 16 },
  ];

  // ============================================================
  // PER-ACTIVITY SHEETS
  // ============================================================
  activities.forEach((activity) => {
    const sheet = workbook.addWorksheet(activity.name.substring(0, 31));
    const rubric = activity.rubric || [];

    const headers = ['Roll Number', 'Student Name', 'Attendance'];
    rubric.forEach((r) => headers.push(`${r.name} (/${r.maxMarks})`));
    headers.push('Total Marks');

    sheet.addRow(headers);

    const hRow = sheet.getRow(1);
    hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    hRow.alignment = { horizontal: 'center', vertical: 'center' };

    sortedStudents.forEach((student) => {
      const am = student.activities.find(
        (a) => String(a.activityId) === String(activity._id)
      );

      const attendance = am?.attendance || 'Absent';
      const total = am?.totalRubricMarks ?? 0;

      const rubricCols = rubric.map((criteria) => {
        const rm = am?.rubricMarks?.find(
          (r) => String(r.criteriaId) === String(criteria._id)
        );
        return rm?.marks ?? 0;
      });

      sheet.addRow([student.rollNumber, student.name, attendance, ...rubricCols, total]);
    });

    sheet.columns = [
      { width: 14 },
      { width: 26 },
      { width: 12 },
      ...rubric.map(() => ({ width: 18 })),
      { width: 14 },
    ];
  });

  return await workbook.xlsx.writeBuffer();
};
