CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       first_name VARCHAR(100) NOT NULL,
                       last_name VARCHAR(100) NOT NULL,
                       nickname VARCHAR(100) UNIQUE NOT NULL,
                       avatar_url TEXT,
                       bio TEXT,
                       color VARCHAR(7) NOT NULL DEFAULT '#8B5CF6',
                       created_at TIMESTAMP DEFAULT NOW(),
                       updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE projects (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          name VARCHAR(255),
                          description TEXT,
                          created_at TIMESTAMP DEFAULT NOW(),
                          updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE project_members (
                                 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                 project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                                 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                 role_in_team TEXT,
                                 joined_at TIMESTAMP DEFAULT NOW(),
                                 permission_level VARCHAR(20) NOT NULL DEFAULT 'member',
                                 granted_at TIMESTAMP DEFAULT NOW(),
                                 granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
                                 last_seen_at TIMESTAMP DEFAULT NOW(),
                                 UNIQUE(project_id, user_id),
                                 CONSTRAINT valid_permission_level CHECK (permission_level IN ('owner', 'admin', 'member'))
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_granted_by ON project_members(granted_by);

CREATE TABLE project_statuses (
                                  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                  created_at TIMESTAMP DEFAULT NOW(),
                                  updated_at TIMESTAMP DEFAULT NOW(),
                                  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                                  name VARCHAR(100) NOT NULL,
                                  status_type VARCHAR(50) NOT NULL,
                                  color VARCHAR(7) NOT NULL DEFAULT '#8B5CF6',
                                  UNIQUE(project_id, name),
                                  CONSTRAINT valid_status_type CHECK (status_type IN ('todo', 'progress', 'paused', 'completed', 'cancelled'))
);

CREATE INDEX idx_project_statuses_project_id ON project_statuses(project_id);
CREATE INDEX idx_project_statuses_type ON project_statuses(status_type);

CREATE TRIGGER update_project_statuses_updated_at
    BEFORE UPDATE ON project_statuses
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE columns (
                         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                         project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                         status_id UUID NOT NULL REFERENCES project_statuses(id) ON DELETE CASCADE,
                         position INTEGER NOT NULL,
                         created_at TIMESTAMP DEFAULT NOW(),
                         updated_at TIMESTAMP DEFAULT NOW(),
                         UNIQUE(project_id, status_id),
                         UNIQUE(project_id, position)
);

CREATE INDEX idx_columns_project_id ON columns(project_id);
CREATE INDEX idx_columns_status_id ON columns(status_id);
CREATE INDEX idx_columns_position ON columns(project_id, position);

CREATE TRIGGER update_columns_updated_at
    BEFORE UPDATE ON columns
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE lanes (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                       title VARCHAR(100) NOT NULL,
                       description TEXT,
                       position INTEGER NOT NULL,
                       color VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
                       rule_condition JSONB NOT NULL,
                       created_at TIMESTAMP DEFAULT NOW(),
                       updated_at TIMESTAMP DEFAULT NOW(),
                       UNIQUE(project_id, position)
);

CREATE INDEX idx_lanes_project_id ON lanes(project_id);
CREATE INDEX idx_lanes_position ON lanes(project_id, position);
CREATE INDEX idx_lanes_rule_condition ON lanes USING GIN (rule_condition);

CREATE TRIGGER update_lanes_updated_at
    BEFORE UPDATE ON lanes
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE tasks (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       created_at TIMESTAMP DEFAULT NOW(),
                       updated_at TIMESTAMP DEFAULT NOW(),
                       project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                       assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
                       status_id UUID REFERENCES project_statuses(id),
                       priority VARCHAR(100) NOT NULL DEFAULT 'medium',
                       start_date TIMESTAMP DEFAULT NOW(),
                       due_date TIMESTAMP DEFAULT NULL,
                       closed_at TIMESTAMP DEFAULT NULL,
                       parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
                       CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status_id ON tasks(status_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_dates ON tasks(created_at, start_date, due_date, closed_at);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE tags (
                      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                      title VARCHAR(100) NOT NULL,
                      color VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
                      created_at TIMESTAMP DEFAULT NOW(),
                      UNIQUE(project_id, title)
);

CREATE INDEX idx_tags_project_id ON tags(project_id);
CREATE INDEX idx_tags_title ON tags(title);

CREATE TABLE task_tags (
                           tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                           task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                           created_at TIMESTAMP DEFAULT NOW(),
                           PRIMARY KEY (tag_id, task_id)
);

CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);

CREATE TABLE comments (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          created_at TIMESTAMP DEFAULT NOW(),
                          updated_at TIMESTAMP DEFAULT NOW(),
                          task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          content TEXT
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE changes (
                         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                         task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                         field_name VARCHAR(50) NOT NULL,
                         old_value JSONB,
                         new_value JSONB NOT NULL,
                         description TEXT,
                         time_duration INTEGER NOT NULL DEFAULT 0,
                         created_at TIMESTAMP DEFAULT NOW(),
                         CONSTRAINT valid_activity_field_name CHECK (
                             field_name IN ('task', 'title', 'description', 'assignee', 'status', 'priority',
                                            'attachment', 'subtask', 'start_date', 'due_date')
                             )
);

CREATE INDEX idx_changes_task_id ON changes(task_id);
CREATE INDEX idx_changes_user_id ON changes(user_id);
CREATE INDEX idx_changes_created_at ON changes(created_at);
CREATE INDEX idx_changes_field_name ON changes(field_name);

CREATE TABLE attachments (
                             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                             created_at TIMESTAMP DEFAULT NOW(),
                             comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
                             task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                             filename VARCHAR(255) NOT NULL,
                             file_url TEXT NOT NULL,
                             file_size INTEGER,
                             file_type VARCHAR(100),
                             uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             CONSTRAINT attachment_source_control CHECK (
                                 (comment_id IS NOT NULL AND task_id IS NULL) OR
                                 (comment_id IS NULL AND task_id IS NOT NULL)
                                 )
);

CREATE INDEX idx_attachments_comment_id ON attachments(comment_id);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX idx_attachments_created_at ON attachments(created_at);
CREATE INDEX idx_attachments_file_type ON attachments(file_type);