import { deleteJson, getJson, postJson, putJson } from "./http";
import type { ModelNode, NodeType, Transform } from "../core/types";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/** 与后端 model_node 行对应的整树节点（三种 nodeType 共用字段，空的为 null）。 */
export type PersistNode = {
  id: string;
  parentId: string | null;
  nodeType: NodeType;
  name: string;
  sortOrder: number;
  transform: Transform;
  shape: string | null;
  dims: Record<string, string> | null;
  templateId: string | null;
  paramValues: Record<string, number> | null;
};

export function listProjects(): Promise<{ projects: Project[] }> {
  return getJson<{ projects: Project[] }>("/projects");
}

export function createProject(name: string): Promise<Project> {
  return postJson<Project>("/projects", { name });
}

export function fetchProject(id: string): Promise<Project> {
  return getJson<Project>(`/projects/${id}`);
}

export function renameProject(id: string, name: string): Promise<Project> {
  return putJson<Project>(`/projects/${id}`, { name });
}

export function deleteProject(id: string): Promise<void> {
  return deleteJson(`/projects/${id}`);
}

export function fetchProjectNodes(id: string): Promise<{ nodes: PersistNode[] }> {
  return getJson<{ nodes: PersistNode[] }>(`/projects/${id}/nodes`);
}

export function saveProjectNodes(
  id: string,
  nodes: PersistNode[],
): Promise<{ nodes: PersistNode[] }> {
  return putJson<{ nodes: PersistNode[] }>(`/projects/${id}/nodes`, { nodes });
}

/** 保存时按数组下标重写 sortOrder。 */
export function modelNodesToPersist(nodes: ModelNode[]): PersistNode[] {
  return nodes.map((node, index) => {
    const base = {
      id: node.id,
      parentId: node.parentId,
      nodeType: node.nodeType,
      name: node.name,
      sortOrder: index,
      transform: node.transform,
    };
    if (node.nodeType === "primitive") {
      return {
        ...base,
        shape: node.shape,
        dims: node.dims,
        templateId: null,
        paramValues: null,
      };
    }
    if (node.nodeType === "instance") {
      return {
        ...base,
        shape: null,
        dims: null,
        templateId: node.templateId,
        paramValues: node.paramValues,
      };
    }
    return {
      ...base,
      shape: null,
      dims: null,
      templateId: null,
      paramValues: null,
    };
  });
}
