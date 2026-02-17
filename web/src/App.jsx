import { useState } from 'react';
import { Container, Title, Button, Group, TextInput, ActionIcon, Tooltip } from '@mantine/core'; // Убрали FileButton
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconLogout } from '@tabler/icons-react'; // Убрали IconUpload
import { FamilyGraph } from './components/FamilyGraph';
import { CreatePersonModal } from './components/CreatePersonModal';
import { CreateRelationshipModal } from './components/CreateRelationshipModal';
import { EditPersonModal } from './components/EditPersonModal';
import { AuthForm } from './components/AuthForm';
import { fetchPeople } from './api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const [personModalOpened, { open: openPersonModal, close: closePersonModal }] =
    useDisclosure(false);
  const [relModalOpened, { open: openRelModal, close: closeRelModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [version, setVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  if (!token) {
    return <AuthForm onLoginSuccess={() => setToken(localStorage.getItem('token'))} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken(null);
  };

  const refreshGraph = () => {
    setVersion((v) => v + 1);
  };

  const handleNodeClick = async (id) => {
    try {
      const people = await fetchPeople();
      const person = people.find((p) => p.id.toString() === id);
      if (person) {
        setSelectedPerson(person);
        openEditModal();
      }
    } catch (e) {
      if (e.response && e.response.status === 401) handleLogout();
    }
  };

  return (
    <Container
      fluid
      style={{ height: '100vh', padding: 20, display: 'flex', flexDirection: 'column' }}
    >
      <Group justify="space-between" mb="md" align="center">
        <Title order={2}>Генеалогическое древо</Title>

        <Group>
          {/* Поиск */}
          <TextInput
            placeholder="Найти родственника..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ width: 250 }}
          />

          {/* КНОПКУ ИМПОРТА УБРАЛИ */}

          <Button variant="light" onClick={openRelModal}>
            🔗 Связать
          </Button>
          <Button onClick={openPersonModal}>+ Добавить</Button>

          <Tooltip label="Выйти">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={handleLogout}>
              <IconLogout size={24} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div style={{ flex: 1 }}>
        <FamilyGraph
          refreshTrigger={version}
          onPersonClick={handleNodeClick}
          searchQuery={searchQuery}
        />
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
