package main

import (
	"log"
	"net/http"

	"family-tree-app/internal/database"
	"family-tree-app/internal/routes" // Импортируем наш новый пакет
)

func main() {
	// 1. Инициализация БД
	database.InitDB()
	defer database.DB.Close()

	// 2. Получаем настроенный роутер из пакета routes
	r := routes.NewRouter()

	// 3. Запуск сервера
	port := "8080"
	log.Printf("Сервер запущен: http://localhost:%s", port)
	
	err := http.ListenAndServe(":"+port, r)
	if err != nil {
		log.Fatal(err)
	}
}