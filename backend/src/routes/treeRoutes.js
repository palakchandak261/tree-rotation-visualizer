const express = require('express');
const AVLTree = require('../trees/AVL');

const router = express.Router();
let tree = new AVLTree();

router.post('/insert', (req, res) => {
  const { value } = req.body;
  tree.insert(value);
  res.json(tree.snapshots);
});

router.get('/reset', (req, res) => {
  tree = new AVLTree();
  res.json({ message: "Tree reset" });
});

module.exports = router;
