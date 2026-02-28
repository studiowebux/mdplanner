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
      "Content-Type": "application/json",
      ...optionHeaders,
    },
  });
  return response;
}

export async function get(url) {
  return request(url);
}

export async function post(url, data) {
  return request(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function put(url, data) {
  return request(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function del(url) {
  return request(url, {
    method: "DELETE",
  });
}

export async function patch(url, data) {
  return request(url, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Uploads management operations */
export const UploadsAPI = {
  async list() {
    const response = await get("/api/uploads");
    return response.json();
  },

  async orphans() {
    const response = await get("/api/uploads/orphans");
    return response.json();
  },

  async delete(year, month, day, filename) {
    const response = await del(
      `/api/uploads/${year}/${month}/${day}/${filename}`,
    );
    return response;
  },
};

/** Tasks CRUD operations */
export const TasksAPI = {
  async fetchAll() {
    const response = await get("/api/tasks");
    return response.json();
  },

  async create(task) {
    const response = await post("/api/tasks", task);
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
  },

  async addAttachments(id, paths) {
    const response = await patch(`/api/tasks/${id}/attachments`, { paths });
    return response;
  },
};

/** Project config and info operations */
export const ProjectAPI = {
  async getInfo() {
    const response = await get("/api/project");
    return response.json();
  },

  async getConfig() {
    const response = await get("/api/project/config");
    return response.json();
  },

  async saveConfig(config) {
    const response = await post("/api/project/config", config);
    return response;
  },

  async saveInfo(info) {
    const response = await put("/api/project/info", info);
    return response;
  },

  async getSections() {
    const response = await get("/api/project/sections");
    return response.json();
  },

  async rewrite(data) {
    const response = await post("/api/project/rewrite", data);
    return response;
  },

  async getVersion() {
    const response = await get("/api/version");
    return response.json();
  },

  async getActiveProject() {
    const response = await get("/api/projects/active");
    return response.json();
  },
};

// Portfolio API - reads from portfolio/ directory
export const PortfolioAPI = {
  async fetchAll() {
    const response = await get("/api/portfolio");
    return response.json();
  },

  async getSummary() {
    const response = await get("/api/portfolio/summary");
    return response.json();
  },

  async get(id) {
    const response = await get(`/api/portfolio/${id}`);
    return response.json();
  },

  async create(data) {
    const response = await post("/api/portfolio", data);
    return response.json();
  },

  async update(id, data) {
    const response = await put(`/api/portfolio/${id}`, data);
    return response;
  },

  async remove(id) {
    const response = await del(`/api/portfolio/${id}`);
    return response;
  },
};

// Notes API
export const NotesAPI = {
  async fetchAll() {
    const response = await get("/api/notes");
    return response.json();
  },

  async create(note) {
    const response = await post("/api/notes", note);
    return response;
  },

  async update(id, note) {
    const response = await put(`/api/notes/${id}`, note);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/notes/${id}`);
    return response;
  },
};

// Goals API
export const GoalsAPI = {
  async create(goal) {
    const response = await post("/api/goals", goal);
    return response;
  },

  async update(id, goal) {
    const response = await put(`/api/goals/${id}`, goal);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/goals/${id}`);
    return response;
  },
};

// Milestones API
export const MilestonesAPI = {
  async fetchAll() {
    const response = await get("/api/milestones");
    return response.json();
  },

  async create(milestone) {
    const response = await post("/api/milestones", milestone);
    return response;
  },

  async update(id, milestone) {
    const response = await put(`/api/milestones/${id}`, milestone);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/milestones/${id}`);
    return response;
  },
};

// Meetings API
export const MeetingsAPI = {
  async fetchAll() {
    const response = await get("/api/meetings");
    return response.json();
  },

  async fetchOne(id) {
    const response = await get(`/api/meetings/${id}`);
    return response.json();
  },

  async create(meeting) {
    return post("/api/meetings", meeting);
  },

  async update(id, meeting) {
    return put(`/api/meetings/${id}`, meeting);
  },

  async delete(id) {
    return del(`/api/meetings/${id}`);
  },
};

// Onboarding API
export const OnboardingAPI = {
  async fetchAll() {
    const response = await get("/api/onboarding");
    return response.json();
  },

  async create(record) {
    return post("/api/onboarding", record);
  },

  async update(id, record) {
    return put(`/api/onboarding/${id}`, record);
  },

  async delete(id) {
    return del(`/api/onboarding/${id}`);
  },
};

// Onboarding Templates API
export const OnboardingTemplatesAPI = {
  async fetchAll() {
    const response = await get("/api/onboarding-templates");
    return response.json();
  },

  async create(template) {
    return post("/api/onboarding-templates", template);
  },

  async update(id, template) {
    return put(`/api/onboarding-templates/${id}`, template);
  },

  async delete(id) {
    return del(`/api/onboarding-templates/${id}`);
  },
};

// Ideas API
export const IdeasAPI = {
  async fetchAll() {
    const response = await get("/api/ideas");
    return response.json();
  },

  async create(idea) {
    const response = await post("/api/ideas", idea);
    return response;
  },

  async update(id, idea) {
    const response = await put(`/api/ideas/${id}`, idea);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/ideas/${id}`);
    return response;
  },
};

// Retrospectives API
export const RetrospectivesAPI = {
  async fetchAll() {
    const response = await get("/api/retrospectives");
    return response.json();
  },

  async create(retrospective) {
    const response = await post("/api/retrospectives", retrospective);
    return response;
  },

  async update(id, retrospective) {
    const response = await put(`/api/retrospectives/${id}`, retrospective);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/retrospectives/${id}`);
    return response;
  },
};

// MoSCoW Analysis API
export const MoscowAPI = {
  async fetchAll() {
    const response = await get("/api/moscow");
    return response.json();
  },

  async create(analysis) {
    const response = await post("/api/moscow", analysis);
    return response;
  },

  async update(id, analysis) {
    const response = await put(`/api/moscow/${id}`, analysis);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/moscow/${id}`);
    return response;
  },
};

// Eisenhower Matrix API
export const EisenhowerAPI = {
  async fetchAll() {
    const response = await get("/api/eisenhower");
    return response.json();
  },

  async create(matrix) {
    const response = await post("/api/eisenhower", matrix);
    return response;
  },

  async update(id, matrix) {
    const response = await put(`/api/eisenhower/${id}`, matrix);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/eisenhower/${id}`);
    return response;
  },
};

// Fundraising — SAFE Agreements API
export const SafeAPI = {
  async fetchAll() {
    const response = await get("/api/safe");
    return response.json();
  },

  async create(agreement) {
    const response = await post("/api/safe", agreement);
    return response;
  },

  async update(id, agreement) {
    const response = await put(`/api/safe/${id}`, agreement);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/safe/${id}`);
    return response;
  },
};

// Fundraising — Investor Pipeline API
export const InvestorAPI = {
  async fetchAll() {
    const response = await get("/api/investors");
    return response.json();
  },

  async create(investor) {
    const response = await post("/api/investors", investor);
    return response;
  },

  async update(id, investor) {
    const response = await put(`/api/investors/${id}`, investor);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/investors/${id}`);
    return response;
  },
};

// Fundraising — KPI Snapshots API
export const KpiAPI = {
  async fetchAll() {
    const response = await get("/api/kpis");
    return response.json();
  },

  async create(snapshot) {
    const response = await post("/api/kpis", snapshot);
    return response;
  },

  async update(id, snapshot) {
    const response = await put(`/api/kpis/${id}`, snapshot);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/kpis/${id}`);
    return response;
  },
};

// SWOT API
export const SwotAPI = {
  async fetchAll() {
    const response = await get("/api/swot");
    return response.json();
  },

  async create(swot) {
    const response = await post("/api/swot", swot);
    return response;
  },

  async update(id, swot) {
    const response = await put(`/api/swot/${id}`, swot);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/swot/${id}`);
    return response;
  },
};

// Risk Analysis API
export const RiskAnalysisAPI = {
  async fetchAll() {
    const response = await get("/api/risk-analysis");
    return response.json();
  },

  async create(risk) {
    const response = await post("/api/risk-analysis", risk);
    return response;
  },

  async update(id, risk) {
    const response = await put(`/api/risk-analysis/${id}`, risk);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/risk-analysis/${id}`);
    return response;
  },
};

