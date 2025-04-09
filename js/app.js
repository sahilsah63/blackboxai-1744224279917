document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  let draggedNode = null;
  let offsetX, offsetY;
  let nodeCount = 0;

  // Handle drag start from palette
  document.querySelectorAll('[draggable="true"]').forEach(node => {
    node.addEventListener('dragstart', (e) => {
      draggedNode = e.target.cloneNode(true);
      draggedNode.style.position = 'absolute';
      draggedNode.style.opacity = '0.8';
      draggedNode.id = `node-${++nodeCount}`;
      e.dataTransfer.setData('text/plain', e.target.dataset.type);
      
      // Calculate offset for proper positioning
      const rect = e.target.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });
  });

  // Handle drop on canvas
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggedNode) {
      const type = e.dataTransfer.getData('text/plain');
      const newNode = createNode(type, e.clientX - offsetX, e.clientY - offsetY);
      canvas.appendChild(newNode);
      makeDraggable(newNode);
    }
  });

  function createNode(type, x, y) {
    const node = document.createElement('div');
    node.className = 'absolute p-4 bg-white rounded-lg shadow-md cursor-move border border-gray-200';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    
    switch(type) {
      case 'llm':
        node.innerHTML = `<i class="fas fa-robot mr-2 text-blue-500"></i>LLM Node`;
        break;
      case 'input':
        node.innerHTML = `<i class="fas fa-keyboard mr-2 text-green-500"></i>Input Node`;
        break;
      case 'output':
        node.innerHTML = `<i class="fas fa-desktop mr-2 text-purple-500"></i>Output Node`;
        break;
    }
    
    return node;
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
});

// Global state
const appState = {
  currentAgent: null,
  agents: [],
  workflows: [],
  connections: []
};

async function loadAgents() {
  try {
    const response = await fetch('http://localhost:3000/api/agents');
    const data = await response.json();
    appState.agents = Array.isArray(data) ? data : [];
    if (appState.agents.length > 0) {
      appState.currentAgent = appState.agents[0];
    }
  } catch (error) {
    console.error('Failed to load agents:', error);
    appState.agents = [];
  }
}

async function loadWorkflows() {
  try {
    const response = await fetch('http://localhost:3000/api/workflows');
    const data = await response.json();
    appState.workflows = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load workflows:', error);
    appState.workflows = [];
  }
}

async function loadConnections() {
  try {
    const response = await fetch('http://localhost:3000/api/connections');
    const data = await response.json();
    appState.connections = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load connections:', error);
    appState.connections = [];
  }
}

function initAgentSwitcher() {
  const switcher = document.createElement('div');
  switcher.className = 'agent-switcher fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50';
  switcher.innerHTML = `
    <h3 class="font-bold mb-2">Active Agent</h3>
    <select class="agent-select border p-2 rounded w-full">
      ${appState.agents.map(agent => `
        <option value="${agent.id}">${agent.name}</option>
      `).join('')}
    </select>
    <button class="mt-2 bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600">
      New Agent
    </button>
  `;
  document.body.appendChild(switcher);

  switcher.querySelector('.agent-select').addEventListener('change', (e) => {
    const agentId = e.target.value;
    appState.currentAgent = appState.agents.find(a => a.id === agentId);
    renderCurrentAgent();
  });
}

function initConnectionHandler() {
  const canvas = document.getElementById('canvas');
  let connectionStart = null;

  canvas.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('node')) {
      connectionStart = e.target.id;
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (connectionStart && e.target.classList.contains('node')) {
      const connection = {
        sourceId: connectionStart,
        targetId: e.target.id,
        type: 'data'
      };
      saveConnection(connection);
      drawConnection(connection);
    }
    connectionStart = null;
  });
}

function drawConnection(connection) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('connection');
  // SVG path drawing logic here
  document.getElementById('canvas').appendChild(svg);
}

async function saveConnection(connection) {
  try {
    const response = await fetch('http://localhost:3000/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(connection)
    });
    const newConnection = await response.json();
    appState.connections.push(newConnection);
  } catch (error) {
    console.error('Failed to save connection:', error);
  }
}

function renderCurrentAgent() {
  // Clear canvas and render current agent's workflow
  const canvas = document.getElementById('canvas');
  canvas.innerHTML = '';
  
  if (appState.currentAgent) {
    const workflow = appState.workflows.find(w => w.id === appState.currentAgent.workflowId);
    if (workflow) {
      // Render workflow nodes and connections
      workflow.nodes.forEach(node => {
        const nodeEl = createNode(node.type, node.x, node.y);
        nodeEl.id = node.id;
        canvas.appendChild(nodeEl);
      });
      
      appState.connections
        .filter(c => workflow.nodes.some(n => n.id === c.sourceId))
        .forEach(drawConnection);
    }
  }
}

// Initialize everything
(async () => {
  await Promise.all([
    loadAgents(),
    loadWorkflows(),
    loadConnections()
  ]);
  initAgentSwitcher();
  initConnectionHandler();
  renderCurrentAgent();
})();
