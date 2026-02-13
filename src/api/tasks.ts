import { MarkdownParser } from "../lib/markdown-parser.ts";
import { ProjectManager } from "../lib/project-manager.ts";
import { Task } from "../lib/types.ts";
import { VERSION, GITHUB_REPO } from "../../main.ts";

export class TaskAPI {
  private projectManager: ProjectManager;

  constructor(projectManager: ProjectManager) {
    this.projectManager = projectManager;
  }

  private get parser(): MarkdownParser {
    return this.projectManager.getActiveParser();
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const pathParts = url.pathname.split("/").filter((p) => p);

    // CORS headers
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    console.log(method, url.href);

    if (method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    try {
      // GET /api/version - get current version and check for updates
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "version") {
        let latestVersion = null;
        let updateAvailable = false;
        try {
          const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { "Accept": "application/vnd.github.v3+json" }
          });
          if (response.ok) {
            const data = await response.json();
            latestVersion = data.tag_name?.replace(/^v/, "") || null;
            if (latestVersion && latestVersion !== VERSION) {
              const current = VERSION.split(".").map(Number);
              const latest = latestVersion.split(".").map(Number);
              for (let i = 0; i < 3; i++) {
                if ((latest[i] || 0) > (current[i] || 0)) {
                  updateAvailable = true;
                  break;
                } else if ((latest[i] || 0) < (current[i] || 0)) {
                  break;
                }
              }
            }
          }
        } catch {
          // Ignore fetch errors - just return current version
        }
        return new Response(JSON.stringify({
          current: VERSION,
          latest: latestVersion,
          updateAvailable,
          repo: GITHUB_REPO
        }), { headers });
      }

