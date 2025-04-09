class InMemoryDatabase {
  constructor() {
    this.workflows = [];
    this.agents = [];
    this.connections = [];
  }

  async saveWorkflow(workflow) {
    const existing = this.workflows.find(w => w.id === workflow.id);
    if (existing) {
      Object.assign(existing, workflow);
    } else {
      workflow.id = this.workflows.length + 1;
      this.workflows.push(workflow);
    }
    return workflow;
  }

  async getWorkflows() {
    return this.workflows;
  }

  async saveAgent(agent) {
    const existing = this.agents.find(a => a.id === agent.id);
    if (existing) {
      Object.assign(existing, agent);
    } else {
      agent.id = this.agents.length + 1;
      this.agents.push(agent);
    }
    return agent;
  }

  async getAgents() {
    return this.agents;
  }

  async saveConnection(connection) {
    this.connections.push(connection);
    return connection;
  }

  async getConnections() {
    return this.connections;
  }
}

module.exports = { InMemoryDatabase };
