package handlers

import (
	"encoding/json"
	"family-tree-app/internal/auth" // Добавлен импорт auth
	"family-tree-app/internal/database"
	"family-tree-app/internal/models"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// CreateRelationship
func CreateRelationship(w http.ResponseWriter, r *http.Request) {
	// Достаем userID из контекста (так же, как в people.go)
	userID := r.Context().Value(auth.UserIDKey).(int)

	var rel models.Relationship
	err := json.NewDecoder(r.Body).Decode(&rel)
	if err != nil {
		http.Error(w, "Неверный формат JSON", http.StatusBadRequest)
		return
	}

	if rel.FromPersonID == rel.ToPersonID {
		http.Error(w, "Человек не может быть связан сам с собой", http.StatusBadRequest)
		return
	}

	// Добавили user_id
	query := `INSERT INTO relationships (user_id, from_person_id, to_person_id, type, description) VALUES (?, ?, ?, ?, ?)`
	result, err := database.DB.Exec(query, userID, rel.FromPersonID, rel.ToPersonID, rel.Type, rel.Description)
	if err != nil {
		http.Error(w, "Ошибка записи в БД: "+err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	rel.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rel)
}

// GetAllRelationships
func GetAllRelationships(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(auth.UserIDKey).(int)

	// Фильтр WHERE user_id = ?
	rows, err := database.DB.Query("SELECT id, from_person_id, to_person_id, type, description FROM relationships WHERE user_id = ?", userID)
	if err != nil {
		http.Error(w, "Ошибка чтения БД: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	relationships := []models.Relationship{}

	for rows.Next() {
		var rel models.Relationship
		if err := rows.Scan(&rel.ID, &rel.FromPersonID, &rel.ToPersonID, &rel.Type, &rel.Description); err != nil {
			continue
		}
		relationships = append(relationships, rel)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(relationships)
}

// DeleteRelationship
func DeleteRelationship(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(auth.UserIDKey).(int)
	idStr := chi.URLParam(r, "id")

	// Удаляем только если принадлежит юзеру
	result, err := database.DB.Exec("DELETE FROM relationships WHERE id=? AND user_id=?", idStr, userID)
	if err != nil {
		http.Error(w, "Ошибка удаления связи: "+err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Связь не найдена или нет прав", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}