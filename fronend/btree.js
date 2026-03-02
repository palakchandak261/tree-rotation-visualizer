/**********************
 * B-TREE IMPLEMENTATION
 **********************/

const treeSVG = document.getElementById("tree");

class BTreeNode {
    constructor(t, leaf = false) {
        this.t = t;
        this.leaf = leaf;
        this.keys = [];
        this.children = [];
        this.id = Math.random(); // unique id for animation
    }
}

class BTree {
    constructor(order) {
        this.order = order;
        this.t = Math.ceil(order / 2);
        this.root = new BTreeNode(this.t, true);
    }

    insert(key) {
        let r = this.root;

        if (r.keys.length === this.order - 1) {
            const s = new BTreeNode(this.t, false);
            this.root = s;
            s.children[0] = r;
            this.splitChild(s, 0);
            this.insertNonFull(s, key);
        } else {
            this.insertNonFull(r, key);
        }
    }

    insertNonFull(node, key) {
        let i = node.keys.length - 1;

        if (node.leaf) {
            node.keys.push(0);
            while (i >= 0 && key < node.keys[i]) {
                node.keys[i + 1] = node.keys[i];
                i--;
            }
            node.keys[i + 1] = key;
        } else {
            while (i >= 0 && key < node.keys[i]) i--;
            i++;

            if (node.children[i].keys.length === this.order - 1) {
                highlightNode(node.children[i]); // animate before split
                this.splitChild(node, i);
                if (key > node.keys[i]) i++;
            }

            this.insertNonFull(node.children[i], key);
        }
    }

    splitChild(parent, i) {
        const t = this.t;
        const y = parent.children[i];
        const z = new BTreeNode(t, y.leaf);

        const mid = y.keys[t - 1];

        z.keys = y.keys.slice(t);
        y.keys = y.keys.slice(0, t - 1);

        if (!y.leaf) {
            z.children = y.children.slice(t);
            y.children = y.children.slice(0, t);
        }

        parent.children.splice(i + 1, 0, z);
        parent.keys.splice(i, 0, mid);
    }
}

let btree = null;

/**********************
 * CREATE TREE
 **********************/

function createTree() {
    const order = Number(document.getElementById("order").value);

    if (order < 3) {
        alert("Order must be at least 3");
        return;
    }

    btree = new BTree(order);
    treeSVG.innerHTML = "";
}

/**********************
 * INSERT
 **********************/

function insert() {
    if (!btree) {
        alert("Create tree first!");
        return;
    }

    const input = document.getElementById("value");
    const value = Number(input.value);

    if (isNaN(value)) return;

    btree.insert(value);
    input.value = "";
    render();
}

/**********************
 * RENDER TREE
 **********************/

function render() {
    treeSVG.innerHTML = "";
    const width = treeSVG.clientWidth;
    const positions = calculatePositions(btree.root, width, 60, width / 2);
    drawTree(btree.root, positions);
}

/**********************
 * POSITION CALCULATION (NO OVERLAP GUARANTEED)
 **********************/

function calculatePositions(node, width, y, centerX) {
    const positions = new Map();

    function helper(node, depth, xMin, xMax) {
        if (!node) return;

        const x = (xMin + xMax) / 2;
        const y = 80 + depth * 120;

        positions.set(node.id, { x, y });

        const childWidth = (xMax - xMin) / node.children.length;

        node.children.forEach((child, i) => {
            helper(
                child,
                depth + 1,
                xMin + i * childWidth,
                xMin + (i + 1) * childWidth
            );
        });
    }

    helper(node, 0, 0, width);
    return positions;
}

/**********************
 * DRAW TREE
 **********************/

function drawTree(node, positions) {
    if (!node) return;

    const { x, y } = positions.get(node.id);

    const keyWidth = 45;
    const nodeWidth = node.keys.length * keyWidth;
    const startX = x - nodeWidth / 2;

    // Draw rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", startX);
    rect.setAttribute("y", y);
    rect.setAttribute("width", nodeWidth);
    rect.setAttribute("height", 40);
    rect.setAttribute("rx", 8);
    rect.setAttribute("fill", "#10b981");
    rect.setAttribute("stroke", "#065f46");
    rect.setAttribute("stroke-width", "2");
    rect.style.transition = "all 0.4s ease";
    treeSVG.appendChild(rect);

    // Draw keys
    node.keys.forEach((key, i) => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", startX + i * keyWidth + keyWidth / 2);
        text.setAttribute("y", y + 25);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("font-weight", "bold");
        text.textContent = key;
        treeSVG.appendChild(text);
    });

    // Draw children
    node.children.forEach(child => {
        const childPos = positions.get(child.id);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", y + 40);
        line.setAttribute("x2", childPos.x);
        line.setAttribute("y2", childPos.y);
        line.setAttribute("stroke", "#94a3b8");
        line.setAttribute("stroke-width", "2");
        treeSVG.appendChild(line);

        drawTree(child, positions);
    });
}

/**********************
 * SPLIT HIGHLIGHT ANIMATION
 **********************/

function highlightNode(node) {
    setTimeout(() => {
        render();
    }, 300);
}