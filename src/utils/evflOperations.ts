// 生成唯一名称
export const generateUniqueName = (items: any[], prefix: string) => {
  let counter = items ? items.length : 0;
  let name = `${prefix}${counter}`;
  while (items && items.some((item: any) => item.name === name)) {
    counter++;
    name = `${prefix}${counter}`;
  }
  return name;
};

// 创建新节点
export const createNewNode = (evflData: any, actionType: string, sourceNodeId: string | null) => {
  if (!evflData) return null;
  const newEvflData = structuredClone(evflData);

  // 处理入口点创建
  if (actionType === 'entry') {
    if (!newEvflData.flowchart.entry_points) newEvflData.flowchart.entry_points = [];
    const newName = generateUniqueName(newEvflData.flowchart.entry_points, 'EntryPoint');
    newEvflData.flowchart.entry_points.push({
      name: newName,
      main_event: { v: null, idx: 65535 },
      sub_flow_event_indices: [],
    });
    return newEvflData;
  }

  const newIdx = newEvflData.flowchart.events.length;
  let newEventData: any = {};

  // 根据不同操作类型初始化数据结构
  switch (actionType) {
    case 'action':
      newEventData = {
        Action: {
          nxt: { v: null, idx: 65535 },
          actor: { v: null, idx: 65535 },
          actor_action: { v: null, idx: 65535 },
          params: { data: {} },
        },
      };
      break;
    case 'switch':
      newEventData = {
        Switch: {
          cases: { '0': { v: null, idx: 65535 }, '1': { v: null, idx: 65535 } },
          actor: { v: null, idx: 65535 },
          actor_query: { v: null, idx: 65535 },
          params: { data: {} },
        },
      };
      break;
    case 'fork':
      newEventData = { Fork: { join: { v: null, idx: 65535 }, forks: [] } };
      break;
    case 'join':
      newEventData = { Join: { nxt: { v: null, idx: 65535 } } };
      break;
    case 'sub_flow':
      newEventData = {
        SubFlow: {
          nxt: { v: null, idx: 65535 },
          res_flowchart_name: '',
          entry_point_name: '',
          params: { data: {} },
        },
      };
      break;
  }

  // 推入新事件
  newEvflData.flowchart.events.push({
    name: generateUniqueName(newEvflData.flowchart.events, 'Event'),
    data: newEventData,
  });

  // 如果提供了源节点ID，则链接到源节点
  if (sourceNodeId) {
    if (sourceNodeId.startsWith('ep-')) {
      const epIndex = parseInt(sourceNodeId.replace('ep-', ''));
      newEvflData.flowchart.entry_points[epIndex].main_event.idx = newIdx;
    } else {
      const srcIdx = parseInt(sourceNodeId);
      const srcEvent = newEvflData.flowchart.events[srcIdx];
      const type = Object.keys(srcEvent.data)[0];
      const data = srcEvent.data[type];

      if (data.nxt) {
        data.nxt.idx = newIdx;
      } else if (type === 'Fork' && data.forks) {
        data.forks.push({ v: null, idx: newIdx });
      } else if (type === 'Switch' && data.cases) {
        const nextCaseNum = Object.keys(data.cases).length;
        data.cases[nextCaseNum.toString()] = { v: null, idx: newIdx };
      }
    }
  }

  return newEvflData;
};

// 链接两个节点
export const linkNodes = (evflData: any, sourceNodeId: string, targetNodeId: string) => {
  if (!evflData) return null;
  const newEvflData = structuredClone(evflData);

  const targetIdx = parseInt(targetNodeId);

  if (sourceNodeId.startsWith('ep-')) {
    const epIndex = parseInt(sourceNodeId.replace('ep-', ''));
    newEvflData.flowchart.entry_points[epIndex].main_event.idx = targetIdx;
  } else {
    const srcIdx = parseInt(sourceNodeId);
    const srcEvent = newEvflData.flowchart.events[srcIdx];
    const type = Object.keys(srcEvent.data)[0];
    const data = srcEvent.data[type];

    // 根据节点类型连接到不同属性上
    if (data.nxt) {
      data.nxt.idx = targetIdx;
    } else if (type === 'Fork' && data.forks) {
      data.forks.push({ v: null, idx: targetIdx });
    } else if (type === 'Switch' && data.cases) {
      const nextCaseNum = Object.keys(data.cases).length;
      data.cases[nextCaseNum.toString()] = { v: null, idx: targetIdx };
    }
  }

  return newEvflData;
};

