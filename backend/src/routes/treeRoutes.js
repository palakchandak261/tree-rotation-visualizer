const express = require('express');
const router = express.Router();

const AVL = require('../trees/AVL');
const BST = require('../trees/BST');
const RB = require('../trees/RedBlack');
const BTree = require('../trees/BTree');
const Splay = require('../trees/Splay');

// ✅ CREATE OBJECTS (NOT CLASSES)
const trees = {
    avl: new AVL(),
    bst: new BST(),
    rb: new RB(),
    btree: new BTree(2),   // degree 2
    splay: new Splay()
};

router.post('/:type/insert', (req, res) => {
    const { type } = req.params;
    const { value } = req.body;

    const tree = trees[type];

    if (!tree) {
        return res.status(400).json({ error: 'Invalid tree type' });
    }

    tree.insert(Number(value));

    res.json(tree.getTree());
});

module.exports = router;