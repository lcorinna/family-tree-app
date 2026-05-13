import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionLineType,
  Panel,
  MarkerType,
} from 'reactflow';
import dagre from 'dagre';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Button } from '@mantine/core';
import { IconDownload, IconX, IconLayoutDashboard } from '@tabler/icons-react';
import 'reactflow/dist/style.css';
import { fetchPeople, fetchRelationships, saveNodePosition } from '../api';
import { isVerticalType, isSpouseType, isSiblingType, isParentType, isChildType, isGrandparentType } from '../utils/relationshipTypes';
import { PersonNode } from './PersonNode';

const nodeWidth = 200;
const nodeHeight = 120;

const NODE_TYPES = { person: PersonNode };

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function calculateAge(birthDateStr, deathDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const end = deathDateStr ? new Date(deathDateStr) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  if (isNaN(age)) return null;
  return age;
}

function getAgeString(age) {
  if (age === null || age === undefined) return '';
  let count = age % 100;
  if (count >= 5 && count <= 20) {
    return `${age} лет`;
  }
  count = count % 10;
  if (count === 1) {
    return `${age} год`;
  }
  if (count >= 2 && count <= 4) {
    return `${age} года`;
  }
  return `${age} лет`;
}

const getRelativeLabel = (fromPerson, toPerson, focusId, type) => {
  const typeLower = type.toLowerCase();
  const focusIdStr = focusId.toString();

  if (fromPerson.id.toString() === focusIdStr) {
    if (typeLower === 'parent' || typeLower === 'родитель') return 'Ребенок';
    if (typeLower === 'child' || typeLower === 'ребенок') return 'Родитель';
    if (typeLower === 'spouse' || typeLower === 'супруг') return 'Супруг(а)';
    if (typeLower === 'sibling' || typeLower === 'брат' || typeLower === 'сестра')
      return 'Брат/Сестра';
  }

  if (toPerson.id.toString() === focusIdStr) {
    if (typeLower === 'parent' || typeLower === 'родитель') return 'Родитель';
    if (typeLower === 'child' || typeLower === 'ребенок') return 'Ребенок';
    if (typeLower === 'spouse' || typeLower === 'супруг') return 'Супруг(а)';
    if (typeLower === 'sibling' || typeLower === 'брат' || typeLower === 'сестра')
      return 'Брат/Сестра';
  }

  return '';
};

// Рассчитывает идеальную раскладку, но не применяет её к стейту напрямую, возвращает словарь позиций
const getLayoutedPositions = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 150,
    nodesep: 80,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    if (isVerticalType(edge.data?.originalType || '')) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const positions = {};
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (nodeWithPosition) {
      positions[node.id] = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };
    }
  });

  return positions;
};

// Отдельный компонент, чтобы использовать useReactFlow внутри контекста ReactFlow
function DownloadPdfButton({ onBeforeDownload }) {
  const { fitView } = useReactFlow();

  const handleDownload = async () => {
    onBeforeDownload();

    // Вписываем всё дерево в экран перед снятием скриншота
    fitView({ padding: 0.06, duration: 0 });

    // Ждём два кадра — браузер должен отрисовать новый viewport
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const container = document.querySelector('.react-flow');
    if (!container) return;

    // html-to-image сам подтягивает внешние картинки, но нам нужна защита от CORS.
    // Конвертируем img.src в data URL заранее.
    const imgs = Array.from(container.querySelectorAll('img'));
    const origSrcs = imgs.map((img) => img.src);

    await Promise.all(
      imgs.map(async (img) => {
        if (img.src.startsWith('data:')) return;
        try {
          const res = await fetch(img.src, { mode: 'cors' });
          const blob = await res.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          if (!img.complete) await new Promise((resolve) => { img.onload = resolve; });
        } catch { /* оставляем как есть */ }
      })
    );

    try {
      // toPng нативно поддерживает SVG-рёбра React Flow, в отличие от html2canvas
      const dataUrl = await toPng(container, {
        backgroundColor: '#f8f9fa',
        pixelRatio: 2,
        filter: (el) =>
          !el.classList?.contains('react-flow__controls') &&
          !el.classList?.contains('react-flow__panel') &&
          !el.classList?.contains('react-flow__minimap'),
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'l' : 'p',
        unit: 'px',
        format: [img.width, img.height],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save('family-tree.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Не удалось создать PDF. Попробуйте ещё раз.');
    } finally {
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });
    }
  };

  return (
    <Button
      leftSection={<IconDownload size={16} />}
      onClick={handleDownload}
      variant="white"
      color="black"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
    >
      Скачать PDF
    </Button>
  );
}

// --- КОМПОНЕНТ ---

