package database

import (
	"database/sql"
	"log"

	_ "github.com/glebarez/go-sqlite" // Драйвер Pure Go
)

var DB *sql.DB

func InitDB() {
	var err error
	// Подключаемся к файлу
	DB, err = sql.Open("sqlite", "./family_tree.db")
	if err != nil {
		log.Fatal("Ошибка открытия БД: ", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Ошибка соединения с БД: ", err)
	}

	createTables()
	log.Println("База данных успешно подключена.")
}

func createTables() {
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		is_verified BOOLEAN DEFAULT 0,
		link_to_person_id INTEGER,
		FOREIGN KEY(link_to_person_id) REFERENCES people(id)
	);`

	peopleTable := `
	CREATE TABLE IF NOT EXISTS people (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		birth_date TEXT,
		death_date TEXT,
		gender TEXT,
		photo_url TEXT
	);`

	relationshipsTable := `
	CREATE TABLE IF NOT EXISTS relationships (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		from_person_id INTEGER NOT NULL,
		to_person_id INTEGER NOT NULL,
		type TEXT NOT NULL,
		description TEXT,
		FOREIGN KEY(from_person_id) REFERENCES people(id),
		FOREIGN KEY(to_person_id) REFERENCES people(id)
	);`

	mustExec(usersTable)
	mustExec(peopleTable)
	mustExec(relationshipsTable)
}

func mustExec(query string) {
	_, err := DB.Exec(query)
	if err != nil {
		log.Fatalf("Ошибка при создании таблицы (%s): %v", query, err)
	}
}