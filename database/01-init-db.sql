-- Создание пользователей
DO $$
BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'task_tracker_admin') THEN
            CREATE USER task_tracker_admin WITH PASSWORD '${ADMIN_PASSWORD}' SUPERUSER;
END IF;
END $$ LANGUAGE plpgsql;

DO $$
BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'task_tracker_user') THEN
            CREATE USER task_tracker_user WITH PASSWORD '${USER_PASSWORD}';
END IF;
END $$ LANGUAGE plpgsql;

-- Создание схемы для словарей
CREATE SCHEMA IF NOT EXISTS dictionaries;

-- Базовые права на подключение и использование схем
GRANT CONNECT ON DATABASE task_tracker_db TO task_tracker_user;
GRANT USAGE ON SCHEMA public TO task_tracker_user;
GRANT USAGE ON SCHEMA dictionaries TO task_tracker_user;

-- ТОЛЬКО CRUD права на существующие таблицы в public
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO task_tracker_user;

-- Права на последовательности (для автоинкремента)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO task_tracker_user;

-- Только чтение для dictionaries
GRANT SELECT ON ALL TABLES IN SCHEMA dictionaries TO task_tracker_user;

-- Настройка прав по умолчанию для будущих таблиц
ALTER DEFAULT PRIVILEGES FOR USER task_tracker_admin IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO task_tracker_user;

ALTER DEFAULT PRIVILEGES FOR USER task_tracker_admin IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO task_tracker_user;

ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO task_tracker_user;

ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO task_tracker_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA dictionaries
    GRANT SELECT ON TABLES TO task_tracker_user;

-- Явно запрещаем создание/удаление объектов
REVOKE CREATE ON SCHEMA public FROM task_tracker_user;
REVOKE CREATE ON SCHEMA dictionaries FROM task_tracker_user;
REVOKE CREATE ON DATABASE task_tracker_db FROM task_tracker_user;
REVOKE ALL ON SCHEMA public FROM task_tracker_user;
GRANT USAGE ON SCHEMA public TO task_tracker_user; -- Возвращаем USAGE после REVOKE ALL

-- Запрещаем изменение структуры таблиц
REVOKE TRIGGER ON ALL TABLES IN SCHEMA public FROM task_tracker_user;
REVOKE REFERENCES ON ALL TABLES IN SCHEMA public FROM task_tracker_user;
REVOKE RULE ON ALL TABLES IN SCHEMA public FROM task_tracker_user;