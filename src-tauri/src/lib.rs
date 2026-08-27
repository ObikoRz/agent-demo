use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Agent Fitness.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    bodyweight_kg REAL,
                    height_cm REAL,
                    experience TEXT CHECK(experience IN ('beginner','intermediate','advanced')),
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS exercises (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    primary_muscle TEXT NOT NULL,
                    secondary_muscles TEXT,
                    equipment TEXT NOT NULL,
                    pattern TEXT,
                    demo_url TEXT,
                    notes TEXT
                );

                CREATE TABLE IF NOT EXISTS workout_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    name TEXT,
                    notes TEXT,
                    duration_min INTEGER,
                    bodyweight_kg REAL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS set_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    exercise_id INTEGER NOT NULL,
                    set_index INTEGER NOT NULL,
                    reps INTEGER NOT NULL,
                    weight_kg REAL NOT NULL,
                    rpe REAL,
                    is_warmup INTEGER DEFAULT 0,
                    is_pr INTEGER DEFAULT 0,
                    notes TEXT,
                    FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
                );

                CREATE TABLE IF NOT EXISTS training_max (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    exercise_id INTEGER NOT NULL,
                    tm_kg REAL NOT NULL,
                    unit TEXT DEFAULT 'kg',
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
                );

                CREATE TABLE IF NOT EXISTS plans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    template TEXT NOT NULL,
                    goal TEXT,
                    weeks INTEGER NOT NULL,
                    days_per_week INTEGER NOT NULL,
                    config_json TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS plan_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_id INTEGER NOT NULL,
                    week INTEGER NOT NULL,
                    day INTEGER NOT NULL,
                    name TEXT,
                    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS plan_exercises (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    exercise_id INTEGER NOT NULL,
                    sets INTEGER NOT NULL,
                    reps TEXT NOT NULL,
                    intensity TEXT,
                    notes TEXT,
                    sort_order INTEGER DEFAULT 0,
                    FOREIGN KEY(session_id) REFERENCES plan_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
                );

                CREATE TABLE IF NOT EXISTS api_config (
                    id INTEGER PRIMARY KEY CHECK(id = 1),
                    base_url TEXT,
                    api_key TEXT,
                    model TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON workout_sessions(user_id, date);
                CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:agent_fitness.db", migrations)
                .build(),
        )
        .setup(|app| {
            // Ensure app data dir exists
            let _app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
