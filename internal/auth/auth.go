package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Секретный ключ для подписи токенов (в продакшене хранить в .env!)
var JwtKey = []byte("super_secret_key_change_me")

// Структура данных внутри токена
type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

// HashPassword превращает "123456" в "$2a$14$..."
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash проверяет, подходит ли пароль к хешу
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken создает JWT токен для пользователя
func GenerateToken(userID int) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Токен живет 1 сутки
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtKey)
}