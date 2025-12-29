const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const posts = require("../data/posts.json");
const userPostsPath = path.join(__dirname, "../data/user-posts.json");

// Helper function to read user posts
function getUserPosts() {
  try {
    const data = fs.readFileSync(userPostsPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper function to save user posts
function saveUserPosts(userPosts) {
  fs.writeFileSync(userPostsPath, JSON.stringify(userPosts, null, 2));
}

// Helper to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Get all tags from posts
function getAllTags() {
  const userPosts = getUserPosts();
  const allPosts = [...posts, ...userPosts];
  const tagsSet = new Set();
  allPosts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
}

// Get blog statistics
function getBlogStats() {
  const userPosts = getUserPosts();
  const allPosts = [...posts, ...userPosts];
  const uniqueAuthors = new Set([...posts.map(() => 'CleanLife'), ...userPosts.map(p => p.author)]);
  
  return {
    totalPosts: allPosts.length,
    officialPosts: posts.length,
    communityPosts: userPosts.length,
    uniqueAuthors: uniqueAuthors.size,
    totalTags: getAllTags().length
  };
}

// Homepage - List all posts with optional filtering
router.get("/", (req, res) => {
  const userPosts = getUserPosts();
  let allPosts = [...posts, ...userPosts].sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  // Filter by tag if provided
  const selectedTag = req.query.tag;
  if (selectedTag) {
    allPosts = allPosts.filter(post => 
      post.tags && post.tags.includes(selectedTag)
    );
  }

  // Search functionality
  const searchQuery = req.query.search?.toLowerCase() || '';
  if (searchQuery) {
    allPosts = allPosts.filter(post =>
      post.title.toLowerCase().includes(searchQuery) ||
      post.summary.toLowerCase().includes(searchQuery) ||
      (post.author && post.author.toLowerCase().includes(searchQuery))
    );
  }

  const stats = getBlogStats();
  const allTags = getAllTags();

  res.render("index", {
    title: "CleanLife Blog | Expert Articles on Air & Water Quality",
    description: "Read expert articles about clean air, water filtration, and healthy living solutions.",
    posts: allPosts,
    stats,
    allTags,
    selectedTag,
    searchQuery
  });
});

// Show create post form
router.get("/create-post", (req, res) => {
  res.render("create-post", {
    title: "Create a New Post | CleanLife Blog",
    description: "Share your knowledge about air quality and water filtration with our community."
  });
});

// Handle post creation
router.post("/create-post", (req, res) => {
  const { title, author, content, tags } = req.body;

  // Validation
  if (!title || !author || !content) {
    return res.status(400).render("create-post", {
      title: "Create a New Post | CleanLife Blog",
      description: "Share your knowledge about air quality and water filtration with our community.",
      error: "All fields are required!"
    });
  }

  if (title.length < 5 || title.length > 200) {
    return res.status(400).render("create-post", {
      title: "Create a New Post | CleanLife Blog",
      description: "Share your knowledge about air quality and water filtration with our community.",
      error: "Title must be between 5 and 200 characters."
    });
  }

  if (content.length < 20) {
    return res.status(400).render("create-post", {
      title: "Create a New Post | CleanLife Blog",
      description: "Share your knowledge about air quality and water filtration with our community.",
      error: "Content must be at least 20 characters long."
    });
  }

  // Create new post
  const userPosts = getUserPosts();
  const postTags = tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
  
  const newPost = {
    title: title.trim(),
    slug: generateSlug(title),
    author: author.trim(),
    summary: content.substring(0, 150) + "...",
    content: content.trim(),
    date: new Date().toISOString(),
    tags: postTags,
    isUserPost: true
  };

  userPosts.unshift(newPost);
  saveUserPosts(userPosts);

  res.redirect(`/post/${newPost.slug}`);
});

// Individual post page
router.get("/post/:slug", (req, res) => {
  let post = posts.find(p => p.slug === req.params.slug);
  
  if (!post) {
    const userPosts = getUserPosts();
    post = userPosts.find(p => p.slug === req.params.slug);
  }

  if (!post) {
    return res.status(404).render("404", {
      title: "Post Not Found | CleanLife Blog",
      description: "The article you're looking for doesn't exist.",
      requestedSlug: req.params.slug
    });
  }

  // Get related posts
  const userPosts = getUserPosts();
  const allPosts = [...posts, ...userPosts];
  const relatedPosts = allPosts
    .filter(p => p.slug !== post.slug && post.tags && p.tags && 
      post.tags.some(tag => p.tags.includes(tag)))
    .slice(0, 3);

  res.render("post", {
    title: `${post.title} | CleanLife Blog`,
    description: post.summary,
    post,
    relatedPosts
  });
});

// View all user posts
router.get("/user-posts", (req, res) => {
  const userPosts = getUserPosts();
  
  res.render("user-posts", {
    title: "Community Posts | CleanLife Blog",
    description: "Read posts shared by our community members.",
    posts: userPosts
  });
});

// Filter by tag
router.get("/tag/:tag", (req, res) => {
  const tag = req.params.tag;
  const userPosts = getUserPosts();
  const allPosts = [...posts, ...userPosts]
    .filter(post => post.tags && post.tags.includes(tag))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const stats = getBlogStats();
  const allTags = getAllTags();

  res.render("index", {
    title: `Posts Tagged with "${tag}" | CleanLife Blog`,
    description: `All articles tagged with ${tag}`,
    posts: allPosts,
    stats,
    allTags,
    selectedTag: tag,
    searchQuery: ''
  });
});

// About page
router.get("/about", (req, res) => {
  const stats = getBlogStats();
  
  res.render("about", {
    title: "About CleanLife Blog | Community for Healthy Living",
    description: "Learn about our mission to promote clean air and water quality.",
    stats
  });
});

module.exports = router;
