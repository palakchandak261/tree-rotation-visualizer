class BTreeNode {
    constructor(t, leaf = false) {
        this.t = t;
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
    }
}

class BTree {
    constructor(t = 2) {
        this.t = t;
        this.root = new BTreeNode(t, true);
    }

    insert(k) {
        const root = this.root;

        if (root.keys.length === 2 * this.t - 1) {
            const newRoot = new BTreeNode(this.t, false);
            newRoot.children.push(root);
            this.splitChild(newRoot, 0);
            this.root = newRoot;
            this.insertNonFull(newRoot, k);
        } else {
            this.insertNonFull(root, k);
        }
    }

    insertNonFull(node, k) {
        let i = node.keys.length - 1;

        if (node.leaf) {
            node.keys.push(0);
            while (i >= 0 && k < node.keys[i]) {
                node.keys[i + 1] = node.keys[i];
                i--;
            }
            node.keys[i + 1] = k;
        } else {
            while (i >= 0 && k < node.keys[i]) {
                i--;
            }
            i++;

            if (node.children[i].keys.length === 2 * this.t - 1) {
                this.splitChild(node, i);
                if (k > node.keys[i]) {
                    i++;
                }
            }
            this.insertNonFull(node.children[i], k);
        }
    }

    splitChild(parent, i) {
        const t = this.t;
        const fullNode = parent.children[i];
        const newNode = new BTreeNode(t, fullNode.leaf);

        parent.keys.splice(i, 0, fullNode.keys[t - 1]);
        parent.children.splice(i + 1, 0, newNode);

        newNode.keys = fullNode.keys.splice(t);
        fullNode.keys.splice(t - 1, 1);

        if (!fullNode.leaf) {
            newNode.children = fullNode.children.splice(t);
        }
    }

    getTree() {
        return this.root;
    }
}

module.exports = new BTree();