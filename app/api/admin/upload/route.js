import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file')
        const folder = formData.get('folder') || 'uploads'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const fileName = `${folder}/product-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

        const { data, error } = await supabaseAdmin.storage
            .from('media')
            .upload(fileName, buffer, {
                contentType: file.type || 'image/jpeg',
                upsert: true
            })

        if (error) {
            console.error('Supabase Upload Error:', error)
            throw error
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('media')
            .getPublicUrl(fileName)

        return NextResponse.json({ publicUrl })
    } catch (err) {
        console.error('Upload Route Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
