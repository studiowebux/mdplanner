// Centralized API layer - All fetch calls go through here

/**
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
async function request(url, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const response = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders
    }
  });
  return response;
}

export async function get(url) {
  return request(url);
}

export async function post(url, data) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function put(url, data) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function del(url) {
  return request(url, {
    method: 'DELETE'
  });
}

export async function patch(url, data) {
  return request(url, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/** Tasks CRUD operations */
export const TasksAPI = {
  async fetchAll() {
    const response = await get('/api/tasks');
    return response.json();
  },

  async create(task) {
    const response = await post('/api/tasks', task);
    return response;
  },

  async update(id, task) {
    const response = await put(`/api/tasks/${id}`, task);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/tasks/${id}`);
    return response;
  },

  async move(id, data) {
    const response = await patch(`/api/tasks/${id}/move`, data);
    return response;
  }
};

/** Project config and info operations */
export const ProjectAPI = {
  async getInfo() {
    const response = await get('/api/project');
    return response.json();
  },

  async getConfig() {
    const response = await get('/api/project/config');
    return response.json();
  },

  async saveConfig(config) {
    const response = await post('/api/project/config', config);
    return response;
  },

  async getSections() {
    const response = await get('/api/project/sections');
    return response.json();
  },

  async rewrite(data) {
    const response = await post('/api/project/rewrite', data);
    return response;
  },

  async getVersion() {
    const response = await get('/api/version');
    return response.json();
  },

  async listProjects() {
    const response = await get('/api/projects');
    return response.json();
  },

  async getActiveProject() {
    const response = await get('/api/projects/active');
    return response.json();
  },

  async switchProject(filename) {
    const response = await post('/api/projects/switch', { filename });
    return response;
  },

  async listProjectsEnriched() {
    const response = await get('/api/projects/enriched');
    return response.json();
  },

  async getPortfolioSummary() {
    const response = await get('/api/projects/portfolio/summary');
    return response.json();
  }
};

// Portfolio API - reads from portfolio/ directory
export const PortfolioAPI = {
  async fetchAll() {
    const response = await get('/api/portfolio');
    return response.json();
  },

  async getSummary() {
    const response = await get('/api/portfolio/summary');
    return response.json();
  },

  async get(id) {
    const response = await get(`/api/portfolio/${id}`);
    return response.json();
  },

  async update(id, data) {
    const response = await put(`/api/portfolio/${id}`, data);
    return response;
  }
};

// Notes API
export const NotesAPI = {
  async fetchAll() {
    const response = await get('/api/notes');
    return response.json();
  },

  async create(note) {
    const response = await post('/api/notes', note);
    return response;
  },

  async update(id, note) {
    const response = await put(`/api/notes/${id}`, note);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/notes/${id}`);
    return response;
  }
};

// Goals API
export const GoalsAPI = {
  async create(goal) {
    const response = await post('/api/goals', goal);
    return response;
  },

  async update(id, goal) {
    const response = await put(`/api/goals/${id}`, goal);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/goals/${id}`);
    return response;
  }
};

// Milestones API
export const MilestonesAPI = {
  async fetchAll() {
    const response = await get('/api/milestones');
    return response.json();
  },

  async create(milestone) {
    const response = await post('/api/milestones', milestone);
    return response;
  },

  async update(id, milestone) {
    const response = await put(`/api/milestones/${id}`, milestone);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/milestones/${id}`);
    return response;
  }
};

// Ideas API
export const IdeasAPI = {
  async fetchAll() {
    const response = await get('/api/ideas');
    return response.json();
  },

  async create(idea) {
    const response = await post('/api/ideas', idea);
    return response;
  },

  async update(id, idea) {
    const response = await put(`/api/ideas/${id}`, idea);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/ideas/${id}`);
    return response;
  }
};

// Retrospectives API
export const RetrospectivesAPI = {
  async fetchAll() {
    const response = await get('/api/retrospectives');
    return response.json();
  },

  async create(retrospective) {
    const response = await post('/api/retrospectives', retrospective);
    return response;
  },

  async update(id, retrospective) {
    const response = await put(`/api/retrospectives/${id}`, retrospective);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/retrospectives/${id}`);
    return response;
  }
};

