// api/scholar-metrics.js

const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  try {
    // Vercel's current working directory is the project root
    const metricsPath = path.join(process.cwd(), "data", "scholar_metrics.json");

    const fileContents = fs.readFileSync(metricsPath, "utf-8");
    const metrics = JSON.parse(fileContents);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).json(metrics);
  } catch (error) {
    console.error("Error reading scholar_metrics.json:", error);
    res
      .status(500)
      .json({ error: "Failed to load metrics" });
  }
};