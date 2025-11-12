// secure-backend/config/emailConfig.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Tạo transporter SMTP dùng Hostinger Mail
 */
export const createTransporter = () => {
    const host = process.env.EMAIL_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!user || !pass) {
        console.warn('⚠️ Thiếu thông tin đăng nhập email (EMAIL_USER hoặc EMAIL_PASSWORD)');
        return null;
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true nếu dùng SSL (465), false nếu STARTTLS (587)
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false, // tránh lỗi chứng chỉ tự ký
        },
    });

    console.log(`✅ Email transporter initialized for ${host}:${port}`);
    return transporter;
};

/**
 * Template email cảnh báo đăng nhập (HTML đẹp, có icon)
 */
export const getLoginAlertTemplate = (username, loginTime, ip, browser) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; font-size: 20px; }
            .content { padding: 20px; }
            .alert { background: #fee2e2; color: #b91c1c; padding: 10px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; }
            .info-box { background: #f1f5f9; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6; margin: 10px 0; }
            .footer { text-align: center; padding: 15px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">🔐 Thông báo đăng nhập hệ thống DTA2K4</div>
            <div class="content">
                <div class="alert">⚠️ CẢNH BÁO BẢO MẬT</div>
                <p>Xin chào <strong>${username}</strong>,</p>
                <p>Hệ thống vừa ghi nhận một lượt đăng nhập mới vào tài khoản của bạn:</p>

                <div class="info-box">
                    🕐 <b>Thời gian:</b> ${loginTime}<br>
                    🌍 <b>Địa chỉ IP:</b> ${ip}<br>
                    🖥️ <b>Trình duyệt:</b> ${browser}
                </div>

                <p>Nếu đây là bạn, bạn có thể bỏ qua email này.</p>
                <p>Nếu <b>không phải</b> bạn, vui lòng đổi mật khẩu ngay lập tức và liên hệ quản trị viên.</p>
            </div>
            <div class="footer">
                Email này được gửi tự động từ hệ thống bảo mật <b>DTA2K4</b>.<br/>
                Vui lòng không trả lời email này.
            </div>
        </div>
    </body>
    </html>
    `;
};
