import passport from "../passport/passport.js";
import authService from "./auth.service.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_CODE = process.env.ADMIN_CODE;
export default {
    async login(req, res, next) {
        passport.authenticate("local", async (err, user, info) => {
            try {
                if (err || !user) {
                    return res.status(400).json({
                        message: info ? info.message : "Login failed",
                        user: user
                    });
                }
                const token = jwt.sign({ id: user.id, username: user.username, sch_id: user.sch_id, isAdmin: user.isadmin }, JWT_SECRET, { expiresIn: "7d" });
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                return res.json({ user });
            } catch (error) {
                return next(error);
            }
        })(req, res, next);
    },
    async register(req, res, next) {
        const { username, scholar_id, password, adminCode } = req.body;
        try {
            const existingUser = await authService.findUser(scholar_id);
            if (existingUser) {
                throw new Error("Scholar ID already exists");
            }
            let isadmin = false;
            if (adminCode && adminCode === ADMIN_CODE) {
                isadmin = true;
            }
            const user = await authService.createUser(username, scholar_id, password, isadmin);
            const token = jwt.sign({ id: user.id, username: user.username, sch_id: user.sch_id, isAdmin: user.isadmin }, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.json({ user });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    async logout(req, res) {
        try {
            res.clearCookie("token");
            req.logout(() => res.json({ message: "Logged out" }));
        } catch (err) {
            console.error("Logout error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
};