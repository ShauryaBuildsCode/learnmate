import {
  mindEnvelopeSchema,
  mindNodeSchema,
  notesEnvelopeSchema,
  topicNotesSchema,
  type MindNode,
  type StoredMindMap,
  type StoredNotes,
  type TopicNotes,
} from "@/lib/schemas/study";

export interface StudyTopic {
  id: string;
  name: string;
  summary?: string;
  pages: number[];
}

export interface ValidatedNotes {
  notes: StoredNotes;
  dropped: string[];
}

/** Keeps only notes for real topics, drops bullets that cite a page that doesn't exist, and fails if too little remains. */
export function validateNotes(
  raw: unknown,
  topics: StudyTopic[],
  validPages: ReadonlySet<number>,
  directedBy?: "claude" | "groq",
): ValidatedNotes {
  const envelope = notesEnvelopeSchema.parse(raw);
  const known = new Set(topics.map((t) => t.id));
  const dropped: string[] = [];
  const byTopic = new Map<string, TopicNotes>();
  for (const candidate of envelope.topics) {
    const parsed = topicNotesSchema.safeParse(candidate);
    if (!parsed.success) {
      dropped.push(`invalid topic notes (${parsed.error.issues[0]?.path.join(".")})`);
      continue;
    }
    const n = parsed.data;
    if (!known.has(n.topicId) || byTopic.has(n.topicId)) {
      dropped.push(`unknown or repeated topic ${n.topicId}`);
      continue;
    }
    const keyPoints = n.keyPoints.filter((k) => validPages.has(k.page));
    if (keyPoints.length < 2) {
      dropped.push(`topic ${n.topicId} cites pages that don't exist`);
      continue;
    }
    byTopic.set(n.topicId, {
      ...n,
      keyPoints,
      terms: n.terms.filter((t) => validPages.has(t.page)),
    });
  }
  // Notes keep the course's topic order.
  const ordered = topics.flatMap((t) => (byTopic.has(t.id) ? [byTopic.get(t.id)!] : []));
  if (ordered.length < Math.ceil(topics.length / 2))
    throw new Error("Too few topics have usable notes.");
  return { notes: { topics: ordered, directedBy }, dropped };
}

export const MAX_DEPTH = 4;

/**
 * Repairs a model-drawn tree so it always renders: one root, every node attached to something that exists,
 * no cycles, bounded depth, and a topic node for every real topic. Page and topic references that don't exist are cleared.
 */
export function validateMindMap(
  raw: unknown,
  topics: StudyTopic[],
  validPages: ReadonlySet<number>,
  courseTitle: string,
  directedBy?: "claude" | "groq",
): StoredMindMap {
  const envelope = mindEnvelopeSchema.parse(raw);
  const known = new Set(topics.map((t) => t.id));
  const seen = new Set<string>();
  let nodes: MindNode[] = [];
  for (const candidate of envelope.nodes) {
    const parsed = mindNodeSchema.safeParse(candidate);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    const n = parsed.data;
    nodes.push({
      ...n,
      topicId: n.topicId && known.has(n.topicId) ? n.topicId : undefined,
      page: n.page && validPages.has(n.page) ? n.page : undefined,
    });
  }
  if (nodes.length < 3) throw new Error("Too few valid mind-map nodes.");

  // One root: the first parentless root-kind node wins; any other parentless node hangs off it.
  const root = nodes.find((n) => n.parent === null && n.kind === "root") ??
    nodes.find((n) => n.parent === null) ?? {
      id: "root",
      label: courseTitle.slice(0, 44),
      parent: null,
      kind: "root" as const,
    };
  if (!nodes.includes(root)) nodes.unshift(root);
  const ids = new Set(nodes.map((n) => n.id));
  nodes = nodes.map((n) => {
    if (n === root) return { ...n, parent: null, kind: "root" as const };
    const ok = n.parent !== null && ids.has(n.parent) && n.parent !== n.id;
    return { ...n, parent: ok ? n.parent : root.id, kind: n.kind === "root" ? "topic" : n.kind };
  });

  // Break cycles by re-attaching any node that can't reach the root.
  const parentOf = new Map(nodes.map((n) => [n.id, n.parent]));
  const depthOf = (id: string): number => {
    let depth = 0;
    let cur: string | null = id;
    const guard = new Set<string>();
    while (cur !== null && cur !== root.id) {
      if (guard.has(cur)) return -1;
      guard.add(cur);
      cur = parentOf.get(cur) ?? null;
      depth++;
    }
    return cur === root.id ? depth : -1;
  };
  nodes = nodes.map((n) => {
    if (n === root) return n;
    const d = depthOf(n.id);
    if (d === -1 || d > MAX_DEPTH) {
      parentOf.set(n.id, root.id);
      return { ...n, parent: root.id };
    }
    return n;
  });

  // Every real topic is reachable from the map.
  const mapped = new Set(nodes.flatMap((n) => (n.topicId ? [n.topicId] : [])));
  for (const t of topics) {
    if (mapped.has(t.id)) continue;
    nodes.push({
      id: `t-${t.id.slice(0, 8)}`,
      label: t.name.slice(0, 44),
      parent: root.id,
      kind: "topic",
      topicId: t.id,
      page: t.pages.find((p) => validPages.has(p)),
    });
  }
  if (nodes.length > 100) nodes = nodes.slice(0, 100);
  return { nodes, directedBy };
}

export interface PlacedNode extends MindNode {
  x: number;
  y: number;
  depth: number;
}

export const COLUMN = 270;
export const ROW = 38;

/** Left-to-right tree: one column per level, one row per leaf, so labels never overlap and read in order. */
export function layoutMindMap(nodes: MindNode[]): {
  placed: PlacedNode[];
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const children = new Map<string, MindNode[]>();
  for (const n of nodes) {
    if (n.parent === null) continue;
    children.set(n.parent, [...(children.get(n.parent) ?? []), n]);
  }
  const root = nodes.find((n) => n.parent === null) ?? nodes[0];
  const placed: PlacedNode[] = [];
  let nextRow = 0;
  /** Returns the node's own y: the middle of its children, or the next free row for a leaf. */
  const place = (n: MindNode, depth: number): number => {
    const kids = children.get(n.id) ?? [];
    const slot = placed.length;
    placed.push({ ...n, depth, x: depth * COLUMN, y: 0 });
    let y: number;
    if (kids.length === 0) y = nextRow++ * ROW;
    else {
      const ys = kids.map((k) => place(k, depth + 1));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    placed[slot].y = y;
    return y;
  };
  place(root, 0);
  const maxX = Math.max(...placed.map((p) => p.x));
  const maxY = Math.max(...placed.map((p) => p.y));
  const PAD = 140;
  return { placed, minX: -PAD, minY: -PAD / 2, width: maxX + PAD * 2 + 100, height: maxY + PAD };
}
