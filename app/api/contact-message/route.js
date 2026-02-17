import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    // Check if env vars are loaded
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing Supabase environment variables');
        return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    );

    try {
        const body = await request.json();
        const { name, email, subject, message } = body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        console.log('Attempting to save contact message...', { name, email, subject });

        // Save to Supabase
        const { data, error } = await supabase
            .from('contact_submissions')
            .insert([{ name, email, subject, message, status: 'new' }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            // If error is related to key/permissions, standard helpful message
            return NextResponse.json(
                { error: `Database Error: ${error.message}` },
                { status: 500 }
            );
        }

        // console.log('Contact message saved:', data);

        return NextResponse.json(
            {
                success: true,
                message: 'Your message has been received. We will get back to you soon!',
                data: data[0]
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Contact form server error:', error);
        return NextResponse.json(
            { error: 'Failed to submit message. Please try again.' },
            { status: 500 }
        );
    }
}
