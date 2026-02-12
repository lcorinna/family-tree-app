package models

// Person - Узел графа. Хранит личные данные.
type Person struct {
	ID        int    `json:"id" db:"id"`
	FirstName string `json:"first_name" db:"first_name"`
	LastName  string `json:"last_name" db:"last_name"`
	BirthDate string  `json:"birth_date" db:"birth_date"` 
	// Используем string для дат, чтобы поддерживать неполные даты (например "1990") 
	// и избежать проблем с парсингом нулевых дат в SQLite.
	DeathDate *string `json:"death_date" db:"death_date"` // Указатель, может быть null (жив)
	Gender    string  `json:"gender" db:"gender"`         // "male", "female", "other"
	PhotoURL	string  `json:"photo_url" db:"photo_url"`   // URL фотографии
}

// Relationship - Ребро графа. Связь между двумя людьми.
type Relationship struct {
	ID           int    `json:"id" db:"id"`
	FromPersonID int    `json:"from_person_id" db:"from_person_id"`
	ToPersonID   int    `json:"to_person_id" db:"to_person_id"`
	
	// Type - Тип связи. Примеры: 
	// "parent" (родитель), "spouse" (супруг), "step_parent" (отчим/мачеха), "adopted" (усыновлен)
	Type string `json:"type" db:"type"` 
	
	// Description - Дополнительное описание (например: "Брак заключен в 2010")
	Description string `json:"description" db:"description"`
}

// User - Аккаунт для входа в систему.
type User struct {
	ID           int    `json:"id" db:"id"`
	Email        string `json:"email" db:"email"`
	PasswordHash string `json:"-" db:"password_hash"` // "-" означает не отправлять в JSON
	IsVerified   bool   `json:"is_verified" db:"is_verified"`
	
	// LinkToPersonID - Какой Person в дереве соответствует этому юзеру (Я)
	LinkToPersonID *int `json:"link_to_person_id" db:"link_to_person_id"`
}