// SWOT API
export const SwotAPI = {
  async fetchAll() {
    const response = await get('/api/swot');
    return response.json();
  },

  async create(swot) {
    const response = await post('/api/swot', swot);
    return response;
  },

  async update(id, swot) {
    const response = await put(`/api/swot/${id}`, swot);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/swot/${id}`);
    return response;
  }
};

// Risk Analysis API
export const RiskAnalysisAPI = {
  async fetchAll() {
    const response = await get('/api/risk-analysis');
    return response.json();
  },

  async create(risk) {
    const response = await post('/api/risk-analysis', risk);
    return response;
  },

  async update(id, risk) {
    const response = await put(`/api/risk-analysis/${id}`, risk);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/risk-analysis/${id}`);
    return response;
  }
};

// Lean Canvas API
export const LeanCanvasAPI = {
  async fetchAll() {
    const response = await get('/api/lean-canvas');
    return response.json();
  },

  async create(canvas) {
    const response = await post('/api/lean-canvas', canvas);
    return response;
  },

  async update(id, canvas) {
    const response = await put(`/api/lean-canvas/${id}`, canvas);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/lean-canvas/${id}`);
    return response;
  }
};

// Business Model API
export const BusinessModelAPI = {
  async fetchAll() {
    const response = await get('/api/business-model');
    return response.json();
  },

  async create(model) {
    const response = await post('/api/business-model', model);
    return response;
  },

  async update(id, model) {
    const response = await put(`/api/business-model/${id}`, model);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/business-model/${id}`);
    return response;
  }
};

// Project Value Board API
export const ProjectValueAPI = {
  async fetchAll() {
    const response = await get('/api/project-value-board');
    return response.json();
  },

  async create(board) {
    const response = await post('/api/project-value-board', board);
    return response;
  },

  async update(id, board) {
    const response = await put(`/api/project-value-board/${id}`, board);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/project-value-board/${id}`);
    return response;
  }
};

// Brief API
export const BriefAPI = {
  async fetchAll() {
    const response = await get('/api/brief');
    return response.json();
  },

  async create(brief) {
    const response = await post('/api/brief', brief);
    return response;
  },

  async update(id, brief) {
    const response = await put(`/api/brief/${id}`, brief);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/brief/${id}`);
    return response;
  }
};

// Capacity API
export const CapacityAPI = {
  async fetchAll() {
    const response = await get('/api/capacity');
    return response.json();
  },

  async create(plan) {
    const response = await post('/api/capacity', plan);
    return response;
  },

  async update(id, plan) {
    const response = await put(`/api/capacity/${id}`, plan);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/capacity/${id}`);
    return response;
  },

  async getUtilization(id) {
    const response = await get(`/api/capacity/${id}/utilization`);
    return response.json();
  },

  async suggestAssignments(id) {
    const response = await get(`/api/capacity/${id}/suggest-assignments`);
    return response.json();
  },

  async applyAssignments(id, assignments) {
    const response = await post(`/api/capacity/${id}/apply-assignments`, assignments);
    return response;
  },

  // Team members
  async createMember(planId, member) {
    const response = await post(`/api/capacity/${planId}/members`, member);
    return response;
  },

  async updateMember(planId, memberId, member) {
    const response = await put(`/api/capacity/${planId}/members/${memberId}`, member);
    return response;
  },

  async deleteMember(planId, memberId) {
    const response = await del(`/api/capacity/${planId}/members/${memberId}`);
    return response;
  },

  // Allocations
  async createAllocation(planId, allocation) {
    const response = await post(`/api/capacity/${planId}/allocations`, allocation);
    return response;
  },

  async deleteAllocation(planId, allocationId) {
    const response = await del(`/api/capacity/${planId}/allocations/${allocationId}`);
    return response;
  }
};

// Time Tracking API
export const TimeTrackingAPI = {
  async fetchAll() {
    const response = await get('/api/time-entries');
    return response.json();
  },

  async fetchForTask(taskId) {
    const response = await get(`/api/time-entries/${taskId}`);
    return response.json();
  },

  async create(taskId, entry) {
    const response = await post(`/api/time-entries/${taskId}`, entry);
    return response;
  },

  async delete(taskId, entryId) {
    const response = await del(`/api/time-entries/${taskId}/${entryId}`);
    return response;
  }
};

// Canvas/Sticky Notes API
export const CanvasAPI = {
  async fetchAll() {
    const response = await get('/api/canvas/sticky_notes');
    return response.json();
  },

  async create(note) {
    const response = await post('/api/canvas/sticky_notes', note);
    return response;
  },

  async update(id, note) {
    const response = await put(`/api/canvas/sticky_notes/${id}`, note);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/canvas/sticky_notes/${id}`);
    return response;
  }
};

