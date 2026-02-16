'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function AmenitiesPage() {
    const [amenities, setAmenities] = useState([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [newAmenity, setNewAmenity] = useState({ name: '', category: '', icon_url: '' })

    const fetchAmenities = async () => {
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/amenities', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAmenities(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAmenities()
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/amenities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newAmenity)
            })

            if (res.ok) {
                setDialogOpen(false)
                setNewAmenity({ name: '', category: '', icon_url: '' })
                fetchAmenities()
            }
        } catch (error) {
            console.error(error)
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Amenities Management</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Amenity</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Amenity</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={newAmenity.name}
                                    onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input
                                    value={newAmenity.category}
                                    onChange={(e) => setNewAmenity({ ...newAmenity, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Icon URL</Label>
                                <Input
                                    value={newAmenity.icon_url}
                                    onChange={(e) => setNewAmenity({ ...newAmenity, icon_url: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Icon</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {amenities.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.icon_url ? <img src={item.icon_url} className="h-6 w-6" alt="" /> : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>{item.is_active ? 'Active' : 'Inactive'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
