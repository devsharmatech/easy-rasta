-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL,
    email varchar NOT NULL,
    subject varchar NOT NULL,
    message text NOT NULL,
    status varchar DEFAULT 'new', -- new, read, replied
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow anyone to insert (public contact form)
CREATE POLICY "Anyone can insert contact submissions" 
ON contact_submissions FOR INSERT 
WITH CHECK (true);

-- Allow admins to view all submissions
CREATE POLICY "Admins can view contact submissions" 
ON contact_submissions FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Allow admins to update submissions (e.g., mark as read)
CREATE POLICY "Admins can update contact submissions" 
ON contact_submissions FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Allow admins to delete submissions
CREATE POLICY "Admins can delete contact submissions" 
ON contact_submissions FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
