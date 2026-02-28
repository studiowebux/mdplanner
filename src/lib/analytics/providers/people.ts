/**
 * People registry statistics provider.
 */

import { DirectoryMarkdownParser } from "../../parser/directory/parser.ts";

export interface DepartmentStat {
  name: string;
  count: number;
}

export interface PeopleStats {
  total: number;
  withDepartment: number;
  byDepartment: DepartmentStat[];
}

export async function collectPeopleStats(
  parser: DirectoryMarkdownParser,
): Promise<PeopleStats> {
  const people = await parser.readPeople();

  const deptMap = new Map<string, number>();
  let withDepartment = 0;

  for (const p of people) {
    if (p.departments?.length) {
      withDepartment++;
      for (const dept of p.departments) {
        deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
      }
    }
  }

  const byDepartment: DepartmentStat[] = [...deptMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { total: people.length, withDepartment, byDepartment };
}
