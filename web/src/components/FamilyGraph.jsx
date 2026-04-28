import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
  MarkerType,
} from 'reactflow';
import dagre from 'dagre';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@mantine/core';
import { IconDownload, IconX, IconLayoutDashboard } from '@tabler/icons-react';
import 'reactflow/dist/style.css';
import { fetchPeople, fetchRelationships, saveNodePosition } from '../api';
import { isVerticalType, isSpouseType, isSiblingType } from '../utils/relationshipTypes';
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

      let strokeColor = '#555';
      let strokeDasharray = '0';
      let showArrow = true;

      if (isSpouse) {
        strokeColor = '#e64980';
        strokeDasharray = '5 5';
        showArrow = false;
      } else if (isSibling) {
        strokeColor = '#228be6';
        strokeDasharray = '0';
        showArrow = false;
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

    setNodes(finalNodes);
    setEdges(newEdges);
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

  const downloadImage = () => {
    setSelectedNodeId(null);

    setTimeout(() => {
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) return;
      html2canvas(viewport, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8f9fa',
        scale: 2,
        ignoreElements: (el) =>
          el.classList.contains('react-flow__controls') ||
          el.classList.contains('react-flow__panel'),
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('family-tree.pdf');
      });
    }, 100);
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

          <Button
            leftSection={<IconDownload size={16} />}
            onClick={downloadImage}
            variant="white"
            color="black"
            style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          >
            Скачать PDF
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
