import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
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

const nodeWidth = 200;
const nodeHeight = 120;

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
    const type = edge.data?.originalType?.toLowerCase() || '';
    const isVertical =
      type === 'parent' ||
      type === 'child' ||
      type === 'родитель' ||
      type === 'ребенок' ||
      type === 'отец' ||
      type === 'мать';

    if (isVertical) {
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

  // 2. Расчет графа и обновление стейта
  useEffect(() => {
    const { people, rels } = rawData;
    if (people.length === 0) return;

    // --- ГЕНЕРАЦИЯ УЗЛОВ (ПОКА БЕЗ КООРДИНАТ) ---
    let tempNodes = people.map((person) => {
      const age = calculateAge(person.birth_date, person.death_date);
      const ageString = getAgeString(age);
      const isDead = !!person.death_date;
      const genderColor = person.gender === 'male' ? '#228be6' : '#e64980';

      const fullName =
        `${person.first_name} ${person.last_name} ${person.middle_name || ''}`.toLowerCase();
      const searchLower = searchQuery ? searchQuery.toLowerCase() : '';
      const isMatch = searchQuery && fullName.includes(searchLower);
      const isDimmed = searchQuery && !isMatch;
      const isSelected = selectedNodeId === person.id.toString();

      // Проверяем, есть ли сохраненные координаты в БД
      const hasSavedPosition = person.position_x !== 0 || person.position_y !== 0;

      return {
        id: person.id.toString(),
        data: {
          hasSavedPosition, // Флаг для логики
          label: (
            <div
              style={{
                width: 190,
                background: 'white',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: isSelected
                  ? '0 0 0 3px #228be6'
                  : isMatch
                    ? '0 0 15px #fcc419'
                    : '0 4px 10px rgba(0,0,0,0.1)',
                border: isSelected
                  ? '2px solid #228be6'
                  : isMatch
                    ? '2px solid #fcc419'
                    : '1px solid #eee',
                display: 'flex',
                flexDirection: 'row',
                textAlign: 'left',
                position: 'relative',
                opacity: isDimmed ? 0.3 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ width: 6, background: genderColor, flexShrink: 0 }}></div>
              <div
                style={{
                  padding: 10,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={person.photo_url || `https://placehold.co/60?text=${person.first_name[0]}`}
                    alt="avatar"
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${genderColor}`,
                      filter: isDead ? 'grayscale(100%)' : 'none',
                    }}
                    crossOrigin="anonymous"
                  />
                  {isDead && (
                    <div style={{ position: 'absolute', bottom: -5, right: -5, fontSize: 12 }}>
                      ⚫
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <strong
                    style={{
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {person.first_name}
                  </strong>
                  <strong style={{ fontSize: 12 }}>{person.last_name}</strong>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
                    {age !== null ? ageString : ''}
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        // Сразу ставим сохраненные координаты, если есть. Если нет - 0,0 (поправим ниже)
        position: hasSavedPosition
          ? { x: person.position_x, y: person.position_y }
          : { x: 0, y: 0 },
        zIndex: isMatch || isSelected ? 10 : 1,
      };
    });

    // --- ГЕНЕРАЦИЯ СВЯЗЕЙ ---
    const newEdges = rels.map((rel) => {
      const typeLower = rel.type.toLowerCase();
      const fromId = rel.from_person_id.toString();
      const toId = rel.to_person_id.toString();
      const isConnectedToSelected =
        selectedNodeId && (fromId === selectedNodeId || toId === selectedNodeId);

      let opacity = 1;
      let label = '';
      let zIndex = 1;
      let strokeWidth = 2;

      if (selectedNodeId) {
        if (isConnectedToSelected) {
          opacity = 1;
          zIndex = 10;
          strokeWidth = 3;
          const fromPerson = people.find((p) => p.id === rel.from_person_id);
          const toPerson = people.find((p) => p.id === rel.to_person_id);
          label = getRelativeLabel(fromPerson, toPerson, selectedNodeId, rel.type);
        } else {
          opacity = 0.1;
          label = '';
        }
      } else {
        opacity = 1;
        label = '';
      }

      const isSpouse =
        typeLower === 'spouse' ||
        typeLower === 'супруг' ||
        typeLower === 'жена' ||
        typeLower === 'муж';
      const isSibling =
        typeLower === 'sibling' ||
        typeLower === 'brother' ||
        typeLower === 'sister' ||
        typeLower === 'брат' ||
        typeLower === 'сестра';

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
        label: label,
        type: 'smoothstep',
        animated: false,
        data: { originalType: rel.type },
        style: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDasharray: strokeDasharray,
          opacity: opacity,
        },
        zIndex: zIndex,
        labelStyle: { fill: strokeColor, fontWeight: 700, fontSize: 12 },
        labelBgStyle: { fill: 'rgba(255, 255, 255, 0.8)' },
        markerEnd: showArrow
          ? { type: MarkerType.ArrowClosed, width: 20, height: 20, color: strokeColor }
          : undefined,
      };
    });

    // --- ПРИМЕНЕНИЕ КООРДИНАТ ---
    // Рассчитываем идеальные позиции (Dagre) для ВСЕХ, чтобы знать, куда ставить новичков
    const idealPositions = getLayoutedPositions(tempNodes, newEdges);

    // Проходим по узлам и решаем: берем из БД или из Dagre
    const finalNodes = tempNodes.map((node) => {
      if (node.data.hasSavedPosition) {
        return node; // Оставляем как есть (из БД)
      }
      // Если координат нет, берем из Dagre
      if (idealPositions[node.id]) {
        node.position = idealPositions[node.id];
      }
      return node;
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
    if (selectedNodeId) onPersonClick(selectedNodeId);
  };

  // ОБРАБОТЧИК: Сохраняем позицию, когда пользователь отпустил карточку
  const onNodeDragStop = useCallback((event, node) => {
    saveNodePosition(node.id, node.position.x, node.position.y);
  }, []);

  // КНОПКА: Принудительный сброс на авто-раскладку
  const resetLayout = () => {
    const idealPositions = getLayoutedPositions(nodes, edges);
    const updatedNodes = nodes.map((node) => {
      if (idealPositions[node.id]) {
        const newPos = idealPositions[node.id];
        // Обновляем визуально
        node.position = newPos;
        // Сохраняем в базу новую красивую позицию
        saveNodePosition(node.id, newPos.x, newPos.y);
      }
      return node;
    });
    setNodes([...updatedNodes]); // Создаем копию массива для ререндера
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
        onNodeDragStop={onNodeDragStop} // <--- ВАЖНО: сохранение
        minZoom={0.2}
      >
        <Background color="#ccc" gap={20} size={1} />
        <Controls />

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
