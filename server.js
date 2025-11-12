// secure-backend/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

import { pool } from "./config/db.js";
import { simpleWAF } from "./middleware/waf.js";
import { checkPasswordExpiry } from "./middleware/passwordPolicy.js";
import { verifyToken } from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import logRoutes from "./routes/logRoutes.js";

// Load biến môi trường
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Đảm bảo có thư mục logs ---
const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

/* ======================================================
   🧱 FIX CORS CHO RENDER + HOSTINGER (QUAN TRỌNG)
====================================================== */
const allowedOrigins = [
    "https://dta2k4.shop",
    "https://www.dta2k4.shop",
    "http://localhost:3000",
];

// ✅ Xử lý thủ công preflight (OPTIONS)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Requested-With,Accept"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204); // ✅ Trả về nhanh cho preflight
    }
    next();
});

// ✅ Dự phòng thêm middleware CORS của Express
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

/* ======================================================
   🛡️ MIDDLEWARE BẢO MẬT
====================================================== */
app.use(helmet()); // chống clickjacking, sniffing, XSS
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 })); // giới hạn 100 request/phút/IP
app.use(simpleWAF); // tường lửa ứng dụng đơn giản

/* ======================================================
   🧠 KIỂM TRA DATABASE
====================================================== */
pool
    .query("SELECT 1")
    .then(() => console.log("✅ MySQL connected"))
    .catch((e) => console.error("MySQL connection error:", e));

/* ======================================================
   🚏 ROUTES
====================================================== */
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", logRoutes);

// Kiểm tra hết hạn mật khẩu (chạy sau verifyToken)
app.use("/api", verifyToken, checkPasswordExpiry);

/* ======================================================
   💚 HEALTH CHECK
====================================================== */
app.get("/health", (req, res) =>
    res.json({ status: "ok", time: new Date().toISOString() })
);

/* ======================================================
   👑 ĐẢM BẢO ADMIN MẶC ĐỊNH TỒN TẠI
====================================================== */
async function ensureAdmin() {
    try {
        const [rows] = await pool.query(
            "SELECT id FROM users WHERE role='admin' LIMIT 1"
        );
        if (rows.length === 0) {
            const strongPassword =
                process.env.DEFAULT_ADMIN_PASSWORD || "Admin@Secure123!";
            const hash = await bcrypt.hash(strongPassword, 12);
            const now = new Date();

            await pool.query(
                "INSERT INTO users (username, password_hash, role, is_locked, created_at, password_changed_at) VALUES (?, ?, 'admin', 0, NOW(), ?)",
                ["admin", hash, now]
            );
            console.log("✅ Default admin created (username: admin)");
            console.log("⚠️  Please change the default admin password immediately!");
        }
    } catch (err) {
        console.error("Ensure admin error:", err);
    }
}
ensureAdmin();

/* ======================================================
   🚀 KHỞI ĐỘNG SERVER
====================================================== */
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
});
