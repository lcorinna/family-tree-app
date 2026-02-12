import React, { useState } from 'react';
import { Modal, TextInput, Select, Button, Group, Stack } from '@mantine/core';
import { createPerson } from '../api';

export function CreatePersonModal({ opened, onClose, onPersonCreated }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'male',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createPerson(formData);
      setFormData({ first_name: '', last_name: '', birth_date: '', gender: 'male' });
      onPersonCreated(); 
      onClose();
    } catch (error) {
      alert('Ошибка при создании: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Новый родственник" centered>
      <Stack>
        <TextInput
          label="Имя"
          placeholder="Иван"
          value={formData.first_name}
          onChange={(e) => handleChange('first_name', e.target.value)}
          required
        />
        <TextInput
          label="Фамилия"
          placeholder="Иванов"
          value={formData.last_name}
          onChange={(e) => handleChange('last_name', e.target.value)}
          required
        />
        <Select
          label="Пол"
          value={formData.gender}
          onChange={(val) => handleChange('gender', val)}
          data={[
            { value: 'male', label: 'Мужской' },
            { value: 'female', label: 'Женский' },
          ]}
        />
        <TextInput
          label="Дата рождения"
          placeholder="1990-01-01"
          value={formData.birth_date}
          onChange={(e) => handleChange('birth_date', e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} loading={loading}>Создать</Button>
        </Group>
      </Stack>
    </Modal>
  );
}