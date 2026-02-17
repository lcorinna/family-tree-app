package handlers

import (
	"encoding/json"
	"family-tree-app/internal/auth"
	"family-tree-app/internal/database"
	"net/http"
)

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(w http.ResponseWriter, r *http.Request) {
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Неверный формат", http.StatusBadRequest)
		return
	}

	// РАНЬШЕ: Хешировали пароль
	// hash, err := auth.HashPassword(creds.Password)
	
	// ТЕПЕРЬ: Просто берем пароль как есть чтобы легче дебажить и тестировать.
	plainPassword := creds.Password

	// Сохраняем пользователя (пишем пароль прямо в колонку password_hash)
	query := `INSERT INTO users (email, password_hash) VALUES (?, ?)`
	_, err := database.DB.Exec(query, creds.Email, plainPassword)
	if err != nil {
		http.Error(w, "Пользователь с таким email уже существует", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "registered"})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Неверный формат", http.StatusBadRequest)
		return
	}

	// 1. Ищем пользователя по email
	var storedPassword string // Тут теперь лежит обычный пароль, не хеш
	var userID int
	
	// Мы не меняли название колонки в БД, она все еще называется password_hash, 
	// но хранить там будем обычный текст.
	err := database.DB.QueryRow("SELECT id, password_hash FROM users WHERE email = ?", creds.Email).Scan(&userID, &storedPassword)
	if err != nil {
		http.Error(w, "Неверный email или пароль", http.StatusUnauthorized)
		return
	}

	// 2. Проверяем пароль (ПРОСТОЕ СРАВНЕНИЕ СТРОК)
	// РАНЬШЕ: if !auth.CheckPasswordHash(creds.Password, storedHash)
	
	if creds.Password != storedPassword {
		http.Error(w, "Неверный email или пароль", http.StatusUnauthorized)
		return
	}

	// 3. Генерируем токен
	token, err := auth.GenerateToken(userID)
	if err != nil {
		http.Error(w, "Ошибка создания токена", http.StatusInternalServerError)
		return
	}

	// 4. Отдаем токен
	json.NewEncoder(w).Encode(map[string]string{
		"token": token, 
		"email": creds.Email,
	})
}