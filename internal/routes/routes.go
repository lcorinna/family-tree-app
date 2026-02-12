package routes

import (
	"net/http"

	"family-tree-app/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter настраивает и возвращает готовый роутер
func NewRouter() http.Handler {
	r := chi.NewRouter()

	// Базовые middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Настройка CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Для разработки разрешаем все
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Маршруты
	r.Route("/api", func(r chi.Router) {
		// Люди
		r.Post("/people", handlers.CreatePerson)
		r.Get("/people", handlers.GetAllPeople)

		r.Put("/people/{id}", handlers.UpdatePerson)    // Редактировать
		r.Delete("/people/{id}", handlers.DeletePerson) // Удалить

		// Связи
		r.Post("/relationships", handlers.CreateRelationship)
		r.Get("/relationships", handlers.GetAllRelationships)
		r.Delete("/relationships/{id}", handlers.DeleteRelationship) // Удалить связь
	})

	return r
}