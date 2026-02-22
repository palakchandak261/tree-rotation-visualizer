
const express = require("express");
const cors = require("cors");
const path = require("path");
const treeRoutes = require("./routes/treeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../../frontend")));
app.use("/api/tree", treeRoutes);

module.exports = app;
