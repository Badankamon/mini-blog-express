const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;

// Set view engine
app.set("view engine", "ejs");
app.set("layout", "layout");

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use express-ejs-layouts middleware
app.use(expressLayouts);

// Static files
app.use(express.static("public"));

// Middleware
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Routes
const postsRoutes = require("./routes/posts");
app.use("/", postsRoutes);

// 404 Error handling
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found | CleanLife Blog",
    description: "The page you're looking for doesn't exist.",
    layout: "layout"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌿 CleanLife Blog Server running on http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
});
