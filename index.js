const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

function buildTree(node, adj) {
    let subTree = {};
    if (!adj[node] || adj[node].length === 0) {
        return subTree;
    }
    
    const children = [...adj[node]].sort();
    children.forEach(child => {
        subTree[child] = buildTree(child, adj);
    });
    
    return subTree;
}

function findDepth(node, adj) {
    if (!adj[node] || adj[node].length === 0) return 1;
    let maxD = 0;
    adj[node].forEach(child => {
        let d = findDepth(child, adj);
        if (d > maxD) maxD = d;
    });
    return 1 + maxD;
}

function detectCycle(node, adj, vis, stack) {
    vis.add(node);
    stack.add(node);

    const list = adj[node] || [];
    for (let i = 0; i < list.length; i++) {
        let nextNode = list[i];
        if (!vis.has(nextNode)) {
            if (detectCycle(nextNode, adj, vis, stack)) return true;
        } else if (stack.has(nextNode)) {
            return true;
        }
    }

    stack.delete(node);
    return false;
}

app.post('/bfhl', (req, res) => {
    try {
        const data = req.body.data;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid array" });
        }

        const invalid_entries = [];
        const duplicate_edges = [];
        const uniqueEdges = new Set();
        const filteredEdges = [];
        
        const adj = {};
        const inDegree = {};
        const allNodes = new Set();

        data.forEach(item => {
            if (typeof item !== 'string') {
                invalid_entries.push(String(item));
                return;
            }
            
            const edge = item.trim();
            const format = /^[A-Z]->[A-Z]$/;
            
            if (!format.test(edge)) {
                invalid_entries.push(edge);
                return;
            }

            const parts = edge.split('->');
            const u = parts[0];
            const v = parts[1];

            if (u === v) {
                invalid_entries.push(edge);
                return;
            }

            if (uniqueEdges.has(edge)) {
                if (!duplicate_edges.includes(edge)) {
                    duplicate_edges.push(edge);
                }
                return;
            }

            uniqueEdges.add(edge);
            filteredEdges.push({ u, v, raw: edge });
        });

        filteredEdges.forEach(({ u, v }) => {
            allNodes.add(u);
            allNodes.add(v);

            if (inDegree[v] === undefined) inDegree[v] = 0;
            if (inDegree[u] === undefined) inDegree[u] = 0;

            if (inDegree[v] >= 1) {
                return; 
            }

            if (!adj[u]) adj[u] = [];
            adj[u].push(v);
            inDegree[v]++;
        });

        const unDirected = {};
        allNodes.forEach(n => unDirected[n] = []);
        filteredEdges.forEach(({ u, v }) => {
            if (adj[u] && adj[u].includes(v)) {
                unDirected[u].push(v);
                unDirected[v].push(u);
            }
        });

        const visitedNodes = new Set();
        const components = [];

        allNodes.forEach(n => {
            if (!visitedNodes.has(n)) {
                const comp = [];
                const q = [n];
                visitedNodes.add(n);

                while (q.length > 0) {
                    const curr = q.shift();
                    comp.push(curr);
                    const neighbors = unDirected[curr] || [];
                    neighbors.forEach(nbr => {
                        if (!visitedNodes.has(nbr)) {
                            visitedNodes.add(nbr);
                            q.push(nbr);
                        }
                    });
                }
                components.push(comp);
            }
        });

        const hierarchies = [];
        let total_trees = 0;
        let total_cycles = 0;
        let largest_tree_root = "";
        let maxDepth = -1;

        components.forEach(comp => {
            let roots = comp.filter(n => (inDegree[n] || 0) === 0);
            let root = "";
            let pureCycle = false;

            if (roots.length > 0) {
                roots.sort();
                root = roots[0];
            } else {
                comp.sort();
                root = comp[0];
                pureCycle = true;
            }

            const vis = new Set();
            const stack = new Set();
            let hasCycle = pureCycle;

            if (!hasCycle) {
                hasCycle = detectCycle(root, adj, vis, stack);
            }

            if (hasCycle) {
                total_cycles++;
                hierarchies.push({
                    root: root,
                    tree: {},
                    has_cycle: true
                });
            } else {
                total_trees++;
                const currentDepth = findDepth(root, adj);
                
                const structure = {};
                structure[root] = buildTree(root, adj);

                hierarchies.push({
                    root: root,
                    tree: structure,
                    depth: currentDepth
                });

                if (currentDepth > maxDepth) {
                    maxDepth = currentDepth;
                    largest_tree_root = root;
                } else if (currentDepth === maxDepth) {
                    if (!largest_tree_root || root < largest_tree_root) {
                        largest_tree_root = root;
                    }
                }
            }
        });

        hierarchies.sort((x, y) => x.root.localeCompare(y.root));

        const result = {
            "user_id": "rishikasingla_24062026", 
            "email_id": "rishika2273.be23@chitkara.edu.in", 
            "college_roll_number": "2310992273", 
            "hierarchies": hierarchies,
            "invalid_entries": invalid_entries,
            "duplicate_edges": duplicate_edges,
            "summary": {
                "total_trees": total_trees,
                "total_cycles": total_cycles,
                "largest_tree_root": largest_tree_root || ""
            }
        };

        return res.json(result);

    } catch (err) {
        return res.status(500).json({ error: "Server Error" });
    }
});

app.get('/', (req, res) => {
    res.send("Active");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Live on ${PORT}`));