// Mindmaps API
export const MindmapsAPI = {
  async fetchAll() {
    const response = await get('/api/mindmaps');
    return response.json();
  },

  async create(mindmap) {
    const response = await post('/api/mindmaps', mindmap);
    return response;
  },

  async update(id, mindmap) {
    const response = await put(`/api/mindmaps/${id}`, mindmap);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/mindmaps/${id}`);
    return response;
  }
};

// C4 API
export const C4API = {
  async fetchAll() {
    const response = await get('/api/c4');
    return response.json();
  },

  async save(components) {
    const response = await post('/api/c4', components);
    return response;
  }
};

// Strategic Levels API
export const StrategicLevelsAPI = {
  async fetchAll() {
    const response = await get('/api/strategic-levels');
    return response.json();
  },

  async create(builder) {
    const response = await post('/api/strategic-levels', builder);
    return response;
  },

  async update(id, builder) {
    const response = await put(`/api/strategic-levels/${id}`, builder);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/strategic-levels/${id}`);
    return response;
  },

  // Level operations
  async createLevel(builderId, level) {
    const response = await post(`/api/strategic-levels/${builderId}/levels`, level);
    return response;
  },

  async updateLevel(builderId, levelId, level) {
    const response = await put(`/api/strategic-levels/${builderId}/levels/${levelId}`, level);
    return response;
  },

  async deleteLevel(builderId, levelId) {
    const response = await del(`/api/strategic-levels/${builderId}/levels/${levelId}`);
    return response;
  }
};

// Billing API
export const BillingAPI = {
  async fetchAll() {
    const response = await get('/api/billing');
    return response.json();
  },

  // Customers
  async createCustomer(customer) {
    const response = await post('/api/customers', customer);
    return response;
  },

  async updateCustomer(id, customer) {
    const response = await put(`/api/customers/${id}`, customer);
    return response;
  },

  async deleteCustomer(id) {
    const response = await del(`/api/customers/${id}`);
    return response;
  },

  // Rates
  async createRate(rate) {
    const response = await post('/api/billing-rates', rate);
    return response;
  },

  async updateRate(id, rate) {
    const response = await put(`/api/billing-rates/${id}`, rate);
    return response;
  },

  async deleteRate(id) {
    const response = await del(`/api/billing-rates/${id}`);
    return response;
  },

  // Quotes
  async createQuote(quote) {
    const response = await post('/api/quotes', quote);
    return response;
  },

  async updateQuote(id, quote) {
    const response = await put(`/api/quotes/${id}`, quote);
    return response;
  },

  async deleteQuote(id) {
    const response = await del(`/api/quotes/${id}`);
    return response;
  },

  async sendQuote(id) {
    const response = await post(`/api/quotes/${id}/send`, {});
    return response;
  },

  async acceptQuote(id) {
    const response = await post(`/api/quotes/${id}/accept`, {});
    return response;
  },

  async convertQuoteToInvoice(id) {
    const response = await post(`/api/quotes/${id}/to-invoice`, {});
    return response;
  },

  // Invoices
  async createInvoice(invoice) {
    const response = await post('/api/invoices', invoice);
    return response;
  },

  async updateInvoice(id, invoice) {
    const response = await put(`/api/invoices/${id}`, invoice);
    return response;
  },

  async deleteInvoice(id) {
    const response = await del(`/api/invoices/${id}`);
    return response;
  },

  async sendInvoice(id) {
    const response = await post(`/api/invoices/${id}/send`, {});
    return response;
  },

  async generateInvoice(data) {
    const response = await post('/api/invoices/generate', data);
    return response;
  },

  // Payments
  async createPayment(invoiceId, payment) {
    const response = await post(`/api/billing/invoices/${invoiceId}/payments`, payment);
    return response;
  }
};

