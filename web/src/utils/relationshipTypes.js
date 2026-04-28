export const isParentType = (type) => {
  const t = type.toLowerCase();
  return t === 'parent' || t === 'родитель' || t === 'отец' || t === 'мать';
};

export const isChildType = (type) => {
  const t = type.toLowerCase();
  return t === 'child' || t === 'ребенок';
};

export const isSpouseType = (type) => {
  const t = type.toLowerCase();
  return t === 'spouse' || t === 'супруг' || t === 'жена' || t === 'муж';
};

export const isSiblingType = (type) => {
  const t = type.toLowerCase();
  return t === 'sibling' || t === 'brother' || t === 'sister' || t === 'брат' || t === 'сестра';
};

export const isVerticalType = (type) => isParentType(type) || isChildType(type);
