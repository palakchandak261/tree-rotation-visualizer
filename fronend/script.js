/**********************
 * GLOBAL SVG REFERENCES
 **********************/
const bstSVG = document.getElementById("bstTree");
const avlSVG = document.getElementById("avlTree");
const rbSVG = document.getElementById("rbTree");

const stepInfo = document.getElementById("stepInfo");
let rbRecoloredNodes = new Set();
/**********************
 * STATISTICS TRACKING
 **********************/

let avlRotationCount = 0;
let rbRotationCount = 0;
let rbRecolorCount = 0;
let statsChart = null;
let bstRotationCount = 0;



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
    this.color = "red"; 
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
let currentRBRotation = "";

/**********************
 * AVL ROTATIONS
 **********************/
function rotateRight(y) {
  avlRotationCount++;
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
  avlRotationCount++;
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
  rbRotationCount++;
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
  rbRotationCount++;
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
  while (node !== rbRoot && node.parent && node.parent.color === "red") {

    const parent = node.parent;
    const grandparent = parent.parent;
    if (!grandparent) break;

    if (parent === grandparent.left) {
      const uncle = grandparent.right;

      if (uncle && uncle.color === "red") {
        parent.color = "black";
        uncle.color = "black";
        grandparent.color = "red";

        rbRecolorCount += 3;
        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(uncle.value);
        rbRecoloredNodes.add(grandparent.value);

        node = grandparent;
      } else {

        if (node === parent.right) {
          currentRBRotation = "LR Rotation (RB)";
          node = parent;
          rotateLeftRB(node);
        } else {
          currentRBRotation = "LL Rotation (RB)";
        }

        parent.color = "black";
        grandparent.color = "red";

        rbRecolorCount += 2;
        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(grandparent.value);

        rotateRightRB(grandparent);
      }

    } else {
      const uncle = grandparent.left;

      if (uncle && uncle.color === "red") {
        parent.color = "black";
        uncle.color = "black";
        grandparent.color = "red";

        rbRecolorCount += 3;
        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(uncle.value);
        rbRecoloredNodes.add(grandparent.value);

        node = grandparent;
      } else {

        if (node === parent.left) {
          currentRBRotation = "RL Rotation (RB)";
          node = parent;
          rotateRightRB(node);
        } else {
          currentRBRotation = "RR Rotation (RB)";
        }

        parent.color = "black";
        grandparent.color = "red";

        rbRecolorCount += 2;
        rbRecoloredNodes.add(parent.value);
        rbRecoloredNodes.add(grandparent.value);

        rotateLeftRB(grandparent);
      }
    }
  }

  if (rbRoot) rbRoot.color = "black";
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
    rbRotation: currentRBRotation,
    rotatedNodes: [...currentRotatedNodes],
    rbRecolored: [...rbRecoloredNodes]
  });
  step = snapshots.length - 1;

  currentRotation = "";
  currentRBRotation = "";
  currentRotatedNodes.clear();
  rbRecoloredNodes.clear();
}
/**********************
 * INSERT HANDLER
 **********************/
function insert() {
  const input = document.getElementById("value");
  const val = Number(input.value);

  if (isNaN(val)) return;

  bstRoot = insertBST(bstRoot, val);
  avlRoot = insertAVL(avlRoot, val);
  insertRB(val);

  saveSnapshot(`Inserted ${val}`);
  render();


  input.value = "";   
  updateStats();
}


function getBalanceValue(node) {
  if (!node) return 0;
  return height(node.left) - height(node.right);
}

function drawBTree(svg, node, x, y, levelGap = 70, siblingGap = 50) {
  if (!node) return;

  // draw this node
  drawBTreeNode(svg, x, y, node.keys);

  // draw children
  const childCount = node.children.length;

  for (let i = 0; i < childCount; i++) {
    const child = node.children[i];
    const childX = x + (i - (childCount - 1) / 2) * siblingGap * (childCount);
    const childY = y + levelGap;

    // draw line from this node to child
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y + 15);
    line.setAttribute("x2", childX);
    line.setAttribute("y2", childY - 15);
    svg.appendChild(line);

    drawBTree(svg, child, childX, childY, levelGap, siblingGap * 0.6);
  }
}
function drawBTreeNode(svg, x, y, keys) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  let offset = -(keys.length - 1) * 20;

  keys.forEach((key) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x + offset);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 18);
    circle.setAttribute("fill", "#10b981"); // green for B-Tree
    circle.setAttribute("stroke", "#047857");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + offset);
    text.setAttribute("y", y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "white");
    text.textContent = key;
    svg.appendChild(text);

    offset += 40;
  });
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
  c.setAttribute("r", 22);

  if (node.color === "red") {
    c.setAttribute("fill", "#dc2626");      // strong red
    c.setAttribute("stroke", "#7f1d1d");
  }

  else {
    c.setAttribute("fill", "#000000");      // PURE BLACK
    c.setAttribute("stroke", "#374151");
  }

  c.setAttribute("stroke-width", "3");

  if (recoloredNodes.includes(node.value)) {
    c.style.filter = "drop-shadow(0 0 15px gold)";
  }

  // Text
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

