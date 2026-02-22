/**********************
 * GLOBAL SVG REFERENCES
 **********************/
const bstSVG = document.getElementById("bstTree");
const avlSVG = document.getElementById("avlTree");
const rbSVG = document.getElementById("rbTree");

const stepInfo = document.getElementById("stepInfo");
let rbRecoloredNodes = new Set();


/**********************
 * GLOBAL STATE
 **********************/
let bstRoot = null;
let avlRoot = null;
let snapshots = [];
let step = -1;
let prevPositions = {};

/**********************
 * SVG DEFS (GRADIENT + ARROW)
 **********************/
function addSVGDefs(svg) {
  if (svg.querySelector("defs")) return;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <radialGradient id="nodeGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </radialGradient>

    <radialGradient id="rotatedGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f97316"/>
    </radialGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <marker id="arrowHead" markerWidth="10" markerHeight="10"
      refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#fb923c"/>
    </marker>

    <radialGradient id="blackGrad" cx="30%" cy="30%" r="70%">
  <stop offset="0%" stop-color="#1f2937"/>
  <stop offset="100%" stop-color="#000000"/>
</radialGradient>

  `;
  svg.appendChild(defs);
}

/**********************
 * TREE NODE
 **********************/
class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class RBNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.parent = null;
    this.color = "red"; // new nodes always red
  }
}
let rbRoot = null;


/**********************
 * BST INSERT
 **********************/
function insertBST(root, value) {
  if (!root) return new Node(value);
  if (value < root.value) root.left = insertBST(root.left, value);
  else root.right = insertBST(root.right, value);
  return root;
}

/**********************
 * AVL HELPERS
 **********************/
function height(n) { return n ? n.height : 0; }
function balance(n) { return n ? height(n.left) - height(n.right) : 0; }

/**********************
 * ROTATION TRACKING
 **********************/
let currentRotation = "";
let currentRotatedNodes = new Set();

/**********************
 * AVL ROTATIONS
 **********************/
function rotateRight(y) {
  const x = y.left;
  const T2 = x.right;

  currentRotatedNodes.add(y.value);
  currentRotatedNodes.add(x.value);

  x.right = y;
  y.left = T2;

  y.height = Math.max(height(y.left), height(y.right)) + 1;
  x.height = Math.max(height(x.left), height(x.right)) + 1;

  return x;
}

function rotateLeft(x) {
  const y = x.right;
  const T2 = y.left;

  currentRotatedNodes.add(x.value);
  currentRotatedNodes.add(y.value);

  y.left = x;
  x.right = T2;

  x.height = Math.max(height(x.left), height(x.right)) + 1;
  y.height = Math.max(height(y.left), height(y.right)) + 1;

  return y;
}


function rotateLeftRB(x) {
  const y = x.right;
  x.right = y.left;

  if (y.left) y.left.parent = x;

  y.parent = x.parent;

  if (!x.parent) rbRoot = y;
  else if (x === x.parent.left) x.parent.left = y;
  else x.parent.right = y;

  y.left = x;
  x.parent = y;
}

function rotateRightRB(x) {
  const y = x.left;
  x.left = y.right;

  if (y.right) y.right.parent = x;

  y.parent = x.parent;

  if (!x.parent) rbRoot = y;
  else if (x === x.parent.right) x.parent.right = y;
  else x.parent.left = y;

  y.right = x;
  x.parent = y;
}

/**********************
 * AVL INSERT
 **********************/
function insertAVL(node, value) {
  if (!node) return new Node(value);

  if (value < node.value) node.left = insertAVL(node.left, value);
  else node.right = insertAVL(node.right, value);

  node.height = 1 + Math.max(height(node.left), height(node.right));
  const b = balance(node);

  if (b > 1 && value < node.left.value) {
    currentRotation = "LL Rotation";
    return rotateRight(node);
  }

  if (b < -1 && value > node.right.value) {
    currentRotation = "RR Rotation";
    return rotateLeft(node);
  }

  if (b > 1 && value > node.left.value) {
    currentRotation = "LR Rotation";
    node.left = rotateLeft(node.left);
    return rotateRight(node);
  }

  if (b < -1 && value < node.right.value) {
    currentRotation = "RL Rotation";
    node.right = rotateRight(node.right);
    return rotateLeft(node);
  }

  return node;
}

function insertRB(value) {
  const newNode = new RBNode(value);

  let parent = null;
  let current = rbRoot;

  // Normal BST insert
  while (current) {
    parent = current;
    if (value < current.value) {
      current = current.left;
    } else {
      current = current.right;
    }
  }

  newNode.parent = parent;

  if (!parent) {
    rbRoot = newNode;
  } else if (value < parent.value) {
    parent.left = newNode;
  } else {
    parent.right = newNode;
  }

  // Fix Red-Black properties
  fixRBInsert(newNode);
}


function fixRBInsert(node) {
  while (node !== rbRoot && node.parent.color === "red") {

    const parent = node.parent;
    const grandparent = parent.parent;

    if (parent === grandparent.left) {
      const uncle = grandparent.right;

      // 🔴 CASE 1: Recoloring
      if (uncle && uncle.color === "red") {
        parent.color = "black";
        uncle.color = "black";
        grandparent.color = "red";

        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(uncle.value);
        rbRecoloredNodes.add(grandparent.value);

        node = grandparent;
      } 
      else {
        // 🔁 CASE 2 & 3: Rotations
        if (node === parent.right) {
          node = parent;
          rotateLeftRB(node);
        }

        parent.color = "black";
        grandparent.color = "red";

        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(grandparent.value);

        rotateRightRB(grandparent);
      }
    } 
    else {
      const uncle = grandparent.left;

      if (uncle && uncle.color === "red") {
        parent.color = "black";
        uncle.color = "black";
        grandparent.color = "red";

        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(uncle.value);
        rbRecoloredNodes.add(grandparent.value);

        node = grandparent;
      } 
      else {
        if (node === parent.left) {
          node = parent;
          rotateRightRB(node);
        }

        parent.color = "black";
        grandparent.color = "red";

        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(grandparent.value);

        rotateLeftRB(grandparent);
      }
    }
  }

  rbRoot.color = "black";
  rbRecoloredNodes.add(rbRoot.value);
}



/**********************
 * SNAPSHOT
 **********************/
function saveSnapshot(action) {
  snapshots.push({
    bst: structuredClone(bstRoot),
    avl: structuredClone(avlRoot),
    rb: structuredClone(rbRoot),
    action,
    rotation: currentRotation,
    rotatedNodes: [...currentRotatedNodes],
    rbRecolored: [...rbRecoloredNodes]   // 🔴 ADD THIS
  });

  currentRotation = "";
  currentRotatedNodes.clear();
  rbRecoloredNodes.clear();   // 🔴 RESET
  step = snapshots.length - 1;
}



/**********************
 * INSERT HANDLER
 **********************/
function insert() {
  const val = Number(document.getElementById("value").value);
  if (isNaN(val)) return;

  bstRoot = insertBST(bstRoot, val);
  avlRoot = insertAVL(avlRoot, val);
  insertRB(val); // 🔴 NEW

  saveSnapshot(`Inserted ${val}`);
  render();
}


function getBalanceValue(node) {
  if (!node) return 0;
  return height(node.left) - height(node.right);
}


/**********************
 * DRAW TREE
 **********************/
function drawTree(svg, node, x, y, gap, rotatedNodes, showBalance) {
  if (!node) return;

  if (node.left) {
    drawLine(svg, x, y, x - gap, y + 70);
    drawTree(svg, node.left, x - gap, y + 70, gap / 1.8, rotatedNodes, showBalance);
  }

  if (node.right) {
    drawLine(svg, x, y, x + gap, y + 70);
    drawTree(svg, node.right, x + gap, y + 70, gap / 1.8, rotatedNodes, showBalance);
  }

  drawNode(svg, x, y, node, rotatedNodes, showBalance);
}

function drawNode(svg, x, y, node, rotatedNodes, showBalance) {
  const value = node.value;
  const prev = prevPositions[value] || { x, y };

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");

  c.setAttribute("cx", prev.x);
  c.setAttribute("cy", prev.y);
  c.setAttribute("r", 18);

  t.setAttribute("x", prev.x);
  t.setAttribute("y", prev.y + 5);
  t.setAttribute("text-anchor", "middle");
  t.textContent = value;

  c.style.transition = "cx 1.5s ease, cy 1.5s ease";
  t.style.transition = "x 1.5s ease, y 1.5s ease";

  // Highlight rotated nodes
  if (rotatedNodes.includes(value)) {
    c.style.fill = "url(#rotatedGrad)";
    c.style.stroke = "#facc15";
    c.style.strokeWidth = "3";
    c.style.filter = "url(#glow)";
  } else {
    c.style.fill = "url(#nodeGrad)";
  }

  svg.appendChild(c);
  svg.appendChild(t);

  // 🔢 BALANCE FACTOR TEXT
  if (showBalance) {
    const bf = getBalanceValue(node);

    const bfText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    bfText.setAttribute("x", prev.x + 24);
    bfText.setAttribute("y", prev.y - 10);
    bfText.setAttribute("class", "balance-text");
    bfText.textContent = bf;

    bfText.style.transition = "x 1.5s ease, y 1.5s ease";

    svg.appendChild(bfText);

    requestAnimationFrame(() => {
      bfText.setAttribute("x", x + 24);
      bfText.setAttribute("y", y - 10);
    });
  }

  requestAnimationFrame(() => {
    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    t.setAttribute("x", x);
    t.setAttribute("y", y + 5);
  });

  prevPositions[value] = { x, y };
}


function drawLine(svg, x1, y1, x2, y2) {
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l.setAttribute("x1", x1);
  l.setAttribute("y1", y1);
  l.setAttribute("x2", x2);
  l.setAttribute("y2", y2);
  l.setAttribute("stroke", "#94a3b8");
  l.setAttribute("stroke-width", "2");
  svg.appendChild(l);
}


function drawTreeRB(svg, node, x, y, gap, recoloredNodes) {
  if (!node) return;

  if (node.left) {
    drawLine(svg, x, y, x - gap, y + 70);
    drawTreeRB(svg, node.left, x - gap, y + 70, gap / 1.8, recoloredNodes);
  }

  if (node.right) {
    drawLine(svg, x, y, x + gap, y + 70);
    drawTreeRB(svg, node.right, x + gap, y + 70, gap / 1.8, recoloredNodes);
  }

  drawRBNode(svg, x, y, node, recoloredNodes);
}

function drawRBNode(svg, x, y, node, recoloredNodes = []) {

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");

  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", 20);

  // 🔴 TRUE RED-BLACK COLORS
  if (node.color === "red") {
    c.setAttribute("fill", "#b91c1c");   // deep red
    c.setAttribute("stroke", "#7f1d1d");
  } else {
    c.setAttribute("fill", "#000000");   // pure black
    c.setAttribute("stroke", "#374151");
  }

  c.setAttribute("stroke-width", "3");

  // 🔥 Recolor glow animation
  if (recoloredNodes.includes(node.value)) {
    c.style.filter = "drop-shadow(0 0 12px gold)";
    c.style.transition = "all 0.6s ease";
  }

  // Text styling
  t.setAttribute("x", x);
  t.setAttribute("y", y + 5);
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("fill", "white");
  t.setAttribute("font-weight", "bold");
  t.setAttribute("font-size", "14px");
  t.textContent = node.value;

  svg.appendChild(c);
  svg.appendChild(t);
}

/**********************
 * ROTATION ARROW (FIXED)
 **********************/
function drawRotationArrow(type, nodes) {
  if (nodes.length < 2) return;

  const [a, b] = nodes;
  const p1 = prevPositions[a];
  const p2 = prevPositions[b];
  if (!p1 || !p2) return;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const midX = (p1.x + p2.x) / 2;
  const curve = type.includes("L") ? -80 : 80;

  path.setAttribute(
    "d",
    `M ${p1.x} ${p1.y}
     Q ${midX} ${Math.min(p1.y, p2.y) + curve}
     ${p2.x} ${p2.y}`
  );

  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#fb923c");
  path.setAttribute("stroke-width", "4");
  path.setAttribute("marker-end", "url(#arrowHead)");

  avlSVG.appendChild(path);

  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;

  path.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    { duration: 2200, easing: "ease-in-out" }
  );

  setTimeout(() => path.remove(), 2400);
}

/**********************
 * RENDER
 **********************/
function render() {
  bstSVG.innerHTML = "";
  avlSVG.innerHTML = "";
  rbSVG.innerHTML = "";

  addSVGDefs(bstSVG);
  addSVGDefs(avlSVG);
  addSVGDefs(rbSVG);

  const snap = snapshots[step];
  if (!snap) return;

  drawTree(bstSVG, snap.bst, 210, 40, 100, [], false);

  drawTree(avlSVG, snap.avl, 210, 40, 100, snap.rotatedNodes, true);

  drawTreeRB(rbSVG, snap.rb, 210, 40, 100, snap.rbRecolored);



  if (snap.rotation) {
    setTimeout(() => drawRotationArrow(snap.rotation, snap.rotatedNodes), 600);
  }

  stepInfo.innerText =
    `Step ${step + 1}/${snapshots.length} — ${snap.action}`;
}

/**********************
 * NAVIGATION
 **********************/
function nextStep() {
  if (step < snapshots.length - 1) {
    step++;
    render();
  }
}

function prevStep() {
  if (step > 0) {
    step--;
    render();
  }
}

/**********************
 * RESET
 **********************/
function resetTrees() {
  bstRoot = null;
  avlRoot = null;
  rbRoot = null;   // 🔴 ADD THIS

  snapshots = [];
  prevPositions = {};
  step = -1;

  bstSVG.innerHTML = "";
  avlSVG.innerHTML = "";
  rbSVG.innerHTML = "";  // 🔴 ADD THIS

  stepInfo.innerText = "Step 0";
}

 