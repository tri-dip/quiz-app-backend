import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import authService from "../auth/auth.service.js";

passport.use(new LocalStrategy(
   {
      usernameField: "scholar_id", 
      passwordField: "password",   
    },
  async (scholar_id, password, done) => {
    try {
      const user = await authService.findUser(scholar_id);
      if (!user) return done(null, false, { message: "User not found" });

      const isMatch = await authService.verifyPassword(user, password);
      if (!isMatch) return done(null, false, { message: "Wrong password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
