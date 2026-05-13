import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { IconTrash, IconInfoCircle, IconCheck, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import {
  updatePerson,
  deletePerson,
  fetchRelationships,
  fetchPeople,
  deleteRelationship,
  updateRelationship,
} from '../api';

export function EditPersonModal({ opened, onClose, person, onUpdated }) {
  const [formData, setFormData] = useState(() => ({
    first_name: person?.first_name || '',
    middle_name: person?.middle_name || '',
    last_name: person?.last_name || '',
    birth_date: person?.birth_date || '',
    death_date: person?.death_date || '',
    gender: person?.gender || 'male',
    photo_url: person?.photo_url || '',
  }));

  const toDisplayDate = (iso) => (iso ? dayjs(iso).format('DD.MM.YYYY') : '');
  const [birthDateText, setBirthDateText] = useState(() => toDisplayDate(person?.birth_date));
  const [deathDateText, setDeathDateText] = useState(() => toDisplayDate(person?.death_date));

  const [personRelationships, setPersonRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteRelId, setConfirmDeleteRelId] = useState(null);
  const [editingRelId, setEditingRelId] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const loadRelationships = useCallback(async () => {
    if (!person) return;
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
          description: rel.description || '',
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
  }, [person]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const handleClose = () => {
    setConfirmDelete(false);
    setConfirmDeleteRelId(null);
    setEditingRelId(null);
    setError(null);
    onClose();
  };

  const saveDescription = async (relId, description) => {
    try {
      await updateRelationship(relId, description);
      setEditingRelId(null);
      loadRelationships();
    } catch (e) {
      console.error(e);
      setEditingRelId(null);
    }
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

  const handleDateChange = (raw, field, setTextFn) => {
    const masked = applyDateMask(raw);
    setTextFn(masked);
    const parsed = parseDateInput(masked);
    handleChange(field, parsed ? formatDate(parsed) : '');
  };

  useEffect(() => {
    setBirthDateText(toDisplayDate(person?.birth_date));
    setDeathDateText(toDisplayDate(person?.death_date));
  }, [person]);

  const handleSave = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await updatePerson(person.id, formData);
      onUpdated();
      handleClose();
    } catch (err) {
      setError(err.response?.data || err.message || 'Ошибка при сохранении');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleDeletePerson = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await deletePerson(person.id);
      onUpdated();
      handleClose();
    } catch (err) {
      setError(err.response?.data || err.message || 'Ошибка при удалении');
      setConfirmDelete(false);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleDeleteRel = async (relId) => {
    try {
      await deleteRelationship(relId);
      setConfirmDeleteRelId(null);
      loadRelationships();
      onUpdated();
    } catch (err) {
      setError(err.response?.data || err.message || 'Ошибка при удалении связи');
    }
  };

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
      onClose={handleClose}
      title={`Редактирование: ${formData.first_name}`}
      centered
      size="lg"
    >
      <Stack>
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

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
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
            <TextInput
              label="Фамилия"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
            />
            <TextInput
              label="Отчество"
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

            <Group grow>
              <TextInput
                label="Дата рождения"
                placeholder="26.06.1995"
                value={birthDateText}
                onChange={(e) => handleDateChange(e.target.value, 'birth_date', setBirthDateText)}
                maxLength={10}
              />
              <TextInput
                label="Дата смерти"
                placeholder="26.06.1995"
                value={deathDateText}
                onChange={(e) => handleDateChange(e.target.value, 'death_date', setDeathDateText)}
                maxLength={10}
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
              onChange={(e) => handleChange('photo_url', e.target.value)}
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
                        <Stack gap={2}>
                          <span>
                            {rel.type}{' '}
                            <Text span c="dimmed" size="xs">
                              {rel.direction}
                            </Text>
                          </span>
                          {editingRelId === rel.id ? (
                            <TextInput
                              size="xs"
                              value={editingDescription}
                              autoFocus
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onBlur={() => saveDescription(rel.id, editingDescription)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveDescription(rel.id, editingDescription);
                                if (e.key === 'Escape') setEditingRelId(null);
                              }}
                            />
                          ) : (
                            <Text
                              size="xs"
                              c={rel.description ? 'dimmed' : 'blue'}
                              style={{
                                cursor: 'pointer',
                                fontStyle: rel.description ? 'normal' : 'italic',
                              }}
                              onClick={() => {
                                setEditingRelId(rel.id);
                                setEditingDescription(rel.description);
                              }}
                            >
                              {rel.description || 'добавить описание...'}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {confirmDeleteRelId === rel.id ? (
                          <Group gap={4}>
                            <ActionIcon
                              color="red"
                              size="sm"
                              onClick={() => handleDeleteRel(rel.id)}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={() => setConfirmDeleteRelId(null)}
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </Group>
                        ) : (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => setConfirmDeleteRelId(rel.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Group>

        <Group justify="space-between" mt="md">
          {confirmDelete ? (
            <Group gap="xs">
              <Text size="sm" c="red">
                Удалить {formData.first_name}? Это нельзя отменить.
              </Text>
              <Button size="xs" color="red" onClick={handleDeletePerson} loading={loading}>
                Да, удалить
              </Button>
              <Button size="xs" variant="default" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
            </Group>
          ) : (
            <Button
              color="red"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              loading={loading}
            >
              Удалить карточку
            </Button>
          )}
          <Group>
            <Button variant="default" onClick={handleClose}>
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
