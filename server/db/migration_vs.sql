-- Create vs_prop table
CREATE TABLE IF NOT EXISTS vs_prop (
    id SERIAL PRIMARY KEY,
    item_a TEXT NOT NULL,
    item_b TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create vs_result table
CREATE TABLE IF NOT EXISTS vs_result (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prop_id INTEGER NOT NULL REFERENCES vs_prop(id) ON DELETE CASCADE,
    selected_value VARCHAR(1) NOT NULL, -- 'A' or 'B'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate votes
ALTER TABLE vs_result ADD CONSTRAINT unique_vote UNIQUE (user_id, prop_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vs_result_prop ON vs_result(prop_id);

-- Seed Data
INSERT INTO vs_prop (item_a, item_b, category) VALUES
('소고기', '돼지고기', 'meat'),
('떡볶이', '마라탕', 'spicy'),
('짬뽕', '짜장면', 'chinese'),
('회', '스시', 'seafood'),
('피자', '치킨', 'delivery'),
('맥주', '소주', 'alcohol'),
('부먹', '찍먹', 'style'),
('물냉', '비냉', 'korean'),
('김치찌개', '된장찌개', 'korean')
ON CONFLICT DO NOTHING;
