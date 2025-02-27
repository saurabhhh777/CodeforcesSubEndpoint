import express from "express";

const router = express.Router();
import { calendarAllData } from "../controllers/userCal.controller.js";


router.route("/calendar/:username").get(calendarAllData);


export default router;  