// CRM API
export const CRMAPI = {
  // Companies
  async fetchCompanies() {
    const response = await get('/api/companies');
    return response.json();
  },

  async getCompany(id) {
    const response = await get(`/api/companies/${id}`);
    return response.json();
  },

  async createCompany(company) {
    const response = await post('/api/companies', company);
    return response;
  },

  async updateCompany(id, company) {
    const response = await put(`/api/companies/${id}`, company);
    return response;
  },

  async deleteCompany(id) {
    const response = await del(`/api/companies/${id}`);
    return response;
  },

  async getCompanyContacts(companyId) {
    const response = await get(`/api/companies/${companyId}/contacts`);
    return response.json();
  },

  async getCompanyDeals(companyId) {
    const response = await get(`/api/companies/${companyId}/deals`);
    return response.json();
  },

  async getCompanyInteractions(companyId) {
    const response = await get(`/api/companies/${companyId}/interactions`);
    return response.json();
  },

  // Contacts
  async fetchContacts() {
    const response = await get('/api/contacts');
    return response.json();
  },

  async getContact(id) {
    const response = await get(`/api/contacts/${id}`);
    return response.json();
  },

  async createContact(contact) {
    const response = await post('/api/contacts', contact);
    return response;
  },

  async updateContact(id, contact) {
    const response = await put(`/api/contacts/${id}`, contact);
    return response;
  },

  async deleteContact(id) {
    const response = await del(`/api/contacts/${id}`);
    return response;
  },

  // Deals
  async fetchDeals() {
    const response = await get('/api/deals');
    return response.json();
  },

  async getDeal(id) {
    const response = await get(`/api/deals/${id}`);
    return response.json();
  },

  async createDeal(deal) {
    const response = await post('/api/deals', deal);
    return response;
  },

  async updateDeal(id, deal) {
    const response = await put(`/api/deals/${id}`, deal);
    return response;
  },

  async deleteDeal(id) {
    const response = await del(`/api/deals/${id}`);
    return response;
  },

  async updateDealStage(id, stage) {
    const response = await post(`/api/deals/${id}/stage`, { stage });
    return response;
  },

  async getDealInteractions(dealId) {
    const response = await get(`/api/deals/${dealId}/interactions`);
    return response.json();
  },

  // Interactions
  async fetchInteractions() {
    const response = await get('/api/interactions');
    return response.json();
  },

  async getInteraction(id) {
    const response = await get(`/api/interactions/${id}`);
    return response.json();
  },

  async createInteraction(interaction) {
    const response = await post('/api/interactions', interaction);
    return response;
  },

  async updateInteraction(id, interaction) {
    const response = await put(`/api/interactions/${id}`, interaction);
    return response;
  },

  async deleteInteraction(id) {
    const response = await del(`/api/interactions/${id}`);
    return response;
  },

  // Summary
  async getSummary() {
    const response = await get('/api/crm/summary');
    return response.json();
  }
};