export function FamilyGraph({ refreshTrigger, onPersonClick, searchQuery }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [rawData, setRawData] = useState({ people: [], rels: [] });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  // Кэш позиций на сессию: не пересчитываем dagre при каждом клике
  const nodePositions = useRef({});

  // 1. Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const [people, rels] = await Promise.all([fetchPeople(), fetchRelationships()]);
        setRawData({ people: people || [], rels: rels || [] });
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      }
    };
    loadData();
  }, [refreshTrigger]);

  // 2. Пересчёт позиций — только при изменении данных, НЕ при клике
  useEffect(() => {
    const { people, rels } = rawData;
    if (people.length === 0) return;

    const nodesForLayout = people.map((p) => ({ id: p.id.toString() }));
    const edgesForLayout = rels.map((r) => ({
      source: r.from_person_id.toString(),
      target: r.to_person_id.toString(),
      data: { originalType: r.type },
    }));
    const ideal = getLayoutedPositions(nodesForLayout, edgesForLayout);

    people.forEach((person) => {
      const id = person.id.toString();
      const hasSaved = person.position_x !== 0 || person.position_y !== 0;
      if (hasSaved) {
        // Позиция из БД всегда приоритетнее
        nodePositions.current[id] = { x: person.position_x, y: person.position_y };
      } else if (!nodePositions.current[id] && ideal[id]) {
        // Новый узел без позиции: берём dagre и кэшируем (больше не двигаем)
        nodePositions.current[id] = ideal[id];
      }
    });
  }, [rawData]);

  // 3. Обновление визуального состояния — запускается и при смене выделения/поиска
  useEffect(() => {
    const { people, rels } = rawData;
    if (people.length === 0) return;

    const searchLower = searchQuery ? searchQuery.toLowerCase() : '';

    const finalNodes = people.map((person) => {
      const id = person.id.toString();
      const age = calculateAge(person.birth_date, person.death_date);
      const ageString = getAgeString(age);
      const fullName =
        `${person.first_name} ${person.last_name} ${person.middle_name || ''}`.toLowerCase();
      const isMatch = !!searchQuery && fullName.includes(searchLower);
      const isDimmed = !!searchQuery && !isMatch;
      const isSelected = selectedNodeId === id;

      return {
        id,
        type: 'person',
        data: { person, age, ageString, isDimmed, isMatch, isSelected },
        position: nodePositions.current[id] || { x: 0, y: 0 },
        zIndex: isMatch || isSelected ? 10 : 1,
      };
    });

    const newEdges = rels.map((rel) => {
      const fromId = rel.from_person_id.toString();
      const toId = rel.to_person_id.toString();
      const isConnectedToSelected =
        selectedNodeId && (fromId === selectedNodeId || toId === selectedNodeId);

      let opacity = 1;
      let label = rel.type; // всегда показываем тип на линии
      let zIndex = 1;
      let strokeWidth = 2;

      if (selectedNodeId) {
        if (isConnectedToSelected) {
          opacity = 1;
          zIndex = 10;
          strokeWidth = 3;
          const fromPerson = people.find((p) => p.id === rel.from_person_id);
          const toPerson = people.find((p) => p.id === rel.to_person_id);
          // для стандартных типов — умная метка с точки зрения выбранного человека,
          // для кастомных — оставляем сырой тип
          const directionLabel = getRelativeLabel(fromPerson, toPerson, selectedNodeId, rel.type);
          label = directionLabel || rel.type;
        } else {
          opacity = 0.1;
        }
      }

      const isSpouse = isSpouseType(rel.type);
      const isSibling = isSiblingType(rel.type);
      const isParent = isParentType(rel.type) || isChildType(rel.type);
      const isGrandparent = isGrandparentType(rel.type);

      let strokeColor = '#555';
      let strokeDasharray = '0';
      let showArrow = true;

      if (isSpouse) {
        strokeColor = '#e64980';
        strokeDasharray = '5 5';
        showArrow = false;
      } else if (isSibling) {
        strokeColor = '#228be6';
        strokeDasharray = '5 5';
        showArrow = false;
      } else if (isParent) {
        strokeColor = '#2f9e44';
        strokeDasharray = '5 5';
      } else if (isGrandparent) {
        strokeColor = '#1a5c27';
        strokeDasharray = '5 5';
      }

      return {
        id: `e${rel.id}`,
        source: fromId,
        target: toId,
        label,
        type: 'smoothstep',
        animated: false,
        data: { originalType: rel.type },
        style: { stroke: strokeColor, strokeWidth, strokeDasharray, opacity },
        zIndex,
        labelStyle: { fill: strokeColor, fontWeight: 700, fontSize: 12 },
        labelBgStyle: { fill: 'rgba(255, 255, 255, 0.8)' },
        markerEnd: showArrow
          ? { type: MarkerType.ArrowClosed, width: 20, height: 20, color: strokeColor }
          : undefined,
      };
    });

    // Вычисляем автоматические рёбра братьев/сестёр на основе общих родителей
    const parentToChildren = new Map();
    rels.forEach((rel) => {
      if (isParentType(rel.type)) {
        const pid = rel.from_person_id.toString();
        const cid = rel.to_person_id.toString();
        if (!parentToChildren.has(pid)) parentToChildren.set(pid, new Set());
        parentToChildren.get(pid).add(cid);
      } else if (isChildType(rel.type)) {
        const pid = rel.to_person_id.toString();
        const cid = rel.from_person_id.toString();
        if (!parentToChildren.has(pid)) parentToChildren.set(pid, new Set());
        parentToChildren.get(pid).add(cid);
      }
    });

    // Все пары с явной связью — не рисуем автосиблинг поверх них,
    // чтобы не скрывать уже существующие рёбра (супруг, родитель и т.д.)
    const addedPairs = new Set();
    rels.forEach((rel) => {
      const key = [rel.from_person_id.toString(), rel.to_person_id.toString()].sort().join('-');
      addedPairs.add(key);
    });

    const autoSiblingEdges = [];
    parentToChildren.forEach((children) => {
      const childArr = Array.from(children);
      for (let i = 0; i < childArr.length; i++) {
        for (let j = i + 1; j < childArr.length; j++) {
          const sorted = [childArr[i], childArr[j]].sort();
          const key = sorted.join('-');
          if (addedPairs.has(key)) continue;
          addedPairs.add(key);

          const [a, b] = sorted;
          const isConnected = selectedNodeId && (a === selectedNodeId || b === selectedNodeId);
          const opacity = selectedNodeId ? (isConnected ? 1 : 0.1) : 1;

          autoSiblingEdges.push({
            id: `auto-sib-${a}-${b}`,
            source: a,
            target: b,
            label: 'Брат/Сестра',
            type: 'smoothstep',
            animated: false,
            data: { originalType: 'sibling', isAutoSibling: true },
            style: { stroke: '#228be6', strokeWidth: isConnected ? 3 : 2, strokeDasharray: '5 5', opacity },
            labelStyle: { fill: '#228be6', fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: 'rgba(255, 255, 255, 0.8)' },
            zIndex: isConnected ? 10 : 1,
            markerEnd: undefined,
          });
        }
      }
    });

    setNodes(finalNodes);
    // autoSiblingEdges — первыми, чтобы явные рёбра рендерились поверх
    setEdges([...autoSiblingEdges, ...newEdges]);
  }, [rawData, searchQuery, selectedNodeId, setNodes, setEdges]);

  const handleNodeClick = (event, node) => {
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
    }
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleEditClick = () => {
    if (!selectedNodeId) return;
    const person = rawData.people.find((p) => p.id.toString() === selectedNodeId);
    if (person) onPersonClick(person);
  };

  const onNodeDragStop = useCallback((event, node) => {
    nodePositions.current[node.id] = node.position;
    saveNodePosition(node.id, node.position.x, node.position.y);
  }, []);

  const resetLayout = () => {
    const idealPositions = getLayoutedPositions(nodes, edges);
    const updatedNodes = nodes.map((node) => {
      if (!idealPositions[node.id]) return node;
      const newPos = idealPositions[node.id];
      nodePositions.current[node.id] = newPos;
      saveNodePosition(node.id, newPos.x, newPos.y);
      return { ...node, position: newPos };
    });
    setNodes([...updatedNodes]);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        border: '1px solid #ddd',
        borderRadius: 8,
        position: 'relative',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={NODE_TYPES}
        minZoom={0.2}
      >
        <Background color="#ccc" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => node.data?.person?.gender === 'male' ? '#228be6' : '#e64980'}
          maskColor="rgba(0,0,0,0.05)"
          style={{ background: '#f8f9fa', border: '1px solid #ddd' }}
          zoomable
          pannable
        />

        <Panel position="top-right" style={{ display: 'flex', gap: 10 }}>
          {/* Кнопка сброса */}
          <Button
            variant="white"
            color="gray"
            onClick={resetLayout}
            title="Авто-расстановка"
            style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          >
            <IconLayoutDashboard size={16} />
          </Button>

          {selectedNodeId && (
            <Button
              variant="filled"
              color="blue"
              onClick={handleEditClick}
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            >
              ✏️ Редактировать
            </Button>
          )}
          {selectedNodeId && (
            <Button
              variant="white"
              color="gray"
              onClick={() => setSelectedNodeId(null)}
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            >
              <IconX size={16} /> Снять выбор
            </Button>
          )}

          <DownloadPdfButton onBeforeDownload={() => setSelectedNodeId(null)} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
