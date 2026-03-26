const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// TEST API
app.post("/attempt", (req, res) => {
  const { kc, correct } = req.body;

  res.json({
    message: "Attempt received",
    kc,
    correct,
    mastery: Math.random() // dummy for now
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});