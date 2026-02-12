import React, { useEffect } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css'; 
import { fetchPeople, fetchRelationships } from '../api';

const nodeWidth = 170;
const nodeHeight = 100;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
  });

  return { nodes, edges };
};

export function FamilyGraph({ refreshTrigger, onPersonClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadData = async () => {
    try {
      // ИСПРАВЛЕНИЕ: Добавляем || [] для защиты от null
      const peopleData = await fetchPeople();
      const people = peopleData || [];

      const relsData = await fetchRelationships();
      const rels = relsData || [];

      // 1. Формируем узлы
      const rawNodes = people.map((person) => ({
        id: person.id.toString(),
        data: { 
          label: (
            <div style={{ 
                padding: 10, 
                border: '1px solid #777', 
                borderRadius: 8, 
                background: 'white', 
                width: 160, 
                textAlign: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',       
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5
            }}>
              {/* Отображение фото */}
              {person.photo_url ? (
                  <img 
                    src={person.photo_url} 
                    alt="avatar" 
                    style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }}
                  />
              ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                     {person.gender === 'male' ? '👨' : '👩'}
                  </div>
              )}

              <strong>{person.first_name} {person.last_name}</strong>
              <div style={{ fontSize: '0.8em', color: 'gray' }}>{person.birth_date}</div>
              {person.death_date && <div style={{ fontSize: '0.8em' }}>† {person.death_date}</div>}
            </div>
          )
        },
        position: { x: 0, y: 0 },
      }));

      // 2. Формируем связи
      const rawEdges = rels.map((rel) => ({
        id: `e${rel.id}`,
        source: rel.from_person_id.toString(),
        target: rel.to_person_id.toString(),
        
        label: rel.type,
        
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#555' }
      }));

      // 3. Авто-расстановка
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        rawNodes,
        rawEdges
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);

    } catch (error) {
      console.error("Ошибка загрузки:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  return (
    <div style={{ height: '100%', width: '100%', border: '1px solid #ddd', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        onNodeClick={(event, node) => {
            onPersonClick(node.id); 
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}