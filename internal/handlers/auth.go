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

	// Пароль хранится в открытом виде (тестовое приложение)
	query := `INSERT INTO users (email, password_hash) VALUES (?, ?)`
	_, err := database.DB.Exec(query, creds.Email, creds.Password)
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

	var storedPassword string
	var userID int
	err := database.DB.QueryRow(
		"SELECT id, password_hash FROM users WHERE email = ?", creds.Email,
	).Scan(&userID, &storedPassword)
	if err != nil {
		http.Error(w, "Неверный email или пароль", http.StatusUnauthorized)
		return
	}

	if creds.Password != storedPassword {
		http.Error(w, "Неверный email или пароль", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(userID)
	if err != nil {
		http.Error(w, "Ошибка создания токена", http.StatusInternalServerError)
		return
	}

	// Токен — в httpOnly куке: JavaScript не может его прочитать
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400, // 24 часа
		SameSite: http.SameSiteLaxMode,
		// Secure: true — раскомментировать при деплое на HTTPS
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"email": creds.Email})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusOK)
}

// Me — проверка авторизации и получение данных текущего пользователя.
// Дополнительно делает запрос в БД, поэтому невалидный user_id (удалённая БД) вернёт 401.
func Me(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(auth.UserIDKey).(int)

	var email string
	err := database.DB.QueryRow("SELECT email FROM users WHERE id = ?", userID).Scan(&email)
	if err != nil {
		// Токен валиден, но пользователь не найден в БД (например, БД была удалена)
		http.Error(w, "Пользователь не найден", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id": userID,
		"email":   email,
	})
}