// function showRotationBanner(text) {
//   const banner = document.createElement("div");
//   banner.innerText = text;

//   banner.style.position = "fixed";
//   banner.style.top = "20px";
//   banner.style.left = "50%";
//   banner.style.transform = "translateX(-50%)";
//   banner.style.background = "#f97316";
//   banner.style.color = "white";
//   banner.style.padding = "10px 20px";
//   banner.style.borderRadius = "8px";
//   banner.style.fontWeight = "bold";
//   banner.style.boxShadow = "0 5px 20px rgba(0,0,0,0.4)";
//   banner.style.zIndex = "1000";
//   banner.style.opacity = "0";
//   banner.style.transition = "opacity 0.4s ease";

//   document.body.appendChild(banner);

//   setTimeout(() => banner.style.opacity = "1", 50);
//   setTimeout(() => {
//     banner.style.opacity = "0";
//     setTimeout(() => banner.remove(), 400);
//   }, 2000);
// }

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

  document.getElementById("avlRotationInfo").innerText =
  snap.rotation ? snap.rotation : "";

document.getElementById("rbRotationInfo").innerText =
  snap.rbRotation ? snap.rbRotation : "";

  // Draw Level Guides FIRST (behind nodes)
drawLevelGuides(bstSVG, snap.bst);
drawLevelGuides(avlSVG, snap.avl);
drawLevelGuides(rbSVG, snap.rb);

// Then draw trees
drawTree(bstSVG, snap.bst, 210, 40, 100, [], false);
drawTree(avlSVG, snap.avl, 210, 40, 100, snap.rotatedNodes, true);
drawTreeRB(rbSVG, snap.rb, 210, 40, 100, snap.rbRecolored);


if (snap.rotation) {
  setTimeout(() => {
    drawRotationArrow(snap.rotation, snap.rotatedNodes);
  }, 600);
}
  stepInfo.innerText =
    `Step ${step + 1}/${snapshots.length} — ${snap.action}`;
    function showHeight(svg, root) {
  const h = getHeight(root);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", 300);
  text.setAttribute("y", 20);
  text.setAttribute("fill", "#38bdf8");
  text.setAttribute("font-size", "14px");
  text.textContent = "Height: " + h;

  svg.appendChild(text);
}

showHeight(bstSVG, snap.bst);
showHeight(avlSVG, snap.avl);
showHeight(rbSVG, snap.rb);
}


function getHeight(node) {
  if (!node) return 0;

  const leftH = node.left ? getHeight(node.left) : 0;
  const rightH = node.right ? getHeight(node.right) : 0;

  return 1 + Math.max(leftH, rightH);
}

function getNodeCount(node) {
    if (!node) return 0;
    return 1 + getNodeCount(node.left) + getNodeCount(node.right);
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
  rbRoot = null;

  snapshots = [];
  prevPositions = {};
  step = -1;

  avlRotationCount = 0;
  rbRotationCount = 0;
  rbRecolorCount = 0;

  bstSVG.innerHTML = "";
  avlSVG.innerHTML = "";
  rbSVG.innerHTML = "";

  stepInfo.innerText = "Step 0";

  updateStats(); 

  document.getElementById("avlRotationInfo").innerText =
  snap.rotation ? snap.rotation : "";

document.getElementById("rbRotationInfo").innerText =
  snap.rbRotation ? snap.rbRotation : "";
}
function showInfo(type) {
  const panel = document.getElementById("infoPanel");

  if (type === "bst") {
    panel.innerHTML = `
      <h3>Binary Search Tree (BST)</h3>
      <p><b>Description:</b> A binary tree where left child < parent < right child.</p>
      <p><b>Time Complexity:</b></p>
      <ul>
        <li>Search: O(h)</li>
        <li>Insert: O(h)</li>
        <li>Delete: O(h)</li>
      </ul>
      <p><b>Worst Case:</b> O(n) (Skewed Tree)</p>
      <p><b>Best Case:</b> O(log n)</p>
      <p><b>Balancing:</b> ❌ Not Self-Balancing</p>
    `;
  }

  if (type === "avl") {
    panel.innerHTML = `
      <h3>AVL Tree</h3>
      <p><b>Description:</b> Self-balancing BST using balance factor.</p>
      <p><b>Balance Condition:</b> |BF| ≤ 1</p>
      <p><b>Time Complexity:</b></p>
      <ul>
        <li>Search: O(log n)</li>
        <li>Insert: O(log n)</li>
        <li>Delete: O(log n)</li>
      </ul>
      <p><b>Rotations:</b> LL, RR, LR, RL</p>
      <p><b>Strictly Balanced:</b> ✅ Yes</p>
    `;
  }

  if (type === "rb") {
    panel.innerHTML = `
      <h3>Red-Black Tree</h3>
      <p><b>Description:</b> Self-balancing BST using color properties.</p>
      <p><b>Properties:</b></p>
      <ul>
        <li>Root is always black</li>
        <li>No two red nodes adjacent</li>
        <li>Same black height on all paths</li>
      </ul>
      <p><b>Time Complexity:</b></p>
      <ul>
        <li>Search: O(log n)</li>
        <li>Insert: O(log n)</li>
        <li>Delete: O(log n)</li>
      </ul>
      <p><b>Loosely Balanced:</b> ✅ Yes</p>
    `;
  }

  panel.style.display = "block";
}

