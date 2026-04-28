import React, { useEffect, useRef, useState } from 'react';
import { Modal, Select, Button, Group, Stack, Autocomplete, Text, Textarea } from '@mantine/core';
import { createRelationship, fetchPeople } from '../api';

export function CreateRelationshipModal({ opened, onClose, onRelationshipCreated }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const submittingRef = useRef(false);

  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);

  // Меняем значение по умолчанию на русское
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

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

  const handleClose = () => {
    setFromId(null);
    setToId(null);
    setType('');
    setDescription('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!fromId || !toId) return;
    if (fromId === toId) {
      setError('Нельзя связать человека с самим собой!');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await createRelationship({
        from_person_id: parseInt(fromId),
        to_person_id: parseInt(toId),
        type: type,
        description: description,
      });

      onRelationshipCreated();
      handleClose();
    } catch (err) {
      setError(err.response?.data || err.message || 'Ошибка при создании связи');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Создать связь" centered>
      <Stack>
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
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

        <Textarea
          label="Описание (необязательно)"
          placeholder="Например: поженились в 1985 году"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autosize
          minRows={2}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
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