// 删除边缘连线
export const deleteEdges = (evflData: any, edges: any[]) => {
  if (!evflData) return { newEvflData: null, modified: false };
  const newEvflData = structuredClone(evflData);
  let modified = false;

  edges.forEach((edge) => {
    if (edge.id.includes('virtual')) return;

    const sourceId = edge.source;
    const targetId = edge.target;

    // 清除入口点的连接
    if (sourceId.startsWith('ep-')) {
      const epIndex = parseInt(sourceId.replace('ep-', ''));
      newEvflData.flowchart.entry_points[epIndex].main_event.idx = 65535;
      modified = true;
    } else {
      const srcIdx = parseInt(sourceId);
      const srcEvent = newEvflData.flowchart.events[srcIdx];
      if (!srcEvent) return;

      const type = Object.keys(srcEvent.data)[0];
      const data = srcEvent.data[type];

      // 清除事件节点的连接
      if (data.nxt && data.nxt.idx === parseInt(targetId)) {
        data.nxt.idx = 65535;
        modified = true;
      } else if (type === 'Fork' && data.forks) {
        const match = edge.id.match(/fork(\d+)-/);
        if (match) {
          const forkIndex = parseInt(match[1]);
          if (data.forks[forkIndex]) {
            data.forks[forkIndex].idx = 65535;
            modified = true;
          }
        }
      } else if (type === 'Switch' && data.cases) {
        const match = edge.id.match(/case(\w+)-/);
        if (match) {
          const caseValue = match[1];
          if (data.cases[caseValue]) {
            data.cases[caseValue].idx = 65535;
            modified = true;
          }
        }
      }
    }
  });

  return { newEvflData, modified };
};

// 在指定节点添加入口点
export const addEntryPoint = (evflData: any, nodeId: string) => {
  const newEvflData = structuredClone(evflData);
  if (!newEvflData.flowchart.entry_points) newEvflData.flowchart.entry_points = [];
  const newName = generateUniqueName(newEvflData.flowchart.entry_points, 'EntryPoint');
  newEvflData.flowchart.entry_points.push({
    name: newName,
    main_event: { v: null, idx: parseInt(nodeId) },
    sub_flow_event_indices: [],
  });
  return newEvflData;
};

// 移除入口点
export const removeEntryPoint = (evflData: any, nodeId: string) => {
  const newEvflData = structuredClone(evflData);
  const epIndex = parseInt(nodeId.replace('ep-', ''));
  newEvflData.flowchart.entry_points = newEvflData.flowchart.entry_points.toSpliced(epIndex, 1);
  return newEvflData;
};

// 重命名入口点
export const renameEntryPoint = (
  evflData: any,
  nodeIdOrIndex: string | number,
  newName: string,
) => {
  const newEvflData = structuredClone(evflData);
  const epIndex =
    typeof nodeIdOrIndex === 'number'
      ? nodeIdOrIndex
      : parseInt(String(nodeIdOrIndex).replace('ep-', ''));
  if (newEvflData.flowchart?.entry_points?.[epIndex]) {
    newEvflData.flowchart.entry_points[epIndex].name = newName;
  }
  return newEvflData;
};

// 添加新父节点
export const addNewParent = (evflData: any, targetIdxStr: string) => {
  const newEvflData = structuredClone(evflData);
  const newIdx = newEvflData.flowchart.events.length;
  const targetIdx = parseInt(targetIdxStr);

  // 辅助函数：重定向索引
  const redirectIdx = (ptr: any) => {
    if (ptr && ptr.idx === targetIdx) {
      ptr.idx = newIdx;
    }
  };

  // 重定向入口点
  if (newEvflData.flowchart.entry_points) {
    newEvflData.flowchart.entry_points.forEach((ep: any) => {
      redirectIdx(ep.main_event);
      redirectIdx(ep.sub_flow_event);
    });
  }

  // 重定向其他事件节点的连接
  newEvflData.flowchart.events.forEach((ev: any) => {
    const type = Object.keys(ev.data)[0];
    const data = ev.data[type];
    if (data.nxt) redirectIdx(data.nxt);
    if (data.join) redirectIdx(data.join);
    if (data.forks) data.forks.forEach(redirectIdx);
    if (data.cases) Object.values(data.cases).forEach(redirectIdx);
  });

  // 插入新的父级节点
  newEvflData.flowchart.events.push({
    name: generateUniqueName(newEvflData.flowchart.events, 'Event'),
    data: {
      Action: {
        nxt: { v: null, idx: targetIdx },
        actor: { v: null, idx: 65535 },
        actor_action: { v: null, idx: 65535 },
        params: { data: {} },
      },
    },
  });
  return newEvflData;
};

