'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Receipt, Droplet, Wrench, MapPin, FileText, Save } from 'lucide-react'

export default function ExpenseSettingsPage() {
    const [settings, setSettings] = useState({ fuel: 5, service: 5, washroom: 5, other: 5 })
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/expenses/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.status && data.data) {
                setSettings(data.data)
            }
        } catch (error) {
            toast.error("Error fetching expense settings")
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        setSaving(true)
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/expenses/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            })
            const data = await res.json()
            if (data.status) {
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error("Error saving expense settings")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading settings...</div>

    return (
        <div className="max-w-full mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Receipt className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expense Cashback Rules</h1>
                    <p className="text-gray-500 text-sm">Configure the automatic wallet payout percentages for rider expenses.</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-lg">Dynamic Percentages</CardTitle>
                    <CardDescription>
                        When an admin approves a rider's expense report, the system will automatically calculate the cashback based on these numbers and deposit it into their wallet.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-gray-700">
                                <Droplet className="w-4 h-4 text-orange-500" />
                                Fuel Expenses (%)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                className="text-lg h-12"
                                value={settings.fuel}
                                onChange={(e) => setSettings({ ...settings, fuel: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-400">Example: Setting to 5 means a ₹1000 fuel bill earns ₹50 cashback.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-gray-700">
                                <Wrench className="w-4 h-4 text-blue-500" />
                                Vehicle Service (%)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                className="text-lg h-12"
                                value={settings.service}
                                onChange={(e) => setSettings({ ...settings, service: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-400">Cashback percentage for maintenance & servicing bills.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-gray-700">
                                <MapPin className="w-4 h-4 text-green-500" />
                                Washroom Usage (%)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                className="text-lg h-12"
                                value={settings.washroom}
                                onChange={(e) => setSettings({ ...settings, washroom: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-400">Cashback for paid washroom usages across the route.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-gray-700">
                                <FileText className="w-4 h-4 text-gray-500" />
                                Other Expenses (%)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                className="text-lg h-12"
                                value={settings.other}
                                onChange={(e) => setSettings({ ...settings, other: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-400">Fallback percentage for miscellaneous expenses.</p>
                        </div>

                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 h-11 px-8 shadow-md shadow-blue-500/20"
                            onClick={saveSettings}
                            disabled={saving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Cashback Rules'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