// Lean Canvas API
export const LeanCanvasAPI = {
  async fetchAll() {
    const response = await get("/api/lean-canvas");
    return response.json();
  },

  async create(canvas) {
    const response = await post("/api/lean-canvas", canvas);
    return response;
  },

  async update(id, canvas) {
    const response = await put(`/api/lean-canvas/${id}`, canvas);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/lean-canvas/${id}`);
    return response;
  },
};

// Business Model API
export const BusinessModelAPI = {
  async fetchAll() {
    const response = await get("/api/business-model");
    return response.json();
  },

  async create(model) {
    const response = await post("/api/business-model", model);
    return response;
  },

  async update(id, model) {
    const response = await put(`/api/business-model/${id}`, model);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/business-model/${id}`);
    return response;
  },
};

// Project Value Board API
export const ProjectValueAPI = {
  async fetchAll() {
    const response = await get("/api/project-value-board");
    return response.json();
  },

  async create(board) {
    const response = await post("/api/project-value-board", board);
    return response;
  },

  async update(id, board) {
    const response = await put(`/api/project-value-board/${id}`, board);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/project-value-board/${id}`);
    return response;
  },
};

// Brief API
export const BriefAPI = {
  async fetchAll() {
    const response = await get("/api/brief");
    return response.json();
  },

  async create(brief) {
    const response = await post("/api/brief", brief);
    return response;
  },

  async update(id, brief) {
    const response = await put(`/api/brief/${id}`, brief);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/brief/${id}`);
    return response;
  },
};

