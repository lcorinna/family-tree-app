package handlers

import (
	"encoding/json"
	"family-tree-app/internal/database"
	"family-tree-app/internal/models"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// CreatePerson
func CreatePerson(w http.ResponseWriter, r *http.Request) {
	var p models.Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Неверный формат JSON", http.StatusBadRequest)
		return
	}

	query := `INSERT INTO people (first_name, last_name, birth_date, death_date, gender, photo_url) VALUES (?, ?, ?, ?, ?, ?)`
	
	result, err := database.DB.Exec(query, p.FirstName, p.LastName, p.BirthDate, p.DeathDate, p.Gender, p.PhotoURL)
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
	query := `SELECT id, first_name, last_name, birth_date, death_date, gender, photo_url FROM people`
	rows, err := database.DB.Query(query)
	if err != nil {
		http.Error(w, "Ошибка чтения БД: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// ИСПРАВЛЕНИЕ: Инициализируем как пустой слайс, чтобы JSON был [], а не null
	people := []models.Person{}

	for rows.Next() {
		var p models.Person
		var photoUrl *string 
		
		if err := rows.Scan(&p.ID, &p.FirstName, &p.LastName, &p.BirthDate, &p.DeathDate, &p.Gender, &photoUrl); err != nil {
			continue
		}
		if photoUrl != nil {
			p.PhotoURL = *photoUrl
		}
		people = append(people, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(people)
}

// UpdatePerson
func UpdatePerson(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	
	var p models.Person
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Ошибка данных", http.StatusBadRequest)
		return
	}

	query := `UPDATE people SET first_name=?, last_name=?, birth_date=?, gender=?, photo_url=? WHERE id=?`
	_, err := database.DB.Exec(query, p.FirstName, p.LastName, p.BirthDate, p.Gender, p.PhotoURL, idStr)
	if err != nil {
		http.Error(w, "Ошибка обновления: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// DeletePerson
func DeletePerson(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	_, _ = database.DB.Exec("DELETE FROM relationships WHERE from_person_id=? OR to_person_id=?", idStr, idStr)
	_, err := database.DB.Exec("DELETE FROM people WHERE id=?", idStr)
	if err != nil {
		http.Error(w, "Ошибка удаления: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}