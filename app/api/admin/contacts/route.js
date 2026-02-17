import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key to bypass RLS for admin operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(request) {
    try {
        const { data, error } = await supabase
            .from('contact_submissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');

    try {
        if (id) {
            const { error } = await supabase
                .from('contact_submissions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } else if (ids) {
            const idList = ids.split(',');
            const { error } = await supabase
                .from('contact_submissions')
                .delete()
                .in('id', idList);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json(
            { error: 'Failed to delete message' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        const { data, error } = await supabase
            .from('contact_submissions')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json(
            { error: 'Failed to update message' },
            { status: 500 }
        );
    }
}
