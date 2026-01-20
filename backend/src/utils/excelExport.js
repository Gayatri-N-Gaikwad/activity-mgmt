import ExcelJS from 'exceljs';

/**
 * Create Excel workbook with marks data
 */
export const createMarksExcel = async (options) => {
  const { students, activities, subject, className } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Marks');

  const headers = ['Roll Number', 'Student Name'];

  activities.forEach((activity) => {
    headers.push(activity.name);                  // Marks
    headers.push(`${activity.name} Attendance`); // Attendance
  });

  worksheet.addRow(headers);

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  students.forEach((student) => {
    const row = [student.rollNumber, student.name];

    activities.forEach((activity) => {
      const activityMarks = student.activities.find(
        (a) =>
          a.activityId === activity._id ||
          a.activityId.toString() === activity._id.toString()
      );

      const marks = activityMarks?.totalRubricMarks || 0;
      const attendance = activityMarks?.attendance || 'Absent'; 
      row.push(marks);
      row.push(attendance);
    });

    worksheet.addRow(row);
  });

  worksheet.columns = [
    { width: 12 },
    { width: 25 },
    ...activities.flatMap(() => [
      { width: 15 }, // Marks
      { width: 15 }  // Attendance
    ])
  ];


  return await workbook.xlsx.writeBuffer();
};

/**
 * Create combined marks Excel with separate sheets for each activity
 */
export const createCombinedMarksExcel = async (options) => {
  const {
    students,
    activities,
    subject,
    className,
    subjectMaxMarks = 15 
  } = options;

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Summary');

  const summaryHeaders = ['Roll Number', 'Student Name'];

  activities.forEach((activity) => {
    summaryHeaders.push(activity.name);
  });

  summaryHeaders.push('Total');
  summaryHeaders.push('Normalized out of 15');

  summarySheet.addRow(summaryHeaders);

  // Header styling
  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  students.forEach((student) => {
    const row = [student.rollNumber, student.name];

    let totalMarks = 0;
    let totalMaxMarks = 0; 

    activities.forEach((activity) => {
      const activityMarks = student.activities.find(
        (a) => a.activityId.toString() === activity._id.toString()
      );

      const marks = activityMarks?.totalRubricMarks || 0;
      row.push(marks);

      totalMarks += marks;
      totalMaxMarks += activity.maxMarks || 0; 
    });

    row.push(totalMarks);

    const normalized =
      totalMaxMarks > 0
        ? Math.round((totalMarks / totalMaxMarks) * subjectMaxMarks)
        : 0;

    row.push(normalized);

    summarySheet.addRow(row);
  });

  summarySheet.columns = [
    { width: 12 },
    { width: 25 },
    ...activities.map(() => ({ width: 15 })),
    { width: 12 },
    { width: 15 }
  ];

  // Create individual sheets for each activity
  activities.forEach((activity) => {
    const activitySheet = workbook.addWorksheet(
      activity.name.substring(0, 31)
    );

    const headers = ['Roll Number', 'Student Name', 'Attendance'];

    if (activity.rubric && activity.rubric.length > 0) {
      activity.rubric.forEach((criteria) => {
        headers.push(`${criteria.name} (/${criteria.maxMarks})`);
      });
    }

    activitySheet.addRow(headers);

    const headerRow = activitySheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    students.forEach((student) => {
      const activityMarks = student.activities.find(
        (a) => a.activityId.toString() === activity._id.toString()
      );

      const row = [
        student.rollNumber,
        student.name,
        activityMarks?.attendance || 'Absent'
      ];

      if (activity.rubric && activity.rubric.length > 0) {
        activity.rubric.forEach((criteria) => {
          const rubricMark = activityMarks?.rubricMarks?.find(
            (r) => r.criteriaId.toString() === criteria._id.toString()
          );
          row.push(rubricMark?.marks || 0);
        });
      }

      activitySheet.addRow(row);
    });

    activitySheet.columns = [
      { width: 12 },
      { width: 25 },
      { width: 12 },
      ...((activity.rubric || []).map(() => ({ width: 18 })))
    ];
  });

  return await workbook.xlsx.writeBuffer();
};
