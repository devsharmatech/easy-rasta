import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromRequest } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'
export const revalidate = 0


const uploadFile = async (file, folder, userId) => {
    if (!file || typeof file === 'string' || file.size === 0) return null
    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true
        })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
        .from('media')
        .getPublicUrl(fileName)

    return urlData.publicUrl
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request)
        if (!user || user.role !== 'rider') {
            return errorResponse('Unauthorized', 401)
        }

        const { data: riderProfile } = await supabaseAdmin
            .from('rider_profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single()

        if (!riderProfile) return errorResponse('Rider profile not found', 404)

        // Handle multipart/form-data
        const formData = await request.formData().catch(() => null)
        if (!formData) {
            return errorResponse('Invalid form data', 400)
        }

        const type = formData.get('type')
        const amount = parseFloat(formData.get('amount'))
        const description = formData.get('description')
        const latitude = parseFloat(formData.get('latitude'))
        const longitude = parseFloat(formData.get('longitude'))
        const vehicle_id = formData.get('vehicle_id') // Optional but recommended
        
        // Fuel fields
        const fuel_type = formData.get('fuel_type')
        const price_per_liter = parseFloat(formData.get('price_per_liter'))
        const quantity = parseFloat(formData.get('quantity'))

        // File
        const imageFile = formData.get('image')

        // Validations
        if (!['fuel', 'service', 'washroom', 'other'].includes(type)) {
            return errorResponse('Invalid expense type', 400)
        }

        if (isNaN(amount) || amount <= 0) {
            return errorResponse('Amount must be a positive number', 400)
        }

        if (isNaN(latitude) || isNaN(longitude)) {
            return errorResponse('Valid Location coordinates are required', 400)
        }

        if (type === 'fuel') {
            if (!fuel_type || isNaN(price_per_liter) || isNaN(quantity)) {
                return errorResponse('fuel_type, price_per_liter, and quantity are required for fuel expenses', 400)
            }
        }

        // Duplication Check (prevent duplicate submission within 1 minute with same amount and type)
        const ONE_MINUTE_AGO = new Date(Date.now() - 60000).toISOString()
        const { data: existing } = await supabaseAdmin
            .from('rider_expenses')
            .select('id')
            .eq('rider_id', riderProfile.id)
            .eq('type', type)
            .eq('amount', amount)
            .gte('created_at', ONE_MINUTE_AGO)
            .limit(1)

        if (existing && existing.length > 0) {
            return errorResponse('Duplicate expense entry detected. Please wait.', 400)
        }

        // Upload image if provided
        let imageUrl = null
        if (imageFile && imageFile.size > 0) {
            imageUrl = await uploadFile(imageFile, 'expense_receipts', user.user_id)
        }

        // Insert Record
        const insertData = {
            rider_id: riderProfile.id,
            vehicle_id: vehicle_id || null,
            type,
            amount,
            description: description || null,
            image: imageUrl,
            latitude,
            longitude,
            status: 'approved' // TEMPORARY for testing: Auto-approve
        }

        if (type === 'fuel') {
            insertData.fuel_type = fuel_type
            insertData.price_per_liter = price_per_liter
            insertData.quantity = quantity
        }

        const { data: expense, error: insertError } = await supabaseAdmin
            .from('rider_expenses')
            .insert(insertData)
            .select()
            .single()

        if (insertError) throw insertError

        // AUTO CASHBACK CALCULATION FOR TESTING
        const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'cashback_percentages')
            .single()

        const percentages = settings?.value || { fuel: 5, service: 5, washroom: 5, other: 5 }
        const percent = percentages[type] || 5
        const cashbackAmount = parseFloat(((amount * percent) / 100).toFixed(2))

        let finalWalletBalance = 0;

        if (cashbackAmount > 0) {
            const { data: currentProfile } = await supabaseAdmin
                .from('rider_profiles')
                .select('wallet_balance')
                .eq('id', riderProfile.id)
                .single()
            
            finalWalletBalance = parseFloat(currentProfile?.wallet_balance || 0) + cashbackAmount;

            await supabaseAdmin
                .from('wallet_transactions')
                .insert({
                    rider_id: riderProfile.id,
                    amount: cashbackAmount,
                    type: 'credit',
                    description: `Cashback for ${type} expense (Auto-approved testing).`,
                    reference_id: expense.id
                })

            await supabaseAdmin
                .from('rider_profiles')
                .update({ wallet_balance: finalWalletBalance })
                .eq('id', riderProfile.id)
        }

        return successResponse('Expense added and automatically approved with cashback!', {
            expense,
            cashback_awarded: cashbackAmount,
            new_wallet_balance: finalWalletBalance
        })

    } catch (err) {
        console.error('Add Expense Error:', err)
        return errorResponse('Internal Server Error', 500)
    }
}
