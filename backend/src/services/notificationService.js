import nodemailer from "nodemailer";

// Lazy transporter initialization - will be created on first use
let transporter = null;

/**
 * Get or create the transporter
 */
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send email notification to Google Group
 * @param {Array|String} googleGroupEmail - Recipient Google Group email or array of emails
 * @param {String} subject - Email subject
 * @param {String} htmlContent - HTML email content
 * @param {String} textContent - Plain text email content (fallback)
 * @returns {Promise} Email sending result
 */
export const sendNotificationEmail = async (
  googleGroupEmail,
  subject,
  htmlContent,
  textContent
) => {
  try {
    if (!googleGroupEmail) {
      console.warn("No Google Group email provided for notification");
      return { success: false, message: "No recipient email" };
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: googleGroupEmail,
      subject: subject,
      html: htmlContent,
      text: textContent || "",
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending email to Google Group:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const generateActivityNotificationTemplate = (
  activityData,
  className,
  subjectName,
  facultyName
) => {
  const { name, description, scheduleDate } = activityData;
  const formattedDate = new Date(scheduleDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #007bff; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Activity Created</h2>
          </div>
          <div class="content">
            <p>Dear Students of <strong>${className}</strong>,</p>
            
            <p>A new activity has been created for your class. Please see the details below:</p>
            
            <div class="field">
              <span class="label">Activity Title:</span> ${name}
            </div>
            
            <div class="field">
              <span class="label">Subject:</span> ${subjectName}
            </div>
            
            <div class="field">
              <span class="label">Faculty:</span> ${facultyName}
            </div>
            
            <div class="field">
              <span class="label">Description:</span>
              <p style="margin: 10px 0; padding: 10px; background-color: #fff; border-left: 4px solid #007bff;">
                ${description}
              </p>
            </div>
            
            <div class="field">
              <span class="label">Scheduled Date & Time:</span> ${formattedDate}
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Activity Management System.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Dear Students of ${className},

A new activity has been created for your class. Please see the details below:

Activity Title: ${name}
Subject: ${subjectName}
Faculty: ${facultyName}
Description: ${description}
Scheduled Date & Time: ${formattedDate}

This is an automated notification from the Activity Management System.
  `;

  return { html: htmlContent, text: textContent };
};


/**
 * Generate activity update notification email template
 */
export const generateActivityUpdateTemplate = (
  activityData,
  className,
  subjectName,
  facultyName
) => {
  const { name, description, scheduleDate } = activityData;
  const formattedDate = new Date(scheduleDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #FF9800; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #FF9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Activity Updated</h2>
          </div>
          <div class="content">
            <div class="warning">
              <strong>Notice:</strong> An activity has been updated with new details.
            </div>
            
            <p>Dear Students of <strong>${className}</strong>,</p>
            
            <p>The following activity has been updated:</p>
            
            <div class="field">
              <span class="label">Activity Title:</span> ${name}
            </div>
            
            <div class="field">
              <span class="label">Subject:</span> ${subjectName}
            </div>
            
            <div class="field">
              <span class="label">Faculty:</span> ${facultyName}
            </div>
            
            <div class="field">
              <span class="label">Description:</span>
              <p style="margin: 10px 0; padding: 10px; background-color: #fff; border-left: 4px solid #FF9800;">
                ${description}
              </p>
            </div>
            
            <div class="field">
              <span class="label">Updated Schedule:</span> ${formattedDate}
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Activity Management System.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Dear Students of ${className},

An activity has been updated with new details:

Activity Title: ${name}
Subject: ${subjectName}
Faculty: ${facultyName}
Description: ${description}
Updated Schedule: ${formattedDate}

This is an automated notification from the Activity Management System.
  `;

  return { html: htmlContent, text: textContent };
};

/**
 * Generate activity delete notification email template
 */
export const generateActivityDeleteTemplate = (
  activityName,
  className,
  subjectName,
  facultyName
) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #f44336; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
          .alert { background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Activity Deleted</h2>
          </div>
          <div class="content">
            <div class="alert">
              <strong>Important:</strong> An activity has been deleted from the system.
            </div>
            
            <p>Dear Students of <strong>${className}</strong>,</p>
            
            <p>Please note that the following activity has been removed:</p>
            
            <div class="field">
              <span class="label">Activity Title:</span> ${activityName}
            </div>
            
            <div class="field">
              <span class="label">Subject:</span> ${subjectName}
            </div>
            
            <div class="field">
              <span class="label">Faculty:</span> ${facultyName}
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Activity Management System.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Dear Students of ${className},

Please note that the following activity has been deleted from the system:

Activity Title: ${activityName}
Subject: ${subjectName}
Faculty: ${facultyName}

This is an automated notification from the Activity Management System.
  `;

  return { html: htmlContent, text: textContent };
};

export default { sendNotificationEmail, generateActivityNotificationTemplate };