// Capacity API
export const CapacityAPI = {
  async fetchAll() {
    const response = await get("/api/capacity");
    return response.json();
  },

  async create(plan) {
    const response = await post("/api/capacity", plan);
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
    const response = await post(
      `/api/capacity/${id}/apply-assignments`,
      assignments,
    );
    return response;
  },

  // Team members
  async createMember(planId, member) {
    const response = await post(`/api/capacity/${planId}/members`, member);
    return response;
  },

  async updateMember(planId, memberId, member) {
    const response = await put(
      `/api/capacity/${planId}/members/${memberId}`,
      member,
    );
    return response;
  },

  async deleteMember(planId, memberId) {
    const response = await del(`/api/capacity/${planId}/members/${memberId}`);
    return response;
  },

  // Allocations
  async createAllocation(planId, allocation) {
    const response = await post(
      `/api/capacity/${planId}/allocations`,
      allocation,
    );
    return response;
  },

  async deleteAllocation(planId, allocationId) {
    const response = await del(
      `/api/capacity/${planId}/allocations/${allocationId}`,
    );
    return response;
  },
};

// Time Tracking API
export const TimeTrackingAPI = {
  async fetchAll() {
    const response = await get("/api/time-entries");
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
  },
};

// Canvas/Sticky Notes API
export const CanvasAPI = {
  async fetchAll() {
    const response = await get("/api/canvas/sticky_notes");
    return response.json();
  },

  async create(note) {
    const response = await post("/api/canvas/sticky_notes", note);
    return response;
  },

  async update(id, note) {
    const response = await put(`/api/canvas/sticky_notes/${id}`, note);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/canvas/sticky_notes/${id}`);
    return response;
  },
};

// Mindmaps API
export const MindmapsAPI = {
  async fetchAll() {
    const response = await get("/api/mindmaps");
    return response.json();
  },

  async create(mindmap) {
    const response = await post("/api/mindmaps", mindmap);
    return response;
  },

  async update(id, mindmap) {
    const response = await put(`/api/mindmaps/${id}`, mindmap);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/mindmaps/${id}`);
    return response;
  },
};

// C4 API
export const C4API = {
  async fetchAll() {
    const response = await get("/api/c4");
    return response.json();
  },

  async save(components) {
    const response = await post("/api/c4", components);
    return response;
  },
};

// Strategic Levels API
export const StrategicLevelsAPI = {
  async fetchAll() {
    const response = await get("/api/strategic-levels");
    return response.json();
  },

  async create(builder) {
    const response = await post("/api/strategic-levels", builder);
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
    const response = await post(
      `/api/strategic-levels/${builderId}/levels`,
      level,
    );
    return response;
  },

  async updateLevel(builderId, levelId, level) {
    const response = await put(
      `/api/strategic-levels/${builderId}/levels/${levelId}`,
      level,
    );
    return response;
  },

  async deleteLevel(builderId, levelId) {
    const response = await del(
      `/api/strategic-levels/${builderId}/levels/${levelId}`,
    );
    return response;
  },
};

