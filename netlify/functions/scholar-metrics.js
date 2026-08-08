// netlify/functions/scholar-metrics.js

const fs = require("fs");
const path = require("path");

exports.handler = async function (event, context) {
  try {
    // In Netlify Functions, process.cwd() points to the project root at runtime
    const metricsPath = path.join(process.cwd(), "data", "scholar_metrics.json");

    const fileContents = fs.readFileSync(metricsPath, "utf-8");
    const metrics = JSON.parse(fileContents);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify(metrics),
    };
  } catch (error) {
    console.error("Error reading scholar_metrics.json:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to load metrics" }),
    };
  }
};