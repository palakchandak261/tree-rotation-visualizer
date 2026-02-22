class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
    this.snapshots = [];
  }

  height(node) {
    return node ? node.height : 0;
  }

  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;

    this.saveSnapshot("Right Rotation");
    return x;
  }

  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1;
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1;

    this.saveSnapshot("Left Rotation");
    return y;
  }

  getBalance(node) {
    return node ? this.height(node.left) - this.height(node.right) : 0;
  }

  insertNode(node, value) {
    if (!node) {
      this.saveSnapshot(`Inserted ${value}`);
      return new Node(value);
    }

    if (value < node.value)
      node.left = this.insertNode(node.left, value);
    else
      node.right = this.insertNode(node.right, value);

    node.height = 1 + Math.max(this.height(node.left), this.height(node.right));

    const balance = this.getBalance(node);

    if (balance > 1 && value < node.left.value)
      return this.rotateRight(node);

    if (balance < -1 && value > node.right.value)
      return this.rotateLeft(node);

    if (balance > 1 && value > node.left.value) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    if (balance < -1 && value < node.right.value) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  insert(value) {
    this.root = this.insertNode(this.root, value);
  }

  saveSnapshot(action) {
    this.snapshots.push({
      action,
      tree: JSON.parse(JSON.stringify(this.root))
    });
  }
}

module.exports = AVLTree;
