import bcrypt from "bcrypt";
import pool from "../../db.js";

export default { 

    async findUser(scholar_id){
        try{
            const result = await pool.query("SELECT * FROM users WHERE sch_id = $1",[scholar_id] );
            if(result.rows.length!==0){
                return result.rows[0];
            }
            return null;
        }
        catch(err){
            console.log(err);
        }
        
    },

    async verifyPassword(user, password) {
        try {
            if (!user) return false;
            return await bcrypt.compare(password, user.password);
        } 
        catch (err) {
            console.error("Error verifying password:", err);
            throw new Error("Password verification error");
        }
    },

    async createUser(username,scholar_id, password) {
    try {
      const existingUser = await this.findUser(scholar_id);
      if (existingUser) {
        throw new Error("Username already exists");
      }

      const hashed = await bcrypt.hash(password, 10);
      const res = await pool.query(
        "INSERT INTO users (username,sch_id, password) VALUES ($1, $2, $3) RETURNING *",
        [username, scholar_id, hashed]
      );
      return res.rows[0];
    } catch (err) {
      console.error("Error in createUser:", err);
      throw err;
    }
  },
  async findById(id) {
        try {
            const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
            if (result.rows.length !== 0) {
                return result.rows[0];
            }
            return null;
        } catch (err) {
            console.log(err);
        }
    },
}