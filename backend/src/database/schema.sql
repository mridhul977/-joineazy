
-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

-- 4. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    onedrive_link TEXT,
    deadline TIMESTAMP,
    target_all_students BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ASSIGNMENT GROUPS TABLE
CREATE TABLE IF NOT EXISTS assignment_groups (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL
        REFERENCES assignments(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE (assignment_id, group_id)
);

-- 6. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL
        REFERENCES assignments(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,
    confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'pending')),
    UNIQUE (assignment_id, group_id)
);

-- INDEXES FOR FASTER QUERIES
CREATE INDEX IF NOT EXISTS idx_group_members_user
ON group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_creator
ON assignments(created_by);

CREATE INDEX IF NOT EXISTS idx_submissions_group
ON submissions(group_id);
