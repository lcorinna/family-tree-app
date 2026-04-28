import { useState, useEffect } from 'react';
import { Container, Title, Button, Group, TextInput, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconLogout } from '@tabler/icons-react';
import { FamilyGraph } from './components/FamilyGraph';
import { CreatePersonModal } from './components/CreatePersonModal';
import { CreateRelationshipModal } from './components/CreateRelationshipModal';
import { EditPersonModal } from './components/EditPersonModal';
import { AuthForm } from './components/AuthForm';
import { checkAuth, logout } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [personModalOpened, { open: openPersonModal, close: closePersonModal }] =
    useDisclosure(false);
  const [relModalOpened, { open: openRelModal, close: closeRelModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [version, setVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Проверяем наличие активной сессии при загрузке страницы
    checkAuth()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthChecked(true));

    // Слушаем событие от response interceptor (истёкшая/невалидная сессия)
    const handleUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // Пока не выяснили статус авторизации — не рендерим ничего
  if (!authChecked) return null;

  if (!isAuthenticated) {
    return <AuthForm onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsAuthenticated(false);
    }
  };

  const refreshGraph = () => {
    setVersion((v) => v + 1);
  };

  const handleNodeClick = (person) => {
    setSelectedPerson(person);
    openEditModal();
  };

  return (
    <Container
      fluid
      style={{ height: '100vh', padding: 20, display: 'flex', flexDirection: 'column' }}
    >
      <Group justify="space-between" mb="md" align="center">
        <Title order={2}>Генеалогическое древо</Title>

        <Group>
          <TextInput
            placeholder="Найти родственника..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ width: 250 }}
          />

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
        key={selectedPerson?.id ?? 0}
        opened={editModalOpened}
        onClose={closeEditModal}
        person={selectedPerson}
        onUpdated={refreshGraph}
      />
    </Container>
  );
}

export default App;
