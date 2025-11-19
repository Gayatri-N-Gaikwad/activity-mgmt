// utils/emailService.js
import nodemailer from "nodemailer";

export const sendEmailNotification = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        };

        await transporter.sendMail(mailOptions);
        console.log("Email Sent!");
    } catch (error) {
        console.error("Email Error:", error);
    }
};
