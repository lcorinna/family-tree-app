import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Group,
  Anchor,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react'; // Импортируем иконку
import { login, register } from '../api';

export function AuthForm({ onLoginSuccess }) {
  const [type, setType] = useState('login'); // 'login' или 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'login') {
        const data = await login(form.email, form.password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.email);
        onLoginSuccess();
      } else {
        await register(form.email, form.password);
        alert('Регистрация успешна! Теперь войдите.');
        setType('login');
      }
    } catch (err) {
      const msg = err.response?.data || 'Ошибка соединения';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Текст подсказки
  const emailTooltip = (
    <Text size="xs">
      Мы <b>не требуем</b> подтверждения почты. <br />
      Email используется только как уникальный логин,
      <br />
      чтобы к вашему дереву имели доступ только вы
      <br />и члены семьи, которым вы дадите пароль.
    </Text>
  );

  return (
    <Container size={420} my={40}>
      <Title align="center" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
        {type === 'login' ? 'Вход в систему' : 'Создание аккаунта'}
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <TextInput
              label={
                <Group gap={5}>
                  <Text span size="sm" fw={500}>
                    Email
                  </Text>
                  {/* Ручная звездочка внутри группы */}
                  <Text span c="red">
                    *
                  </Text>

                  {/* Показываем подсказку только при регистрации */}
                  {type === 'register' && (
                    <Tooltip
                      label={emailTooltip}
                      multiline
                      w={220}
                      withArrow
                      events={{ hover: true, focus: true, touch: true }}
                    >
                      <IconInfoCircle size={16} style={{ cursor: 'help', opacity: 0.6 }} />
                    </Tooltip>
                  )}
                </Group>
              }
              placeholder="you@family.com"
              required
              withAsterisk={false} // Отключаем стандартную звездочку, чтобы она не переносилась
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              mt="md"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Button fullWidth mt="xl" type="submit" loading={loading}>
              {type === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </Stack>
        </form>

        <Group justify="center" mt="xl">
          <Anchor
            component="button"
            type="button"
            c="dimmed"
            onClick={() => {
              setType(type === 'login' ? 'register' : 'login');
              setError(null);
            }}
            size="sm"
          >
            {type === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </Anchor>
        </Group>
      </Paper>
    </Container>
  );
}