function toggleMenu() {
    const menu = document.getElementById("treeOptions");
    menu.style.display =
        menu.style.display === "block" ? "none" : "block";
}

function openTree(page) {
    window.location.href = page;
}



function initChart() {
    const ctx = document.getElementById("statsChart").getContext("2d");

    statsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Height", "Rotations", "Recolorings"],
            datasets: [
                {
                    label: "Binary Search Tree",
                    data: [0, 0, 0],
                    backgroundColor: "rgba(10, 245, 14, 0.7)",
                    categoryPercentage: 0.8,
                    barPercentage: 0.8
                },
                {
                    label: "AVL Tree",
                    data: [0, 0, 0],
                    backgroundColor: "rgba(52, 127, 247, 0.7)",
                    categoryPercentage: 0.8,
                    barPercentage: 0.8
                },
                {
                    label: "Red-Black Tree",
                    data: [0, 0, 0],
                    backgroundColor: "rgba(244, 24, 24, 0.7)",
                    categoryPercentage: 0.8,
                    barPercentage: 0.8
                }

            ]
            
        },
        options: {
            responsive: true,
            animation: {
                duration: 800
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
          
        }
    });
}

function updateStats() {
    if (!statsChart) return;

    const avlHeight = getHeight(avlRoot);
    const rbHeight = getHeight(rbRoot);
    const bstHeight = getHeight(bstRoot)

    const avlNodes = getNodeCount(avlRoot);
    const rbNodes = getNodeCount(rbRoot);
    const bstNodes = getNodeCount(bstRoot);

    const avlTheoretical = avlNodes > 0 ? Math.log2(avlNodes).toFixed(2) : 0;
    const rbTheoretical = rbNodes > 0 ? Math.log2(rbNodes).toFixed(2) : 0;
    const bstTheoretical = bstNodes > 0 ? Math.log2(bstNodes).toFixed(2) : 0;

    statsChart.data.labels = [
        "Height",
        "Complexities",
        "Rotations",
        "Recolorings"
    ];

// BST
statsChart.data.datasets[0].data = [
    bstHeight,
    bstTheoretical,
    0,
    0
];

// AVL
statsChart.data.datasets[1].data = [
    avlHeight,
    avlTheoretical,
    avlRotationCount,
    0
];

// RB
statsChart.data.datasets[2].data = [
    rbHeight,
    rbTheoretical,
    rbRotationCount,
    rbRecolorCount
];

    statsChart.update();
}

function toggleStatsPanel() {
    const panel = document.getElementById("statsContainer");

    if (panel.style.display === "none") {
        panel.style.display = "block";

        setTimeout(() => {
            if (!statsChart) {
                initChart();
            } else {
                statsChart.resize();
            }
            updateStats();
        }, 200);

    } else {
        panel.style.display = "none";
    }
}

function drawLevelGuides(svg, root) {
  if (!root) return;

  const height = getHeight(root);
  const levelGap = 70;
  const startY = 40;

  for (let i = 0; i < height; i++) {
    const y = startY + i * levelGap;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 0);
    line.setAttribute("y1", y);
    line.setAttribute("x2", svg.clientWidth);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#cbd5e1");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("stroke-dasharray", "4,8");
    line.setAttribute("opacity", "0.35");   // 🔥 more subtle
    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 8);
    text.setAttribute("y", y - 6);
    text.setAttribute("fill", "#94a3b8");
    text.setAttribute("font-size", "10px");
    text.setAttribute("font-family", "Inter, sans-serif");
    text.setAttribute("opacity", "0.4");   // 
    text.textContent = i; 

    svg.appendChild(text);
  }
}