      // GET /api/projects - list all projects
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "projects") {
        const projects = await this.projectManager.scanProjects();
        return new Response(JSON.stringify(projects), { headers });
      }

      // GET /api/projects/active - get active project
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "projects" && pathParts[2] === "active") {
        const activeFile = this.projectManager.getActiveFile();
        const projects = await this.projectManager.scanProjects();
        const active = projects.find(p => p.filename === activeFile);
        return new Response(JSON.stringify({ filename: activeFile, project: active }), { headers });
      }

      // POST /api/projects/switch - switch project
      if (method === "POST" && pathParts.length === 3 && pathParts[1] === "projects" && pathParts[2] === "switch") {
        const body = await req.json();
        const success = await this.projectManager.switchProject(body.filename);
        if (success) {
          return new Response(JSON.stringify({ success: true, filename: body.filename }), { headers });
        }
        return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers });
      }

      // POST /api/projects/create - create new project
      if (method === "POST" && pathParts.length === 3 && pathParts[1] === "projects" && pathParts[2] === "create") {
        const body = await req.json();
        const filename = await this.projectManager.createProject(body.name);
        return new Response(JSON.stringify({ success: true, filename }), { status: 201, headers });
      }

      // GET /api/milestones
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "milestones") {
        const milestones = await this.parser.readMilestones();
        const tasks = await this.parser.readTasks();
        const result = milestones.map(m => {
          const linkedTasks = this.getTasksByMilestone(tasks, m.name);
          const completedCount = linkedTasks.filter(t => t.completed).length;
          return {
            ...m,
            taskCount: linkedTasks.length,
            completedCount,
            progress: linkedTasks.length > 0 ? Math.round((completedCount / linkedTasks.length) * 100) : 0,
          };
        });
        return new Response(JSON.stringify(result), { headers });
      }

      // POST /api/milestones
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "milestones") {
        const body = await req.json();
        const milestones = await this.parser.readMilestones();
        const id = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        milestones.push({ id, name: body.name, target: body.target, status: body.status || "open", description: body.description });
        await this.parser.saveMilestones(milestones);
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers });
      }

      // PUT /api/milestones/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "milestones") {
        const id = pathParts[2];
        const body = await req.json();
        const milestones = await this.parser.readMilestones();
        const index = milestones.findIndex(m => m.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        milestones[index] = { ...milestones[index], ...body };
        await this.parser.saveMilestones(milestones);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/milestones/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "milestones") {
        const id = pathParts[2];
        const milestones = await this.parser.readMilestones();
        const filtered = milestones.filter(m => m.id !== id);
        if (filtered.length === milestones.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveMilestones(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/ideas (returns ideas with computed backlinks)
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "ideas") {
        const ideas = await this.parser.readIdeasWithBacklinks();
        return new Response(JSON.stringify(ideas), { headers });
      }

      // POST /api/ideas
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "ideas") {
        const body = await req.json();
        const ideas = await this.parser.readIdeas();
        const id = crypto.randomUUID().substring(0, 8);
        ideas.push({ id, title: body.title, status: body.status || "new", category: body.category, created: new Date().toISOString().split("T")[0], description: body.description });
        await this.parser.saveIdeas(ideas);
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers });
      }

      // PUT /api/ideas/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "ideas") {
        const id = pathParts[2];
        const body = await req.json();
        const ideas = await this.parser.readIdeas();
        const index = ideas.findIndex(i => i.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        ideas[index] = { ...ideas[index], ...body };
        await this.parser.saveIdeas(ideas);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/ideas/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "ideas") {
        const id = pathParts[2];
        const ideas = await this.parser.readIdeas();
        const filtered = ideas.filter(i => i.id !== id);
        if (filtered.length === ideas.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveIdeas(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/retrospectives
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "retrospectives") {
        const retrospectives = await this.parser.readRetrospectives();
        return new Response(JSON.stringify(retrospectives), { headers });
      }

      // POST /api/retrospectives
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "retrospectives") {
        const body = await req.json();
        const retrospectives = await this.parser.readRetrospectives();
        const id = crypto.randomUUID().substring(0, 8);
        retrospectives.push({
          id,
          title: body.title,
          date: body.date || new Date().toISOString().split("T")[0],
          status: body.status || "open",
          continue: body.continue || [],
          stop: body.stop || [],
          start: body.start || [],
        });
        await this.parser.saveRetrospectives(retrospectives);
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers });
      }

      // PUT /api/retrospectives/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "retrospectives") {
        const id = pathParts[2];
        const body = await req.json();
        const retrospectives = await this.parser.readRetrospectives();
        const index = retrospectives.findIndex(r => r.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        retrospectives[index] = { ...retrospectives[index], ...body };
        await this.parser.saveRetrospectives(retrospectives);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/retrospectives/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "retrospectives") {
        const id = pathParts[2];
        const retrospectives = await this.parser.readRetrospectives();
        const filtered = retrospectives.filter(r => r.id !== id);
        if (filtered.length === retrospectives.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveRetrospectives(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/swot
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "swot") {
        const swotAnalyses = await this.parser.readSwotAnalyses();
        return new Response(JSON.stringify(swotAnalyses), { headers });
      }

      // POST /api/swot
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "swot") {
        const body = await req.json();
        const swotAnalyses = await this.parser.readSwotAnalyses();
        const id = crypto.randomUUID().substring(0, 8);
        swotAnalyses.push({
          id,
          title: body.title,
          date: body.date || new Date().toISOString().split("T")[0],
          strengths: body.strengths || [],
          weaknesses: body.weaknesses || [],
          opportunities: body.opportunities || [],
          threats: body.threats || [],
        });
        await this.parser.saveSwotAnalyses(swotAnalyses);
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers });
      }

      // PUT /api/swot/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "swot") {
        const id = pathParts[2];
        const body = await req.json();
        const swotAnalyses = await this.parser.readSwotAnalyses();
        const index = swotAnalyses.findIndex(s => s.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        swotAnalyses[index] = { ...swotAnalyses[index], ...body };
        await this.parser.saveSwotAnalyses(swotAnalyses);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/swot/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "swot") {
        const id = pathParts[2];
        const swotAnalyses = await this.parser.readSwotAnalyses();
        const filtered = swotAnalyses.filter(s => s.id !== id);
        if (filtered.length === swotAnalyses.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveSwotAnalyses(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/risk-analysis
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "risk-analysis") {
        const riskAnalyses = await this.parser.readRiskAnalyses();
        return new Response(JSON.stringify(riskAnalyses), { headers });
      }

      // POST /api/risk-analysis
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "risk-analysis") {
        const body = await req.json();
        const riskAnalyses = await this.parser.readRiskAnalyses();
        const newRisk = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title,
          date: body.date || new Date().toISOString().split("T")[0],
          highImpactHighProb: body.highImpactHighProb || [],
          highImpactLowProb: body.highImpactLowProb || [],
          lowImpactHighProb: body.lowImpactHighProb || [],
          lowImpactLowProb: body.lowImpactLowProb || [],
        };
        riskAnalyses.push(newRisk);
        await this.parser.saveRiskAnalyses(riskAnalyses);
        return new Response(JSON.stringify(newRisk), { status: 201, headers });
      }

      // PUT /api/risk-analysis/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "risk-analysis") {
        const id = pathParts[2];
        const body = await req.json();
        const riskAnalyses = await this.parser.readRiskAnalyses();
        const index = riskAnalyses.findIndex(r => r.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        riskAnalyses[index] = { ...riskAnalyses[index], ...body };
        await this.parser.saveRiskAnalyses(riskAnalyses);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/risk-analysis/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "risk-analysis") {
        const id = pathParts[2];
        const riskAnalyses = await this.parser.readRiskAnalyses();
        const filtered = riskAnalyses.filter(r => r.id !== id);
        if (filtered.length === riskAnalyses.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveRiskAnalyses(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/lean-canvas
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "lean-canvas") {
        const leanCanvases = await this.parser.readLeanCanvases();
        return new Response(JSON.stringify(leanCanvases), { headers });
      }

      // POST /api/lean-canvas
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "lean-canvas") {
        const body = await req.json();
        const leanCanvases = await this.parser.readLeanCanvases();
        const newCanvas = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title,
          date: body.date || new Date().toISOString().split("T")[0],
          problem: body.problem || [],
          solution: body.solution || [],
          uniqueValueProp: body.uniqueValueProp || [],
          unfairAdvantage: body.unfairAdvantage || [],
          customerSegments: body.customerSegments || [],
          existingAlternatives: body.existingAlternatives || [],
          keyMetrics: body.keyMetrics || [],
          highLevelConcept: body.highLevelConcept || [],
          channels: body.channels || [],
          earlyAdopters: body.earlyAdopters || [],
          costStructure: body.costStructure || [],
          revenueStreams: body.revenueStreams || [],
        };
        leanCanvases.push(newCanvas);
        await this.parser.saveLeanCanvases(leanCanvases);
        return new Response(JSON.stringify(newCanvas), { status: 201, headers });
      }

      // PUT /api/lean-canvas/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "lean-canvas") {
        const id = pathParts[2];
        const body = await req.json();
        const leanCanvases = await this.parser.readLeanCanvases();
        const index = leanCanvases.findIndex(c => c.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        leanCanvases[index] = { ...leanCanvases[index], ...body };
        await this.parser.saveLeanCanvases(leanCanvases);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/lean-canvas/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "lean-canvas") {
        const id = pathParts[2];
        const leanCanvases = await this.parser.readLeanCanvases();
        const filtered = leanCanvases.filter(c => c.id !== id);
        if (filtered.length === leanCanvases.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveLeanCanvases(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/business-model
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "business-model") {
        const canvases = await this.parser.readBusinessModelCanvases();
        return new Response(JSON.stringify(canvases), { headers });
      }

      // POST /api/business-model
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "business-model") {
        const body = await req.json();
        const canvases = await this.parser.readBusinessModelCanvases();
        const newCanvas = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title,
          date: body.date || new Date().toISOString().split("T")[0],
          keyPartners: body.keyPartners || [],
          keyActivities: body.keyActivities || [],
          keyResources: body.keyResources || [],
          valueProposition: body.valueProposition || [],
          customerRelationships: body.customerRelationships || [],
          channels: body.channels || [],
          customerSegments: body.customerSegments || [],
          costStructure: body.costStructure || [],
          revenueStreams: body.revenueStreams || [],
        };
        canvases.push(newCanvas);
        await this.parser.saveBusinessModelCanvases(canvases);
        return new Response(JSON.stringify(newCanvas), { status: 201, headers });
      }

      // PUT /api/business-model/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "business-model") {
        const id = pathParts[2];
        const body = await req.json();
        const canvases = await this.parser.readBusinessModelCanvases();
        const index = canvases.findIndex(c => c.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        canvases[index] = { ...canvases[index], ...body };
        await this.parser.saveBusinessModelCanvases(canvases);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // DELETE /api/business-model/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "business-model") {
        const id = pathParts[2];
        const canvases = await this.parser.readBusinessModelCanvases();
        const filtered = canvases.filter(c => c.id !== id);
        if (filtered.length === canvases.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveBusinessModelCanvases(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/project-value-board - get all project value boards
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "project-value-board") {
        const boards = await this.parser.readProjectValueBoards();
        return new Response(JSON.stringify(boards), { headers });
      }

      // POST /api/project-value-board - create new project value board
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "project-value-board") {
        const boards = await this.parser.readProjectValueBoards();
        const body = await req.json();
        const newBoard = {
          id: crypto.randomUUID(),
          title: body.title || "New Board",
          date: body.date || new Date().toISOString().split("T")[0],
          customerSegments: body.customerSegments || [],
          problem: body.problem || [],
          solution: body.solution || [],
          benefit: body.benefit || [],
        };
        boards.push(newBoard);
        await this.parser.saveProjectValueBoards(boards);
        return new Response(JSON.stringify(newBoard), { status: 201, headers });
      }

      // PUT /api/project-value-board/:id - update project value board
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "project-value-board") {
        const id = pathParts[2];
        const boards = await this.parser.readProjectValueBoards();
        const index = boards.findIndex(b => b.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        const body = await req.json();
        boards[index] = { ...boards[index], ...body };
        await this.parser.saveProjectValueBoards(boards);
        return new Response(JSON.stringify(boards[index]), { headers });
      }

      // DELETE /api/project-value-board/:id - delete project value board
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "project-value-board") {
        const id = pathParts[2];
        const boards = await this.parser.readProjectValueBoards();
        const filtered = boards.filter(b => b.id !== id);
        if (filtered.length === boards.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveProjectValueBoards(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/brief - get all briefs
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "brief") {
        const briefs = await this.parser.readBriefs();
        return new Response(JSON.stringify(briefs), { headers });
      }

      // POST /api/brief - create new brief
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "brief") {
        const briefs = await this.parser.readBriefs();
        const body = await req.json();
        const newBrief = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title || "New Brief",
          date: body.date || new Date().toISOString().split("T")[0],
          summary: body.summary || [],
          mission: body.mission || [],
          responsible: body.responsible || [],
          accountable: body.accountable || [],
          consulted: body.consulted || [],
          informed: body.informed || [],
          highLevelBudget: body.highLevelBudget || [],
          highLevelTimeline: body.highLevelTimeline || [],
          culture: body.culture || [],
          changeCapacity: body.changeCapacity || [],
          guidingPrinciples: body.guidingPrinciples || [],
        };
        briefs.push(newBrief);
        await this.parser.saveBriefs(briefs);
        return new Response(JSON.stringify(newBrief), { status: 201, headers });
      }

      // PUT /api/brief/:id - update brief
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "brief") {
        const id = pathParts[2];
        const briefs = await this.parser.readBriefs();
        const index = briefs.findIndex(b => b.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        const body = await req.json();
        briefs[index] = { ...briefs[index], ...body };
        await this.parser.saveBriefs(briefs);
        return new Response(JSON.stringify(briefs[index]), { headers });
      }

      // DELETE /api/brief/:id - delete brief
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "brief") {
        const id = pathParts[2];
        const briefs = await this.parser.readBriefs();
        const filtered = briefs.filter(b => b.id !== id);
        if (filtered.length === briefs.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveBriefs(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/time-entries - get all time entries
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "time-entries") {
        const timeEntries = await this.parser.readTimeEntries();
        const result: Record<string, unknown[]> = {};
        for (const [taskId, entries] of timeEntries) {
          result[taskId] = entries;
        }
        return new Response(JSON.stringify(result), { headers });
      }

      // GET /api/time-entries/:taskId - get time entries for a specific task
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "time-entries") {
        const taskId = pathParts[2];
        const entries = await this.parser.getTimeEntriesForTask(taskId);
        return new Response(JSON.stringify(entries), { headers });
      }

      // POST /api/time-entries/:taskId - add time entry to a task
      if (method === "POST" && pathParts.length === 3 && pathParts[1] === "time-entries") {
        const taskId = pathParts[2];
        const body = await req.json();
        const id = await this.parser.addTimeEntry(taskId, {
          date: body.date || new Date().toISOString().split("T")[0],
          hours: body.hours || 0,
          person: body.person,
          description: body.description,
        });
        return new Response(JSON.stringify({ success: true, id }), { status: 201, headers });
      }

      // DELETE /api/time-entries/:taskId/:entryId - delete a time entry
      if (method === "DELETE" && pathParts.length === 4 && pathParts[1] === "time-entries") {
        const taskId = pathParts[2];
        const entryId = pathParts[3];
        const success = await this.parser.deleteTimeEntry(taskId, entryId);
        if (!success) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/tasks
      if (
        method === "GET" && pathParts.length === 2 && pathParts[1] === "tasks"
      ) {
        const tasks = await this.parser.readTasks();
        return new Response(JSON.stringify(tasks), { headers });
      }

      // GET /api/project
      if (
        method === "GET" && pathParts.length === 2 && pathParts[1] === "project"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        return new Response(JSON.stringify(projectInfo), { headers });
      }

      // GET /api/project/config
      if (
        method === "GET" && pathParts.length === 3 &&
        pathParts[1] === "project" && pathParts[2] === "config"
      ) {
        const config = await this.parser.readProjectConfig();
        return new Response(JSON.stringify(config), { headers });
      }

      // GET /api/project/sections
      if (
        method === "GET" && pathParts.length === 3 &&
        pathParts[1] === "project" && pathParts[2] === "sections"
      ) {
        const sections = this.parser.getSectionsFromBoard();
        return new Response(JSON.stringify(sections), { headers });
      }

      // POST /api/project/config
      if (
        method === "POST" && pathParts.length === 3 &&
        pathParts[1] === "project" && pathParts[2] === "config"
      ) {
        const config = await req.json();
        const success = await this.parser.saveProjectConfig(config);
        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(
            JSON.stringify({ error: "Failed to save config" }),
            {
              status: 500,
              headers,
            },
          );
        }
      }

      // POST /api/project/rewrite
      if (
        method === "POST" && pathParts.length === 3 &&
        pathParts[1] === "project" && pathParts[2] === "rewrite"
      ) {
        console.log("Rewrite endpoint called");
        const body = await req.json();
        const tasks = await this.parser.readTasks();
        console.log("Current tasks count:", tasks.length);
        await this.parser.writeTasks(tasks, body.sections);
        console.log("Tasks rewritten with sections:", body.sections);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/tasks
      if (
        method === "POST" && pathParts.length === 2 && pathParts[1] === "tasks"
      ) {
        const body = await req.json();
        const taskId = await this.parser.addTask(body);
        return new Response(JSON.stringify({ id: taskId }), {
          status: 201,
          headers,
        });
      }

      // PUT /api/tasks/:id
      if (
        method === "PUT" && pathParts.length === 3 && pathParts[1] === "tasks"
      ) {
        const taskId = pathParts[2];
        const updates = await req.json();
        const success = await this.parser.updateTask(taskId, updates);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Task not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // DELETE /api/tasks/:id
      if (
        method === "DELETE" && pathParts.length === 3 &&
        pathParts[1] === "tasks"
      ) {
        const taskId = pathParts[2];
        const success = await this.parser.deleteTask(taskId);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Task not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // PATCH /api/tasks/:id/move
      if (
        method === "PATCH" && pathParts.length === 4 &&
        pathParts[1] === "tasks" && pathParts[3] === "move"
      ) {
        const taskId = pathParts[2];
        const { section } = await req.json();
        const success = await this.parser.updateTask(taskId, { section });

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Task not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // GET /api/tasks/:id
      if (
        method === "GET" && pathParts.length === 3 && pathParts[1] === "tasks"
      ) {
        const taskId = pathParts[2];
        const tasks = await this.parser.readTasks();
        const task = this.findTaskById(tasks, taskId);

        if (task) {
          return new Response(JSON.stringify(task), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Task not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // Notes API endpoints
      // GET /api/notes
      if (
        method === "GET" && pathParts.length === 2 && pathParts[1] === "notes"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        return new Response(JSON.stringify(projectInfo.notes), {
          headers,
        });
      }

      // POST /api/notes
      if (
        method === "POST" && pathParts.length === 2 && pathParts[1] === "notes"
      ) {
        const body = await req.json();
        const noteId = await this.parser.addNote(body);
        return new Response(JSON.stringify({ id: noteId }), {
          status: 201,
          headers,
        });
      }

      // PUT /api/notes/:id
      if (
        method === "PUT" && pathParts.length === 3 && pathParts[1] === "notes"
      ) {
        const noteId = pathParts[2];
        const updates = await req.json();
        const success = await this.parser.updateNote(noteId, updates);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Note not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // DELETE /api/notes/:id
      if (
        method === "DELETE" && pathParts.length === 3 &&
        pathParts[1] === "notes"
      ) {
        const noteId = pathParts[2];
        const success = await this.parser.deleteNote(noteId);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Note not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // GET /api/notes/:id
      if (
        method === "GET" && pathParts.length === 3 && pathParts[1] === "notes"
      ) {
        const noteId = pathParts[2];
        const projectInfo = await this.parser.readProjectInfo();
        const note = projectInfo.notes.find((n) => n.id === noteId);

        if (note) {
          return new Response(JSON.stringify(note), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Note not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // Goals API endpoints
      // GET /api/goals
      if (
        method === "GET" && pathParts.length === 2 && pathParts[1] === "goals"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        return new Response(JSON.stringify(projectInfo.goals), {
          headers,
        });
      }

      // POST /api/goals
      if (
        method === "POST" && pathParts.length === 2 && pathParts[1] === "goals"
      ) {
        const body = await req.json();
        const goalId = await this.parser.addGoal(body);
        return new Response(JSON.stringify({ id: goalId }), {
          status: 201,
          headers,
        });
      }

      // PUT /api/goals/:id
      if (
        method === "PUT" && pathParts.length === 3 && pathParts[1] === "goals"
      ) {
        const goalId = pathParts[2];
        const updates = await req.json();
        const success = await this.parser.updateGoal(goalId, updates);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Goal not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // DELETE /api/goals/:id
      if (
        method === "DELETE" && pathParts.length === 3 &&
        pathParts[1] === "goals"
      ) {
        const goalId = pathParts[2];
        const success = await this.parser.deleteGoal(goalId);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Goal not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // GET /api/goals/:id
      if (
        method === "GET" && pathParts.length === 3 && pathParts[1] === "goals"
      ) {
        const goalId = pathParts[2];
        const projectInfo = await this.parser.readProjectInfo();
        const goal = projectInfo.goals.find((g) => g.id === goalId);

        if (goal) {
          return new Response(JSON.stringify(goal), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Goal not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // Canvas API endpoints
      // GET /api/canvas/sticky_notes
      if (
        method === "GET" && pathParts.length === 3 &&
        pathParts[1] === "canvas" && pathParts[2] === "sticky_notes"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        return new Response(JSON.stringify(projectInfo.stickyNotes), {
          headers,
        });
      }

      // POST /api/canvas/sticky_notes
      if (
        method === "POST" && pathParts.length === 3 &&
        pathParts[1] === "canvas" && pathParts[2] === "sticky_notes"
      ) {
        const body = await req.json();
        const stickyNoteId = await this.parser.addStickyNote(body);
        return new Response(JSON.stringify({ id: stickyNoteId }), {
          status: 201,
          headers,
        });
      }

      // PUT /api/canvas/sticky_notes/:id
      if (
        method === "PUT" && pathParts.length === 4 &&
        pathParts[1] === "canvas" && pathParts[2] === "sticky_notes"
      ) {
        const stickyNoteId = pathParts[3];
        const updates = await req.json();
        const success = await this.parser.updateStickyNote(
          stickyNoteId,
          updates,
        );

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(
            JSON.stringify({ error: "Sticky note not found" }),
            {
              status: 404,
              headers,
            },
          );
        }
      }

      // DELETE /api/canvas/sticky_notes/:id
      if (
        method === "DELETE" && pathParts.length === 4 &&
        pathParts[1] === "canvas" && pathParts[2] === "sticky_notes"
      ) {
        const stickyNoteId = pathParts[3];
        const success = await this.parser.deleteStickyNote(stickyNoteId);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(
            JSON.stringify({ error: "Sticky note not found" }),
            {
              status: 404,
              headers,
            },
          );
        }
      }

      // Mindmap API endpoints
      // GET /api/mindmaps
      if (
        method === "GET" && pathParts.length === 2 &&
        pathParts[1] === "mindmaps"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        return new Response(JSON.stringify(projectInfo.mindmaps), {
          headers,
        });
      }

      // POST /api/mindmaps
      if (
        method === "POST" && pathParts.length === 2 &&
        pathParts[1] === "mindmaps"
      ) {
        const body = await req.json();
        const mindmapId = await this.parser.addMindmap(body);
        return new Response(JSON.stringify({ id: mindmapId }), {
          status: 201,
          headers,
        });
      }

      // PUT /api/mindmaps/:id
      if (
        method === "PUT" && pathParts.length === 3 &&
        pathParts[1] === "mindmaps"
      ) {
        const mindmapId = pathParts[2];
        const updates = await req.json();
        const success = await this.parser.updateMindmap(mindmapId, updates);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Mindmap not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // DELETE /api/mindmaps/:id
      if (
        method === "DELETE" && pathParts.length === 3 &&
        pathParts[1] === "mindmaps"
      ) {
        const mindmapId = pathParts[2];
        const success = await this.parser.deleteMindmap(mindmapId);

        if (success) {
          return new Response(JSON.stringify({ success: true }), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Mindmap not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // GET /api/mindmaps/:id
      if (
        method === "GET" && pathParts.length === 3 &&
        pathParts[1] === "mindmaps"
      ) {
        const mindmapId = pathParts[2];
        const projectInfo = await this.parser.readProjectInfo();
        const mindmap = projectInfo.mindmaps.find((m) => m.id === mindmapId);

        if (mindmap) {
          return new Response(JSON.stringify(mindmap), { headers });
        } else {
          return new Response(JSON.stringify({ error: "Mindmap not found" }), {
            status: 404,
            headers,
          });
        }
      }

      // CSV Export endpoints
      // GET /api/export/csv/tasks
      if (
        method === "GET" && pathParts.length === 4 &&
        pathParts[1] === "export" && pathParts[2] === "csv" &&
        pathParts[3] === "tasks"
      ) {
        const tasks = await this.parser.readTasks();
        const csv = this.convertTasksToCSV(tasks);
        return new Response(csv, {
          headers: {
            ...headers,
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=tasks.csv",
          },
        });
      }

      // POST /api/import/csv/tasks
      if (
        method === "POST" && pathParts.length === 4 &&
        pathParts[1] === "import" && pathParts[2] === "csv" &&
        pathParts[3] === "tasks"
      ) {
        const body = await req.text();
        const importedTasks = this.parseTasksCSV(body);
        const existingTasks = await this.parser.readTasks();

        // Filter out tasks that already exist by title to avoid duplicates
        const existingTitles = new Set(existingTasks.map((t) => t.title));
        const newTasks = importedTasks.filter((t) =>
          !existingTitles.has(t.title)
        );

        if (newTasks.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              imported: 0,
              message: "No new tasks to import (all tasks already exist)",
            }),
            { headers },
          );
        }

        // Use a safer direct markdown append method
        const importedCount = await this.appendTasksToMarkdown(newTasks);

        return new Response(
          JSON.stringify({ success: true, imported: importedCount }),
          { headers },
        );
      }

      // POST /api/import/csv/canvas
      if (
        method === "POST" && pathParts.length === 4 &&
        pathParts[1] === "import" && pathParts[2] === "csv" &&
        pathParts[3] === "canvas"
      ) {
        const body = await req.text();
        const stickyNotes = this.parseCanvasCSV(body);
        const projectInfo = await this.parser.readProjectInfo();
        projectInfo.stickyNotes = stickyNotes;
        await this.parser.saveProjectInfo(projectInfo);
        return new Response(
          JSON.stringify({ success: true, imported: stickyNotes.length }),
          { headers },
        );
      }

      // GET /api/export/pdf/report
      if (
        method === "GET" && pathParts.length === 4 &&
        pathParts[1] === "export" && pathParts[2] === "pdf" &&
        pathParts[3] === "report"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        const tasks = await this.parser.readTasks();
        const config = await this.parser.readProjectConfig();

        const html = this.generateProjectReportHTML(projectInfo, tasks, config);

        return new Response(html, {
          headers: {
            ...headers,
            "Content-Type": "text/html",
            "Content-Disposition": "inline; filename=project-report.html",
          },
        });
      }

      // C4 Architecture API endpoints
      // GET /api/c4
      if (
        method === "GET" && pathParts.length === 2 && pathParts[1] === "c4"
      ) {
        const projectInfo = await this.parser.readProjectInfo();
        const c4Components = projectInfo.c4Components || [];
        return new Response(JSON.stringify({ components: c4Components }), { headers });
      }

      // POST /api/c4
      if (
        method === "POST" && pathParts.length === 2 && pathParts[1] === "c4"
      ) {
        const body = await req.json();
        const projectInfo = await this.parser.readProjectInfo();
        projectInfo.c4Components = body.components || [];

        try {
          await this.parser.saveProjectInfo(projectInfo);
          return new Response(JSON.stringify({ success: true }), { headers });
        } catch (error) {
          console.error("Failed to save C4 components:", error);
          return new Response(
            JSON.stringify({ error: "Failed to save C4 components" }),
            {
              status: 500,
              headers,
            },
          );
        }
      }

      // Capacity Planning API endpoints
      // GET /api/capacity - list all capacity plans
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "capacity") {
        const plans = await this.parser.readCapacityPlans();
        return new Response(JSON.stringify(plans), { headers });
      }

      // POST /api/capacity - create new capacity plan
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "capacity") {
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const newPlan = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title || "New Capacity Plan",
          date: body.date || new Date().toISOString().split("T")[0],
          budgetHours: body.budgetHours,
          teamMembers: body.teamMembers || [],
          allocations: body.allocations || [],
        };
        plans.push(newPlan);
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(newPlan), { status: 201, headers });
      }

      // GET /api/capacity/:id - get single capacity plan
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "capacity") {
        const id = pathParts[2];
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === id);
        if (!plan) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(plan), { headers });
      }

      // PUT /api/capacity/:id - update capacity plan
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "capacity") {
        const id = pathParts[2];
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const index = plans.findIndex(p => p.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        plans[index] = { ...plans[index], ...body };
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(plans[index]), { headers });
      }

      // DELETE /api/capacity/:id - delete capacity plan
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "capacity") {
        const id = pathParts[2];
        const plans = await this.parser.readCapacityPlans();
        const filtered = plans.filter(p => p.id !== id);
        if (filtered.length === plans.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveCapacityPlans(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/capacity/:id/members - add team member
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "capacity" && pathParts[3] === "members") {
        const planId = pathParts[2];
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const newMember = {
          id: crypto.randomUUID().substring(0, 8),
          name: body.name,
          role: body.role,
          hoursPerDay: body.hoursPerDay || 8,
          workingDays: body.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
        };
        plan.teamMembers.push(newMember);
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(newMember), { status: 201, headers });
      }

      // PUT /api/capacity/:id/members/:mid - update team member
      if (method === "PUT" && pathParts.length === 5 && pathParts[1] === "capacity" && pathParts[3] === "members") {
        const planId = pathParts[2];
        const memberId = pathParts[4];
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const memberIndex = plan.teamMembers.findIndex(m => m.id === memberId);
        if (memberIndex === -1) return new Response(JSON.stringify({ error: "Member not found" }), { status: 404, headers });

        plan.teamMembers[memberIndex] = { ...plan.teamMembers[memberIndex], ...body };
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(plan.teamMembers[memberIndex]), { headers });
      }

      // DELETE /api/capacity/:id/members/:mid - delete team member
      if (method === "DELETE" && pathParts.length === 5 && pathParts[1] === "capacity" && pathParts[3] === "members") {
        const planId = pathParts[2];
        const memberId = pathParts[4];
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const filtered = plan.teamMembers.filter(m => m.id !== memberId);
        if (filtered.length === plan.teamMembers.length) return new Response(JSON.stringify({ error: "Member not found" }), { status: 404, headers });

        plan.teamMembers = filtered;
        // Also remove allocations for this member
        plan.allocations = plan.allocations.filter(a => a.memberId !== memberId);
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/capacity/:id/allocations - add allocation
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "capacity" && pathParts[3] === "allocations") {
        const planId = pathParts[2];
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const newAllocation = {
          id: crypto.randomUUID().substring(0, 8),
          memberId: body.memberId,
          weekStart: body.weekStart,
          allocatedHours: body.allocatedHours || 0,
          targetType: body.targetType || "project",
          targetId: body.targetId,
          notes: body.notes,
        };
        plan.allocations.push(newAllocation);
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(newAllocation), { status: 201, headers });
      }

      // PUT /api/capacity/:id/allocations/:aid - update allocation
      if (method === "PUT" && pathParts.length === 5 && pathParts[1] === "capacity" && pathParts[3] === "allocations") {
        const planId = pathParts[2];
        const allocId = pathParts[4];
        const body = await req.json();
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const allocIndex = plan.allocations.findIndex(a => a.id === allocId);
        if (allocIndex === -1) return new Response(JSON.stringify({ error: "Allocation not found" }), { status: 404, headers });

        plan.allocations[allocIndex] = { ...plan.allocations[allocIndex], ...body };
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify(plan.allocations[allocIndex]), { headers });
      }

      // DELETE /api/capacity/:id/allocations/:aid - delete allocation
      if (method === "DELETE" && pathParts.length === 5 && pathParts[1] === "capacity" && pathParts[3] === "allocations") {
        const planId = pathParts[2];
        const allocId = pathParts[4];
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const filtered = plan.allocations.filter(a => a.id !== allocId);
        if (filtered.length === plan.allocations.length) return new Response(JSON.stringify({ error: "Allocation not found" }), { status: 404, headers });

        plan.allocations = filtered;
        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/capacity/:id/utilization - get utilization report
      if (method === "GET" && pathParts.length === 4 && pathParts[1] === "capacity" && pathParts[3] === "utilization") {
        const planId = pathParts[2];
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        // Get time entries for actual hours
        const timeEntries = await this.parser.readTimeEntries();

        const utilization = plan.teamMembers.map(member => {
          const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
          const allocatedByWeek = new Map<string, number>();

          for (const alloc of plan.allocations.filter(a => a.memberId === member.id)) {
            const current = allocatedByWeek.get(alloc.weekStart) || 0;
            allocatedByWeek.set(alloc.weekStart, current + alloc.allocatedHours);
          }

          // Calculate actual hours from time entries
          let actualHours = 0;
          for (const [, entries] of timeEntries) {
            for (const entry of entries) {
              if (entry.person === member.name || entry.person === member.id) {
                actualHours += entry.hours;
              }
            }
          }

          const totalAllocated = Array.from(allocatedByWeek.values()).reduce((a, b) => a + b, 0);

          return {
            memberId: member.id,
            memberName: member.name,
            weeklyCapacity,
            allocatedByWeek: Object.fromEntries(allocatedByWeek),
            totalAllocated,
            actualHours,
            utilizationPercent: weeklyCapacity > 0 ? Math.round((totalAllocated / weeklyCapacity) * 100) : 0,
          };
        });

        return new Response(JSON.stringify(utilization), { headers });
      }

      // GET /api/capacity/:id/suggest-assignments - auto-assign suggestions
      if (method === "GET" && pathParts.length === 4 && pathParts[1] === "capacity" && pathParts[3] === "suggest-assignments") {
        const planId = pathParts[2];
        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        const tasks = await this.parser.readTasks();
        const unassignedTasks = this.getUnassignedTasks(tasks).sort((a, b) => (a.config.priority || 999) - (b.config.priority || 999));

        // Calculate current week
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(monday.getDate() - monday.getDay() + 1);
        const weekStart = monday.toISOString().split("T")[0];

        // Calculate remaining capacity for each member
        const memberCapacity = new Map<string, number>();
        for (const member of plan.teamMembers) {
          const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
          const allocated = plan.allocations
            .filter(a => a.memberId === member.id && a.weekStart === weekStart)
            .reduce((sum, a) => sum + a.allocatedHours, 0);
          memberCapacity.set(member.id, weeklyCapacity - allocated);
        }

        const suggestions: Array<{ taskId: string; taskTitle: string; memberId: string; memberName: string; hours: number; weekStart: string }> = [];

        for (const task of unassignedTasks) {
          const effort = task.config.effort || 8;

          // Find member with most available capacity
          let bestMember: { id: string; name: string } | null = null;
          let maxCapacity = 0;

          for (const member of plan.teamMembers) {
            const remaining = memberCapacity.get(member.id) || 0;
            if (remaining >= effort && remaining > maxCapacity) {
              maxCapacity = remaining;
              bestMember = { id: member.id, name: member.name };
            }
          }

          if (bestMember) {
            suggestions.push({
              taskId: task.id,
              taskTitle: task.title,
              memberId: bestMember.id,
              memberName: bestMember.name,
              hours: effort,
              weekStart,
            });
            memberCapacity.set(bestMember.id, (memberCapacity.get(bestMember.id) || 0) - effort);
          }
        }

        return new Response(JSON.stringify(suggestions), { headers });
      }

      // POST /api/capacity/:id/apply-assignments - apply auto-assign suggestions
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "capacity" && pathParts[3] === "apply-assignments") {
        const planId = pathParts[2];
        const body = await req.json();
        const suggestions = body.suggestions || [];

        const plans = await this.parser.readCapacityPlans();
        const plan = plans.find(p => p.id === planId);
        if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers });

        for (const suggestion of suggestions) {
          // Create allocation
          plan.allocations.push({
            id: crypto.randomUUID().substring(0, 8),
            memberId: suggestion.memberId,
            weekStart: suggestion.weekStart,
            allocatedHours: suggestion.hours,
            targetType: "task",
            targetId: suggestion.taskId,
          });

          // Update task assignee
          const member = plan.teamMembers.find(m => m.id === suggestion.memberId);
          if (member) {
            await this.parser.updateTask(suggestion.taskId, {
              config: { assignee: member.name }
            });
          }
        }

        await this.parser.saveCapacityPlans(plans);
        return new Response(JSON.stringify({ success: true, applied: suggestions.length }), { headers });
      }

      // GET /api/strategic-levels - list all strategic levels builders
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "strategic-levels") {
        const builders = await this.parser.readStrategicLevelsBuilders();
        return new Response(JSON.stringify(builders), { headers });
      }

      // POST /api/strategic-levels - create new strategic levels builder
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "strategic-levels") {
        const body = await req.json();
        const builders = await this.parser.readStrategicLevelsBuilders();
        const newBuilder = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title || "New Strategy",
          date: body.date || new Date().toISOString().split("T")[0],
          levels: body.levels || [],
        };
        builders.push(newBuilder);
        await this.parser.saveStrategicLevelsBuilders(builders);
        return new Response(JSON.stringify(newBuilder), { status: 201, headers });
      }

      // GET /api/strategic-levels/:id - get single strategic levels builder
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "strategic-levels") {
        const id = pathParts[2];
        const builders = await this.parser.readStrategicLevelsBuilders();
        const builder = builders.find(b => b.id === id);
        if (!builder) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(builder), { headers });
      }

      // PUT /api/strategic-levels/:id - update strategic levels builder
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "strategic-levels") {
        const id = pathParts[2];
        const body = await req.json();
        const builders = await this.parser.readStrategicLevelsBuilders();
        const index = builders.findIndex(b => b.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        builders[index] = { ...builders[index], ...body };
        await this.parser.saveStrategicLevelsBuilders(builders);
        return new Response(JSON.stringify(builders[index]), { headers });
      }

      // DELETE /api/strategic-levels/:id - delete strategic levels builder
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "strategic-levels") {
        const id = pathParts[2];
        const builders = await this.parser.readStrategicLevelsBuilders();
        const filtered = builders.filter(b => b.id !== id);
        if (filtered.length === builders.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveStrategicLevelsBuilders(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/strategic-levels/:id/levels - add level to builder
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "strategic-levels" && pathParts[3] === "levels") {
        const builderId = pathParts[2];
        const body = await req.json();
        const builders = await this.parser.readStrategicLevelsBuilders();
        const builder = builders.find(b => b.id === builderId);
        if (!builder) return new Response(JSON.stringify({ error: "Builder not found" }), { status: 404, headers });

        const newLevel = {
          id: crypto.randomUUID().substring(0, 8),
          title: body.title,
          description: body.description,
          level: body.level,
          parentId: body.parentId,
          order: builder.levels.filter(l => l.level === body.level).length,
          linkedTasks: body.linkedTasks || [],
          linkedMilestones: body.linkedMilestones || [],
        };
        builder.levels.push(newLevel);
        await this.parser.saveStrategicLevelsBuilders(builders);
        return new Response(JSON.stringify(newLevel), { status: 201, headers });
      }

      // PUT /api/strategic-levels/:id/levels/:levelId - update level
      if (method === "PUT" && pathParts.length === 5 && pathParts[1] === "strategic-levels" && pathParts[3] === "levels") {
        const builderId = pathParts[2];
        const levelId = pathParts[4];
        const body = await req.json();
        const builders = await this.parser.readStrategicLevelsBuilders();
        const builder = builders.find(b => b.id === builderId);
        if (!builder) return new Response(JSON.stringify({ error: "Builder not found" }), { status: 404, headers });

        const levelIndex = builder.levels.findIndex(l => l.id === levelId);
        if (levelIndex === -1) return new Response(JSON.stringify({ error: "Level not found" }), { status: 404, headers });

        builder.levels[levelIndex] = { ...builder.levels[levelIndex], ...body };
        await this.parser.saveStrategicLevelsBuilders(builders);
        return new Response(JSON.stringify(builder.levels[levelIndex]), { headers });
      }

      // DELETE /api/strategic-levels/:id/levels/:levelId - delete level
      if (method === "DELETE" && pathParts.length === 5 && pathParts[1] === "strategic-levels" && pathParts[3] === "levels") {
        const builderId = pathParts[2];
        const levelId = pathParts[4];
        const builders = await this.parser.readStrategicLevelsBuilders();
        const builder = builders.find(b => b.id === builderId);
        if (!builder) return new Response(JSON.stringify({ error: "Builder not found" }), { status: 404, headers });

        const filtered = builder.levels.filter(l => l.id !== levelId);
        if (filtered.length === builder.levels.length) return new Response(JSON.stringify({ error: "Level not found" }), { status: 404, headers });

        // Also remove this level as parent from any children
        builder.levels = filtered.map(l => {
          if (l.parentId === levelId) {
            return { ...l, parentId: undefined };
          }
          return l;
        });
        await this.parser.saveStrategicLevelsBuilders(builders);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // ================== CUSTOMER BILLING API ==================

      // GET /api/customers
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "customers") {
        const customers = await this.parser.readCustomers();
        return new Response(JSON.stringify(customers), { headers });
      }

      // GET /api/customers/:id
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "customers") {
        const id = pathParts[2];
        const customers = await this.parser.readCustomers();
        const customer = customers.find(c => c.id === id);
        if (!customer) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(customer), { headers });
      }

      // POST /api/customers
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "customers") {
        const body = await req.json();
        const customers = await this.parser.readCustomers();
        const id = crypto.randomUUID().substring(0, 8);
        const newCustomer = {
          id,
          name: body.name,
          email: body.email,
          phone: body.phone,
          company: body.company,
          billingAddress: body.billingAddress,
          notes: body.notes,
          created: new Date().toISOString().split("T")[0],
        };
        customers.push(newCustomer);
        await this.parser.saveCustomers(customers);
        return new Response(JSON.stringify(newCustomer), { status: 201, headers });
      }

      // PUT /api/customers/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "customers") {
        const id = pathParts[2];
        const body = await req.json();
        const customers = await this.parser.readCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        customers[index] = { ...customers[index], ...body };
        await this.parser.saveCustomers(customers);
        return new Response(JSON.stringify(customers[index]), { headers });
      }

      // DELETE /api/customers/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "customers") {
        const id = pathParts[2];
        const customers = await this.parser.readCustomers();
        const filtered = customers.filter(c => c.id !== id);
        if (filtered.length === customers.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveCustomers(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/billing-rates
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "billing-rates") {
        const rates = await this.parser.readBillingRates();
        return new Response(JSON.stringify(rates), { headers });
      }

      // POST /api/billing-rates
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "billing-rates") {
        const body = await req.json();
        const rates = await this.parser.readBillingRates();
        const id = crypto.randomUUID().substring(0, 8);
        const newRate = {
          id,
          name: body.name,
          hourlyRate: body.hourlyRate || 0,
          assignee: body.assignee,
          isDefault: body.isDefault,
        };
        rates.push(newRate);
        await this.parser.saveBillingRates(rates);
        return new Response(JSON.stringify(newRate), { status: 201, headers });
      }

      // PUT /api/billing-rates/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "billing-rates") {
        const id = pathParts[2];
        const body = await req.json();
        const rates = await this.parser.readBillingRates();
        const index = rates.findIndex(r => r.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        rates[index] = { ...rates[index], ...body };
        await this.parser.saveBillingRates(rates);
        return new Response(JSON.stringify(rates[index]), { headers });
      }

      // DELETE /api/billing-rates/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "billing-rates") {
        const id = pathParts[2];
        const rates = await this.parser.readBillingRates();
        const filtered = rates.filter(r => r.id !== id);
        if (filtered.length === rates.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveBillingRates(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // GET /api/quotes
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "quotes") {
        const quotes = await this.parser.readQuotes();
        return new Response(JSON.stringify(quotes), { headers });
      }

      // GET /api/quotes/:id
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "quotes") {
        const id = pathParts[2];
        const quotes = await this.parser.readQuotes();
        const quote = quotes.find(q => q.id === id);
        if (!quote) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(quote), { headers });
      }

      // POST /api/quotes
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "quotes") {
        const body = await req.json();
        const quotes = await this.parser.readQuotes();
        const id = crypto.randomUUID().substring(0, 8);
        const number = await this.parser.getNextQuoteNumber();
        const lineItems = body.lineItems || [];
        const subtotal = lineItems.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
        const tax = body.taxRate ? subtotal * (body.taxRate / 100) : 0;
        const newQuote = {
          id,
          number,
          customerId: body.customerId,
          title: body.title,
          status: body.status || "draft",
          validUntil: body.validUntil,
          lineItems,
          subtotal,
          tax,
          taxRate: body.taxRate,
          total: subtotal + tax,
          notes: body.notes,
          created: new Date().toISOString().split("T")[0],
        };
        quotes.push(newQuote);
        await this.parser.saveQuotes(quotes);
        return new Response(JSON.stringify(newQuote), { status: 201, headers });
      }

      // PUT /api/quotes/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "quotes") {
        const id = pathParts[2];
        const body = await req.json();
        const quotes = await this.parser.readQuotes();
        const index = quotes.findIndex(q => q.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });

        const updated = { ...quotes[index], ...body };
        // Recalculate totals if lineItems changed
        if (body.lineItems) {
          updated.subtotal = updated.lineItems.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
          updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : 0;
          updated.total = updated.subtotal + (updated.tax || 0);
        }
        quotes[index] = updated;
        await this.parser.saveQuotes(quotes);
        return new Response(JSON.stringify(quotes[index]), { headers });
      }

      // DELETE /api/quotes/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "quotes") {
        const id = pathParts[2];
        const quotes = await this.parser.readQuotes();
        const filtered = quotes.filter(q => q.id !== id);
        if (filtered.length === quotes.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveQuotes(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/quotes/:id/send - mark quote as sent
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "quotes" && pathParts[3] === "send") {
        const id = pathParts[2];
        const quotes = await this.parser.readQuotes();
        const index = quotes.findIndex(q => q.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        quotes[index].status = "sent";
        quotes[index].sentAt = new Date().toISOString().split("T")[0];
        await this.parser.saveQuotes(quotes);
        return new Response(JSON.stringify(quotes[index]), { headers });
      }

      // POST /api/quotes/:id/accept - mark quote as accepted
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "quotes" && pathParts[3] === "accept") {
        const id = pathParts[2];
        const quotes = await this.parser.readQuotes();
        const index = quotes.findIndex(q => q.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        quotes[index].status = "accepted";
        quotes[index].acceptedAt = new Date().toISOString().split("T")[0];
        await this.parser.saveQuotes(quotes);
        return new Response(JSON.stringify(quotes[index]), { headers });
      }

      // POST /api/quotes/:id/to-invoice - convert quote to invoice
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "quotes" && pathParts[3] === "to-invoice") {
        const id = pathParts[2];
        const quotes = await this.parser.readQuotes();
        const quote = quotes.find(q => q.id === id);
        if (!quote) return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers });

        const invoices = await this.parser.readInvoices();
        const invoiceId = crypto.randomUUID().substring(0, 8);
        const invoiceNumber = await this.parser.getNextInvoiceNumber();
        const newInvoice = {
          id: invoiceId,
          number: invoiceNumber,
          customerId: quote.customerId,
          quoteId: quote.id,
          title: quote.title,
          status: "draft" as const,
          lineItems: quote.lineItems.map(item => ({
            ...item,
            id: crypto.randomUUID().substring(0, 8),
          })),
          subtotal: quote.subtotal,
          tax: quote.tax,
          taxRate: quote.taxRate,
          total: quote.total,
          paidAmount: 0,
          notes: quote.notes,
          created: new Date().toISOString().split("T")[0],
        };
        invoices.push(newInvoice);
        await this.parser.saveInvoices(invoices);
        return new Response(JSON.stringify(newInvoice), { status: 201, headers });
      }

      // GET /api/invoices
      if (method === "GET" && pathParts.length === 2 && pathParts[1] === "invoices") {
        const invoices = await this.parser.readInvoices();
        return new Response(JSON.stringify(invoices), { headers });
      }

      // GET /api/invoices/:id
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "invoices") {
        const id = pathParts[2];
        const invoices = await this.parser.readInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        return new Response(JSON.stringify(invoice), { headers });
      }

      // POST /api/invoices
      if (method === "POST" && pathParts.length === 2 && pathParts[1] === "invoices") {
        const body = await req.json();
        const invoices = await this.parser.readInvoices();
        const id = crypto.randomUUID().substring(0, 8);
        const number = await this.parser.getNextInvoiceNumber();
        const lineItems = body.lineItems || [];
        const subtotal = lineItems.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
        const tax = body.taxRate ? subtotal * (body.taxRate / 100) : 0;
        const newInvoice = {
          id,
          number,
          customerId: body.customerId,
          quoteId: body.quoteId,
          title: body.title,
          status: body.status || "draft",
          dueDate: body.dueDate,
          lineItems,
          subtotal,
          tax,
          taxRate: body.taxRate,
          total: subtotal + tax,
          paidAmount: 0,
          notes: body.notes,
          created: new Date().toISOString().split("T")[0],
        };
        invoices.push(newInvoice);
        await this.parser.saveInvoices(invoices);
        return new Response(JSON.stringify(newInvoice), { status: 201, headers });
      }

      // PUT /api/invoices/:id
      if (method === "PUT" && pathParts.length === 3 && pathParts[1] === "invoices") {
        const id = pathParts[2];
        const body = await req.json();
        const invoices = await this.parser.readInvoices();
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });

        const updated = { ...invoices[index], ...body };
        // Recalculate totals if lineItems changed
        if (body.lineItems) {
          updated.subtotal = updated.lineItems.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
          updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : 0;
          updated.total = updated.subtotal + (updated.tax || 0);
        }
        invoices[index] = updated;
        await this.parser.saveInvoices(invoices);
        return new Response(JSON.stringify(invoices[index]), { headers });
      }

      // DELETE /api/invoices/:id
      if (method === "DELETE" && pathParts.length === 3 && pathParts[1] === "invoices") {
        const id = pathParts[2];
        const invoices = await this.parser.readInvoices();
        const filtered = invoices.filter(inv => inv.id !== id);
        if (filtered.length === invoices.length) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        await this.parser.saveInvoices(filtered);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // POST /api/invoices/:id/send - mark invoice as sent
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "invoices" && pathParts[3] === "send") {
        const id = pathParts[2];
        const invoices = await this.parser.readInvoices();
        const index = invoices.findIndex(inv => inv.id === id);
        if (index === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
        invoices[index].status = "sent";
        invoices[index].sentAt = new Date().toISOString().split("T")[0];
        await this.parser.saveInvoices(invoices);
        return new Response(JSON.stringify(invoices[index]), { headers });
      }

      // GET /api/invoices/:id/payments - get payments for an invoice
      if (method === "GET" && pathParts.length === 4 && pathParts[1] === "invoices" && pathParts[3] === "payments") {
        const invoiceId = pathParts[2];
        const payments = await this.parser.readPayments();
        const invoicePayments = payments.filter(p => p.invoiceId === invoiceId);
        return new Response(JSON.stringify(invoicePayments), { headers });
      }

      // POST /api/invoices/:id/payments - add payment to invoice
      if (method === "POST" && pathParts.length === 4 && pathParts[1] === "invoices" && pathParts[3] === "payments") {
        const invoiceId = pathParts[2];
        const body = await req.json();

        // Verify invoice exists
        const invoices = await this.parser.readInvoices();
        const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);
        if (invoiceIndex === -1) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers });

        // Add payment
        const payments = await this.parser.readPayments();
        const paymentId = crypto.randomUUID().substring(0, 8);
        const newPayment = {
          id: paymentId,
          invoiceId,
          amount: body.amount || 0,
          date: body.date || new Date().toISOString().split("T")[0],
          method: body.method,
          reference: body.reference,
          notes: body.notes,
        };
        payments.push(newPayment);
        await this.parser.savePayments(payments);

        // Update invoice paid amount and status
        invoices[invoiceIndex].paidAmount += newPayment.amount;
        if (invoices[invoiceIndex].paidAmount >= invoices[invoiceIndex].total) {
          invoices[invoiceIndex].status = "paid";
          invoices[invoiceIndex].paidAt = new Date().toISOString().split("T")[0];
        }
        await this.parser.saveInvoices(invoices);

        return new Response(JSON.stringify(newPayment), { status: 201, headers });
      }

      // POST /api/invoices/generate - generate invoice from time entries
      if (method === "POST" && pathParts.length === 3 && pathParts[1] === "invoices" && pathParts[2] === "generate") {
        const body = await req.json();
        const { customerId, taskIds, startDate, endDate, hourlyRate, title } = body;

        if (!customerId || !taskIds || !Array.isArray(taskIds)) {
          return new Response(JSON.stringify({ error: "customerId and taskIds are required" }), { status: 400, headers });
        }

        const timeEntries = await this.parser.readTimeEntries();
        const tasks = await this.parser.readTasks();

        const lineItems: { id: string; description: string; quantity: number; rate: number; amount: number; taskId: string; timeEntryIds: string[] }[] = [];

        for (const taskId of taskIds) {
          const entries = timeEntries.get(taskId) || [];
          const task = this.findTaskById(tasks, taskId);

          // Filter entries by date range
          const filteredEntries = entries.filter(entry => {
            if (startDate && entry.date < startDate) return false;
            if (endDate && entry.date > endDate) return false;
            return true;
          });

          if (filteredEntries.length > 0) {
            const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
            const rate = hourlyRate || 0;
            lineItems.push({
              id: crypto.randomUUID().substring(0, 8),
              description: task?.title || `Task ${taskId}`,
              quantity: totalHours,
              rate,
              amount: totalHours * rate,
              taskId,
              timeEntryIds: filteredEntries.map(e => e.id),
            });
          }
        }

        if (lineItems.length === 0) {
          return new Response(JSON.stringify({ error: "No time entries found for the specified criteria" }), { status: 400, headers });
        }

        const invoices = await this.parser.readInvoices();
        const id = crypto.randomUUID().substring(0, 8);
        const number = await this.parser.getNextInvoiceNumber();
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        const newInvoice = {
          id,
          number,
          customerId,
          title: title || `Time Entry Invoice - ${new Date().toISOString().split("T")[0]}`,
          status: "draft" as const,
          lineItems,
          subtotal,
          tax: 0,
          total: subtotal,
          paidAmount: 0,
          created: new Date().toISOString().split("T")[0],
        };

        invoices.push(newInvoice);
        await this.parser.saveInvoices(invoices);
        return new Response(JSON.stringify(newInvoice), { status: 201, headers });
      }

      // GET /api/billing/summary - get billing summary
      if (method === "GET" && pathParts.length === 3 && pathParts[1] === "billing" && pathParts[2] === "summary") {
        const invoices = await this.parser.readInvoices();
        const quotes = await this.parser.readQuotes();

        const today = new Date().toISOString().split("T")[0];

        const summary = {
          totalOutstanding: 0,
          totalOverdue: 0,
          totalPaid: 0,
          totalInvoiced: 0,
          pendingQuotes: 0,
          acceptedQuotes: 0,
          draftInvoices: 0,
          sentInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
        };

        for (const invoice of invoices) {
          summary.totalInvoiced += invoice.total;
          summary.totalPaid += invoice.paidAmount;

          if (invoice.status === "draft") {
            summary.draftInvoices++;
          } else if (invoice.status === "sent") {
            summary.sentInvoices++;
            summary.totalOutstanding += (invoice.total - invoice.paidAmount);
            if (invoice.dueDate && invoice.dueDate < today) {
              summary.overdueInvoices++;
              summary.totalOverdue += (invoice.total - invoice.paidAmount);
            }
          } else if (invoice.status === "paid") {
            summary.paidInvoices++;
          } else if (invoice.status === "overdue") {
            summary.overdueInvoices++;
            summary.totalOverdue += (invoice.total - invoice.paidAmount);
            summary.totalOutstanding += (invoice.total - invoice.paidAmount);
          }
        }

        for (const quote of quotes) {
          if (quote.status === "sent") {
            summary.pendingQuotes++;
          } else if (quote.status === "accepted") {
            summary.acceptedQuotes++;
          }
        }

        return new Response(JSON.stringify(summary), { headers });
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers,
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers,
      });
    }
  }

  private findTaskById(tasks: Task[], id: string): Task | null {
    for (const task of tasks) {
      if (task.id === id) {
        return task;
      }
      if (task.children) {
        const found = this.findTaskById(task.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private getTasksByMilestone(tasks: Task[], milestone: string): Task[] {
    const result: Task[] = [];
    const collect = (taskList: Task[]) => {
      for (const task of taskList) {
        if (task.config.milestone === milestone) result.push(task);
        if (task.children) collect(task.children);
      }
    };
    collect(tasks);
    return result;
  }

  private getUnassignedTasks(tasks: Task[]): Task[] {
    const result: Task[] = [];
    const collect = (taskList: Task[]) => {
      for (const task of taskList) {
        if (!task.completed && !task.config.assignee) {
          result.push(task);
        }
        if (task.children) collect(task.children);
      }
    };
    collect(tasks);
    return result;
  }

  private convertTasksToCSV(tasks: Task[]): string {
    const headers = [
      "ID",
      "Title",
      "Section",
      "Completed",
      "Priority",
      "Assignee",
      "Due Date",
      "Effort",
      "Tags",
      "Blocked By",
      "Milestone",
      "Description",
      "Parent ID",
    ];
    let csv = headers.join(",") + "\n";

    const flatTasks = this.flattenTasksWithParent(tasks);

    for (const task of flatTasks) {
      const row = [
        this.escapeCSV(task.id),
        this.escapeCSV(task.title),
        this.escapeCSV(task.section),
        task.completed ? "TRUE" : "FALSE",
        this.escapeCSV(task.config.priority?.toString() || ""),
        this.escapeCSV(task.config.assignee || ""),
        this.escapeCSV(task.config.due_date || ""),
        this.escapeCSV(task.config.effort?.toString() || ""),
        this.escapeCSV(task.config.tag?.join(", ") || ""),
        this.escapeCSV(task.config.blocked_by?.join(", ") || ""),
        this.escapeCSV(task.config.milestone || ""),
        this.escapeCSV(task.description?.join(" ") || ""),
        this.escapeCSV(task.parentId || ""),
      ];
      csv += row.join(",") + "\n";
    }

    return csv;
  }

  private parseTasksCSV(csvContent: string): Task[] {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) return [];

    const tasks: Array<Task & { parentId?: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= 4) {
        const task: Task & { parentId?: string } = {
          id: values[0] || `task_${Date.now()}_${i}`,
          title: values[1] || "",
          section: values[2] || "Backlog",
          completed: values[3]?.toUpperCase() === "TRUE",
          config: {
            priority: values[4] ? parseInt(values[4]) : undefined,
            assignee: values[5] || undefined,
            due_date: values[6] || undefined,
            effort: values[7] ? parseInt(values[7]) : undefined,
            tag: values[8]
              ? values[8].split(", ").filter((t) => t.trim())
              : undefined,
            blocked_by: values[9]
              ? values[9].split(", ").filter((t) => t.trim())
              : undefined,
            milestone: values[10] || undefined,
          },
          description: values[11] ? [values[11]] : undefined,
          parentId: values[12] || undefined,
        };

        tasks.push(task);
      }
    }

    return this.buildTaskHierarchy(tasks);
  }

  private buildTaskHierarchy(flatTasks: Array<Task & { parentId?: string }>): Task[] {
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];

    // First pass: create all tasks
    for (const task of flatTasks) {
      const { parentId, ...taskWithoutParentId } = task;
      taskMap.set(task.id, { ...taskWithoutParentId, children: [] });
    }

    // Second pass: build hierarchy
    for (const task of flatTasks) {
      const taskObj = taskMap.get(task.id)!;
      
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(taskObj);
      } else {
        rootTasks.push(taskObj);
      }
    }

    return rootTasks;
  }

  private parseCanvasCSV(csvContent: string): any[] {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    const stickyNotes = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= 5) {
        const stickyNote = {
          id: values[0] || `sticky_note_${Date.now()}_${i}`,
          content: values[1] || "",
          color: values[2] || "yellow",
          position: {
            x: parseInt(values[3]) || 0,
            y: parseInt(values[4]) || 0,
          },
        };

        if (values[5] && values[6]) {
          stickyNote.size = {
            width: parseInt(values[5]) || 200,
            height: parseInt(values[6]) || 150,
          };
        }

        stickyNotes.push(stickyNote);
      }
    }

    return stickyNotes;
  }

  private flattenTasks(tasks: Task[]): Task[] {
    const flattened: Task[] = [];
    for (const task of tasks) {
      flattened.push(task);
      if (task.children && task.children.length > 0) {
        flattened.push(...this.flattenTasks(task.children));
      }
    }
    return flattened;
  }

  private flattenTasksWithParent(tasks: Task[], parentId?: string): Array<Task & { parentId?: string }> {
    const flattened: Array<Task & { parentId?: string }> = [];
    for (const task of tasks) {
      const taskWithParent = { ...task, parentId };
      flattened.push(taskWithParent);
      if (task.children && task.children.length > 0) {
        flattened.push(...this.flattenTasksWithParent(task.children, task.id));
      }
    }
    return flattened;
  }

  private escapeCSV(value: string): string {
    if (!value) return '""';
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private generateProjectReportHTML(
    projectInfo: any,
    tasks: Task[],
    config: any,
  ): string {
    const totalTasks = this.flattenTasks(tasks).length;
    const completedTasks =
      this.flattenTasks(tasks).filter((t) => t.completed).length;
    const progressPercent = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Get section statistics
    const sections = [...new Set(tasks.map((t) => t.section))];
    const sectionStats = sections.map((section) => {
      const sectionTasks = tasks.filter((t) => t.section === section);
      const sectionCompleted = sectionTasks.filter((t) => t.completed).length;
      return {
        name: section,
        total: sectionTasks.length,
        completed: sectionCompleted,
        progress: sectionTasks.length > 0
          ? Math.round((sectionCompleted / sectionTasks.length) * 100)
          : 0,
      };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Report - ${projectInfo.name}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        @media print {
            body { font-size: 12px; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #3b82f6;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #666;
            font-size: 1.1em;
            margin-top: 10px;
        }
        .section {
            margin-bottom: 25px;
            break-inside: avoid;
        }
        .section h2 {
            color: #3b82f6;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        .progress-bar {
            background: #e5e7eb;
            border-radius: 10px;
            height: 20px;
            margin: 10px 0;
            overflow: hidden;
        }
        .progress-fill {
            background: linear-gradient(90deg, #10b981, #3b82f6);
            height: 100%;
            transition: width 0.3s ease;
        }
        .task-list {
            margin: 15px 0;
        }
        .task-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .task-status {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
        }
        .task-completed {
            background: #10b981;
        }
        .task-pending {
            background: #6b7280;
        }
        .goal-item {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .goal-title {
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .goal-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .no-print {
            margin: 20px 0;
            text-align: center;
        }
        .print-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        .print-btn:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">📄 Print/Save as PDF</button>
    </div>

    <div class="header">
        <h1>${projectInfo.name}</h1>
        <div class="subtitle">Project Report • Generated on ${
      new Date().toLocaleDateString()
    }</div>
    </div>

    <div class="section">
        <h2>Project Overview</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalTasks}</div>
                <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completedTasks}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${progressPercent}%</div>
                <div class="stat-label">Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${sections.length}</div>
                <div class="stat-label">Sections</div>
            </div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>

        ${
      projectInfo.description
        ? `<p>${projectInfo.description.join(" ")}</p>`
        : ""
    }
    </div>

    <div class="section">
        <h2>Section Breakdown</h2>
        ${
      sectionStats.map((section) => `
            <div style="margin-bottom: 20px;">
                <h3>${section.name}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span>${section.completed}/${section.total} tasks completed</span>
                    <span><strong>${section.progress}%</strong></span>
                </div>
                <div class="progress-bar" style="height: 12px;">
                    <div class="progress-fill" style="width: ${section.progress}%"></div>
                </div>
            </div>
        `).join("")
    }
    </div>

    ${
      projectInfo.goals && projectInfo.goals.length > 0
        ? `
    <div class="section">
        <h2>Goals</h2>
        ${
          projectInfo.goals.map((goal) => `
            <div class="goal-item">
                <div class="goal-title">${goal.title}</div>
                <div class="goal-meta">
                    <div>Type: ${goal.type}</div>
                    <div>Status: ${goal.status}</div>
                    <div>KPI: ${goal.kpi}</div>
                    <div>Timeline: ${goal.startDate} - ${goal.endDate}</div>
                </div>
                ${goal.description ? `<div>${goal.description}</div>` : ""}
            </div>
        `).join("")
        }
    </div>
    `
        : ""
    }

    <div class="section">
        <h2>Recent Tasks</h2>
        <div class="task-list">
            ${
      this.flattenTasks(tasks).slice(0, 20).map((task) => `
                <div class="task-item">
                    <div class="task-status ${
        task.completed ? "task-completed" : "task-pending"
      }">
                        ${task.completed ? "✓" : "○"}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${task.title}</div>
                        <div style="font-size: 0.9em; color: #666;">
                            ${task.section}${
        task.config.assignee ? ` • ${task.config.assignee}` : ""
      }${task.config.due_date ? ` • Due: ${task.config.due_date}` : ""}
                        </div>
                    </div>
                </div>
            `).join("")
    }
        </div>
    </div>

    <div class="footer">
        <p>Generated by MD Planner • ${new Date().toISOString()}</p>
    </div>

    <script>
        // Auto-print when accessed from PDF export
        if (window.location.search.includes('auto-print')) {
            window.onload = () => setTimeout(() => window.print(), 1000);
        }
    </script>
</body>
</html>`;
  }

  private async appendTasksToMarkdown(tasks: Task[]): Promise<number> {
    try {
      // Read the current markdown file
      const currentContent = await Deno.readTextFile(this.parser.filePath);
      const lines = currentContent.split("\n");

      // Group tasks by section
      const tasksBySection = new Map<string, Task[]>();
      for (const task of tasks) {
        const section = task.section || "Todo";
        if (!tasksBySection.has(section)) {
          tasksBySection.set(section, []);
        }
        tasksBySection.get(section)!.push(task);
      }

      // Find Board section first
      const boardIndex = lines.findIndex((line) => line.trim() === "# Board");
      if (boardIndex === -1) {
        // Add Board section if it doesn't exist
        lines.push("", "<!-- Board -->", "# Board", "");
      }

      // Process each section
      for (const [sectionName, sectionTasks] of tasksBySection) {
        const insertIndex = this.findOrCreateSectionInsertPoint(lines, sectionName);
        
        // Generate markdown for tasks in this section
        const taskLines: string[] = [];
        this.generateTaskMarkdown(sectionTasks, taskLines, 0);
        
        // Insert the new tasks
        lines.splice(insertIndex, 0, ...taskLines);
      }

      // Write the updated content back with backup
      await this.parser.safeWriteFile(lines.join("\n"));

      return tasks.length;
    } catch (error) {
      console.error("Error appending tasks to markdown:", error);
      return 0;
    }
  }

  private findOrCreateSectionInsertPoint(lines: string[], sectionName: string): number {
    // Find the section header
    const sectionHeaderPattern = `## ${sectionName}`;
    let sectionIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === sectionHeaderPattern) {
        sectionIndex = i;
        break;
      }
    }

    if (sectionIndex === -1) {
      // Section doesn't exist, create it
      const boardIndex = lines.findIndex((line) => line.trim() === "# Board");
      if (boardIndex !== -1) {
        // Insert after Board header and before any existing sections
        let insertPosition = boardIndex + 1;
        
        // Skip any empty lines after Board header
        while (insertPosition < lines.length && lines[insertPosition].trim() === "") {
          insertPosition++;
        }
        
        // Insert new section
        lines.splice(insertPosition, 0, "", `## ${sectionName}`, "");
        return insertPosition + 3; // Return position after the new section header
      } else {
        // Fallback: append at end
        lines.push("", "<!-- Board -->", "# Board", "", `## ${sectionName}`, "");
        return lines.length;
      }
    } else {
      // Section exists, find insertion point within it
      let insertIndex = -1;
      
      // Find the next section or end of file to insert before
      for (let j = sectionIndex + 1; j < lines.length; j++) {
        if (lines[j].startsWith("## ")) {
          insertIndex = j - 1;
          // Skip backward over any empty lines
          while (insertIndex > sectionIndex && lines[insertIndex].trim() === "") {
            insertIndex--;
          }
          insertIndex++; // Insert after the last task/content
          break;
        }
      }
      
      if (insertIndex === -1) {
        insertIndex = lines.length;
      }
      
      return insertIndex;
    }
  }

  private generateTaskMarkdown(tasks: Task[], lines: string[], depth: number = 0) {
    const indent = "  ".repeat(depth);
    
    for (const task of tasks) {
      const checkbox = task.completed ? "[x]" : "[ ]";
      const configParts: string[] = [];

      if (task.config.tag && task.config.tag.length > 0) {
        configParts.push(`tag: [${task.config.tag.join(", ")}]`);
      }
      if (task.config.due_date) {
        configParts.push(`due_date: ${task.config.due_date}`);
      }
      if (task.config.assignee) {
        configParts.push(`assignee: ${task.config.assignee}`);
      }
      if (task.config.priority) {
        configParts.push(`priority: ${task.config.priority}`);
      }
      if (task.config.effort) {
        configParts.push(`effort: ${task.config.effort}`);
      }
      if (task.config.milestone) {
        configParts.push(`milestone: ${task.config.milestone}`);
      }
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        configParts.push(`blocked_by: ${task.config.blocked_by.join(", ")}`);
      }

      const configStr = configParts.length > 0
        ? ` {${configParts.join("; ")}}`
        : "";
      lines.push(`${indent}- ${checkbox} (${task.id}) ${task.title}${configStr}`);

      // Add description if present
      if (task.description && task.description.length > 0) {
        task.description.forEach((desc) => {
          lines.push(`${indent}  ${desc}`);
        });
      }

      // Recursively add children (subtasks)
      if (task.children && task.children.length > 0) {
        this.generateTaskMarkdown(task.children, lines, depth + 1);
      }

      if (depth === 0) {
        lines.push(""); // Empty line after each top-level task
      }
    }
  }
}
