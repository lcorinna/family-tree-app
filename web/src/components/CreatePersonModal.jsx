import React, { useState } from 'react';
import { Modal, TextInput, Select, Button, Group, Stack, Tooltip, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDate = (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

  const handleSubmit = async () => {
    setLoading(true);
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
      onPersonCreated();
      onClose();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    } finally {
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

        <DateInput
          valueFormat="DD.MM.YYYY"
          label="Дата рождения"
          placeholder="Выберите дату"
          editable={false} // <--- ОТКЛЮЧИЛИ РУЧНОЙ ВВОД
          value={formData.birth_date ? dayjs(formData.birth_date).toDate() : null}
          onChange={(date) => handleChange('birth_date', formatDate(date))}
          clearable
          locale="ru"
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
