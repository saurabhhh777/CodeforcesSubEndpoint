import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const app = express();
dotenv.config();
import calendarRoute from "./routes/userCal.route.js";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hey Devs, Codeforces subendpoint is Working !",
    examples:{
        text:"Hit the url 👇 change the username name with your codeforces username or someone else !",
        url:"",
    },
    success: true,
  });
});

app.use("/", calendarRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
