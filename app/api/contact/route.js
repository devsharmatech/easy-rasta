import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
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

        // Save to Supabase
        const { data, error } = await supabase
            .from('contact_submissions')
            .insert([{ name, email, subject, message, status: 'new' }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw new Error(error.message);
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Your message has been received. We will get back to you soon!',
                data: data[0]
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Failed to submit message. Please try again.' },
            { status: 500 }
        );
    }
}
