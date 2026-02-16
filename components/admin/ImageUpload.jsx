'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Upload, X, Check, Image as ImageIcon, Link as LinkIcon, Crop as CropIcon } from 'lucide-react'
import { getCroppedImg } from '@/lib/cropUtils'

export default function ImageUpload({ value, onChange, aspectRatio = 1, folder = 'uploads' }) {
    const [tab, setTab] = useState('upload')
    const [imageSrc, setImageSrc] = useState(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [isCropping, setIsCropping] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                setImageSrc(reader.result)
                setIsCropping(true)
            }
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
        multiple: false
    })

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleUpload = async () => {
        try {
            setUploading(true)
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

            // Create FormData to send to API
            const formData = new FormData()
            formData.append('file', croppedImageBlob, 'image.jpg')
            formData.append('folder', folder)

            // Upload via our secure API route
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Upload failed')
            }

            const { publicUrl } = await res.json()

            onChange(publicUrl)
            setIsCropping(false)
            setImageSrc(null)
            toast.success('Image uploaded successfully')
        } catch (error) {
            console.error('Upload Error:', error)
            toast.error(error.message || 'Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    const handleUrlSubmit = () => {
        if (!urlInput) return
        onChange(urlInput)
        toast.success('Image URL set')
    }

    return (
        <div className="space-y-4">
            <Label>Product Image</Label>

            {value ? (
                <div className="relative group w-40 h-40 rounded-lg overflow-hidden border bg-gray-100">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => onChange('')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" /> Upload</TabsTrigger>
                        <TabsTrigger value="url"><LinkIcon className="w-4 h-4 mr-2" /> URL</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-4">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-500'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-2 text-gray-500">
                                <ImageIcon className="w-10 h-10 mb-2 text-gray-400" />
                                <p className="text-sm font-medium">Click or drag image to upload</p>
                                <p className="text-xs text-gray-400">Supports JPG, PNG, GIF</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="url" className="mt-4 space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                            />
                            <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput}>Set</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {/* Cropper Dialog */}
            <Dialog open={isCropping} onOpenChange={setIsCropping}>
                <DialogContent className="sm:max-w-xl z-[70]">
                    <DialogHeader>
                        <DialogTitle>Crop Image</DialogTitle>
                    </DialogHeader>

                    <div className="relative h-80 w-full bg-black rounded-md overflow-hidden">
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>

                    <div className="py-4 space-y-2">
                        <Label>Zoom</Label>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCropping(false)} disabled={uploading}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploading} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {uploading ? 'Uploading...' : 'Save & Upload'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
