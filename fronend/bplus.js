let root = null;
let M = 0; // internal degree (max children)
let L = 0; // leaf capacity (max keys)

class Node {
    constructor(isLeaf = false) {
        this.keys = [];
        this.children = [];
        this.isLeaf = isLeaf;
        this.next = null;
        this.parent = null;
        this.x = 0;
        this.y = 0;
    }
}

function createTree() {
    M = parseInt(document.getElementById("internalDegree").value);
    L = parseInt(document.getElementById("leafDegree").value);

    if (!M || !L || M < 3 || L < 2) {
        alert("Internal degree (m) must be >=3 and Leaf degree (L) >=2");
        return;
    }

    root = new Node(true);
    drawTree();
}

function insert() {
    if (!root) return alert("Create tree first");

    const value = parseInt(document.getElementById("value").value);
    if (isNaN(value)) return;

    const leaf = findLeaf(root, value);
    insertIntoLeaf(leaf, value);

    drawTree();
}

function findLeaf(node, value) {
    if (node.isLeaf) return node;

    let i = 0;
    while (i < node.keys.length && value >= node.keys[i]) i++;
    return findLeaf(node.children[i], value);
}

function insertIntoLeaf(leaf, value) {
    leaf.keys.push(value);
    leaf.keys.sort((a, b) => a - b);

    if (leaf.keys.length > L) {
        splitLeaf(leaf);
    }
}

function splitLeaf(leaf) {
    const newLeaf = new Node(true);
    const mid = Math.ceil(L / 2);

    newLeaf.keys = leaf.keys.splice(mid);
    newLeaf.next = leaf.next;
    leaf.next = newLeaf;

    newLeaf.parent = leaf.parent;

    const promoteKey = newLeaf.keys[0];

    if (!leaf.parent) {
        const newRoot = new Node(false);
        newRoot.keys = [promoteKey];
        newRoot.children = [leaf, newLeaf];

        leaf.parent = newRoot;
        newLeaf.parent = newRoot;
        root = newRoot;
    } else {
        insertIntoInternal(leaf.parent, promoteKey, newLeaf);
    }
}

function insertIntoInternal(node, key, newChild) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;

    node.keys.splice(i, 0, key);
    node.children.splice(i + 1, 0, newChild);
    newChild.parent = node;

    if (node.children.length > M) {
        splitInternal(node);
    }
}

function splitInternal(node) {
    const newInternal = new Node(false);
    const midIndex = Math.floor(M / 2);
    const promoteKey = node.keys[midIndex];

    newInternal.keys = node.keys.splice(midIndex + 1);
    node.keys.splice(midIndex);

    newInternal.children = node.children.splice(midIndex + 1);
    newInternal.children.forEach(child => child.parent = newInternal);

    newInternal.parent = node.parent;

    if (!node.parent) {
        const newRoot = new Node(false);
        newRoot.keys = [promoteKey];
        newRoot.children = [node, newInternal];

        node.parent = newRoot;
        newInternal.parent = newRoot;
        root = newRoot;
    } else {
        insertIntoInternal(node.parent, promoteKey, newInternal);
    }
}

function drawTree() {
    const svg = document.getElementById("tree");
    svg.innerHTML = "";
    if (!root) return;

    const levels = [];
    collectLevels(root, 0, levels);

    const levelHeight = 120;

    levels.forEach((level, depth) => {
        let totalWidth = 0;
        level.forEach(node => {
            totalWidth += getNodeWidth(node) + 40;
        });

        let startX = (svg.clientWidth - totalWidth) / 2;

        level.forEach(node => {
            node.x = startX;
            node.y = depth * levelHeight + 50;
            drawNode(svg, node);
            startX += getNodeWidth(node) + 40;
        });
    });

    drawConnections(svg, root);
    drawLeafLinks(svg);
}

function getNodeWidth(node) {
    return node.keys.length * 40 + 20;
}

function drawNode(svg, node) {
    const width = getNodeWidth(node);
    const height = 40;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", node.x);
    rect.setAttribute("y", node.y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("fill", node.isLeaf ? "#10b981" : "#3b82f6");
    rect.setAttribute("rx", 6);
    svg.appendChild(rect);

    node.keys.forEach((key, i) => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x + 20 + i * 40);
        text.setAttribute("y", node.y + 25);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.textContent = key;
        svg.appendChild(text);

        if (i !== 0) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", node.x + i * 40);
            line.setAttribute("y1", node.y);
            line.setAttribute("x2", node.x + i * 40);
            line.setAttribute("y2", node.y + 40);
            line.setAttribute("stroke", "white");
            svg.appendChild(line);
        }
    });
}

function drawConnections(svg, node) {
    if (node.isLeaf) return;

    node.children.forEach(child => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", node.x + getNodeWidth(node) / 2);
        line.setAttribute("y1", node.y + 40);
        line.setAttribute("x2", child.x + getNodeWidth(child) / 2);
        line.setAttribute("y2", child.y);
        line.setAttribute("stroke", "white");
        svg.appendChild(line);

        drawConnections(svg, child);
    });
}

function drawLeafLinks(svg) {
    let node = root;
    while (!node.isLeaf) node = node.children[0];

    while (node && node.next) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", node.x + getNodeWidth(node));
        line.setAttribute("y1", node.y + 20);
        line.setAttribute("x2", node.next.x);
        line.setAttribute("y2", node.next.y + 20);
        line.setAttribute("stroke", "yellow");
        line.setAttribute("stroke-dasharray", "5,5");
        svg.appendChild(line);

        node = node.next;
    }
}

function collectLevels(node, depth, levels) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    if (!node.isLeaf)
        node.children.forEach(child => collectLevels(child, depth + 1, levels));
}