// Billing API
export const BillingAPI = {
  async fetchAll() {
    const response = await get("/api/billing");
    return response.json();
  },

  // Customers
  async fetchCustomers() {
    const response = await get("/api/customers");
    return response.json();
  },

  async createCustomer(customer) {
    const response = await post("/api/customers", customer);
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
    const response = await post("/api/billing-rates", rate);
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
    const response = await post("/api/quotes", quote);
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
    const response = await post("/api/invoices", invoice);
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
    const response = await post("/api/invoices/generate", data);
    return response;
  },

  // Payments
  async createPayment(invoiceId, payment) {
    const response = await post(
      `/api/billing/invoices/${invoiceId}/payments`,
      payment,
    );
    return response;
  },
};

// CRM API
export const CRMAPI = {
  // Companies
  async fetchCompanies() {
    const response = await get("/api/companies");
    return response.json();
  },

  async getCompany(id) {
    const response = await get(`/api/companies/${id}`);
    return response.json();
  },

  async createCompany(company) {
    const response = await post("/api/companies", company);
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
    const response = await get("/api/contacts");
    return response.json();
  },

  async getContact(id) {
    const response = await get(`/api/contacts/${id}`);
    return response.json();
  },

  async createContact(contact) {
    const response = await post("/api/contacts", contact);
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
    const response = await get("/api/deals");
    return response.json();
  },

  async getDeal(id) {
    const response = await get(`/api/deals/${id}`);
    return response.json();
  },

  async createDeal(deal) {
    const response = await post("/api/deals", deal);
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
    const response = await get("/api/interactions");
    return response.json();
  },

  async getInteraction(id) {
    const response = await get(`/api/interactions/${id}`);
    return response.json();
  },

  async createInteraction(interaction) {
    const response = await post("/api/interactions", interaction);
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
    const response = await get("/api/crm/summary");
    return response.json();
  },
};

// People Registry API
export const PeopleAPI = {
  async fetchAll() {
    const response = await get("/api/people");
    return response.json();
  },

  async fetchTree() {
    const response = await get("/api/people/tree");
    return response.json();
  },

  async getSummary() {
    const response = await get("/api/people/summary");
    return response.json();
  },

  async getDepartments() {
    const response = await get("/api/people/departments");
    return response.json();
  },

  async get(id) {
    const response = await get(`/api/people/${id}`);
    return response.json();
  },

  async getDirectReports(id) {
    const response = await get(`/api/people/${id}/reports`);
    return response.json();
  },

  async create(person) {
    const response = await post("/api/people", person);
    return response;
  },

  async update(id, person) {
    const response = await put(`/api/people/${id}`, person);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/people/${id}`);
    return response;
  },
};

// Org Chart API
export const OrgChartAPI = {
  async fetchAll() {
    const response = await get("/api/orgchart");
    return response.json();
  },

  async fetchTree() {
    const response = await get("/api/orgchart/tree");
    return response.json();
  },

  async getSummary() {
    const response = await get("/api/orgchart/summary");
    return response.json();
  },

  async getDepartments() {
    const response = await get("/api/orgchart/departments");
    return response.json();
  },

  async get(id) {
    const response = await get(`/api/orgchart/${id}`);
    return response.json();
  },

  async getDirectReports(id) {
    const response = await get(`/api/orgchart/${id}/reports`);
    return response.json();
  },

  async create(member) {
    const response = await post("/api/orgchart", member);
    return response;
  },

  async update(id, member) {
    const response = await put(`/api/orgchart/${id}`, member);
    return response;
  },

  async delete(id) {
    const response = await del(`/api/orgchart/${id}`);
    return response;
  },
};

// Search API
export const SearchAPI = {
  async search(query, { limit = 20, types } = {}) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (types) params.set("types", types.join(","));
    const response = await get(`/api/search?${params}`);
    return response.json();
  },

  async status() {
    const response = await get("/api/search/status");
    return response.json();
  },
};

// Finances API
export const FinancesAPI = {
  async fetchAll() {
    const response = await get("/api/finances");
    return response.json();
  },

  async create(record) {
    return post("/api/finances", record);
  },

  async update(id, record) {
    return put(`/api/finances/${id}`, record);
  },

  async delete(id) {
    return del(`/api/finances/${id}`);
  },
};

// Journal API
export const JournalAPI = {
  async fetchAll() {
    const response = await get("/api/journal");
    return response.json();
  },

  async fetchOne(id) {
    const response = await get(`/api/journal/${id}`);
    return response.json();
  },

  async create(entry) {
    return post("/api/journal", entry);
  },

  async update(id, entry) {
    return put(`/api/journal/${id}`, entry);
  },

  async delete(id) {
    return del(`/api/journal/${id}`);
  },
};
