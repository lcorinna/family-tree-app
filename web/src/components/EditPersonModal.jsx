import React, { useEffect, useState } from 'react';
import { Modal, TextInput, Select, Button, Group, Stack, Image, Text, ActionIcon, Table } from '@mantine/core';
// Импортируем иконку мусорки (нужно установить пакет или использовать текст)
import { IconTrash } from '@tabler/icons-react'; 
import { updatePerson, deletePerson, fetchRelationships, fetchPeople, deleteRelationship } from '../api';

export function EditPersonModal({ opened, onClose, person, onUpdated }) {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', birth_date: '', gender: 'male', photo_url: '',
  });

  // Храним связи этого человека
  const [personRelationships, setPersonRelationships] = useState([]);
  const [loading, setLoading] = useState(false);

  // При открытии окна загружаем данные
  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        birth_date: person.birth_date || '',
        gender: person.gender || 'male',
        photo_url: person.photo_url || '',
      });
      loadRelationships();
    }
  }, [person]);

  // Функция загрузки и фильтрации связей
  const loadRelationships = async () => {
    try {
        const [allRels, allPeople] = await Promise.all([fetchRelationships(), fetchPeople()]);
        
        // Находим связи, где участвует наш person
        const myRels = allRels.filter(r => r.from_person_id === person.id || r.to_person_id === person.id);
        
        // Обогащаем данные именами (так как в связи только ID)
        const enriched = myRels.map(rel => {
            // Если person - это "от кого", то "родственник" - это "кому"
            const isFromMe = rel.from_person_id === person.id;
            const otherId = isFromMe ? rel.to_person_id : rel.from_person_id;
            const otherPerson = allPeople.find(p => p.id === otherId);
            
            return {
                id: rel.id,
                type: rel.type,
                otherName: otherPerson ? `${otherPerson.first_name} ${otherPerson.last_name}` : 'Неизвестный',
                direction: isFromMe ? '🡆 (Исходящая)' : '🡄 (Входящая)' // Для понимания кто кому кем
            };
        });
        setPersonRelationships(enriched);
    } catch (e) {
        console.error(e);
    }
  };

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
      onUpdated(); onClose();
    } catch (error) { alert(error.message); } finally { setLoading(false); }
  };

  // Удаление конкретной связи
  const handleDeleteRel = async (relId) => {
      if(!window.confirm("Разорвать эту связь?")) return;
      try {
          await deleteRelationship(relId);
          loadRelationships(); // Обновляем список внутри модалки
          onUpdated(); // Обновляем большой график на фоне
      } catch (e) {
          alert(e.message);
      }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Редактирование: ${formData.first_name}`} centered size="lg">
      <Stack>
        <Group align="flex-start" grow>
            {/* ЛЕВАЯ КОЛОНКА - ФОРМА */}
            <Stack>
                {formData.photo_url && (
                    <Group justify="center">
                        <Image src={formData.photo_url} w={80} h={80} radius="md" fit="cover" fallbackSrc="https://placehold.co/100?text=Error"/>
                    </Group>
                )}
                <TextInput label="Имя" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                <TextInput label="Фамилия" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                <Select label="Пол" value={formData.gender} onChange={(val) => setFormData({...formData, gender: val})} data={['male', 'female']} />
                <TextInput label="Фото URL" value={formData.photo_url} onChange={(e) => setFormData({...formData, photo_url: e.target.value})} />
            </Stack>

            {/* ПРАВАЯ КОЛОНКА - СПИСОК СВЯЗЕЙ */}
            <Stack style={{ borderLeft: '1px solid #eee', paddingLeft: 15 }}>
                <Text fw={700} size="sm">Родственные связи:</Text>
                {personRelationships.length === 0 ? (
                    <Text c="dimmed" size="xs">Связей нет</Text>
                ) : (
                    <Table>
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
                                    <Table.Td>{rel.type}</Table.Td>
                                    <Table.Td>
                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteRel(rel.id)}>
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
          <Button color="red" variant="outline" onClick={handleDeletePerson} loading={loading}>Удалить человека</Button>
          <Group>
            <Button variant="default" onClick={onClose}>Закрыть</Button>
            <Button onClick={handleSave} loading={loading}>Сохранить</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}