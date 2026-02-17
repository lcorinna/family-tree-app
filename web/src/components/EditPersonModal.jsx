import React, { useEffect, useState } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Image,
  Text,
  ActionIcon,
  Table,
  Divider,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconTrash, IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import {
  updatePerson,
  deletePerson,
  fetchRelationships,
  fetchPeople,
  deleteRelationship,
} from '../api';

export function EditPersonModal({ opened, onClose, person, onUpdated }) {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    birth_date: '',
    death_date: '',
    gender: 'male',
    photo_url: '',
  });

  const [personRelationships, setPersonRelationships] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name || '',
        middle_name: person.middle_name || '',
        last_name: person.last_name || '',
        birth_date: person.birth_date || '',
        death_date: person.death_date || '',
        gender: person.gender || 'male',
        photo_url: person.photo_url || '',
      });
      loadRelationships();
    }
  }, [person]);

  const loadRelationships = async () => {
    try {
      const [allRels, allPeople] = await Promise.all([fetchRelationships(), fetchPeople()]);
      const myRels = allRels.filter(
        (r) => r.from_person_id === person.id || r.to_person_id === person.id
      );

      const enriched = myRels.map((rel) => {
        const isFromMe = rel.from_person_id === person.id;
        const otherId = isFromMe ? rel.to_person_id : rel.from_person_id;
        const otherPerson = allPeople.find((p) => p.id === otherId);

        return {
          id: rel.id,
          type: rel.type,
          otherName: otherPerson
            ? `${otherPerson.first_name} ${otherPerson.last_name}`
            : 'Неизвестный',
          direction: isFromMe ? '🡆' : '🡄',
        };
      });
      setPersonRelationships(enriched);
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (date) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

  const handleSave = async () => {
    setLoading(true);
    try {
      await updatePerson(person.id, formData);
      onUpdated();
      onClose();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!window.confirm(`Удалить ${person.first_name}?`)) return;
    setLoading(true);
    try {
      await deletePerson(person.id);
      onUpdated();
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRel = async (relId) => {
    if (!window.confirm('Разорвать эту связь?')) return;
    try {
      await deleteRelationship(relId);
      loadRelationships();
      onUpdated();
    } catch (e) {
      alert(e.message);
    }
  };

  // Текст подсказки
  const photoTooltip = (
    <Text size="xs">
      Используйте <b>прямые ссылки</b> (на .jpg/.png).
      <br />
      Ссылки с Google Drive/Яндекс.Диск не работают.
      <br />
      Используйте <b>Imgur.com</b>.
    </Text>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Редактирование: ${formData.first_name}`}
      centered
      size="lg"
    >
      <Stack>
        <Group align="flex-start" grow>
          {/* ЛЕВАЯ КОЛОНКА */}
          <Stack>
            {formData.photo_url && (
              <Group justify="center">
                <Image
                  src={formData.photo_url}
                  w={120}
                  h={120}
                  radius="md"
                  fit="cover"
                  fallbackSrc="https://placehold.co/100?text=Error"
                />
              </Group>
            )}
            <TextInput
              label="Имя"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <TextInput
              label="Фамилия"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
            <TextInput
              label="Отчество"
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            />

            <Select
              label="Пол"
              value={formData.gender}
              onChange={(val) => setFormData({ ...formData, gender: val })}
              data={[
                { value: 'male', label: 'Мужской' },
                { value: 'female', label: 'Женский' },
              ]}
            />

            <Group grow>
              <DateInput
                valueFormat="DD.MM.YYYY"
                label="Дата рождения"
                placeholder="Выберите дату"
                editable={false} // <--- ОТКЛЮЧИЛИ РУЧНОЙ ВВОД
                value={formData.birth_date ? dayjs(formData.birth_date).toDate() : null}
                onChange={(date) => setFormData({ ...formData, birth_date: formatDate(date) })}
                clearable
                locale="ru"
              />
              <DateInput
                valueFormat="DD.MM.YYYY"
                label="Дата смерти"
                placeholder="Выберите дату"
                editable={false} // <--- ОТКЛЮЧИЛИ РУЧНОЙ ВВОД
                value={formData.death_date ? dayjs(formData.death_date).toDate() : null}
                onChange={(date) => setFormData({ ...formData, death_date: formatDate(date) })}
                clearable
                locale="ru"
              />
            </Group>

            <TextInput
              label={
                <Group gap={5}>
                  Фото URL
                  <Tooltip label={photoTooltip} multiline w={220} withArrow>
                    <IconInfoCircle size={16} style={{ cursor: 'help', opacity: 0.6 }} />
                  </Tooltip>
                </Group>
              }
              placeholder="https://..."
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            />
          </Stack>

          {/* ПРАВАЯ КОЛОНКА (Связи) */}
          <Stack style={{ borderLeft: '1px solid #eee', paddingLeft: 15 }}>
            <Text fw={700} size="sm">
              Родственные связи:
            </Text>
            <Divider />
            {personRelationships.length === 0 ? (
              <Text c="dimmed" size="xs">
                Связей пока нет
              </Text>
            ) : (
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Родственник</Table.Th>
                    <Table.Th>Роль</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {personRelationships.map((rel) => (
                    <Table.Tr key={rel.id}>
                      <Table.Td>{rel.otherName}</Table.Td>
                      <Table.Td>
                        {rel.type}{' '}
                        <Text span c="dimmed" size="xs">
                          {rel.direction}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleDeleteRel(rel.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Group>

        <Group justify="space-between" mt="md">
          <Button color="red" variant="outline" onClick={handleDeletePerson} loading={loading}>
            Удалить карточку
          </Button>
          <Group>
            <Button variant="default" onClick={onClose}>
              Закрыть
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Сохранить
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