// 添加新子节点
export const addNewChild = (evflData: any, srcIdxStr: string) => {
  const newEvflData = structuredClone(evflData);
  const newIdx = newEvflData.flowchart.events.length;
  const srcIdx = parseInt(srcIdxStr);

  const type = Object.keys(newEvflData.flowchart.events[srcIdx].data)[0];
  const data = newEvflData.flowchart.events[srcIdx].data[type];

  let oldNxtIdx = 65535;
  if (data.nxt) {
    oldNxtIdx = data.nxt.idx;
    data.nxt.idx = newIdx;
  }

  // 插入新的子节点
  newEvflData.flowchart.events.push({
    name: generateUniqueName(newEvflData.flowchart.events, 'Event'),
    data: {
      Action: {
        nxt: { v: null, idx: oldNxtIdx },
        actor: { v: null, idx: 65535 },
        actor_action: { v: null, idx: 65535 },
        params: { data: {} },
      },
    },
  });
  return newEvflData;
};

// 取消子节点的连接
export const unlinkChild = (evflData: any, srcIdxStr: string) => {
  const newEvflData = structuredClone(evflData);
  const srcIdx = parseInt(srcIdxStr);
  const type = Object.keys(newEvflData.flowchart.events[srcIdx].data)[0];
  const data = newEvflData.flowchart.events[srcIdx].data[type];
  if (data.nxt) {
    data.nxt.idx = 65535;
  }
  return newEvflData;
};

// 移除事件节点及其关联索引调整
export const removeEvent = (evflData: any, deletedIdxStr: string) => {
  const newEvflData = structuredClone(evflData);
  const deletedIdx = parseInt(deletedIdxStr);

  let nextEventIdx = 65535;
  const deletedEv = newEvflData.flowchart.events[deletedIdx];
  const deletedType = Object.keys(deletedEv.data)[0];
  const deletedData = deletedEv.data[deletedType];

  // 找出删除节点的下一个连接节点
  if (deletedData.nxt) {
    nextEventIdx = deletedData.nxt.idx;
  } else if (deletedData.cases) {
    const cases = Object.values(deletedData.cases) as any[];
    if (cases.length > 0) nextEventIdx = cases[0].idx;
  } else if (deletedData.forks && deletedData.forks.length > 0) {
    nextEventIdx = deletedData.forks[0].idx;
  }

  // 调整索引
  const newNextEventIdx =
    nextEventIdx !== 65535 && nextEventIdx > deletedIdx ? nextEventIdx - 1 : nextEventIdx;

  const updateIdx = (ptr: any) => {
    if (!ptr) return;
    if (ptr.idx === deletedIdx) ptr.idx = newNextEventIdx;
    else if (ptr.idx !== 65535 && ptr.idx > deletedIdx) ptr.idx--;
  };

  // 更新所有入口点指向
  if (newEvflData.flowchart.entry_points) {
    newEvflData.flowchart.entry_points.forEach((ep: any) => {
      updateIdx(ep.main_event);
      updateIdx(ep.sub_flow_event);
    });
  }

  // 从数组中删除
  newEvflData.flowchart.events = newEvflData.flowchart.events.toSpliced(deletedIdx, 1);

  // 更新剩余节点的指向
  newEvflData.flowchart.events.forEach((ev: any) => {
    const type = Object.keys(ev.data)[0];
    const data = ev.data[type];
    if (data.nxt) updateIdx(data.nxt);
    if (data.join) updateIdx(data.join);
    if (data.forks) data.forks.forEach(updateIdx);
    if (data.cases) Object.values(data.cases).forEach(updateIdx);
  });

  return newEvflData;
};
