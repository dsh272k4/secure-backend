// secure-backend/services/emailService.js
import { createTransporter, getLoginAlertTemplate } from '../config/emailConfig.js';
import dotenv from 'dotenv';
dotenv.config();

export class EmailService {
    constructor() {
        // Nếu DISABLE_EMAIL bật, không khởi tạo transporter
        if (process.env.DISABLE_EMAIL === "true") {
            console.log("📭 Email service disabled for Render testing");
            this.disabled = true;
            return;
        }

        this.transporter = createTransporter();
        this.disabled = false;
    }

    async verifyConnection() {
        if (this.disabled) {
            console.log("📭 Email verification skipped (email disabled)");
            return false;
        }

        try {
            await this.transporter.verify();
            console.log("✅ Email server connection verified");
            return true;
        } catch (error) {
            console.error("❌ Email server connection failed:", error);
            return false;
        }
    }

    async sendLoginAlert(userEmail, username, loginData) {
        if (this.disabled) {
            console.log("📭 Email send skipped (email disabled)");
            return { success: false, message: "Email disabled" };
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log("⚠️ Email configuration missing - skipping email send");
            return { success: false, error: "Email configuration missing" };
        }

        try {
            const { ip, browser, loginTime } = loginData;
            const mailOptions = {
                from: `"Hệ thống Bảo mật" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `🔐 Thông báo đăng nhập - ${username}`,
                html: getLoginAlertTemplate(username, loginTime, ip, browser),
            };

            console.log(`📧 Attempting to send login alert to: ${userEmail}`);
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Login alert email sent to ${userEmail}:`, result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error("❌ Error sending login alert email:", error);
            return { success: false, error: error.message };
        }
    }
}

export const emailService = new EmailService();

// Kiểm tra kết nối email khi khởi động
emailService.verifyConnection().then(success => {
    if (success) console.log("🚀 Email service ready");
    else console.log("⚠️ Email service not available - emails will be skipped");
});
