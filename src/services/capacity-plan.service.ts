// Capacity plan service — CRUD + member and allocation mutation helpers.

import type { CapacityPlanRepository } from "../repositories/capacity-plan.repository.ts";
import type {
  CapacityPlan,
  CreateCapacityPlan,
  ProjectAllocation,
  TeamMemberRef,
  UpdateCapacityPlan,
} from "../types/capacity-plan.types.ts";
import { generateId } from "../utils/id.ts";
import { BaseService } from "./base.service.ts";

/** Capacity-plan service: CRUD plus team-member and allocation management (add/update/remove member & allocation). */
export class CapacityPlanService extends BaseService<
  CapacityPlan,
  CreateCapacityPlan,
  UpdateCapacityPlan
> {
  constructor(repo: CapacityPlanRepository) {
    super(repo);
  }

  protected applyFilters(plans: CapacityPlan[]): CapacityPlan[] {
    return plans;
  }

  // ---------------------------------------------------------------------------
  // Team member helpers
  // ---------------------------------------------------------------------------

  async addMember(
    planId: string,
    member: Omit<TeamMemberRef, "id">,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    const newMember: TeamMemberRef = { ...member, id: generateId("member") };
    return this.update(planId, {
      teamMembers: [...plan.teamMembers, newMember],
    });
  }

  async updateMember(
    planId: string,
    memberId: string,
    updates: Partial<Omit<TeamMemberRef, "id">>,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    const idx = plan.teamMembers.findIndex((m) => m.id === memberId);
    if (idx === -1) return null;

    const teamMembers = [...plan.teamMembers];
    teamMembers[idx] = { ...teamMembers[idx], ...updates, id: memberId };
    return this.update(planId, { teamMembers });
  }

  async removeMember(
    planId: string,
    memberId: string,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    const member = plan.teamMembers.find((m) => m.id === memberId);
    return this.update(planId, {
      teamMembers: plan.teamMembers.filter((m) => m.id !== memberId),
      // Remove allocations belonging to this person.
      allocations: member
        ? plan.allocations.filter((a) => a.personId !== member.personId)
        : plan.allocations,
    });
  }

  // ---------------------------------------------------------------------------
  // Allocation helpers
  // ---------------------------------------------------------------------------

  async addAllocation(
    planId: string,
    allocation: Omit<ProjectAllocation, "id">,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    const newAllocation: ProjectAllocation = {
      ...allocation,
      id: generateId("alloc"),
    };
    return this.update(planId, {
      allocations: [...plan.allocations, newAllocation],
    });
  }

  async updateAllocation(
    planId: string,
    allocId: string,
    updates: Partial<Omit<ProjectAllocation, "id">>,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    const idx = plan.allocations.findIndex((a) => a.id === allocId);
    if (idx === -1) return null;

    const allocations = [...plan.allocations];
    allocations[idx] = { ...allocations[idx], ...updates, id: allocId };
    return this.update(planId, { allocations });
  }

  async removeAllocation(
    planId: string,
    allocId: string,
  ): Promise<CapacityPlan | null> {
    const plan = await this.repo.findById(planId);
    if (!plan) return null;

    return this.update(planId, {
      allocations: plan.allocations.filter((a) => a.id !== allocId),
    });
  }
}
