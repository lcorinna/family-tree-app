package routes

import (
	"net/http"

	"family-tree-app/internal/auth"
	"family-tree-app/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		
		// --- ПУБЛИЧНЫЕ ---
		r.Post("/register", handlers.Register)
		r.Post("/login", handlers.Login)

		// --- ЗАЩИЩЕННЫЕ ---
		r.Group(func(r chi.Router) {
			r.Use(auth.AuthMiddleware)

			// Люди
			r.Post("/people", handlers.CreatePerson)
			r.Get("/people", handlers.GetAllPeople)
			r.Put("/people/{id}", handlers.UpdatePerson)
			r.Delete("/people/{id}", handlers.DeletePerson)

			// Связи
			r.Post("/relationships", handlers.CreateRelationship)
			r.Get("/relationships", handlers.GetAllRelationships)
			r.Delete("/relationships/{id}", handlers.DeleteRelationship)
			
			r.Put("/people/position", handlers.SaveNodePosition)
		})
	})

	return r
}