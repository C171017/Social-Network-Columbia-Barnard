export function buildGroups(nodes, links) {
  const adj = new Map(nodes.map((n) => [n.id, []]));
  links.forEach((l) => {
    adj.get(l.source.id ?? l.source).push(l.target.id ?? l.target);
    adj.get(l.target.id ?? l.target).push(l.source.id ?? l.source);
  });

  let current = 0;
  const groupMap = new Map();
  nodes.forEach((n) => {
    if (groupMap.has(n.id)) return;
    const stack = [n.id];
    while (stack.length) {
      const id = stack.pop();
      if (groupMap.has(id)) continue;
      groupMap.set(id, current);
      adj.get(id).forEach((nei) => stack.push(nei));
    }
    current += 1;
  });
  return groupMap;
}

export function isLargeGroupNode(d, groupMap, groupSizes, largeGroupThreshold) {
  const gi = groupMap.get(d.id);
  if (gi == null) return false;
  return groupSizes[gi] > largeGroupThreshold;
}
