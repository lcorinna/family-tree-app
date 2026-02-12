import { useState } from 'react';
import { Container, Title, Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FamilyGraph } from './components/FamilyGraph';
import { CreatePersonModal } from './components/CreatePersonModal';
import { CreateRelationshipModal } from './components/CreateRelationshipModal';
import { EditPersonModal } from './components/EditPersonModal'; // <--- Импорт
import { fetchPeople } from './api'; // Нам нужно будет найти данные человека по ID

function App() {
  const [personModalOpened, { open: openPersonModal, close: closePersonModal }] = useDisclosure(false);
  const [relModalOpened, { open: openRelModal, close: closeRelModal }] = useDisclosure(false);
  
  // Состояние для редактирования
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [version, setVersion] = useState(0);

  const refreshGraph = () => {
    setVersion(v => v + 1);
  };

  // Функция, которая вызывается при клике на карточку в графе
  const handleNodeClick = async (id) => {
    // Нам нужно получить полные данные человека, чтобы заполнить форму.
    // Самый простой способ сейчас - загрузить всех и найти нужного. 
    // (В идеале сделать API endpoint GET /people/{id}, но пока так быстрее)
    const people = await fetchPeople();
    const person = people.find(p => p.id.toString() === id);
    
    if (person) {
        setSelectedPerson(person);
        openEditModal();
    }
  };

  return (
    <Container fluid style={{ height: '100vh', padding: 20, display: 'flex', flexDirection: 'column' }}>
      
      <Group justify="space-between" mb="md">
        <Title order={2}>Мое Родственное Дерево</Title>
        <Group>
            <Button variant="light" onClick={openRelModal}>🔗 Связать людей</Button>
            <Button onClick={openPersonModal}>+ Добавить человека</Button>
        </Group>
      </Group>
      
      <div style={{ flex: 1 }}>
        {/* Передаем обработчик клика */}
        <FamilyGraph refreshTrigger={version} onPersonClick={handleNodeClick} />
      </div>

      <CreatePersonModal 
        opened={personModalOpened} 
        onClose={closePersonModal} 
        onPersonCreated={refreshGraph} 
      />

      <CreateRelationshipModal 
        opened={relModalOpened} 
        onClose={closeRelModal} 
        onRelationshipCreated={refreshGraph} 
      />

      {/* Модалка редактирования */}
      <EditPersonModal
        opened={editModalOpened}
        onClose={closeEditModal}
        person={selectedPerson}
        onUpdated={refreshGraph}
      />

    </Container>
  );
}

export default App;