import React, { useState, useRef } from 'react';
import { Modal, TextInput, Select, Button, Group, Stack, Tooltip, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { createPerson } from '../api';

export function CreatePersonModal({ opened, onClose, onPersonCreated }) {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birth_date: '',
    gender: 'male',
    photo_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [birthDateText, setBirthDateText] = useState('');
  const submittingRef = useRef(false);

  const handleChange = (field, value) => {
    if (error) setError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

  const parseDateInput = (value) => {
    if (!value) return undefined;
    const m = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const d = new Date(+m[3], +m[2] - 1, +m[1]);
      if (!isNaN(d.getTime()) && d.getFullYear() === +m[3]) return d;
    }
    return undefined;
  };

  const applyDateMask = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  };

  const handleBirthDateChange = (raw) => {
    const masked = applyDateMask(raw);
    setBirthDateText(masked);
    const parsed = parseDateInput(masked);
    handleChange('birth_date', parsed ? formatDate(parsed) : '');
  };

  const handleSubmit = async () => {
    if (!formData.first_name.trim()) {
      setError('Укажите имя');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await createPerson(formData);
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        birth_date: '',
        gender: 'male',
        photo_url: '',
      });
      setBirthDateText('');
      onPersonCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data || err.message || 'Ошибка при создании');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  // Подсказка для картинок
  const photoTooltip = (
    <Text size="xs">
      Используйте <b>прямые ссылки</b> (заканчиваются на .jpg или .png).
      <br />
      Ссылки с Яндекс.Диска/Google Drive часто закрыты.
      <br />
      Рекомендуем загружать на <b>Imgur.com</b> или <b>Postimages.org</b>.
    </Text>
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Новый родственник" centered>
      <Stack>
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
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
        <TextInput
          label="Отчество"
          placeholder="Иванович"
          value={formData.middle_name}
          onChange={(e) => handleChange('middle_name', e.target.value)}
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
          placeholder="26.06.1995"
          value={birthDateText}
          onChange={(e) => handleBirthDateChange(e.target.value)}
          maxLength={10}
        />

        <TextInput
          label={
            <Group gap={5}>
              Ссылка на фото
              <Tooltip label={photoTooltip} multiline w={250} withArrow>
                <IconInfoCircle size={16} style={{ cursor: 'help', opacity: 0.6 }} />
              </Tooltip>
            </Group>
          }
          placeholder="https://i.imgur.com/..."
          value={formData.photo_url}
          onChange={(e) => handleChange('photo_url', e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Создать
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
