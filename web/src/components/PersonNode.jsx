import React from 'react';
import { Handle, Position } from 'reactflow';

export function PersonNode({ data }) {
  const { person, isDimmed, isMatch, isSelected, age, ageString } = data;
  const genderColor = person.gender === 'male' ? '#228be6' : '#e64980';
  const isDead = !!person.death_date;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
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
        <div style={{ width: 6, background: genderColor, flexShrink: 0 }} />
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
              <div style={{ position: 'absolute', bottom: -5, right: -5, fontSize: 12 }}>⚫</div>
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
    </>
  );
}
