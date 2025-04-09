const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB with error handling
mongoose.connect('mongodb://localhost:27017/ai_agents')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Using in-memory database instead');
    // Fallback to in-memory storage
    const { InMemoryDatabase } = require('./memory-db');
    global.db = new InMemoryDatabase();
  });

// Define Schemas
const workflowSchema = new mongoose.Schema({
  name: String,
  nodes: Array,
  connections: Array,
  createdAt: { type: Date, default: Date.now }
});

const agentSchema = new mongoose.Schema({
  name: String,
  workflowId: String,
  config: Object,
  createdAt: { type: Date, default: Date.now }
});

const connectionSchema = new mongoose.Schema({
  sourceId: String,
  targetId: String,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const Workflow = mongoose.model('Workflow', workflowSchema);
const Agent = mongoose.model('Agent', agentSchema);
const Connection = mongoose.model('Connection', connectionSchema);

// Initialize in-memory database if needed
if (!global.db) {
  const { InMemoryDatabase } = require('./memory-db');
  global.db = new InMemoryDatabase();
  global.db.init({
    workflows: [],
    agents: [],
    connections: []
  });
}

// API Routes
app.post('/api/workflows', async (req, res) => {
  const workflow = new Workflow(req.body);
  await workflow.save();
  res.status(201).send(workflow);
});

app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = global.db?.getWorkflows?.() || await Workflow.find();
    res.send(workflows);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Agents
app.post('/api/agents', async (req, res) => {
  try {
    const agent = global.db?.saveAgent?.(req.body) || await new Agent(req.body).save();
    res.status(201).send(agent);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const agents = global.db?.getAgents?.() || await Agent.find();
    res.send(agents);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Connections
app.post('/api/connections', async (req, res) => {
  try {
    const connection = global.db?.saveConnection?.(req.body) || await new Connection(req.body).save();
    res.status(201).send(connection);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/connections', async (req, res) => {
  try {
    const connections = global.db?.getConnections?.() || await Connection.find();
    res.send(connections);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Start HTTP server
const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// WebSocket server
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Broadcast workflow updates
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
