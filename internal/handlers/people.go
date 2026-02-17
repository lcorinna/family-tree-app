package handlers

import (
	"encoding/json"
	"family-tree-app/internal/auth"
	"family-tree-app/internal/database"
	"family-tree-app/internal/models"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Структура для получения координат с фронтенда
type PositionUpdate struct {
	ID int     `json:"id"`
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
}

// Вспомогательная функция для получения ID пользователя из контекста
func getUserID(r *http.Request) int {
	return r.Context().Value(auth.UserIDKey).(int)
}

// CreatePerson
func CreatePerson(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	var p models.Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Неверный формат JSON", http.StatusBadRequest)
		return
	}

	// При создании position_x/y по умолчанию 0 (в БД)
	query := `INSERT INTO people (user_id, first_name, middle_name, last_name, birth_date, death_date, gender, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	
	result, err := database.DB.Exec(query, userID, p.FirstName, p.MiddleName, p.LastName, p.BirthDate, p.DeathDate, p.Gender, p.PhotoURL)
	if err != nil {
		http.Error(w, "Ошибка записи в БД: "+err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	p.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

// GetAllPeople
func GetAllPeople(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	// Добавили чтение координат: position_x, position_y
	query := `SELECT id, first_name, middle_name, last_name, birth_date, death_date, gender, photo_url, position_x, position_y FROM people WHERE user_id = ?`
	rows, err := database.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Ошибка чтения БД: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	people := []models.Person{}

	for rows.Next() {
		var p models.Person
		var photoUrl *string 
		var middleName *string
		
		// Сканируем координаты в p.PositionX, p.PositionY
		if err := rows.Scan(&p.ID, &p.FirstName, &middleName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &photoUrl, &p.PositionX, &p.PositionY); err != nil {
			continue
		}
		if photoUrl != nil {
			p.PhotoURL = *photoUrl
		}
		if middleName != nil {
			p.MiddleName = *middleName
		}
		people = append(people, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(people)
}

// UpdatePerson
func UpdatePerson(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	
	var p models.Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Ошибка данных", http.StatusBadRequest)
		return
	}

	query := `UPDATE people SET first_name=?, middle_name=?, last_name=?, birth_date=?, death_date=?, gender=?, photo_url=? WHERE id=? AND user_id=?`
	
	_, err := database.DB.Exec(query, p.FirstName, p.MiddleName, p.LastName, p.BirthDate, p.DeathDate, p.Gender, p.PhotoURL, idStr, userID)
	if err != nil {
		http.Error(w, "Ошибка обновления: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// SaveNodePosition - сохраняет координаты перетащенной карточки
func SaveNodePosition(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	
	var pos PositionUpdate
	if err := json.NewDecoder(r.Body).Decode(&pos); err != nil {
		http.Error(w, "Неверный формат", http.StatusBadRequest)
		return
	}

	// Обновляем только координаты X и Y
	query := `UPDATE people SET position_x=?, position_y=? WHERE id=? AND user_id=?`
	_, err := database.DB.Exec(query, pos.X, pos.Y, pos.ID, userID)
	if err != nil {
		http.Error(w, "Ошибка сохранения позиции: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeletePerson
func DeletePerson(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	
	_, _ = database.DB.Exec("DELETE FROM relationships WHERE (from_person_id=? OR to_person_id=?) AND user_id=?", idStr, idStr, userID)
	
	result, err := database.DB.Exec("DELETE FROM people WHERE id=? AND user_id=?", idStr, userID)
	if err != nil {
		http.Error(w, "Ошибка удаления: "+err.Error(), http.StatusInternalServerError)
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Человек не найден или нет прав", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}