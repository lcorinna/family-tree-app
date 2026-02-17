import React, { useEffect, useState } from 'react';
import { Modal, Select, Button, Group, Stack, Autocomplete, Text } from '@mantine/core';
import { createRelationship, fetchPeople } from '../api';

export function CreateRelationshipModal({ opened, onClose, onRelationshipCreated }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);

  // Меняем значение по умолчанию на русское
  const [type, setType] = useState('');

  useEffect(() => {
    if (opened) {
      fetchPeople().then((data) => {
        const options = data.map((p) => ({
          value: p.id.toString(),
          label: `${p.first_name} ${p.last_name}`,
        }));
        setPeople(options);
      });
    }
  }, [opened]);

  const handleSubmit = async () => {
    if (!fromId || !toId) return;
    if (fromId === toId) {
      alert('Нельзя связать человека с самим собой!');
      return;
    }

    setLoading(true);
    try {
      await createRelationship({
        from_person_id: parseInt(fromId),
        to_person_id: parseInt(toId),
        type: type,
        description: '',
      });

      onRelationshipCreated();
      onClose();
      setFromId(null);
      setToId(null);
      setType('Родитель');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Создать связь" centered>
      <Stack>
        <Select
          label="Кто (От кого идет стрелка)"
          placeholder="Выберите человека"
          data={people}
          value={fromId}
          onChange={setFromId}
          searchable
        />

        <Autocomplete
          label="Кем приходится"
          placeholder="Например: родитель, ребенок, супруг..."
          data={[
            'Родитель',
            'Супруг',
            'Ребенок',
            'Брат',
            'Сестра',
            'Бабушка',
            'Дедушка',
            'Отчим',
            'Мачеха',
            'Дядя',
            'Тетя',
          ]}
          value={type}
          onChange={setType}
        />

        <Select
          label="Кому (В кого идет стрелка)"
          placeholder="Выберите человека"
          data={people}
          value={toId}
          onChange={setToId}
          searchable
        />

        {fromId && toId && (
          <Text size="sm" c="dimmed">
            {people.find((p) => p.value === fromId)?.label} — <b>{type}</b> —{' '}
            {people.find((p) => p.value === toId)?.label}
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Связать
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
